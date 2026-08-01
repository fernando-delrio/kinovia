# Alta de entrenador, invitación de cliente y consentimiento — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un entrenador puede registrarse público, aceptar la política de
privacidad, invitar a un cliente por email, y ese cliente puede aceptar la
invitación, poner su contraseña y aceptar la misma política — con guards de
ruta reales, no solo UI decorativa.

**Architecture:** React Router con un `ProtectedRoute` que exige sesión y
consentimiento. Supabase Auth para signup/login/invitación. Una Edge
Function (`invite-client`) con `service_role key` para invitar y crear la
fila `profiles` del cliente, verificando server-side que quien invita es un
`trainer` autenticado. `profiles.consent_accepted_at` como gate único tanto
para entrenador como cliente.

**Tech Stack:** React 19, React Router 7, Supabase (`@supabase/supabase-js`),
Vitest, `@testing-library/react` (nuevo), Deno (Edge Function).

## Global Constraints

- Arrow functions siempre, nunca `function foo() {}` (`CLAUDE.md` §4).
- Componente nunca hace `fetch`; `try/catch` SOLO en el hook; service lanza,
  nunca silencia (`CLAUDE.md` §3, §6).
- Ninguna tabla/columna nueva sin RLS y GRANT explícitos en el mismo commit
  — recordatorio de `ERRORES_APRENDIDOS.md` (2026-07-31): RLS y GRANT son
  capas distintas, `service_role` también necesita GRANT de tabla.
- `service_role key` únicamente en la Edge Function, nunca en el frontend.
- Toda tabla/columna con RLS tocada necesita test de aislamiento
  (`NORMAS_INAMOVIBLES.md` §6) y revisión del subagente `rls-reviewer`.
- El `.feature` de Gherkin lo aprueba Fernando antes de implementar contra
  él (regla anti-alucinación, `NORMAS_INAMOVIBLES.md` §6.3) — Task 2 es un
  punto de parada obligatorio.
- **Nadie hace `git commit` salvo Fernando.** Cada tarea termina con el
  código implementado y probado, cambios en el working tree sin comitear —
  nunca con un commit hecho por un agente.

---

### Task 1: Migración — columna de consentimiento + alta propia del entrenador

**Files:**
- Create: `supabase/migrations/<timestamp>_profiles_consent.sql`

**Interfaces:**
- Produces: columna `profiles.consent_accepted_at` (timestamptz, nullable),
  política `profiles_insert_own_trainer`, GRANT `insert` a `authenticated`.

- [ ] **Step 1: Generar el archivo de migración**

```bash
cd "c:\Users\FeR\OneDrive\Escritorio\full stack\entrenamientos"
supabase migration new profiles_consent
```

- [ ] **Step 2: Escribir la migración**

```sql
-- consent_accepted_at: gate único de política de privacidad, aplica igual
-- a entrenador y cliente (el entrenador también maneja datos de salud de
-- sus clientes, tiene que aceptar la misma política).
alter table public.profiles
  add column consent_accepted_at timestamptz;

-- Alta propia del entrenador: a diferencia del cliente (creado por
-- service_role en la Edge Function), el entrenador se registra público y
-- crea su propia fila. Esta política SOLO permite crear una fila de rol
-- 'trainer' para uno mismo — nunca 'client' (eso sigue exigiendo
-- service_role, ver Task 8). El CHECK client_has_trainer de la migración
-- anterior ya impide guardar un 'trainer' con trainer_id relleno.
create policy profiles_insert_own_trainer
  on public.profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and role = 'trainer'
    and trainer_id is null
  );

-- Sin GRANT insert, ni RLS ni políticas importan — la operación se
-- rechaza antes de llegar a evaluarlas (lección de ERRORES_APRENDIDOS.md).
grant insert on public.profiles to authenticated;
```

- [ ] **Step 3: Aplicar la migración**

```bash
supabase db push
```
Confirma con `y` cuando pregunte. Verifica con `supabase migration list`
que `local` y `remote` coinciden.


---

### Task 2: Escenario de aceptación en Gherkin — PARADA OBLIGATORIA

