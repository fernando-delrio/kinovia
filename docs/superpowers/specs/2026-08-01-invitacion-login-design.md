# Diseño: Alta de entrenador, invitación de cliente y consentimiento

## Contexto

Es el primer sub-proyecto real de Kinovia, elegido para arrancar la Fase 1
(`doc/fases.md`) porque el resto del recorrido (crear plantilla, ver plan,
registrar entreno) no tiene sentido sin cuentas de entrenador y cliente
primero. Decidido en sesión de brainstorming (`superpowers:brainstorming`)
el 1 de agosto de 2026.

Corrige una decisión anterior: el `NORMAS_INAMOVIBLES.md` original prohibía
alta pública tanto a entrenadores como a clientes. Se corrigió el mismo día:
**el entrenador es quien paga, así que se registra público desde la
landing; el cliente sigue siendo siempre por invitación de su propio
entrenador.**

## Alcance

**Dentro de este sub-proyecto:**
- Alta pública del entrenador (email + contraseña).
- Invitación de un cliente por su entrenador (solo email).
- Aceptación de la invitación por el cliente (contraseña propia).
- Gate de consentimiento de política de privacidad antes de usar la app.

**Fuera de este sub-proyecto (decisiones ya tomadas, documentadas aparte):**
- Formulario extenso de condición física/lesiones del cliente — es Fase 3
  (`doc/fases.md`), no se adelanta aquí.
- Soporte para gimnasios con varios entrenadores (organización) — fuera del
  MVP, hay señal real de interés pero se revalúa después de validar
  (`doc/validacion-entrevistas.md` §5, `doc/fases.md`).
- Confirmación de email en el signup del entrenador — desactivada a
  propósito para la fase de validación (`doc/deuda-tecnica.md`).
- Texto legal real de la política de privacidad — hay un borrador sin
  revisar (`doc/borrador-politica-privacidad.md`), pendiente de revisión
  profesional antes de que entre el primer cliente real
  (`doc/deuda-tecnica.md`).

## Arquitectura

Nuevo módulo `frontend/src/modules/auth/` (ya existen parcialmente
`services/authService.js` y `hooks/useAuthSession.jsx` de la Fase 0).

Rutas nuevas en React Router (hoy solo existe `/`):

| Ruta | Quién | Qué hace |
|---|---|---|
| `/signup` | Público | Entrenador se registra (email + contraseña) |
| `/login` | Público | Entrada para entrenador o cliente ya registrado |
| `/accept-invite` | Cliente invitado (link del email) | Establece contraseña vía el flujo de invitación de Supabase |
| `/consent` | Cualquier usuario autenticado sin `consent_accepted_at` (entrenador o cliente) | Checkbox obligatorio de política de privacidad |
| `/trainer` | Entrenador autenticado + con consentimiento | Panel (vacío por ahora salvo "Invitar cliente") |
| `/client` | Cliente autenticado + con consentimiento | Vista del cliente (vacía por ahora, la rellena el resto de Fase 1) |

Capas dentro de `modules/auth/` (`Componente → Hook → Service → Model →
core/lib/api`, ya establecido en `CLAUDE.md` §3):
- `services/authService.js` — añade `signUp`, `signIn`, `acceptInvite` a lo
  ya existente.
- `services/consentService.js` (nuevo) — leer/guardar `consent_accepted_at`.
- `services/inviteService.js` (nuevo) — llama a la Edge Function
  `invite-client`.
- Un hook y un componente por página de la tabla de arriba.
- `core/components/ProtectedRoute.jsx` (nuevo) — guard de rutas.

## Flujo de datos

**Entrenador se registra:**
1. `/signup` → `supabase.auth.signUp({ email, password })`.
2. Sin confirmación de email (deuda técnica) → sesión activa al momento.
3. Se crea la fila en `profiles` (`role: 'trainer'`, `trainer_id: null`,
   `display_name: null`, `consent_accepted_at: null`).
4. Redirige a `/consent` (el entrenador también pasa por el gate — maneja
   datos de salud de sus clientes, tiene que aceptar la misma política).
   Tras aceptar, a `/trainer`.

**Entrenador invita a un cliente:**
1. Desde `/trainer`, formulario con un único campo: email.
2. Llama a la Edge Function `invite-client` (usa `service_role key`, nunca
   en el frontend), que:
   - Verifica que quien llama es un `trainer` autenticado (valida el JWT).
   - Rechaza si el email ya tiene cuenta — como cliente de OTRO entrenador
     (no se reasigna así) o como entrenador (un entrenador no puede
     convertirse en cliente de otro por invitación).
   - Llama a `supabase.auth.admin.inviteUserByEmail(email)`.
   - Inserta la fila en `profiles` (`role: 'client'`,
     `trainer_id: <id del entrenador que invita>`).
3. Supabase manda el email de invitación automáticamente.

**Cliente acepta la invitación:**
1. Clic en el enlace del email → `/accept-invite` con el token de Supabase.
2. Formulario de contraseña → `supabase.auth.updateUser({ password })`.
3. Redirige a `/consent` (no tiene `consent_accepted_at` todavía).
4. Marca el checkbox → se guarda `consent_accepted_at` (columna nueva en
   `profiles`, migración aparte de la que ya existe).
5. Redirige a `/client`.

**Guard de rutas:** `ProtectedRoute` redirige a `/login` si no hay sesión,
y a `/consent` si hay sesión pero `consent_accepted_at` es `null` —
aplica igual a entrenador y a cliente.

## Modelo de datos — cambios

Migración nueva sobre `profiles` (la tabla y su RLS ya existen desde la
Fase 0):
- `alter table public.profiles add column consent_accepted_at timestamptz;`
- Sin política RLS nueva — ya cubierta por `profiles_select_own` /
  `profiles_update_own` (el usuario solo lee/escribe su propia fila).

Edge Function nueva: `supabase/functions/invite-client/`.

## Manejo de errores

- Signup con email ya registrado → mensaje claro, no genérico de Supabase.
- Invitar a un email que ya tiene cuenta (cliente de otro entrenador, o
  entrenador) → la Edge Function lo rechaza con mensaje explícito.
- Usuario (entrenador o cliente) sin `consent_accepted_at` intentando
  acceder a `/trainer` o `/client` → redirige a `/consent`, nunca deja
  pasar.
- Invitar sin sesión de `trainer` válida → la Edge Function rechaza
  (401/403), verificado server-side, no solo en el frontend.

## Testing (`NORMAS_INAMOVIBLES.md` §6, aplicado aquí)

- **Unit:** `authService`, `consentService`, `inviteService` (mocks de
  Supabase).
- **RLS:** ampliar `frontend/test/rls/profiles.rls.test.js` para cubrir la
  nueva columna y el caso de invitación entre tenants.
- **Acceptance (Gherkin):** recorrido completo signup → invitar → aceptar →
  consentir → entra. El `.feature` lo escribe o aprueba Fernando **antes**
  de que se implemente (regla anti-alucinación, no negociable).
- **`rls-reviewer`** (`.claude/agents/rls-reviewer.md`): obligatorio al
  tocar la Edge Function `invite-client`, la migración de `consent_accepted_at`
  y cualquier query nueva sobre `profiles`.
- Property-based / mutation testing: no aplica todavía — no hay lógica pura
  compleja en este sub-proyecto (le toca al motor de sustitución más
  adelante).

## Siguiente paso

Invocar `superpowers:writing-plans` para convertir esto en un plan de
implementación paso a paso.
