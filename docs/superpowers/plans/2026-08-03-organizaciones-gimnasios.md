# Organizaciones (gimnasios/clínicas) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un entrenador puede registrarse como organización (gimnasio o
clínica) además de como independiente, invitar a otros entrenadores a su
organización, reasignar los clientes de un entrenador que se va, y publicar
rutinas estándar que ven los clientes del gimnasio sin entrenador personal
asignado.

**Architecture:** Capa nueva sobre el modelo ya existente de `profiles`
(entrenador/cliente): tabla `organizations` (un admin = un entrenador),
`profiles.organization_id` opcional, y `plan_templates` (nuevo, prerrequisito
nunca construido) con dos modos — personal (`trainer_id`) o compartida de
organización (`organization_id` + flujo `draft`/`published`). Toda escritura
sensible (crear organización, reasignar cliente, publicar rutina) pasa por
una función `SECURITY DEFINER`, nunca por un UPDATE/INSERT directo desde el
frontend — mismo patrón ya usado en `accept_consent()`.

**Tech Stack:** React 19, React Router 7, Supabase (`@supabase/supabase-js`),
Vitest, Deno (Edge Functions).

## Global Constraints

- Arrow functions siempre, nunca `function foo() {}` (`CLAUDE.md` §4).
- Componente nunca hace `fetch`; `try/catch` SOLO en el hook; service lanza,
  nunca silencia (`CLAUDE.md` §3, §6).
- Ninguna tabla/columna nueva sin RLS y GRANT explícitos en el mismo
  archivo de migración — RLS y GRANT son capas distintas
  (`ERRORES_APRENDIDOS.md`, 2026-07-31).
- `service_role key` únicamente en Edge Functions, nunca en el frontend.
- Toda tabla/función con RLS tocada necesita test de aislamiento (dos JWT
  reales) y revisión del subagente `rls-reviewer`
  (`.claude/agents/rls-reviewer.md`) — su `subagent_type` no está
  registrado en este entorno, hay que dispatcharlo como `general-purpose`
  con el contenido completo de ese archivo como instrucciones de persona.
- El `.feature` de Gherkin lo aprueba Fernando antes de implementarse
  contra él (regla anti-alucinación) — la tarea que lo introduce es un
  punto de parada obligatorio.
- **Nadie hace `git commit` salvo Fernando.** Cada tarea termina con el
  código implementado y probado, working tree sin comitear.
- Toda función `SECURITY DEFINER` lleva `set search_path = public`
  (protección contra secuestro de `search_path`, lección de la revisión
  final de la rama anterior).
- Toda Edge Function invocable desde el navegador lleva cabeceras CORS +
  handler `OPTIONS` + `verify_jwt = false` en `supabase/config.toml` (la
  función valida el `Authorization` a mano) — lección de la Task C2 de la
  rama anterior.

---

## Pieza 0 — `plan_templates` básico (prerrequisito)

### Task 1: Migración — tabla `plan_templates` (personal, sin organización todavía)

**Files:**
- Create: `supabase/migrations/20260803090000_plan_templates.sql`

**Interfaces:**
- Produces: tabla `public.plan_templates(id, trainer_id, name, content, created_at)`.

- [ ] **Step 1: Escribir la migración**

```sql
-- plan_templates: plantillas de entrenamiento del entrenador (JSONB,
-- fases->días->ejercicios). Prerrequisito nunca construido hasta ahora
-- (doc/fases.md, Fase 1) — sin esto no existe ningún concepto de
-- "plantilla", ni personal ni compartida de organización.
--
-- Esta migración solo cubre el caso personal (un entrenador, sus propias
-- plantillas). El caso de organización (rutinas estándar compartidas)
-- llega en una migración posterior, cuando exista la tabla organizations.

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index plan_templates_trainer_id_idx on public.plan_templates (trainer_id);

alter table public.plan_templates enable row level security;
alter table public.plan_templates force row level security;

-- Aislamiento: cada entrenador ve, crea, edita y borra solo sus propias plantillas.
create policy plan_templates_select_own
  on public.plan_templates
  for select
  to authenticated
  using ((select auth.uid ()) = trainer_id);

create policy plan_templates_insert_own
  on public.plan_templates
  for insert
  to authenticated
  with check ((select auth.uid ()) = trainer_id);

create policy plan_templates_update_own
  on public.plan_templates
  for update
  to authenticated
  using ((select auth.uid ()) = trainer_id)
  with check ((select auth.uid ()) = trainer_id);

create policy plan_templates_delete_own
  on public.plan_templates
  for delete
  to authenticated
  using ((select auth.uid ()) = trainer_id);

grant select, insert, update, delete on public.plan_templates to authenticated;
grant select, insert, update, delete on public.plan_templates to service_role;
```

- [ ] **Step 2: Aplicar contra el proyecto real**

```bash
supabase db push
```

- [ ] **Step 3: Confirmar en Supabase Studio (o `\d plan_templates` vía CLI)**

Confirma que la tabla existe con las 4 columnas, RLS activa, y las 4
políticas creadas.

---

### Task 2: `planTemplatesService.js` — crear y listar plantillas personales

**Files:**
- Create: `frontend/src/modules/plan-templates/services/planTemplatesService.js`
- Test: `frontend/src/modules/plan-templates/services/planTemplatesService.test.js`

**Interfaces:**
- Consumes: `supabase` desde `../../core/lib/api`.
- Produces: `createTemplate({ name, content }) => Promise<{id, name, content}>`,
  `listMyTemplates() => Promise<Array<{id, name, content}>>`. Ambas lanzan
  `Error` con `error.message` de Supabase si falla.

- [ ] **Step 1: Escribir el test que falla**

```js
// frontend/src/modules/plan-templates/services/planTemplatesService.test.js
import { describe, expect, it, vi } from 'vitest'

const single = vi.fn()
const select = vi.fn(() => ({ order: () => Promise.resolve({ data: [], error: null }) }))
const insertSelect = vi.fn(() => ({ single }))
const insert = vi.fn(() => ({ select: insertSelect }))
const from = vi.fn(() => ({ select, insert }))

vi.mock('../../core/lib/api', () => ({ supabase: { from: (...args) => from(...args) } }))

import { createTemplate, listMyTemplates } from './planTemplatesService'

describe('planTemplatesService', () => {
  it('createTemplate inserta y devuelve la plantilla creada', async () => {
    single.mockResolvedValue({
      data: { id: 't1', name: 'Plantilla base', content: { fases: [] } },
      error: null,
    })
    const template = await createTemplate({ name: 'Plantilla base', content: { fases: [] } })
    expect(insert).toHaveBeenCalledWith({ name: 'Plantilla base', content: { fases: [] } })
    expect(template).toEqual({ id: 't1', name: 'Plantilla base', content: { fases: [] } })
  })

  it('createTemplate lanza con el mensaje de Supabase si falla', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'nombre requerido' } })
    await expect(createTemplate({ name: '', content: {} })).rejects.toThrow('nombre requerido')
  })

  it('listMyTemplates devuelve la lista (vacía si no hay ninguna)', async () => {
    const templates = await listMyTemplates()
    expect(templates).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
cd frontend && npx vitest run src/modules/plan-templates/services/planTemplatesService.test.js
```
Esperado: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/plan-templates/services/planTemplatesService.js
import { supabase } from '../../core/lib/api'