**Files:**
- Create: `frontend/test/acceptance/invitacion-y-consentimiento.feature`

**Interfaces:**
- Produces: el `.feature` que Task 12 implementa. Ningún task posterior que
  dependa del comportamiento aquí descrito avanza sin aprobación explícita.

- [ ] **Step 1: Escribir el borrador del escenario**

```gherkin
Feature: Alta de entrenador, invitación de cliente y consentimiento

  Scenario: Un entrenador se registra y acepta la política antes de entrar
    Given no existe ninguna cuenta con el email "ana@kinovia.test"
    When Ana se registra como entrenadora con ese email y una contraseña válida
    Then Ana ve la pantalla de consentimiento, no el panel de entrenador
    When Ana acepta la política de privacidad
    Then Ana ve su panel de entrenador

  Scenario: Un entrenador invita a un cliente por email
    Given Ana es una entrenadora autenticada y con consentimiento aceptado
    When Ana invita a "laura@kinovia.test" como cliente
    Then se crea una invitación pendiente para "laura@kinovia.test" asociada a Ana

  Scenario: Un cliente acepta la invitación, pone contraseña y consiente
    Given existe una invitación pendiente para "laura@kinovia.test" de Ana
    When Laura abre el enlace de invitación y establece su contraseña
    Then Laura ve la pantalla de consentimiento, no la vista de cliente
    When Laura acepta la política de privacidad
    Then Laura ve su propia vista de cliente

  Scenario: Un entrenador no puede invitar a alguien que ya tiene cuenta
    Given Ana es una entrenadora autenticada y con consentimiento aceptado
    And ya existe una cuenta de entrenador con el email "bruno@kinovia.test"
    When Ana invita a "bruno@kinovia.test" como cliente
    Then la invitación se rechaza con un mensaje claro
```

- [ ] **Step 2: PARAR — pedir aprobación explícita**

Mensaje literal a Fernando: *"Escenario Gherkin escrito en
`frontend/test/acceptance/invitacion-y-consentimiento.feature`. Necesito tu
aprobación explícita antes de implementar nada contra él — ¿lo apruebas tal
cual, o cambias algo?"* No continuar a Task 3 hasta recibir un "sí" u
cambios ya incorporados y reaprobados.


---

### Task 3: `authService` — signUp, signIn, acceptInvite

**Files:**
- Modify: `frontend/src/modules/auth/services/authService.js`
- Test: `frontend/src/modules/auth/services/authService.test.js`

**Interfaces:**
- Consumes: `supabase` desde `../../core/lib/api` (`createClient` ya
  configurado).
- Produces: `signUp({ email, password }) => Promise<Session>`,
  `signIn({ email, password }) => Promise<Session>`,
  `acceptInvite({ password }) => Promise<User>`. Todas lanzan `Error` con
  `error.message` de Supabase si falla.

- [ ] **Step 1: Instalar dependencias de testing de componentes/hooks**

```bash
cd frontend
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Escribir el test que falla**

```js
// frontend/src/modules/auth/services/authService.test.js
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../core/lib/api', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

import { supabase } from '../../core/lib/api'
import { signUp, signIn, acceptInvite } from './authService'

describe('authService', () => {
  it('signUp devuelve la sesión si Supabase no da error', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: { user: { id: '1' } } }, error: null })
    const session = await signUp({ email: 'a@a.com', password: 'x' })
    expect(session.user.id).toBe('1')
  })

  it('signUp lanza con el mensaje de Supabase si falla', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: null, error: { message: 'ya existe' } })
    await expect(signUp({ email: 'a@a.com', password: 'x' })).rejects.toThrow('ya existe')
  })

  it('signIn devuelve la sesión si Supabase no da error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: '1' } } }, error: null })
    const session = await signIn({ email: 'a@a.com', password: 'x' })
    expect(session.user.id).toBe('1')
  })

  it('acceptInvite devuelve el usuario si Supabase no da error', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: { user: { id: '2' } }, error: null })
    const user = await acceptInvite({ password: 'x' })
    expect(user.id).toBe('2')
  })
})
```

- [ ] **Step 3: Ejecutar y confirmar que falla**

```bash
npx vitest run src/modules/auth/services/authService.test.js
```
Esperado: FAIL — `signUp`/`signIn`/`acceptInvite` no existen todavía.

- [ ] **Step 4: Implementar**

```js
// frontend/src/modules/auth/services/authService.js — añadir a lo existente
export const signUp = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return data.session
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data.session
}

