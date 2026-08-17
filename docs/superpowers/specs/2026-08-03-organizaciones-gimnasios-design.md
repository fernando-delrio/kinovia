# Diseño: Organizaciones (gimnasios/clínicas) — entrenadores, admin y rutinas estándar

## Contexto

Hasta ahora Kinovia solo modela entrenadores independientes: cada uno es su
propio tenant, se registra público, invita a sus propios clientes. Hay una
señal real de interés (`doc/validacion-entrevistas.md`, conversación del 1
de agosto con un dueño de gimnasio) que ya motivó una nota en
`doc/fases.md`: soportar gimnasios con varios entrenadores "cuando se
construya, es una capa por encima del modelo actual (`organization_id`
opcional en el entrenador), no un rediseño". Decidido en sesión de
brainstorming (`superpowers:brainstorming`) el 3 de agosto de 2026.

Fernando planteó además que una clínica de fisioterapeutas para
readaptación debía poder usar la misma app — se confirmó en brainstorming
que estructuralmente es idéntica a un gimnasio (organización con admin +
varios profesionales + clientes), así que no se modela aparte; `type` en
`organizations` es solo una etiqueta informativa (`gym` | `clinic`).

## Alcance

Cuatro piezas, en este orden porque cada una depende de la anterior:

0. **`plan_templates` básico** — prerrequisito nunca construido hasta ahora
   (seguía `⬜` en `doc/fases.md`, Fase 1). Sin esto no hay "plantilla" de
   ningún tipo, ni personal ni compartida.
1. **Organizaciones + alta de admin + invitar entrenadores** — el núcleo.
2. **Reasignar cliente al despedir a un entrenador** — acción puntual del
   admin.
3. **Rutinas estándar compartidas** (propuesta de cualquier entrenador,
   publicación solo del admin) — para clientes del gimnasio sin
   entrenador personal contratado.

Decisión explícita de la sesión: las 4 piezas se diseñan **y** se
implementan juntas, no se difiere ninguna a una fase posterior.

**Fuera de alcance de este spec (decisiones ya tomadas, no se revisan aquí):**
- Cobro/Stripe, límites de plan por número de entrenadores — se deja listo
  el dato (contar entrenadores por organización es una query trivial), sin
  ninguna lógica de pago ni límites todavía (`doc/fases.md`, Fase 5).
- Copiar una plantilla a `client_plans` por cliente individual (asignación
  personalizada) — sigue siendo un paso posterior y separado de la Fase 1,
  no lo toca este spec.
- Varios admins por organización (co-dueños) — un solo `owner_id` por
  ahora, sin tabla de membresía aparte (YAGNI, nadie lo ha pedido todavía).
- Datos de condición física / salud en `profiles` — no existen aún (Fase
  3). Cuando se añadan, la política de "directorio del admin" (ver más
  abajo) deberá revisarse para asegurar que sigue sin exponerlos (columna
  restringida por GRANT, mismo patrón ya usado con `consent_accepted_at`
  en `20260802060830_profiles_restrict_update_columns.sql`). Anotado aquí
  como recordatorio futuro, no se resuelve en este spec.
- Entrenador independiente "convirtiéndose" en organización más tarde
  desde su panel — de momento la organización solo se crea en el alta
  (`/signup`). Si hace falta después, es una función nueva sencilla sobre
  el mismo modelo, no un rediseño.

## Modelo de datos

### `organizations` (nueva)

```
id            uuid primary key
name          text not null
type          text not null check (type in ('gym', 'clinic')) default 'gym'
owner_id      uuid not null references profiles(id)   -- el admin, uno solo
created_at    timestamptz not null default now()
```

`type` es puramente informativo (copy/UI futura) — el comportamiento es
idéntico para `gym` y `clinic`.

### `profiles` — dos columnas nuevas, ambas nullable

```
organization_id   uuid references organizations(id) on delete set null
```

- En un **entrenador**: a qué organización pertenece. `null` = entrenador
  independiente, exactamente como hoy.
- En un **cliente**: a qué organización pertenece si NO tiene entrenador
  personal propio (ve solo las rutinas estándar publicadas de esa
  organización).

**No** se añade ninguna columna `is_org_admin`. "¿Es admin?" se deriva
siempre de `organizations.owner_id = auth.uid()` — nunca un flag
denormalizado que se pueda desincronizar del dueño real.