export const createTemplate = async ({ name, content }) => {
  const { data, error } = await supabase
    .from('plan_templates')
    .insert({ name, content })
    .select('id, name, content')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listMyTemplates = async () => {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, name, content')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/plan-templates/services/planTemplatesService.test.js
```
Esperado: PASS, 3/3.

---

### Task 3: Test de aislamiento RLS de `plan_templates` (personal) + `rls-reviewer`

**Files:**
- Create: `frontend/test/rls/planTemplates.rls.test.js`

**Interfaces:**
- Consumes: `adminClient`, `createTestUser`, `signInAs`, `deleteTestUser` de
  `./testUsers` (ya existen, sin cambios).

- [ ] **Step 1: Escribir el test**

```js
// frontend/test/rls/planTemplates.rls.test.js
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('plan_templates RLS (personal)', () => {
  let trainerA
  let trainerB

  beforeAll(async () => {
    trainerA = await createTestUser({ label: 'templates-trainer-a', role: 'trainer' })
    trainerB = await createTestUser({ label: 'templates-trainer-b', role: 'trainer' })
  })

  afterAll(async () => {
    await Promise.all([trainerA, trainerB].filter(Boolean).map((user) => deleteTestUser(user.id)))
  })

  it('un entrenador crea y lee su propia plantilla', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data: inserted, error: insertError } = await asTrainerA
      .from('plan_templates')
      .insert({ name: 'Fuerza básica', content: { fases: [] } })
      .select('id')
      .single()
    expect(insertError).toBeNull()

    const { data, error } = await asTrainerA.from('plan_templates').select('id').eq('id', inserted.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)

    await adminClient.from('plan_templates').delete().eq('id', inserted.id)
  })

  it('trainer B NO ve las plantillas de trainer A', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data: inserted } = await asTrainerA
      .from('plan_templates')
      .insert({ name: 'Privada de A', content: { fases: [] } })
      .select('id')
      .single()

    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB.from('plan_templates').select('id').eq('id', inserted.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    await adminClient.from('plan_templates').delete().eq('id', inserted.id)
  })

  it('trainer B NO puede insertar una plantilla a nombre de trainer A', async () => {
    const asTrainerB = await signInAs(trainerB.email)
    const { error } = await asTrainerB
      .from('plan_templates')
      .insert({ trainer_id: trainerA.id, name: 'Suplantada', content: {} })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run test/rls/planTemplates.rls.test.js
```
Esperado: PASS, 3/3.

- [ ] **Step 3: Dispatch obligatorio de `rls-reviewer`**

Sobre `supabase/migrations/20260803090000_plan_templates.sql` y este test —
confirma que el aislamiento por `trainer_id` es correcto y que no falta
ningún GRANT.

---

## Pieza 1 — Organizaciones, alta de admin, invitar entrenadores

### Task 4: Migración — tabla `organizations`

> **Nota (3 agosto 2026, retrospectiva):** esta tarea, tal como estaba
> escrita originalmente, tenía un bug de secuenciación — su política
> `organizations_select_member` hace referencia a `profiles.organization_id`,
> columna que no se crea hasta la Task 6. El primer implementador se topó
> con esto al aplicar la migración y creó, por su cuenta,
> `supabase/migrations/20260803085000_profiles_add_organization_id.sql`
> (columna sin FK ni índice) para desbloquearse. Fernando aceptó el
> resultado técnico pero señaló que debió pararse a preguntar antes de
> improvisar una migración fuera del plan — la Task 6 ya está ajustada
> para completar el FK/índice que falta. Ver `doc/deuda-tecnica.md`.

**Files:**
- Create: `supabase/migrations/20260803091500_organizations.sql`

**Interfaces:**
- Produces: tabla `public.organizations(id, name, type, owner_id, created_at)`.

- [ ] **Step 1: Escribir la migración**

```sql
-- organizations: un gimnasio o clínica. "type" es solo una etiqueta
-- informativa para copy/UI futura — el comportamiento es idéntico para
-- 'gym' y 'clinic' (confirmado en el spec, no hay lógica distinta).
--
-- owner_id es el ÚNICO admin de la organización (un solo admin por ahora,
-- YAGNI — nadie ha pedido co-dueños todavía).
--
-- Sin política de insert/update/delete para `authenticated`: la única vía
-- de crear una organización es la función create_organization() de la
-- siguiente migración (SECURITY DEFINER, corre con privilegios de su
-- dueño, no del rol authenticated).

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'gym' check (type in ('gym', 'clinic')),
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

-- Un entrenador ve la organización a la que pertenece (para pintar su
-- nombre), y el admin siempre ve la suya propia.
create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (
    id in (select organization_id from public.profiles where id = (select auth.uid ()) and organization_id is not null)
    or owner_id = (select auth.uid ())
  );

grant select on public.organizations to authenticated;
grant select, insert, update, delete on public.organizations to service_role;
```

- [ ] **Step 2: Aplicar**

```bash
supabase db push
```

---

### Task 5: Migración — función `create_organization()` (SECURITY DEFINER)

**Files:**
- Create: `supabase/migrations/20260803092000_create_organization_function.sql`

**Interfaces:**
- Produces: `create_organization(org_name text, org_type text default 'gym') returns uuid`
  (RPC, invocable como `supabase.rpc('create_organization', {...})`).

- [ ] **Step 1: Escribir la migración**

```sql
-- Única vía de crear una organización: un entrenador SIN organización
-- previa (organization_id is null) crea la suya y queda como admin en el
-- mismo paso. Nunca un INSERT directo sobre organizations desde el
-- frontend (no hay política que lo permita, ver migración anterior).
create or replace function public.create_organization(org_name text, org_type text default 'gym')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer' and organization_id is null
  ) then
    raise exception 'Solo un entrenador sin organización puede crear una';
  end if;

  insert into public.organizations (name, type, owner_id)
  values (org_name, org_type, auth.uid())
  returning id into new_org_id;

  update public.profiles set organization_id = new_org_id where id = auth.uid();

  return new_org_id;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;
revoke execute on function public.create_organization(text, text) from public;
```

- [ ] **Step 2: Aplicar**

```bash
supabase db push
```

---

### Task 6: Migración — FK/índice de `profiles.organization_id` + directorio del admin

> **Nota (3 agosto 2026, ajustada tras la Task 4):** la columna
> `profiles.organization_id` YA EXISTE — la creó
> `supabase/migrations/20260803085000_profiles_add_organization_id.sql`,
> una migración fuera de la numeración de este plan que el implementador
> de la Task 4 tuvo que improvisar porque `organizations.sql` (Task 4)
> hace referencia a esa columna en su política `organizations_select_member`,
> y este Task 6 (que era quien originalmente la creaba) todavía no se
> había ejecutado — bug de secuenciación del propio plan, aceptado por
> Fernando, ver `doc/deuda-tecnica.md`. Esa columna existente es
> `organization_id uuid` a secas: **sin FK, sin índice**. Esta tarea ya NO
> crea la columna (fallaría, "column already exists") — completa lo que
> le falta.

**Files:**
- Create: `supabase/migrations/20260803092500_profiles_organization_id.sql`

**Interfaces:**
- Produces: FK + índice sobre `profiles.organization_id` (columna ya
  existente), política `profiles_select_org_admin_clients`.

- [ ] **Step 1: Escribir la migración**

```sql
-- La columna profiles.organization_id ya existe (creada fuera de
-- secuencia por la Task 4, ver nota arriba) — sin FK ni índice todavía.
-- Esta migración completa eso, en vez de crear la columna desde cero.
alter table public.profiles
  add constraint profiles_organization_id_fkey
  foreign key (organization_id) references public.organizations (id) on delete set null;

create index profiles_organization_id_idx on public.profiles (organization_id);

-- Antes: un cliente SIEMPRE necesitaba trainer_id. Ahora: trainer_id O
-- organization_id (al menos uno) — nunca los dos vacíos.
alter table public.profiles drop constraint client_has_trainer;
alter table public.profiles add constraint client_has_trainer check (
  (role = 'client' and (trainer_id is not null or organization_id is not null)) or
  (role = 'trainer' and trainer_id is null)
);

-- Directorio básico del admin: ve qué clientes tiene cada entrenador de SU
-- organización (para poder reasignar al despedir a alguien, pieza 2) —
-- pero nunca ve planes, entrenos ni datos de salud, esas tablas ni
-- siquiera tienen política que se lo permita.
create policy profiles_select_org_admin_clients
  on public.profiles
  for select
  to authenticated
  using (
    role = 'client'
    and trainer_id in (
      select p.id from public.profiles p
      join public.organizations o on o.id = p.organization_id
      where o.owner_id = (select auth.uid ()) and p.role = 'trainer'
    )
  );
```

- [ ] **Step 2: Aplicar**

```bash
supabase db push
```

---

### Task 7: `organizationsService.js` — crear y leer organización

**Files:**
- Create: `frontend/src/modules/organizations/services/organizationsService.js`
- Test: `frontend/src/modules/organizations/services/organizationsService.test.js`

**Interfaces:**
- Consumes: `supabase` desde `../../core/lib/api`.
- Produces: `createOrganization(name, type = 'gym') => Promise<string>` (id
  de la organización creada), `getMyOrganization(organizationId) => Promise<{id, name, type, ownerId} | null>`.

- [ ] **Step 1: Escribir el test que falla**

```js
// frontend/src/modules/organizations/services/organizationsService.test.js
import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock('../../core/lib/api', () => ({ supabase: { rpc: (...args) => rpc(...args), from: (...args) => from(...args) } }))

import { createOrganization, getMyOrganization } from './organizationsService'

describe('organizationsService', () => {
  it('createOrganization llama a la función y devuelve el id creado', async () => {
    rpc.mockResolvedValue({ data: 'org-1', error: null })
    const id = await createOrganization('Gimnasio Central', 'gym')
    expect(rpc).toHaveBeenCalledWith('create_organization', { org_name: 'Gimnasio Central', org_type: 'gym' })
    expect(id).toBe('org-1')
  })

  it('createOrganization lanza con el mensaje de Supabase si falla', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'ya tienes una organización' } })
    await expect(createOrganization('X')).rejects.toThrow('ya tienes una organización')
  })

  it('getMyOrganization devuelve null si no hay organizationId', async () => {
    const org = await getMyOrganization(null)
    expect(org).toBeNull()
  })

  it('getMyOrganization normaliza la fila (camelCase)', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'org-1', name: 'Gimnasio Central', type: 'gym', owner_id: 'u1' }, error: null })
    const org = await getMyOrganization('org-1')
    expect(org).toEqual({ id: 'org-1', name: 'Gimnasio Central', type: 'gym', ownerId: 'u1' })
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
cd frontend && npx vitest run src/modules/organizations/services/organizationsService.test.js
```
Esperado: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/organizations/services/organizationsService.js
import { supabase } from '../../core/lib/api'

export const createOrganization = async (name, type = 'gym') => {
  const { data, error } = await supabase.rpc('create_organization', { org_name: name, org_type: type })
  if (error) throw new Error(error.message)
  return data
}

export const getMyOrganization = async (organizationId) => {
  if (!organizationId) return null
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type, owner_id')
    .eq('id', organizationId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { id: data.id, name: data.name, type: data.type, ownerId: data.owner_id } : null
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/organizations/services/organizationsService.test.js
```
Esperado: PASS, 4/4.

---

### Task 8: `profileService.getMyProfile` incluye `organizationId`

**Files:**
- Modify: `frontend/src/modules/auth/services/profileService.js`
- Modify: `frontend/src/modules/auth/services/profileService.test.js`

**Interfaces:**
- Produces: `getMyProfile` ahora devuelve
  `{ role, trainerId, consentAcceptedAt, displayName, organizationId }`.

- [ ] **Step 1: Ajustar el test existente de `getMyProfile`**

Busca el test `'getMyProfile normaliza la fila de profiles'` en
`profileService.test.js` y añade `organization_id` al mock de entrada y
`organizationId` a lo esperado:

```js
it('getMyProfile normaliza la fila de profiles', async () => {
  single.mockResolvedValue({
    data: { role: 'trainer', trainer_id: null, consent_accepted_at: null, display_name: null, organization_id: 'org-1' },
    error: null,
  })
  const profile = await getMyProfile('1')
  expect(profile).toEqual({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null, organizationId: 'org-1' })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
cd frontend && npx vitest run src/modules/auth/services/profileService.test.js
```
Esperado: FAIL — `organizationId` no viene en el resultado todavía.

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/auth/services/profileService.js
const toProfile = (row) => ({
  role: row.role,
  trainerId: row.trainer_id,
  consentAcceptedAt: row.consent_accepted_at,
  displayName: row.display_name,
  organizationId: row.organization_id,
})