export const acceptInvite = async ({ password }) => {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
  return data.user
}
```

- [ ] **Step 5: Ejecutar y confirmar que pasa**

```bash
npx vitest run src/modules/auth/services/authService.test.js
```
Esperado: PASS, 4/4.


---

### Task 4: `profileService` — perfil propio y aceptar consentimiento

**Files:**
- Create: `frontend/src/modules/auth/services/profileService.js`
- Test: `frontend/src/modules/auth/services/profileService.test.js`

**Interfaces:**
- Consumes: `supabase` desde `../../core/lib/api`.
- Produces: `getMyProfile(userId) => Promise<{ role, trainerId, consentAcceptedAt, displayName }>`,
  `acceptConsent(userId) => Promise<string>` (ISO timestamp).

- [ ] **Step 1: Escribir el test que falla**

```js
// frontend/src/modules/auth/services/profileService.test.js
import { describe, expect, it, vi } from 'vitest'

const single = vi.fn()
const eq = vi.fn(() => ({ single }))
const select = vi.fn(() => ({ eq }))
const updateEq = vi.fn(() => ({ select: () => ({ single }) }))
const update = vi.fn(() => ({ eq: updateEq }))
const from = vi.fn(() => ({ select, update }))

vi.mock('../../core/lib/api', () => ({ supabase: { from: (...args) => from(...args) } }))

import { getMyProfile, acceptConsent } from './profileService'