**CHECK `client_has_trainer` (ya existe desde Fase 0) se relaja:**

```sql
-- antes: (role='client' and trainer_id is not null) or (role='trainer' and trainer_id is null)
-- después:
constraint client_has_trainer check (
  (role = 'client' and (trainer_id is not null or organization_id is not null)) or
  (role = 'trainer' and trainer_id is null)
)
```

Un cliente necesita `trainer_id` **o** `organization_id` (uno de los dos
como mínimo) — nunca los dos vacíos, nunca sin ningún vínculo. Un
entrenador sigue sin tener nunca `trainer_id` propio, tenga o no
organización.

### `plan_templates` (nueva, pieza 0)

```
id                uuid primary key
trainer_id        uuid references profiles(id) on delete cascade
organization_id   uuid references organizations(id) on delete cascade
name              text not null
content           jsonb not null
status            text not null default 'published' check (status in ('draft', 'published'))
created_by        uuid not null references profiles(id)
created_at        timestamptz not null default now()

constraint template_owner check (
  (trainer_id is not null and organization_id is null) or   -- plantilla personal
  (trainer_id is null and organization_id is not null)      -- plantilla estándar del gimnasio
)
```

- **Plantilla personal** (`trainer_id` set): privada de ese entrenador,
  `status` no aplica en la práctica (siempre efectivamente "publicada"
  para su propio uso — no hay flujo de aprobación entre un entrenador y
  sí mismo).
- **Plantilla estándar** (`organization_id` set): cualquier entrenador de
  esa organización puede crearla — nace en `draft`. Solo el admin
  (`organizations.owner_id`) puede pasarla a `published`, momento en el
  que la ven los clientes de esa organización sin entrenador personal.

No incluye todavía `client_plans` (la copia de una plantilla al asignarla
a un cliente concreto) — eso sigue siendo un paso posterior de la Fase 1,
sin relación con las organizaciones.

## RLS y permisos — resumen por tabla

**`organizations`**: `select` para cualquier `authenticated` cuyo
`profiles.organization_id` coincida (los entrenadores necesitan saber el
nombre de su propio gimnasio); `insert`/`update` solo vía las funciones de
abajo, nunca directo desde el cliente.

**`profiles`** — política nueva, además de las ya existentes
(`profiles_select_own`, `profiles_select_own_clients`,
`profiles_update_own`):

```sql
-- El admin ve el directorio básico (toda la fila, hoy sin datos de salud)
-- de los clientes de SUS entrenadores — nunca planes ni historial, esas
-- tablas ni siquiera tienen política que lo permita.
create policy profiles_select_org_admin_clients
  on public.profiles
  for select
  to authenticated
  using (
    role = 'client'
    and trainer_id in (
      select p.id from public.profiles p
      join public.organizations o on o.id = p.organization_id
      where o.owner_id = (select auth.uid()) and p.role = 'trainer'
    )
  );
```

El panel del admin solo pinta `display_name` de esta consulta — no hay
columna de email en `profiles` (vive en `auth.users`, fuera del alcance
del cliente API), así que no hace falta ocultar nada aparte.

**`plan_templates`** — políticas nuevas:
- `select`: dueño de la plantilla personal (`trainer_id = auth.uid()`), o
  cualquier entrenador de la misma organización (`organization_id` coincide
  con `profiles.organization_id` del que llama, para poder revisar
  borradores), o un cliente de esa organización sin entrenador SOLO si
  `status = 'published'`.
- `insert`: entrenador crea su propia personal (`trainer_id = auth.uid()`),
  o una de organización con `organization_id` igual a la suya propia y
  `status` forzado a `'draft'` en el `with check` (nunca puede insertar ya
  publicada).
- `update`: el propio entrenador para las personales. Para las de
  organización, dos casos distintos — el entrenador que la propuso puede
  seguir editando el **contenido** mientras siga en `draft` (para corregir
  antes de que el admin la revise), pero **solo** `organizations.owner_id`
  puede cambiar `status` a `published`, y solo el admin puede editar una
  plantilla que ya está `published`. Ningún entrenador (ni el que la
  propuso) puede volver a `draft` una plantilla ya publicada.