export const getMyProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, trainer_id, consent_accepted_at, display_name, organization_id')
    .eq('id', userId)
    .single()
  if (error) throw new Error(error.message)
  return toProfile(data)
}
```

(El resto del archivo — `createTrainerProfile`, `acceptConsent` — no cambia.)

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/auth/services/profileService.test.js
```
Esperado: PASS, todos los casos en verde.

---

### Task 9: `SignUpPage` — selector independiente / organización

**Files:**
- Modify: `frontend/src/modules/auth/hooks/useSignUpForm.jsx`
- Modify: `frontend/src/modules/auth/hooks/useSignUpForm.test.jsx`
- Modify: `frontend/src/modules/auth/components/SignUpPage.jsx`

**Interfaces:**
- Consumes: `createOrganization` de
  `../../organizations/services/organizationsService` (Task 7).
- Produces: `useSignUpForm().submit({ email, password, accountType, organizationName })`
  donde `accountType` es `'trainer' | 'organization'`.

- [ ] **Step 1: Escribir los casos nuevos del test**

Añade al `describe('useSignUpForm', ...)` existente (mockea también
`createOrganization`):

```jsx
// al inicio del archivo, junto a los mocks existentes
vi.mock('../../organizations/services/organizationsService', () => ({ createOrganization: vi.fn() }))
// y el import correspondiente:
import { createOrganization } from '../../organizations/services/organizationsService'

// dentro de beforeEach, añade: createOrganization.mockReset()

it('si accountType es "trainer", NO llama a createOrganization', async () => {
  signUp.mockResolvedValue({ user: { id: 'user-1' } })
  createTrainerProfile.mockResolvedValue(undefined)
  const { result } = renderHook(() => useSignUpForm())

  await act(async () => {
    await result.current.submit({ email: 'a@a.com', password: 'x', accountType: 'trainer' })
  })

  expect(createOrganization).not.toHaveBeenCalled()
  expect(navigateMock).toHaveBeenCalledWith('/consent')
})

it('si accountType es "organization", crea el perfil Y la organización antes de navegar', async () => {
  signUp.mockResolvedValue({ user: { id: 'user-1' } })
  createTrainerProfile.mockResolvedValue(undefined)
  createOrganization.mockResolvedValue('org-1')
  const { result } = renderHook(() => useSignUpForm())

  await act(async () => {
    await result.current.submit({ email: 'a@a.com', password: 'x', accountType: 'organization', organizationName: 'Gimnasio Central' })
  })

  expect(createTrainerProfile).toHaveBeenCalledWith('user-1')
  expect(createOrganization).toHaveBeenCalledWith('Gimnasio Central')
  expect(navigateMock).toHaveBeenCalledWith('/consent')
})

it('si accountType es "organization" y falla createOrganization, expone el error y NO navega', async () => {
  signUp.mockResolvedValue({ user: { id: 'user-1' } })
  createTrainerProfile.mockResolvedValue(undefined)
  createOrganization.mockRejectedValue(new Error('nombre requerido'))
  const { result } = renderHook(() => useSignUpForm())

  await act(async () => {
    await result.current.submit({ email: 'a@a.com', password: 'x', accountType: 'organization', organizationName: '' })
  })

  expect(navigateMock).not.toHaveBeenCalled()
  expect(result.current.error).toBe('nombre requerido')
})
```

- [ ] **Step 2: Ejecutar y confirmar que fallan los 3 casos nuevos**

```bash
cd frontend && npx vitest run src/modules/auth/hooks/useSignUpForm.test.jsx
```
Esperado: FAIL — `submit` todavía no acepta `accountType`/`organizationName`.

- [ ] **Step 3: Implementar el hook**

```jsx
// frontend/src/modules/auth/hooks/useSignUpForm.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp } from '../services/authService'
import { createTrainerProfile } from '../services/profileService'
import { createOrganization } from '../../organizations/services/organizationsService'

export const useSignUpForm = () => {
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async ({ email, password, accountType, organizationName }) => {
    try {
      const session = await signUp({ email, password })
      await createTrainerProfile(session.user.id)
      if (accountType === 'organization') {
        await createOrganization(organizationName)
      }
      navigate('/consent')
    } catch (err) {
      setError(err.message)
    }
  }

  return { submit, error }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/auth/hooks/useSignUpForm.test.jsx
```
Esperado: PASS, todos los casos en verde.

- [ ] **Step 5: Actualizar `SignUpPage.jsx` con el selector**

```jsx
// frontend/src/modules/auth/components/SignUpPage.jsx
import { useState } from 'react'
import { useSignUpForm } from '../hooks/useSignUpForm'

const isOrganization = (accountType) => accountType === 'organization'

export const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState('trainer')
  const [organizationName, setOrganizationName] = useState('')
  const { submit, error } = useSignUpForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    await submit({ email, password, accountType, organizationName })
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
        {error && <p className="text-red-600">{error}</p>}
        <fieldset className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="accountType" value="trainer" checked={accountType === 'trainer'} onChange={() => setAccountType('trainer')} />
            Entrenador independiente
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="accountType" value="organization" checked={accountType === 'organization'} onChange={() => setAccountType('organization')} />
            Gimnasio o clínica
          </label>
        </fieldset>
        {isOrganization(accountType) && (
          <input type="text" required placeholder="Nombre del gimnasio/clínica" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        )}
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <button type="submit" className="w-full rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Crear cuenta
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 6: Verificación manual en navegador**

```bash
cd frontend && npm run dev
```
Abre `/signup`, elige "Gimnasio o clínica", confirma que aparece el campo
de nombre y que el formulario sigue funcionando para "Entrenador
independiente" sin ese campo.

---

### Task 10: Edge Function `invite-trainer`

**Files:**
- Create: `supabase/functions/invite-trainer/index.ts`

**Interfaces:**
- Consumes: header `Authorization` (JWT del admin), body `{ email: string }`.
- Produces: `200 {ok:true}` / `401` sin token o token inválido / `403` si
  quien llama no es admin de ninguna organización / `400` sin email /
  `409` si el email ya tiene cuenta / `500` si falla el insert.

- [ ] **Step 1: Implementar**

```ts
// supabase/functions/invite-trainer/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Falta el token de autenticación' }, 401)
  }

  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Token inválido' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('id')
    .eq('owner_id', callerData.user.id)
    .maybeSingle()
  if (orgError || !org) {
    return jsonResponse({ error: 'Solo el admin de una organización puede invitar entrenadores' }, 403)
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return jsonResponse({ error: 'Falta el email' }, 400)
  }

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === email)?.id ?? '')
    .maybeSingle()
  if (existing) {
    return jsonResponse({ error: 'Ese email ya tiene cuenta' }, 409)
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
  if (inviteError) {
    return jsonResponse({ error: inviteError.message }, 409)
  }

  const { error: insertError } = await admin
    .from('profiles')
    .insert({ id: invited.user.id, role: 'trainer', trainer_id: null, organization_id: org.id })
  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500)
  }

  return jsonResponse({ ok: true }, 200)
})
```

- [ ] **Step 2: Añadir a `supabase/config.toml`**

```toml
[functions.invite-trainer]
verify_jwt = false
```

- [ ] **Step 3: Desplegar de verdad**

```bash
supabase functions deploy invite-trainer
```

- [ ] **Step 4: Verificación manual con curl** (servidor-a-servidor, para
  confirmar la lógica antes de probar CORS desde navegador en la Task 11)

Crea un trainer-admin de prueba (con `create_organization` ya ejecutado) y
un trainer normal sin organización, obtén sus JWT reales (mismo patrón que
`frontend/test/rls/testUsers.js`), y confirma:
- JWT del admin + email nuevo → `200 {"ok":true}`.
- Mismo email otra vez → `409`.
- Sin `Authorization` → `401`.
- JWT de un entrenador SIN organización → `403`.

Limpia los usuarios de prueba creados al terminar.

---

### Task 11: Invitar entrenador desde el panel — service + hook + UI

**Files:**
- Modify: `frontend/src/modules/organizations/services/organizationsService.js`
- Modify: `frontend/src/modules/organizations/services/organizationsService.test.js`
- Create: `frontend/src/modules/organizations/hooks/useMyOrganization.jsx`
- Create: `frontend/src/modules/organizations/hooks/useInviteTrainerForm.jsx`
- Modify: `frontend/src/modules/trainer/components/TrainerDashboard.jsx`

**Interfaces:**
- Consumes: `getMyOrganization` (Task 7), `useMyProfile` (ya existe,
  ahora con `organizationId`), `useAuthSessionContext` (ya existe).
- Produces: `inviteTrainer(email) => Promise<void>`,
  `useMyOrganization(organizationId, userId) => { organization, isAdmin, isLoading }`,
  `useInviteTrainerForm() => { submit, status }`.

- [ ] **Step 1: Test que falla — `inviteTrainer`**

Añade a `organizationsService.test.js` (necesita `functions: { invoke: vi.fn() }`
en el mock de `supabase` — actualiza el `vi.mock` al inicio del archivo):

```js
// sustituye el vi.mock del inicio del archivo por:
const invoke = vi.fn()
vi.mock('../../core/lib/api', () => ({
  supabase: {
    rpc: (...args) => rpc(...args),
    from: (...args) => from(...args),
    functions: { invoke: (...args) => invoke(...args) },
  },
}))

// nuevos casos, dentro del describe existente:
it('inviteTrainer llama a la Edge Function invite-trainer con el email', async () => {
  invoke.mockResolvedValue({ data: { ok: true }, error: null })
  await inviteTrainer('nuevo@kinovia.test')
  expect(invoke).toHaveBeenCalledWith('invite-trainer', { body: { email: 'nuevo@kinovia.test' } })
})