describe('profileService', () => {
  it('getMyProfile normaliza la fila de profiles', async () => {
    single.mockResolvedValue({
      data: { role: 'trainer', trainer_id: null, consent_accepted_at: null, display_name: null },
      error: null,
    })
    const profile = await getMyProfile('1')
    expect(profile).toEqual({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
  })

  it('getMyProfile lanza con el mensaje de Supabase si falla', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'no encontrado' } })
    await expect(getMyProfile('1')).rejects.toThrow('no encontrado')
  })

  it('acceptConsent devuelve el timestamp guardado', async () => {
    single.mockResolvedValue({ data: { consent_accepted_at: '2026-08-01T00:00:00.000Z' }, error: null })
    const acceptedAt = await acceptConsent('1')
    expect(acceptedAt).toBe('2026-08-01T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run src/modules/auth/services/profileService.test.js
```
Esperado: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/auth/services/profileService.js
import { supabase } from '../../core/lib/api'

const toProfile = (row) => ({
  role: row.role,
  trainerId: row.trainer_id,
  consentAcceptedAt: row.consent_accepted_at,
  displayName: row.display_name,
})

export const getMyProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, trainer_id, consent_accepted_at, display_name')
    .eq('id', userId)
    .single()
  if (error) throw new Error(error.message)
  return toProfile(data)
}

export const acceptConsent = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ consent_accepted_at: new Date().toISOString() })
    .eq('id', userId)
    .select('consent_accepted_at')
    .single()
  if (error) throw new Error(error.message)
  return data.consent_accepted_at
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npx vitest run src/modules/auth/services/profileService.test.js
```
Esperado: PASS, 3/3.


---

### Task 5: `useMyProfile` — hook de perfil + consentimiento

**Files:**
- Create: `frontend/src/modules/auth/hooks/useMyProfile.jsx`
- Test: `frontend/src/modules/auth/hooks/useMyProfile.test.jsx`

**Interfaces:**
- Consumes: `getMyProfile`, `acceptConsent` de `../services/profileService`
  (Task 4).
- Produces: `useMyProfile(userId) => { profile, isLoading, error, accept }`
  donde `profile` es `null` hasta cargar, luego el objeto de
  `getMyProfile`; `accept()` es `async () => void`, actualiza `profile`.

- [ ] **Step 1: Escribir el test que falla**

```jsx
// frontend/src/modules/auth/hooks/useMyProfile.test.jsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../services/profileService', () => ({
  getMyProfile: vi.fn(),
  acceptConsent: vi.fn(),
}))

import { getMyProfile, acceptConsent } from '../services/profileService'
import { useMyProfile } from './useMyProfile'

describe('useMyProfile', () => {
  it('carga el perfil al montar', async () => {
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    const { result } = renderHook(() => useMyProfile('1'))
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.profile.role).toBe('trainer')
  })

  it('accept() actualiza consentAcceptedAt en el estado', async () => {
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    acceptConsent.mockResolvedValue('2026-08-01T00:00:00.000Z')
    const { result } = renderHook(() => useMyProfile('1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.accept() })
    expect(result.current.profile.consentAcceptedAt).toBe('2026-08-01T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run src/modules/auth/hooks/useMyProfile.test.jsx
```
Esperado: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```jsx
// frontend/src/modules/auth/hooks/useMyProfile.jsx
import { useEffect, useState } from 'react'
import { acceptConsent, getMyProfile } from '../services/profileService'

export const useMyProfile = (userId) => {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    const load = async () => {
      try {
        setProfile(await getMyProfile(userId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId])

  const accept = async () => {
    try {
      const consentAcceptedAt = await acceptConsent(userId)
      setProfile((current) => ({ ...current, consentAcceptedAt }))
    } catch (err) {
      setError(err.message)
    }
  }

  return { profile, isLoading, error, accept }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npx vitest run src/modules/auth/hooks/useMyProfile.test.jsx
```
Esperado: PASS, 2/2.


---

### Task 6: `ProtectedRoute` — guard de sesión y consentimiento

**Files:**
- Create: `frontend/src/modules/core/components/ProtectedRoute.jsx`

**Interfaces:**
- Consumes: `useAuthSession` (`modules/auth/hooks/useAuthSession.jsx`,
  existente), `useMyProfile` (Task 5).
- Produces: `<ProtectedRoute />` — úsalo como elemento padre de rutas
  anidadas de React Router (`<Route element={<ProtectedRoute />}>...`).
  Redirige a `/login` sin sesión, a `/consent` sin `consentAcceptedAt`,
  si no renderiza `<Outlet />`.

- [ ] **Step 1: Implementar (sin test unitario — es un componente, no un
  hook; se verifica en Task 12 vía el escenario Gherkin, según convención
  de `CLAUDE.md` §10: "testea el hook, nunca el componente")**

```jsx
// frontend/src/modules/core/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useMyProfile } from '../../auth/hooks/useMyProfile'

const loadingState = (isLoading) => isLoading && <p>Cargando…</p>
const unauthenticated = (session) => !session && <Navigate to="/login" replace />
const needsConsent = (profile) => profile && !profile.consentAcceptedAt && <Navigate to="/consent" replace />

export const ProtectedRoute = () => {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const { profile, isLoading: isProfileLoading } = useMyProfile(session?.user?.id)

  return (
    loadingState(isSessionLoading || (session && isProfileLoading)) ||
    unauthenticated(session) ||
    needsConsent(profile) ||
    <Outlet />
  )
}
```


---

### Task 7: `inviteService` — el entrenador invita a un cliente

**Files:**
- Create: `frontend/src/modules/trainer/services/inviteService.js`
- Test: `frontend/src/modules/trainer/services/inviteService.test.js`

**Interfaces:**
- Consumes: `supabase` desde `../../core/lib/api` (`supabase.functions.invoke`).
- Produces: `inviteClient(email) => Promise<void>`. Lanza `Error` con el
  mensaje de la Edge Function si falla (email duplicado, no autenticado
  como trainer, etc.).

- [ ] **Step 1: Escribir el test que falla**

```js
// frontend/src/modules/trainer/services/inviteService.test.js
import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../../core/lib/api', () => ({ supabase: { functions: { invoke: (...args) => invoke(...args) } } }))

import { inviteClient } from './inviteService'

describe('inviteService', () => {
  it('llama a la Edge Function invite-client con el email', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    await inviteClient('laura@kinovia.test')
    expect(invoke).toHaveBeenCalledWith('invite-client', { body: { email: 'laura@kinovia.test' } })
  })

  it('lanza con el mensaje de error de la función si falla', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'ese email ya tiene cuenta' } })
    await expect(inviteClient('bruno@kinovia.test')).rejects.toThrow('ese email ya tiene cuenta')
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run src/modules/trainer/services/inviteService.test.js
```
Esperado: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/modules/trainer/services/inviteService.js
import { supabase } from '../../core/lib/api'

export const inviteClient = async (email) => {
  const { error } = await supabase.functions.invoke('invite-client', { body: { email } })
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
npx vitest run src/modules/trainer/services/inviteService.test.js
```
Esperado: PASS, 2/2.


---

### Task 8: Edge Function `invite-client`

**Files:**
- Create: `supabase/functions/invite-client/index.ts`

**Interfaces:**
- Consumes: header `Authorization: Bearer <jwt del entrenador>`, body
  `{ email: string }`.
- Produces: `200 { ok: true }` si invita correctamente; `401` sin JWT
  válido; `403` si el JWT no es de un `trainer`; `409` si el email ya tiene
  cuenta (trainer o client de otro entrenador).

- [ ] **Step 1: Implementar**

```ts
// supabase/functions/invite-client/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Falta el token de autenticación' }), { status: 401 })
  }

  // Cliente "como el que llama" — solo para averiguar quién es (auth.uid()),
  // nunca para tocar datos: eso lo hace admin (service_role) más abajo.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()
  if (callerProfileError || callerProfile?.role !== 'trainer') {
    return new Response(JSON.stringify({ error: 'Solo un entrenador puede invitar clientes' }), { status: 403 })
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Falta el email' }), { status: 400 })
  }

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === email)?.id ?? '')
    .maybeSingle()
  if (existing) {
    return new Response(JSON.stringify({ error: 'Ese email ya tiene cuenta' }), { status: 409 })
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), { status: 409 })
  }

  const { error: insertError } = await admin
    .from('profiles')
    .insert({ id: invited.user.id, role: 'client', trainer_id: callerData.user.id })
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