**Función `reassign_client(client_id, new_trainer_id)`** — `SECURITY
DEFINER`, mismo patrón que `accept_consent()`
(`20260802220708_profiles_accept_consent_function.sql`): verifica que
quien llama es `organizations.owner_id`, que ambos entrenadores
(`client_id`'s `trainer_id` actual y `new_trainer_id`) pertenecen a esa
misma organización, y solo entonces actualiza `trainer_id`. Es la única
vía de escritura de `trainer_id` de un cliente ajeno — nunca un UPDATE
directo desde el frontend.

## Flujos

**Alta como organización:** `/signup` gana un selector "Entrenador
independiente" / "Gimnasio o clínica" (+ nombre de la organización si
elige esto último). Al completar: se crea `profiles` (igual que hoy) y,
si eligió organización, también la fila `organizations` (con él como
`owner_id`) y se le asigna `organization_id` — mismo flujo transaccional
que ya usa `createTrainerProfile`, con un paso extra. Pasa por `/consent`
igual que cualquier alta.

**Invitar entrenador al gimnasio:** Edge Function nueva, `invite-trainer`
(no se reutiliza `invite-client` — la verificación de quién puede invitar
es distinta: aquí hace falta `organizations.owner_id`, no
`role='trainer'` a secas). Mismo patrón ya probado en `invite-client`:
`service_role`, verifica que quien llama es el admin, `inviteUserByEmail`,
crea el `profiles` del entrenador nuevo con `organization_id` ya asignado
y `trainer_id` null.

**Reasignar cliente al despedir:** en el panel del admin, ve la lista
(`display_name`) de clientes de cada entrenador de su organización, elige
cliente + entrenador destino, llama a `reassign_client(...)`.

**Rutinas estándar:** un entrenador del gimnasio crea una plantilla con
`organization_id` → nace `draft`. El admin la revisa y la pasa a
`published` — desde ese momento la ven los clientes de esa organización
sin entrenador asignado.

## Manejo de errores

- Alta como organización con nombre vacío → error claro en el propio
  formulario, no llega a Supabase.
- Invitar entrenador sin ser admin de ninguna organización → la Edge
  Function rechaza (403), verificado server-side.
- `reassign_client` con un `new_trainer_id` que no pertenece a la misma
  organización que el cliente → la función rechaza (excepción SQL,
  ninguna fila se actualiza).
- Publicar una plantilla de organización siendo un entrenador (no el
  admin) → RLS rechaza el `update`, ningún camino de la UI debería
  ofrecer ese botón a quien no sea admin, pero el rechazo real está en la
  base de datos, no solo en la UI.

## Testing (`NORMAS_INAMOVIBLES.md` §6, aplicado aquí)

- **RLS/aislamiento (no negociable, el grueso de este spec):**
  - Trainer A y B de la MISMA organización no pueden verse los clientes
    entre sí (solo el admin puede, y solo el directorio básico).
  - Trainer de la organización X no ve nada de la organización Y (ni
    plantillas estándar, ni el directorio del admin de Y).
  - Un cliente sin entrenador ve las plantillas `published` de su
    organización, nunca las `draft`, nunca las de otra organización.
  - `reassign_client` funciona entre dos entrenadores de la misma
    organización, y falla si el entrenador destino es de otra
    organización o no es admin quien llama.
  - Un entrenador NO puede publicar una plantilla de organización (solo
    crearla y editarla en `draft`) — solo el admin puede pasarla a
    `published`, y solo el admin puede editarla una vez publicada (ni
    siquiera quien la propuso).
- **`rls-reviewer`** (`.claude/agents/rls-reviewer.md`): obligatorio antes
  de cerrar cada una de las piezas 1, 2 y 3 — son las que tocan RLS/GRANT
  nuevo. La pieza 0 (`plan_templates` básico, sin organización todavía)
  también, en cuanto tiene su propia RLS de aislamiento por `trainer_id`.
- **Unit:** services/hooks nuevos (`organizationService`,
  `useInviteTrainerForm`, etc.) con mocks, siguiendo el mismo patrón ya
  usado en `modules/auth` y `modules/trainer`.
- **Acceptance (Gherkin):** recorrido "admin se registra con su gimnasio →
  invita a un entrenador → el entrenador entra → el admin invita a un
  cliente sin asignar entrenador → el cliente ve la rutina estándar
  publicada". El `.feature` lo aprueba Fernando antes de implementarse
  contra él (regla anti-alucinación, igual que en el spec anterior).

## Siguiente paso

Invocar `superpowers:writing-plans` para convertir esto en un plan de
implementación paso a paso.