it('inviteTrainer lanza con el mensaje real extraído de error.context', async () => {
  const context = { clone: () => ({ json: () => Promise.resolve({ error: 'Ese email ya tiene cuenta' }) }) }
  invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context } })
  await expect(inviteTrainer('x@x.com')).rejects.toThrow('Ese email ya tiene cuenta')
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
cd frontend && npx vitest run src/modules/organizations/services/organizationsService.test.js
```
Esperado: FAIL — `inviteTrainer` no existe.

- [ ] **Step 3: Implementar `inviteTrainer`**

```js
// frontend/src/modules/organizations/services/organizationsService.js — añadir
const extractErrorMessage = (error) =>
  typeof error?.context?.clone === 'function'
    ? error.context.clone().json().then((body) => body?.error ?? error.message, () => error.message)
    : Promise.resolve(error.message)

export const inviteTrainer = async (email) => {
  const { error } = await supabase.functions.invoke('invite-trainer', { body: { email } })
  if (error) throw new Error(await extractErrorMessage(error))
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/organizations/services/organizationsService.test.js
```
Esperado: PASS, todos los casos en verde.

- [ ] **Step 5: `useMyOrganization` hook**

```jsx
// frontend/src/modules/organizations/hooks/useMyOrganization.jsx
import { useEffect, useState } from 'react'
import { getMyOrganization } from '../services/organizationsService'

export const useMyOrganization = (organizationId, userId) => {
  const [organization, setOrganization] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      setOrganization(await getMyOrganization(organizationId))
      setIsLoading(false)
    }
    load()
  }, [organizationId])

  const isAdmin = Boolean(organization && organization.ownerId === userId)
  return { organization, isAdmin, isLoading }
}
```

- [ ] **Step 6: `useInviteTrainerForm` hook**

```jsx
// frontend/src/modules/organizations/hooks/useInviteTrainerForm.jsx
import { useState } from 'react'
import { inviteTrainer } from '../services/organizationsService'