- [ ] **Step 2: Desplegar**

```bash
supabase functions deploy invite-client
```

- [ ] **Step 3: Probar manualmente contra la función real**

```bash
curl -i -X POST "https://cyzvmviafjnswizargwn.supabase.co/functions/v1/invite-client" \
  -H "Authorization: Bearer <JWT_DE_UN_TRAINER_DE_PRUEBA>" \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente-prueba@kinovia.test"}'
```
Esperado: `200 {"ok":true}`. Repetir con el mismo email → `409`.

- [ ] **Step 4: Dispatch obligatorio del subagente `rls-reviewer`**

Motivo: esta función usa `service_role key` y hace insert directo en
`profiles`, exactamente lo que `.claude/agents/rls-reviewer.md` cubre en su
punto 6. Lanzarlo sobre `supabase/functions/invite-client/index.ts` y la
migración de Task 1 antes de dar la tarea por cerrada.


---

### Task 9: Páginas — signup, login, accept-invite, consent, dashboards mínimos

**Files:**
- Create: `frontend/src/modules/auth/components/SignUpPage.jsx`
- Create: `frontend/src/modules/auth/components/LogInPage.jsx`
- Create: `frontend/src/modules/auth/components/AcceptInvitePage.jsx`
- Create: `frontend/src/modules/auth/components/ConsentPage.jsx`
- Create: `frontend/src/modules/trainer/components/TrainerDashboard.jsx`
- Create: `frontend/src/modules/client/components/ClientDashboard.jsx`

**Interfaces:**
- Consumes: `signUp`/`signIn` (Task 3), `acceptInvite` (Task 3),
  `useMyProfile` (Task 5), `inviteClient` (Task 7).
- Produces: un componente exportado por archivo, sin lógica de negocio
  propia (todo delegado a hooks/services) — sin tests unitarios directos,
  cubiertos por Task 12.

- [ ] **Step 1: `SignUpPage`**

```jsx
// frontend/src/modules/auth/components/SignUpPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp } from '../services/authService'

export const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await signUp({ email, password })
      navigate('/consent')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Crea tu cuenta de entrenador</h1>
        {error && <p className="text-red-600">{error}</p>}
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

- [ ] **Step 2: `LogInPage`**

```jsx
// frontend/src/modules/auth/components/LogInPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../services/authService'

export const LogInPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await signIn({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Entrar</h1>
        {error && <p className="text-red-600">{error}</p>}
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <button type="submit" className="w-full rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Entrar
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: `AcceptInvitePage`**

```jsx
// frontend/src/modules/auth/components/AcceptInvitePage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { acceptInvite } from '../services/authService'

export const AcceptInvitePage = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await acceptInvite({ password })
      navigate('/consent')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Elige tu contraseña</h1>
        {error && <p className="text-red-600">{error}</p>}
        <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <button type="submit" className="w-full rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Continuar
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: `ConsentPage`**

```jsx
// frontend/src/modules/auth/components/ConsentPage.jsx
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession'
import { useMyProfile } from '../hooks/useMyProfile'

export const ConsentPage = () => {
  const { session } = useAuthSession()
  const { profile, accept, error } = useMyProfile(session?.user?.id)
  const navigate = useNavigate()

  const handleAccept = async () => {
    await accept()
    navigate(profile?.role === 'trainer' ? '/trainer' : '/client')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Antes de continuar</h1>
        <p className="text-neutral-600">
          Lee la <a href="/privacidad" className="underline">política de privacidad</a> antes de aceptar.
        </p>
        {error && <p className="text-red-600">{error}</p>}
        <button type="button" onClick={handleAccept} className="rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Acepto la política de privacidad
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: `TrainerDashboard` (con formulario de invitar)**

```jsx
// frontend/src/modules/trainer/components/TrainerDashboard.jsx
import { useState } from 'react'
import { inviteClient } from '../services/inviteService'

export const TrainerDashboard = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus(null)
    try {
      await inviteClient(email)
      setStatus({ type: 'success', message: `Invitación enviada a ${email}` })
      setEmail('')
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Panel del entrenador</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm gap-2">
        <input type="email" required placeholder="Email del cliente" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Invitar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
    </main>
  )
}
```

- [ ] **Step 6: `ClientDashboard` (placeholder)**

```jsx
// frontend/src/modules/client/components/ClientDashboard.jsx
export const ClientDashboard = () => (
  <main className="p-8">
    <h1 className="text-2xl font-bold">Tu plan</h1>
    <p className="mt-2 text-neutral-600">Todavía no tienes ningún plan asignado.</p>
  </main>
)
```


---

### Task 10: Rutas en `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: todos los componentes de Task 9, `ProtectedRoute` (Task 6).

- [ ] **Step 1: Reescribir `App.jsx`**

```jsx
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './modules/marketing/components/LandingPage'
import { SignUpPage } from './modules/auth/components/SignUpPage'
import { LogInPage } from './modules/auth/components/LogInPage'
import { AcceptInvitePage } from './modules/auth/components/AcceptInvitePage'
import { ConsentPage } from './modules/auth/components/ConsentPage'
import { TrainerDashboard } from './modules/trainer/components/TrainerDashboard'
import { ClientDashboard } from './modules/client/components/ClientDashboard'
import { ProtectedRoute } from './modules/core/components/ProtectedRoute'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LogInPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/consent" element={<ConsentPage />} />
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/client" element={<ClientDashboard />} />
      </Route>
    </Routes>
  </BrowserRouter>
)

export default App
```

- [ ] **Step 2: Verificar visualmente**

```bash
cd frontend && npm run dev
```
Abrir `/signup`, registrar un entrenador de prueba, confirmar que redirige
a `/consent` y de ahí a `/trainer`. Capturar con Playwright si hay dudas
(mismo patrón usado para el landing).


---

### Task 11: Ampliar el test de aislamiento RLS

**Files:**
- Modify: `frontend/test/rls/profiles.rls.test.js`

**Interfaces:**
- Consumes: `adminClient`, `createTestUser`, `signInAs`, `deleteTestUser`
  de `./testUsers` (ya existen).

- [ ] **Step 1: Añadir los casos nuevos**

```js
// añadir dentro del describe('profiles RLS', ...) existente

it('un entrenador puede crear su propia fila (self-insert), nunca de rol client', async () => {
  const asTrainerA = await signInAs(trainerA.email)
  const { error: forbiddenInsert } = await asTrainerA
    .from('profiles')
    .insert({ id: trainerA.id, role: 'client', trainer_id: trainerA.id })
  expect(forbiddenInsert).not.toBeNull()
})

it('trainer B NO puede leer consent_accepted_at de un cliente de trainer A', async () => {
  const asTrainerB = await signInAs(trainerB.email)
  const { data, error } = await asTrainerB.from('profiles').select('consent_accepted_at').eq('id', clientOfA.id)
  expect(error).toBeNull()
  expect(data).toHaveLength(0)
})
```

- [ ] **Step 2: Ejecutar y confirmar que pasa**

```bash
cd frontend && npx vitest run test/rls/profiles.rls.test.js
```
Esperado: PASS, 7/7 (5 existentes + 2 nuevos).

- [ ] **Step 3: Dispatch del subagente `rls-reviewer`**

Sobre la migración de Task 1 completa (columna + política + grant) y este
archivo de test — confirma que no falta ninguna política ni GRANT.


---

### Task 12: Implementar el escenario Gherkin aprobado (Task 2)

**Files:**
- Create: `frontend/test/acceptance/steps/invitacion-y-consentimiento.steps.js`
- Modify: `frontend/package.json` (script `test:acceptance`)

**Interfaces:**
- Consumes: `@cucumber/cucumber`, Playwright contra `npm run dev` real
  (mismo patrón que las capturas manuales ya hechas en esta sesión),
  usuarios de prueba vía `frontend/test/rls/testUsers.js`.

- [ ] **Step 1: Instalar Cucumber**

```bash
cd frontend && npm install -D @cucumber/cucumber
```

- [ ] **Step 2: Implementar los step definitions**

Traducir cada `Given/When/Then` del `.feature` aprobado en Task 2 a
Playwright real contra la app corriendo (`npm run dev` en paralelo) — no
mocks. Usar `createTestUser`/`deleteTestUser` de `test/rls/testUsers.js`
para el estado inicial de cada escenario, y limpiar en un hook `After`.

- [ ] **Step 3: Añadir el script**

```json
// frontend/package.json — dentro de "scripts"
"test:acceptance": "cucumber-js test/acceptance --require test/acceptance/steps"
```

- [ ] **Step 4: Ejecutar contra la app real**

```bash
cd frontend && npm run dev &
npm run test:acceptance
```
Esperado: los 4 escenarios de Task 2 en verde.


---

## Self-Review (hecho antes de entregar el plan)

**Cobertura de la spec:** signup entrenador ✓ (Task 3, 9, 10) · invitación
✓ (Task 7, 8) · aceptar invitación ✓ (Task 3, 9) · gate de consentimiento
✓ (Task 1, 4, 5, 6, 9) · errores (email duplicado, sin sesión de trainer,
sin consentimiento) ✓ (Task 8, 6, 12) · RLS + rls-reviewer ✓ (Task 1, 8,
11) · Gherkin con aprobación previa ✓ (Task 2, gate explícito). Sin huecos
encontrados.

**Placeholders:** ninguno — cada step tiene código real, no "TODO" ni
"similar a la tarea anterior".

**Consistencia de tipos:** `getMyProfile` devuelve `{ role, trainerId,
consentAcceptedAt, displayName }` en Task 4 y así se consume en Task 5, 6 y
9 — verificado que ningún sitio usa `consent_accepted_at` (snake_case) fuera
de `profileService.js`, que es el único punto que toca la fila cruda de
Supabase.