export const useInviteTrainerForm = () => {
  const [status, setStatus] = useState(null)

  const submit = async (email) => {
    setStatus(null)
    try {
      await inviteTrainer(email)
      setStatus({ type: 'success', message: `Invitación enviada a ${email}` })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
```

- [ ] **Step 7: Sección de admin en `TrainerDashboard.jsx`**

```jsx
// frontend/src/modules/trainer/components/TrainerDashboard.jsx
import { useState } from 'react'
import { useInviteClientForm } from '../hooks/useInviteClientForm'
import { useAuthSessionContext } from '../../auth/context/AuthSessionContext'
import { useMyProfile } from '../../auth/hooks/useMyProfile'
import { useMyOrganization } from '../../organizations/hooks/useMyOrganization'
import { useInviteTrainerForm } from '../../organizations/hooks/useInviteTrainerForm'

const InviteTrainerSection = () => {
  const [email, setEmail] = useState('')
  const { submit, status } = useInviteTrainerForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(email)
    if (success) setEmail('')
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold">Invitar entrenador a tu organización</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex max-w-sm gap-2">
        <input type="email" required placeholder="Email del entrenador" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Invitar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
    </section>
  )
}

export const TrainerDashboard = () => {
  const [email, setEmail] = useState('')
  const { submit, status } = useInviteClientForm()
  const { session } = useAuthSessionContext()
  const { profile } = useMyProfile(session?.user?.id)
  const { organization, isAdmin } = useMyOrganization(profile?.organizationId, session?.user?.id)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(email)
    if (success) setEmail('')
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Panel del entrenador</h1>
      {organization && <p className="mt-1 text-neutral-500">{organization.name}</p>}
      <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm gap-2">
        <input type="email" required placeholder="Email del cliente" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Invitar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
      {isAdmin && <InviteTrainerSection />}
    </main>
  )
}
```

- [ ] **Step 8: Verificación manual en navegador**

```bash
cd frontend && npm run dev
```
Regístrate como organización, confirma que el panel muestra el nombre del
gimnasio y la sección "Invitar entrenador a tu organización" — y que un
entrenador independiente (sin organización) NO la ve.

---

### Task 12: Ampliar el test de aislamiento RLS (organizaciones) + `rls-reviewer`

**Files:**
- Create: `frontend/test/rls/organizations.rls.test.js`
- Modify: `frontend/test/rls/testUsers.js`

**Interfaces:**
- `createTestUser({ label, role, trainerId, organizationId })` — añade el
  parámetro opcional `organizationId`, sin cambiar el comportamiento
  existente si se omite.

- [ ] **Step 1: Ampliar `createTestUser` para aceptar `organizationId`**

```js
// frontend/test/rls/testUsers.js — reemplaza createTestUser
export const createTestUser = async ({ label, role, trainerId, organizationId }) => {
  const email = randomEmail(label)
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: data.user.id, role, trainer_id: trainerId ?? null, organization_id: organizationId ?? null, display_name: label })
  if (profileError) throw profileError

  return { id: data.user.id, email }
}
```

(El resto del archivo — `adminClient`, `signInAs`, `deleteTestUser` — no
cambia.)

- [ ] **Step 2: Escribir el test de organizaciones**

```js
// frontend/test/rls/organizations.rls.test.js
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('organizations RLS', () => {
  let adminA
  let orgAId
  let trainerInA
  let trainerIndependent

  beforeAll(async () => {
    adminA = await createTestUser({ label: 'org-admin-a', role: 'trainer' })
    const asAdminA = await signInAs(adminA.email)
    const { data: newOrgId, error } = await asAdminA.rpc('create_organization', { org_name: 'Gimnasio de prueba A', org_type: 'gym' })
    if (error) throw error
    orgAId = newOrgId

    trainerInA = await createTestUser({ label: 'org-trainer-in-a', role: 'trainer', organizationId: orgAId })
    trainerIndependent = await createTestUser({ label: 'org-trainer-independent', role: 'trainer' })
  })

  afterAll(async () => {
    await Promise.all([adminA, trainerInA, trainerIndependent].filter(Boolean).map((user) => deleteTestUser(user.id)))
    if (orgAId) await adminClient.from('organizations').delete().eq('id', orgAId)
  })

  it('create_organization() deja al que llama como owner_id y le asigna organization_id', async () => {
    const { data: orgRow } = await adminClient.from('organizations').select('owner_id').eq('id', orgAId).single()
    expect(orgRow.owner_id).toBe(adminA.id)

    const { data: adminProfile } = await adminClient.from('profiles').select('organization_id').eq('id', adminA.id).single()
    expect(adminProfile.organization_id).toBe(orgAId)
  })

  it('un entrenador de la organización ve la organización (nombre)', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { data, error } = await asTrainerInA.from('organizations').select('name').eq('id', orgAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('un entrenador independiente NO ve una organización ajena', async () => {
    const asIndependent = await signInAs(trainerIndependent.email)
    const { data, error } = await asIndependent.from('organizations').select('name').eq('id', orgAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('un entrenador ya con organización NO puede crear otra', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { error } = await asTrainerInA.rpc('create_organization', { org_name: 'Otra', org_type: 'gym' })
    expect(error).not.toBeNull()
  })

  it('ningún entrenador puede insertar una organización directamente (sin política de insert)', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { error } = await asTrainerInA.from('organizations').insert({ name: 'Directo', type: 'gym', owner_id: trainerInA.id })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 3: Ampliar `profiles.rls.test.js` con el directorio del admin**

Añade dentro del `describe('profiles RLS', ...)` existente:

```js
it('el admin de una organización ve el display_name de los clientes de sus entrenadores', async () => {
  const orgAdmin = await createTestUser({ label: 'profiles-org-admin', role: 'trainer' })
  const asOrgAdmin = await signInAs(orgAdmin.email)
  const { data: orgId } = await asOrgAdmin.rpc('create_organization', { org_name: 'Gimnasio profiles test', org_type: 'gym' })

  const orgTrainer = await createTestUser({ label: 'profiles-org-trainer', role: 'trainer', organizationId: orgId })
  const orgClient = await createTestUser({ label: 'profiles-org-client', role: 'client', trainerId: orgTrainer.id })

  const { data, error } = await asOrgAdmin.from('profiles').select('id, display_name').eq('id', orgClient.id)
  expect(error).toBeNull()
  expect(data).toHaveLength(1)
  expect(data[0].display_name).toBe('profiles-org-client')

  await Promise.all([orgAdmin, orgTrainer, orgClient].map((u) => deleteTestUser(u.id)))
  await adminClient.from('organizations').delete().eq('id', orgId)
})

it('un entrenador que NO es admin de ninguna organización NO ve clientes ajenos vía el directorio', async () => {
  const asTrainerA = await signInAs(trainerA.email)
  const { data, error } = await asTrainerA.from('profiles').select('id').eq('id', clientOfA.id).neq('trainer_id', trainerA.id)
  expect(error).toBeNull()
  expect(data).toHaveLength(0)
})
```

- [ ] **Step 4: Ejecutar toda la suite RLS**

```bash
cd frontend && npx vitest run test/rls/
```
Esperado: todos los tests, previos y nuevos, en verde.

- [ ] **Step 5: Dispatch obligatorio de `rls-reviewer`**

Sobre las migraciones de la Pieza 1 completa
(`organizations.sql`, `create_organization_function.sql`,
`profiles_organization_id.sql`) y los dos archivos de test de esta tarea —
confirma en concreto: (a) que `create_organization()` no permite que un
entrenador con organización cree una segunda, (b) que la política
`profiles_select_org_admin_clients` no puede usarse para ver clientes de
una organización ajena, (c) que no hay ningún camino de INSERT directo
sobre `organizations` desde `authenticated`.

---

## Pieza 2 — Reasignar cliente al despedir a un entrenador

### Task 13: Migración — función `reassign_client()` (SECURITY DEFINER)

**Files:**
- Create: `supabase/migrations/20260803094000_reassign_client_function.sql`

**Interfaces:**
- Produces: `reassign_client(target_client_id uuid, new_trainer_id uuid) returns void`.

- [ ] **Step 1: Escribir la migración**

```sql
-- Única vía de cambiar el trainer_id de un cliente ajeno: el admin de la
-- organización reasigna explícitamente (acción puntual y auditable, no
-- visibilidad permanente — decisión de brainstorming del 3 de agosto de
-- 2026). Nunca un UPDATE directo desde el frontend sobre trainer_id de
-- otro usuario.
create or replace function public.reassign_client(target_client_id uuid, new_trainer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_org_id uuid;
  client_belongs_to_org boolean;
  new_trainer_belongs_to_org boolean;
begin
  select id into caller_org_id from public.organizations where owner_id = auth.uid();
  if caller_org_id is null then
    raise exception 'Solo el admin de una organización puede reasignar clientes';
  end if;

  select exists (
    select 1
    from public.profiles client
    join public.profiles trainer on trainer.id = client.trainer_id
    where client.id = target_client_id
      and client.role = 'client'
      and trainer.organization_id = caller_org_id
  ) into client_belongs_to_org;
  if not client_belongs_to_org then
    raise exception 'El cliente no pertenece a un entrenador de tu organización';
  end if;

  select exists (
    select 1 from public.profiles
    where id = new_trainer_id and role = 'trainer' and organization_id = caller_org_id
  ) into new_trainer_belongs_to_org;
  if not new_trainer_belongs_to_org then
    raise exception 'El entrenador destino no pertenece a tu organización';
  end if;

  update public.profiles set trainer_id = new_trainer_id where id = target_client_id;
end;
$$;

grant execute on function public.reassign_client(uuid, uuid) to authenticated;
revoke execute on function public.reassign_client(uuid, uuid) from public;
```

- [ ] **Step 2: Aplicar**

```bash
supabase db push
```

---

### Task 14: `organizationsService` — listar clientes por entrenador + reasignar

**Files:**
- Modify: `frontend/src/modules/organizations/services/organizationsService.js`
- Modify: `frontend/src/modules/organizations/services/organizationsService.test.js`

**Interfaces:**
- Produces: `listOrganizationClients() => Promise<Array<{id, displayName, trainerId}>>`,
  `reassignClient(clientId, newTrainerId) => Promise<void>`.

- [ ] **Step 1: Escribir los tests que fallan**

Añade al mock de `from` para soportar `.select().eq()` sin filtros extra
(reutiliza el `select`/`eq` ya definidos si el shape encaja; si no, añade
uno dedicado) y estos casos:

```js
it('listOrganizationClients devuelve los clientes normalizados', async () => {
  // ajusta el mock de "from" para que, en este caso concreto, la cadena
  // .select('id, display_name, trainer_id').eq('role','client') resuelva:
  eq.mockResolvedValueOnce({ data: [{ id: 'c1', display_name: 'Cliente Uno', trainer_id: 't1' }], error: null })
  const clients = await listOrganizationClients()
  expect(clients).toEqual([{ id: 'c1', displayName: 'Cliente Uno', trainerId: 't1' }])
})

it('reassignClient llama a la función reassign_client con los ids', async () => {
  rpc.mockResolvedValue({ data: null, error: null })
  await reassignClient('c1', 't2')
  expect(rpc).toHaveBeenCalledWith('reassign_client', { target_client_id: 'c1', new_trainer_id: 't2' })
})

it('reassignClient lanza con el mensaje de Supabase si falla', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'el entrenador destino no pertenece a tu organización' } })
  await expect(reassignClient('c1', 't2')).rejects.toThrow('el entrenador destino no pertenece a tu organización')
})
```

Si el mock existente de `eq`/`select` no encaja limpiamente con la llamada
de `listOrganizationClients` (que no filtra por `id` sino por `role`),
ajusta el mock compartido al inicio del archivo para que `select` devuelva
un objeto con `eq` que resuelva directamente a `{data, error}` (sin
encadenar más), documentando el cambio en un comentario corto si hace
falta reestructurar el mock.

- [ ] **Step 2: Ejecutar y confirmar que fallan**

```bash
cd frontend && npx vitest run src/modules/organizations/services/organizationsService.test.js
```

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/organizations/services/organizationsService.js — añadir
export const listOrganizationClients = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, trainer_id')
    .eq('role', 'client')
  if (error) throw new Error(error.message)
  return data.map((row) => ({ id: row.id, displayName: row.display_name, trainerId: row.trainer_id }))
}

export const reassignClient = async (clientId, newTrainerId) => {
  const { error } = await supabase.rpc('reassign_client', { target_client_id: clientId, new_trainer_id: newTrainerId })
  if (error) throw new Error(error.message)
}
```

(La RLS de `profiles_select_org_admin_clients` ya limita el resultado de
`listOrganizationClients` a los clientes de la organización de quien
llama — no hace falta filtrar nada más en el service.)

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/organizations/services/organizationsService.test.js
```
Esperado: PASS, todos los casos en verde.

---

### Task 15: UI — reasignar cliente desde el panel del admin

**Files:**
- Create: `frontend/src/modules/organizations/hooks/useReassignClientForm.jsx`
- Create: `frontend/src/modules/organizations/hooks/useOrganizationClients.jsx`
- Modify: `frontend/src/modules/trainer/components/TrainerDashboard.jsx`

**Interfaces:**
- Consumes: `listOrganizationClients`, `reassignClient` (Task 14).
- Produces: `useOrganizationClients() => { clients, isLoading }`,
  `useReassignClientForm() => { submit, status }`.

- [ ] **Step 1: `useOrganizationClients` hook**

```jsx
// frontend/src/modules/organizations/hooks/useOrganizationClients.jsx
import { useEffect, useState } from 'react'
import { listOrganizationClients } from '../services/organizationsService'

export const useOrganizationClients = (isAdmin) => {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      setClients(await listOrganizationClients())
      setIsLoading(false)
    }
    load()
  }, [isAdmin])

  return { clients, isLoading }
}
```

- [ ] **Step 2: `useReassignClientForm` hook**

```jsx
// frontend/src/modules/organizations/hooks/useReassignClientForm.jsx
import { useState } from 'react'
import { reassignClient } from '../services/organizationsService'

export const useReassignClientForm = () => {
  const [status, setStatus] = useState(null)

  const submit = async (clientId, newTrainerId) => {
    setStatus(null)
    try {
      await reassignClient(clientId, newTrainerId)
      setStatus({ type: 'success', message: 'Cliente reasignado' })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
```

- [ ] **Step 3: Sección en `TrainerDashboard.jsx`**

```jsx
// frontend/src/modules/trainer/components/TrainerDashboard.jsx — añade este bloque
// (importa useOrganizationClients y useReassignClientForm junto a los ya existentes)
import { useOrganizationClients } from '../../organizations/hooks/useOrganizationClients'
import { useReassignClientForm } from '../../organizations/hooks/useReassignClientForm'

const ReassignClientSection = ({ isAdmin }) => {
  const { clients } = useOrganizationClients(isAdmin)
  const [clientId, setClientId] = useState('')
  const [newTrainerId, setNewTrainerId] = useState('')
  const { submit, status } = useReassignClientForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(clientId, newTrainerId)
    if (success) {
      setClientId('')
      setNewTrainerId('')
    }
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold">Reasignar cliente</h2>
      <ul className="mt-4 space-y-1 text-sm text-neutral-600">
        {clients.map((client) => (
          <li key={client.id}>{client.displayName} — entrenador actual: {client.trainerId}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="mt-4 flex max-w-lg gap-2">
        <input type="text" required placeholder="ID del cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <input type="text" required placeholder="ID del nuevo entrenador" value={newTrainerId} onChange={(e) => setNewTrainerId(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#5B7B6B] px-4 py-2 text-sm font-semibold text-white">
          Reasignar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
    </section>
  )
}
```

Y dentro de `TrainerDashboard`, junto a `{isAdmin && <InviteTrainerSection />}`:

```jsx
{isAdmin && <InviteTrainerSection />}
{isAdmin && <ReassignClientSection isAdmin={isAdmin} />}
```

Nota deliberada de esta tarea: los campos son IDs en bruto (sin buscador
de nombre ni desplegable) — coincide con el resto del proyecto ("no se
pule ninguna pantalla antes de validar demanda", `CLAUDE.md` §0.0). Sirve
para probar que el flujo funciona de verdad, no para uso diario todavía.

- [ ] **Step 4: Verificación manual en navegador**

```bash
cd frontend && npm run dev
```
Como admin de una organización con al menos un entrenador y un cliente de
prueba, confirma que la lista aparece y que reasignar un cliente a otro
entrenador de la misma organización funciona.

---

### Task 16: Test de `reassign_client()` + `rls-reviewer`

**Files:**
- Create: `frontend/test/rls/reassignClient.rls.test.js`

**Interfaces:**
- Consumes: `adminClient`, `createTestUser`, `signInAs`, `deleteTestUser`.

- [ ] **Step 1: Escribir el test**

```js
// frontend/test/rls/reassignClient.rls.test.js
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('reassign_client() RLS', () => {
  let orgAdmin
  let orgId
  let trainerOne
  let trainerTwo
  let client
  let outsideTrainer

  beforeAll(async () => {
    orgAdmin = await createTestUser({ label: 'reassign-admin', role: 'trainer' })
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { data: newOrgId } = await asOrgAdmin.rpc('create_organization', { org_name: 'Gimnasio reasignación', org_type: 'gym' })
    orgId = newOrgId

    trainerOne = await createTestUser({ label: 'reassign-trainer-one', role: 'trainer', organizationId: orgId })
    trainerTwo = await createTestUser({ label: 'reassign-trainer-two', role: 'trainer', organizationId: orgId })
    client = await createTestUser({ label: 'reassign-client', role: 'client', trainerId: trainerOne.id })
    outsideTrainer = await createTestUser({ label: 'reassign-outside-trainer', role: 'trainer' })
  })

  afterAll(async () => {
    await Promise.all(
      [orgAdmin, trainerOne, trainerTwo, client, outsideTrainer].filter(Boolean).map((u) => deleteTestUser(u.id)),
    )
    if (orgId) await adminClient.from('organizations').delete().eq('id', orgId)
  })

  it('el admin reasigna el cliente de un entrenador a otro de la misma organización', async () => {
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { error } = await asOrgAdmin.rpc('reassign_client', { target_client_id: client.id, new_trainer_id: trainerTwo.id })
    expect(error).toBeNull()

    const { data: row } = await adminClient.from('profiles').select('trainer_id').eq('id', client.id).single()
    expect(row.trainer_id).toBe(trainerTwo.id)
  })

  it('falla si el entrenador destino es de OTRA organización', async () => {
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { error } = await asOrgAdmin.rpc('reassign_client', { target_client_id: client.id, new_trainer_id: outsideTrainer.id })
    expect(error).not.toBeNull()
  })

  it('falla si quien llama NO es admin de ninguna organización', async () => {
    const asTrainerOne = await signInAs(trainerOne.email)
    const { error } = await asTrainerOne.rpc('reassign_client', { target_client_id: client.id, new_trainer_id: trainerTwo.id })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run test/rls/reassignClient.rls.test.js
```
Esperado: PASS, 3/3.

- [ ] **Step 3: Dispatch obligatorio de `rls-reviewer`**

Sobre `supabase/migrations/20260803094000_reassign_client_function.sql` y
este test — confirma en concreto que no hay forma de reasignar un cliente
a un entrenador fuera de la organización de quien llama, ni de que alguien
que no sea `organizations.owner_id` ejecute la función con éxito.

---

## Pieza 3 — Rutinas estándar compartidas

### Task 17: Migración — `plan_templates` gana modo organización

**Files:**
- Create: `supabase/migrations/20260803095500_plan_templates_organization.sql`

**Interfaces:**
- Produces: columnas nuevas en `plan_templates`
  (`organization_id`, `status`, `created_by`), constraint `template_owner`.

- [ ] **Step 1: Escribir la migración**

```sql
-- plan_templates gana un segundo modo: plantilla COMPARTIDA de una
-- organización (rutina estándar para clientes sin entrenador personal),
-- en vez de personal de un entrenador. Nunca las dos cosas a la vez.
alter table public.plan_templates
  add column organization_id uuid references public.organizations (id) on delete cascade,
  add column status text not null default 'published' check (status in ('draft', 'published')),
  add column created_by uuid references public.profiles (id);

-- Las filas ya existentes son todas personales (trainer_id set); rellena
-- created_by con el propio trainer_id para no dejar nulos en filas viejas.
update public.plan_templates set created_by = trainer_id where created_by is null;
alter table public.plan_templates alter column created_by set not null;

-- trainer_id deja de ser NOT NULL: una plantilla de organización no tiene
-- trainer_id, solo organization_id.
alter table public.plan_templates alter column trainer_id drop not null;

alter table public.plan_templates add constraint template_owner check (
  (trainer_id is not null and organization_id is null) or
  (trainer_id is null and organization_id is not null)
);

create index plan_templates_organization_id_idx on public.plan_templates (organization_id);
```

- [ ] **Step 2: Aplicar**

```bash
supabase db push
```

---

### Task 18: Migración — RLS de `plan_templates` para organización

**Files:**
- Create: `supabase/migrations/20260803100000_plan_templates_organization_rls.sql`

**Interfaces:**
- Produces: políticas nuevas de `select`/`insert`/`update` sobre
  `plan_templates` para el caso de organización.

- [ ] **Step 1: Escribir la migración**

```sql
-- Lectura: cualquier entrenador de la organización ve TODAS las plantillas
-- de esa organización (draft incluido, para poder revisarlas); un cliente
-- de esa organización SOLO ve las ya publicadas.
create policy plan_templates_select_organization
  on public.plan_templates
  for select
  to authenticated
  using (
    organization_id is not null
    and (
      organization_id in (
        select organization_id from public.profiles
        where id = (select auth.uid ()) and role = 'trainer' and organization_id is not null
      )
      or (
        status = 'published'
        and organization_id in (
          select organization_id from public.profiles
          where id = (select auth.uid ()) and role = 'client' and organization_id is not null
        )
      )
    )
  );

-- Creación: cualquier entrenador de la organización puede proponer una
-- plantilla estándar — nace SIEMPRE en draft (with check lo fuerza, nunca
-- se puede insertar ya publicada).
create policy plan_templates_insert_organization
  on public.plan_templates
  for insert
  to authenticated
  with check (
    trainer_id is null
    and status = 'draft'
    and created_by = (select auth.uid ())
    and organization_id in (
      select organization_id from public.profiles
      where id = (select auth.uid ()) and role = 'trainer' and organization_id is not null
    )
  );

-- Edición: quien la propuso puede seguir editando el CONTENIDO mientras
-- siga en draft. Solo el admin (organizations.owner_id) puede publicarla
-- o editar una ya publicada.
create policy plan_templates_update_organization_creator_draft
  on public.plan_templates
  for update
  to authenticated
  using (
    organization_id is not null
    and status = 'draft'
    and created_by = (select auth.uid ())
  )
  with check (
    organization_id is not null
    and status = 'draft'
    and created_by = (select auth.uid ())
  );

create policy plan_templates_update_organization_admin
  on public.plan_templates
  for update
  to authenticated
  using (
    organization_id in (select id from public.organizations where owner_id = (select auth.uid ()))
  )
  with check (
    organization_id in (select id from public.organizations where owner_id = (select auth.uid ()))
  );
```

- [ ] **Step 2: Aplicar**

```bash
supabase db push
```

---

### Task 19: `planTemplatesService` — rutinas estándar (crear, listar, publicar)

> **Nota (3 agosto 2026, ajustada tras la revisión de la Task 17):** la
> columna `plan_templates.trainer_id` tiene `default auth.uid()` (Task 3,
> `20260803090500_plan_templates_trainer_id_default.sql`, para que
> `createTemplate` no tuviera que mandarlo a mano). Si `createOrganizationTemplate`
> inserta solo `{ organization_id, name, content, status }` sin anular ese
> default, `trainer_id` se rellenaría igualmente con `auth.uid()` — dejando
> AMBAS columnas set y violando el constraint `template_owner` (que exige
> exactamente una de las dos). El `insert` de abajo ya incluye
> `trainer_id: null` explícito para anular el default; el código y el test
> de este brief ya reflejan el arreglo, no como en la primera versión.

**Files:**
- Modify: `frontend/src/modules/plan-templates/services/planTemplatesService.js`
- Modify: `frontend/src/modules/plan-templates/services/planTemplatesService.test.js`

**Interfaces:**
- Produces: `createOrganizationTemplate({ organizationId, name, content }) => Promise<{id, name, content, status}>`,
  `listOrganizationTemplates(organizationId) => Promise<Array<{id, name, content, status, createdBy}>>`,
  `publishTemplate(templateId) => Promise<void>`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// añadir al describe('planTemplatesService', ...) existente
it('createOrganizationTemplate inserta con organization_id, status draft y trainer_id anulado', async () => {
  single.mockResolvedValue({
    data: { id: 'ot1', name: 'Rutina estándar', content: { fases: [] }, status: 'draft' },
    error: null,
  })
  const template = await createOrganizationTemplate({ organizationId: 'org-1', name: 'Rutina estándar', content: { fases: [] } })
  expect(insert).toHaveBeenCalledWith({ organization_id: 'org-1', trainer_id: null, name: 'Rutina estándar', content: { fases: [] }, status: 'draft' })
  expect(template).toEqual({ id: 'ot1', name: 'Rutina estándar', content: { fases: [] }, status: 'draft' })
})

it('listOrganizationTemplates devuelve la lista normalizada', async () => {
  // ajusta el mock de "select" para que .eq('organization_id', ...) resuelva
  // { data: [{ id, name, content, status, created_by }], error: null }
  const templates = await listOrganizationTemplates('org-1')
  expect(Array.isArray(templates)).toBe(true)
})

it('publishTemplate actualiza el status a published', async () => {
  const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
  from.mockReturnValueOnce({ update })
  await publishTemplate('ot1')
  expect(update).toHaveBeenCalledWith({ status: 'published' })
})
```

Ajusta los mocks compartidos al inicio del archivo (`select`, `insert`,
`from`) lo mínimo necesario para que estas cadenas resuelvan — documenta
con un comentario corto cualquier reestructuración del mock compartido,
igual que en la Task 14.

- [ ] **Step 2: Ejecutar y confirmar que fallan**

```bash
cd frontend && npx vitest run src/modules/plan-templates/services/planTemplatesService.test.js
```

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/plan-templates/services/planTemplatesService.js — añadir
const toOrganizationTemplate = (row) => ({
  id: row.id,
  name: row.name,
  content: row.content,
  status: row.status,
  createdBy: row.created_by,
})

export const createOrganizationTemplate = async ({ organizationId, name, content }) => {
  const { data, error } = await supabase
    .from('plan_templates')
    // trainer_id: null anula el default auth.uid() de la columna (Task 3) —
    // sin esto, el insert dejaría trainer_id Y organization_id set a la vez,
    // violando el constraint template_owner (Task 17).
    .insert({ organization_id: organizationId, trainer_id: null, name, content, status: 'draft' })
    .select('id, name, content, status')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listOrganizationTemplates = async (organizationId) => {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, name, content, status, created_by')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map(toOrganizationTemplate)
}

export const publishTemplate = async (templateId) => {
  const { error } = await supabase
    .from('plan_templates')
    .update({ status: 'published' })
    .eq('id', templateId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run src/modules/plan-templates/services/planTemplatesService.test.js
```
Esperado: PASS, todos los casos en verde.

---

### Task 20: UI — proponer y publicar rutinas estándar (panel del entrenador/admin)

**Files:**
- Create: `frontend/src/modules/plan-templates/hooks/useOrganizationTemplates.jsx`
- Create: `frontend/src/modules/plan-templates/hooks/useCreateOrganizationTemplateForm.jsx`
- Create: `frontend/src/modules/plan-templates/hooks/usePublishTemplateAction.jsx`
- Modify: `frontend/src/modules/trainer/components/TrainerDashboard.jsx`

**Interfaces:**
- Consumes: `createOrganizationTemplate`, `listOrganizationTemplates`,
  `publishTemplate` (Task 19).

- [ ] **Step 1: Hooks**

```jsx
// frontend/src/modules/plan-templates/hooks/useOrganizationTemplates.jsx
import { useEffect, useState } from 'react'
import { listOrganizationTemplates } from '../services/planTemplatesService'

export const useOrganizationTemplates = (organizationId, refreshKey) => {
  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      setTemplates(await listOrganizationTemplates(organizationId))
      setIsLoading(false)
    }
    load()
  }, [organizationId, refreshKey])

  return { templates, isLoading }
}
```

```jsx
// frontend/src/modules/plan-templates/hooks/useCreateOrganizationTemplateForm.jsx
import { useState } from 'react'
import { createOrganizationTemplate } from '../services/planTemplatesService'

const PLACEHOLDER_CONTENT = { fases: [{ nombre: 'Fase 1', dias: [] }] }

export const useCreateOrganizationTemplateForm = (organizationId) => {
  const [status, setStatus] = useState(null)

  const submit = async (name) => {
    setStatus(null)
    try {
      await createOrganizationTemplate({ organizationId, name, content: PLACEHOLDER_CONTENT })
      setStatus({ type: 'success', message: `"${name}" creada como borrador` })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
```

```jsx
// frontend/src/modules/plan-templates/hooks/usePublishTemplateAction.jsx
import { useState } from 'react'
import { publishTemplate } from '../services/planTemplatesService'

export const usePublishTemplateAction = () => {
  const [status, setStatus] = useState(null)

  const publish = async (templateId) => {
    setStatus(null)
    try {
      await publishTemplate(templateId)
      setStatus({ type: 'success', message: 'Rutina publicada' })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { publish, status }
}
```

Nota deliberada: `PLACEHOLDER_CONTENT` es un JSONB mínimo fijo, no un
editor de plantillas — coincide con `CLAUDE.md` §0.0 ("no se pule el
editor de plantillas sin validar demanda"). El objetivo de esta pieza es
el modelo de datos y el flujo draft/publish, no la experiencia de edición.

- [ ] **Step 2: Sección en `TrainerDashboard.jsx`**

```jsx
// frontend/src/modules/trainer/components/TrainerDashboard.jsx — añade
import { useState as useStateAlias } from 'react' // si "useState" ya está importado arriba, omite esta línea y reusa el existente
import { useOrganizationTemplates } from '../../plan-templates/hooks/useOrganizationTemplates'
import { useCreateOrganizationTemplateForm } from '../../plan-templates/hooks/useCreateOrganizationTemplateForm'
import { usePublishTemplateAction } from '../../plan-templates/hooks/usePublishTemplateAction'

const StandardRoutinesSection = ({ organizationId, isAdmin }) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { templates } = useOrganizationTemplates(organizationId, refreshKey)
  const [name, setName] = useState('')
  const { submit, status: createStatus } = useCreateOrganizationTemplateForm(organizationId)
  const { publish, status: publishStatus } = usePublishTemplateAction()

  const handleCreate = async (event) => {
    event.preventDefault()
    const success = await submit(name)
    if (success) {
      setName('')
      setRefreshKey((key) => key + 1)
    }
  }

  const handlePublish = async (templateId) => {
    const success = await publish(templateId)
    if (success) setRefreshKey((key) => key + 1)
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold">Rutinas estándar del gimnasio</h2>
      <form onSubmit={handleCreate} className="mt-4 flex max-w-sm gap-2">
        <input type="text" required placeholder="Nombre de la rutina" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Proponer
        </button>
      </form>
      {createStatus && (
        <p className={createStatus.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{createStatus.message}</p>
      )}
      <ul className="mt-4 space-y-2">
        {templates.map((template) => (
          <li key={template.id} className="flex items-center gap-3 text-sm">
            <span>{template.name} — {template.status}</span>
            {isAdmin && template.status === 'draft' && (
              <button type="button" onClick={() => handlePublish(template.id)} className="rounded bg-[#5B7B6B] px-2 py-1 text-xs font-semibold text-white">
                Publicar
              </button>
            )}
          </li>
        ))}
      </ul>
      {publishStatus && (
        <p className={publishStatus.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{publishStatus.message}</p>
      )}
    </section>
  )
}
```

Y en `TrainerDashboard`, visible para CUALQUIER entrenador de una
organización (no solo el admin — cualquiera puede proponer, según el
spec):

```jsx
{profile?.organizationId && <StandardRoutinesSection organizationId={profile.organizationId} isAdmin={isAdmin} />}
```

- [ ] **Step 3: Verificación manual en navegador**

```bash
cd frontend && npm run dev
```
Como entrenador de una organización, propone una rutina (aparece
`draft`); como admin, confirma que ves el botón "Publicar" y que tras
publicarla pasa a `published`; confirma que un entrenador NO admin no ve
el botón "Publicar".

---

### Task 21: `ClientDashboard` — ver rutinas estándar si no hay entrenador personal

**Files:**
- Create: `frontend/src/modules/client/hooks/useStandardRoutines.jsx`
- Modify: `frontend/src/modules/client/components/ClientDashboard.jsx`

**Interfaces:**
- Consumes: `listOrganizationTemplates` (Task 19),
  `useAuthSessionContext`, `useMyProfile` (ya existen).

- [ ] **Step 1: Hook**

```jsx
// frontend/src/modules/client/hooks/useStandardRoutines.jsx
import { useEffect, useState } from 'react'
import { listOrganizationTemplates } from '../../plan-templates/services/planTemplatesService'

export const useStandardRoutines = (organizationId, hasPersonalTrainer) => {
  const [routines, setRoutines] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!organizationId || hasPersonalTrainer) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      setRoutines(await listOrganizationTemplates(organizationId))
      setIsLoading(false)
    }
    load()
  }, [organizationId, hasPersonalTrainer])

  return { routines, isLoading }
}
```

(La RLS de `plan_templates_select_organization` ya limita este resultado a
`status = 'published'` para un cliente — el hook no necesita filtrar nada
más.)

- [ ] **Step 2: `ClientDashboard.jsx`**

```jsx
// frontend/src/modules/client/components/ClientDashboard.jsx
import { useAuthSessionContext } from '../../auth/context/AuthSessionContext'
import { useMyProfile } from '../../auth/hooks/useMyProfile'
import { useStandardRoutines } from '../hooks/useStandardRoutines'

export const ClientDashboard = () => {
  const { session } = useAuthSessionContext()
  const { profile } = useMyProfile(session?.user?.id)
  const hasPersonalTrainer = Boolean(profile?.trainerId)
  const { routines } = useStandardRoutines(profile?.organizationId, hasPersonalTrainer)

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Tu plan</h1>
      {hasPersonalTrainer ? (
        <p className="mt-2 text-neutral-600">Todavía no tienes ningún plan asignado.</p>
      ) : (
        <>
          <p className="mt-2 text-neutral-600">No tienes entrenador personal asignado — estas son las rutinas estándar de tu gimnasio:</p>
          <ul className="mt-4 space-y-1">
            {routines.map((routine) => (
              <li key={routine.id} className="text-sm">{routine.name}</li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Verificación manual en navegador**

Con un cliente de organización sin `trainer_id` (creado a mano vía
`adminClient` para la prueba, con `organization_id` set), confirma que
`/client` lista las rutinas `published` de su organización.

---

### Task 22: Test completo de aislamiento — rutinas estándar + `rls-reviewer`

**Files:**
- Create: `frontend/test/rls/planTemplatesOrganization.rls.test.js`

**Interfaces:**
- Consumes: `adminClient`, `createTestUser`, `signInAs`, `deleteTestUser`.

- [ ] **Step 1: Escribir el test**

```js
// frontend/test/rls/planTemplatesOrganization.rls.test.js
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('plan_templates RLS (organización)', () => {
  let orgAdmin
  let orgId
  let orgTrainer
  let clientNoTrainer
  let outsideOrgId
  let outsideTrainer

  beforeAll(async () => {
    orgAdmin = await createTestUser({ label: 'std-org-admin', role: 'trainer' })
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { data: newOrgId } = await asOrgAdmin.rpc('create_organization', { org_name: 'Gimnasio rutinas', org_type: 'gym' })
    orgId = newOrgId

    orgTrainer = await createTestUser({ label: 'std-org-trainer', role: 'trainer', organizationId: orgId })
    clientNoTrainer = await createTestUser({ label: 'std-client-no-trainer', role: 'client', organizationId: orgId })

    outsideTrainer = await createTestUser({ label: 'std-outside-trainer', role: 'trainer' })
    const asOutsideTrainer = await signInAs(outsideTrainer.email)
    const { data: newOutsideOrgId } = await asOutsideTrainer.rpc('create_organization', { org_name: 'Otro gimnasio', org_type: 'gym' })
    outsideOrgId = newOutsideOrgId
  })

  afterAll(async () => {
    await Promise.all(
      [orgAdmin, orgTrainer, clientNoTrainer, outsideTrainer].filter(Boolean).map((u) => deleteTestUser(u.id)),
    )
    if (orgId) await adminClient.from('organizations').delete().eq('id', orgId)
    if (outsideOrgId) await adminClient.from('organizations').delete().eq('id', outsideOrgId)
  })

  it('un entrenador de la organización crea una plantilla estándar en draft', async () => {
    const asOrgTrainer = await signInAs(orgTrainer.email)
    const { data, error } = await asOrgTrainer
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Rutina básica', content: {}, status: 'draft', created_by: orgTrainer.id })
      .select('id, status')
      .single()
    expect(error).toBeNull()
    expect(data.status).toBe('draft')

    await adminClient.from('plan_templates').delete().eq('id', data.id)
  })

  it('un entrenador NO puede insertar ya publicada', async () => {
    const asOrgTrainer = await signInAs(orgTrainer.email)
    const { error } = await asOrgTrainer
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Trampa', content: {}, status: 'published', created_by: orgTrainer.id })
    expect(error).not.toBeNull()
  })

  it('el cliente sin entrenador NO ve una plantilla en draft', async () => {
    const { data: draft } = await adminClient
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Draft oculto', content: {}, status: 'draft', created_by: orgTrainer.id })
      .select('id')
      .single()

    const asClient = await signInAs(clientNoTrainer.email)
    const { data, error } = await asClient.from('plan_templates').select('id').eq('id', draft.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    await adminClient.from('plan_templates').delete().eq('id', draft.id)
  })

  it('el cliente sin entrenador SÍ ve una plantilla published de su organización', async () => {
    const { data: published } = await adminClient
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Publicada', content: {}, status: 'published', created_by: orgTrainer.id })
      .select('id')
      .single()

    const asClient = await signInAs(clientNoTrainer.email)
    const { data, error } = await asClient.from('plan_templates').select('id').eq('id', published.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)

    await adminClient.from('plan_templates').delete().eq('id', published.id)
  })

  it('un entrenador NO admin no puede publicar (cambiar status)', async () => {
    const { data: draft } = await adminClient
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Para publicar', content: {}, status: 'draft', created_by: orgTrainer.id })
      .select('id')
      .single()

    const asOrgTrainer = await signInAs(orgTrainer.email)
    const { data, error } = await asOrgTrainer
      .from('plan_templates')
      .update({ status: 'published' })
      .eq('id', draft.id)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    const { data: realRow } = await adminClient.from('plan_templates').select('status').eq('id', draft.id).single()
    expect(realRow.status).toBe('draft')

    await adminClient.from('plan_templates').delete().eq('id', draft.id)
  })

  it('el admin SÍ puede publicar', async () => {
    const { data: draft } = await adminClient
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Para publicar de verdad', content: {}, status: 'draft', created_by: orgTrainer.id })
      .select('id')
      .single()

    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { error } = await asOrgAdmin.from('plan_templates').update({ status: 'published' }).eq('id', draft.id)
    expect(error).toBeNull()

    const { data: realRow } = await adminClient.from('plan_templates').select('status').eq('id', draft.id).single()
    expect(realRow.status).toBe('published')

    await adminClient.from('plan_templates').delete().eq('id', draft.id)
  })

  it('un entrenador de OTRA organización no ve ninguna plantilla de esta, ni draft ni published', async () => {
    const { data: published } = await adminClient
      .from('plan_templates')
      .insert({ organization_id: orgId, name: 'Cruzada', content: {}, status: 'published', created_by: orgTrainer.id })
      .select('id')
      .single()

    const asOutsideTrainer = await signInAs(outsideTrainer.email)
    const { data, error } = await asOutsideTrainer.from('plan_templates').select('id').eq('id', published.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    await adminClient.from('plan_templates').delete().eq('id', published.id)
  })
})
```

- [ ] **Step 2: Ejecutar toda la suite RLS**

```bash
cd frontend && npx vitest run test/rls/
```
Esperado: todos los tests, de todas las piezas, en verde.

- [ ] **Step 3: Dispatch obligatorio de `rls-reviewer`**

Sobre las dos migraciones de esta pieza
(`plan_templates_organization.sql`, `plan_templates_organization_rls.sql`)
y este test — confirma en concreto: (a) que ningún entrenador puede
publicar una plantilla que no sea de su propia organización, (b) que un
cliente nunca ve una plantilla `draft`, de ninguna organización, (c) que
el `constraint template_owner` cierra cualquier fila con `trainer_id` y
`organization_id` a la vez, o ninguno de los dos.

---

## Pieza final — Escenario de aceptación

### Task 23: Escenario Gherkin — PARADA OBLIGATORIA

**Files:**
- Create: `frontend/test/acceptance/organizaciones.feature`

No lo implementes todavía. Escribe el escenario y preséntaselo a Fernando
para su aprobación explícita antes de seguir con la Task 24 — regla
anti-alucinación, igual que en el plan anterior (`2026-08-01-invitacion-login.md`, Task 2).

- [ ] **Step 1: Redactar el escenario propuesto**

```gherkin
Feature: Organizaciones — alta de gimnasio, invitar entrenador, rutinas estándar

  Scenario: Un entrenador se registra como organización y aparece como admin
    Given no existe ninguna cuenta con el email "admin@mailinator.com"
    When Marta se registra eligiendo "Gimnasio o clínica" con el nombre "Gimnasio Marta" y ese email
    Then Marta ve la pantalla de consentimiento
    When Marta acepta la política de privacidad
    Then Marta ve su panel de entrenador con el nombre "Gimnasio Marta" y la sección para invitar entrenadores

  Scenario: La admin invita a un entrenador y este entra a su organización
    Given Marta es admin de "Gimnasio Marta", autenticada y con consentimiento aceptado
    When Marta invita a "entrenador@mailinator.com" como entrenador de su gimnasio
    Then se crea una invitación pendiente para "entrenador@mailinator.com" asociada a la organización de Marta
    When ese entrenador abre el enlace de invitación y establece su contraseña
    Then ve la pantalla de consentimiento
    When acepta la política de privacidad
    Then ve su panel de entrenador con el nombre "Gimnasio Marta"

  Scenario: Un cliente sin entrenador personal ve la rutina estándar publicada
    Given Marta es admin de "Gimnasio Marta", autenticada y con consentimiento aceptado
    And existe una rutina estándar "Rutina de bienvenida" publicada en su gimnasio
    And existe un cliente de su gimnasio sin entrenador personal asignado
    When ese cliente entra a su cuenta
    Then ve la rutina "Rutina de bienvenida" en su panel

  Scenario: Un entrenador no admin no puede publicar una rutina estándar
    Given un entrenador de "Gimnasio Marta" (no admin), autenticado y con consentimiento aceptado
    And ha propuesto una rutina estándar "Rutina de prueba" (queda en borrador)
    When intenta publicarla él mismo
    Then la acción se rechaza y la rutina sigue en borrador
```

- [ ] **Step 2: Presentar a Fernando y esperar aprobación explícita antes de la Task 24.**

---

### Task 24: Implementar el escenario Gherkin aprobado (Task 23)

**Files:**
- Create: `frontend/test/acceptance/steps/organizaciones.steps.js`

**Interfaces:**
- Consumes: `@cucumber/cucumber`, Playwright, `frontend/test/acceptance/support/world.js`
  y `testAccounts.js` (ya existen, reutilizables — mismo patrón que
  `invitacion-y-consentimiento.steps.js`), `frontend/test/rls/testUsers.js`
  (`createTestUser` con `organizationId` de la Task 12).

- [ ] **Step 1: Traducir cada paso del `.feature` aprobado a Playwright real**,
  sin mocks, contra `npm run dev` y el proyecto Supabase real — mismo
  patrón que `invitacion-y-consentimiento.steps.js` (usar
  `adminClient`/`generateLink` para los `Given` que no son el foco del
  escenario, igual que se hizo allí para no gastar cuota de envío de
  email en pasos que no están probando el envío en sí).

- [ ] **Step 2: Ejecutar contra la app real**

```bash
cd frontend && npm run dev &
npx cucumber-js test/acceptance/organizaciones.feature --import test/acceptance/support --import test/acceptance/steps
```
Esperado: los 4 escenarios en verde.

---

## Autorrevisión del plan (hecha antes de entregarlo)

**Cobertura del spec:** pieza 0 (Tasks 1-3) ✓ · pieza 1 — organizaciones,
admin, invitar entrenadores (Tasks 4-12) ✓ · pieza 2 — reasignar cliente
(Tasks 13-16) ✓ · pieza 3 — rutinas estándar draft/publish (Tasks 17-22) ✓
· escenario Gherkin con parada de aprobación (Tasks 23-24) ✓. El directorio
básico del admin (`display_name`, nunca salud) — cubierto en Task 6 (SQL)
y Task 12 (test). La nota del spec sobre revisar la política del
directorio cuando lleguen datos de salud (Fase 3) queda fuera de este plan
a propósito, tal como dice el propio spec.

**Placeholders:** ninguno — cada step tiene SQL/JS real, sin "TODO" ni
"añadir validación". La única simplificación deliberada y explícita es
`PLACEHOLDER_CONTENT` en Task 20 (JSONB fijo, no editor — documentado en
el propio código y justificado por `CLAUDE.md` §0.0).

**Consistencia de tipos:** `getMyProfile` devuelve
`{role, trainerId, consentAcceptedAt, displayName, organizationId}` desde
la Task 8 en adelante, y así se consume en Tasks 9, 11, 20, 21 — verificado
que ningún sitio usa `organization_id` (snake_case) fuera de
`profileService.js`/`organizationsService.js`/`planTemplatesService.js`
(los únicos puntos que tocan filas crudas de Supabase). `createOrganization`
devuelve un `string` (uuid) en Tasks 7, 9 y 12 de forma consistente.
`reassignClient(clientId, newTrainerId)` mantiene el mismo orden de
argumentos en Tasks 14, 15 y 16.
