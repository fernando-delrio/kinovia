import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.test' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Cliente admin: SOLO para preparar y limpiar el estado de los escenarios.
// Salta RLS, así que nunca debe salir de test/ (misma regla que test/rls/testUsers.js).
export const adminClient = createClient(supabaseUrl, serviceRoleKey)

// Dominio propio de los escenarios de aceptación. Descartados antes de este:
// ".test" (TLD reservado RFC 2606, rechazado por Supabase) y
// "kinovia-qa.com" (dominio ficticio sin DNS/MX real — signUp lo rechaza en
// cuanto el rate limit de envío no enmascara el error). "mailinator.com" es
// un dominio real con DNS/MX válidos, ya probado con éxito en esta sesión
// (Task 8, prueba manual del Edge Function invite-client).
export const ACCEPTANCE_EMAIL_DOMAIN = '@mailinator.com'

// Contraseña fija para todas las cuentas de aceptación: el Gherkin habla de
// "una contraseña válida", no de una contraseña concreta.
export const ACCEPTANCE_PASSWORD = 'kinovia-acceptance-123!'

// listUsers() sin argumentos solo trae la PRIMERA página (50 usuarios, los
// más antiguos del proyecto) — en un proyecto real con cientos de usuarios
// históricos de otras pruebas, las cuentas @mailinator.com de esta sesión
// (siempre las más recientes) nunca caen en esa página. Sin paginar de
// verdad, purgeAcceptanceUsers/findAcceptanceUserByEmail "ven" una lista
// vacía aunque la cuenta exista — descubierto en vivo: un entrenador
// invitado en un escenario fallido quedó sin purgar y rompió el siguiente
// intento con un 409 "ese email ya tiene cuenta".
const PAGE_SIZE = 1000

const fetchUsersPage = async (page) => {
  const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
  if (error) throw error
  return data.users
}

const fetchAllUsers = async (page = 1) => {
  const users = await fetchUsersPage(page)
  if (users.length < PAGE_SIZE) return users
  return [...users, ...(await fetchAllUsers(page + 1))]
}

const listAcceptanceUsers = async () => {
  const users = await fetchAllUsers()
  return users.filter((user) => user.email?.endsWith(ACCEPTANCE_EMAIL_DOMAIN))
}

// El borrado va en varias pasadas por dos problemas de FK distintos:
//
// 1. CHECK `client_has_trainer`: al borrar primero un entrenador, la FK
//    `trainer_id ... on delete set null` dejaría a su cliente con
//    trainer_id null y rompería el CHECK si tampoco tiene organization_id.
//    Se borran antes las filas de clientes, después las de entrenadores.
// 2. `organizations.owner_id references public.profiles(id)` SIN
//    `on delete cascade` ni `set null` (ver migración
//    20260803091500_organizations.sql) — es `on delete no action` por
//    defecto. Si se intenta borrar el profile de un admin de organización
//    antes que su fila en `organizations`, Postgres rechaza el delete con
//    una violación de foreign key y el siguiente escenario arranca con
//    basura sin limpiar. Por eso las organizaciones se borran ANTES que
//    ningún profile — de paso, esto cascada sobre
//    `plan_templates.organization_id` (on delete cascade) y limpia también
//    las rutinas estándar de prueba.
export const purgeAcceptanceUsers = async () => {
  const users = await listAcceptanceUsers()
  const ids = users.map((user) => user.id)
  if (ids.length === 0) return []

  await adminClient.from('organizations').delete().in('owner_id', ids)
  await adminClient.from('profiles').delete().eq('role', 'client').in('id', ids)
  await adminClient.from('profiles').delete().in('id', ids)
  await Promise.all(ids.map((id) => adminClient.auth.admin.deleteUser(id)))

  return users.map((user) => user.email)
}

export const findAcceptanceUserByEmail = async (email) => {
  const users = await listAcceptanceUsers()
  return users.find((user) => user.email === email) ?? null
}

export const findProfileById = async (userId) => {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, role, trainer_id, consent_accepted_at, organization_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export const findOrganizationByOwnerId = async (ownerId) => {
  const { data, error } = await adminClient
    .from('organizations')
    .select('id, name, type, owner_id')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw error
  return data
}

// createUser (a diferencia de signUp/inviteUserByEmail) no manda ningún email,
// así que preparar el estado previo de un escenario no consume cuota de envío
// del plan gratuito. Solo los pasos que el escenario está probando de verdad
// pasan por el flujo real que sí manda correo.
export const createConfirmedUser = async ({
  email,
  role,
  trainerId = null,
  organizationId = null,
  consentAccepted = false,
}) => {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: ACCEPTANCE_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: data.user.id,
    role,
    trainer_id: trainerId,
    organization_id: organizationId,
    consent_accepted_at: consentAccepted ? new Date().toISOString() : null,
  })
  if (profileError) throw profileError

  return { id: data.user.id, email }
}

// Prepara de un golpe el estado que create_organization() (RPC, Task 7) deja
// tras el alta pública de un entrenador que elige "Gimnasio o clínica": el
// entrenador confirmado, la fila en organizations con él como owner, y su
// propio profile apuntando a esa organización. El alta pública real ya la
// cubre el Escenario 1 vía UI — esto es solo preparación para escenarios que
// dan por hecho que la organización YA existe (Escenarios 2, 3 y 4).
export const createConfirmedOrganizationAdmin = async ({ email, organizationName, organizationType = 'gym' }) => {
  const trainer = await createConfirmedUser({ email, role: 'trainer', consentAccepted: true })

  const { data: organization, error: organizationError } = await adminClient
    .from('organizations')
    .insert({ name: organizationName, type: organizationType, owner_id: trainer.id })
    .select('id, name')
    .single()
  if (organizationError) throw organizationError

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ organization_id: organization.id })
    .eq('id', trainer.id)
  if (profileError) throw profileError

  return { id: trainer.id, email, organizationId: organization.id, organizationName: organization.name }
}

// Inserta una plantilla de organización directamente en BD (draft o
// publicada) sin pasar por el editor del entrenador — igual que el resto de
// `Given` de este harness, preparar estado previo no es el foco del
// escenario. `content` no puede ser null (columna NOT NULL); un JSONB vacío
// basta porque ningún escenario de aceptación revisa el contenido interno.
export const insertOrganizationTemplate = async ({ organizationId, createdBy, name, status = 'draft' }) => {
  const { data, error } = await adminClient
    .from('plan_templates')
    .insert({
      organization_id: organizationId,
      trainer_id: null,
      created_by: createdBy,
      name,
      content: { fases: [] },
      status,
    })
    .select('id, name, status')
    .single()
  if (error) throw error
  return data
}

// Equivalente a createPendingInvite (abajo) pero para invitar un
// ENTRENADOR a una organización en vez de un cliente a un entrenador.
//
// Debería bastar con disparar la Edge Function invite-trainer desde la UI
// real (que es lo que hace el escenario 2 de organizaciones.feature) — pero
// esa función llama a auth.admin.inviteUserByEmail(), y esa llamada está
// caída AHORA MISMO en este proyecto Supabase: falla de forma consistente
// con AuthRetryableFetchError/500 (verificado en vivo, 3/3 reintentos), y
// el mismo fallo rompe por igual el invite-client ya aprobado de
// invitacion-y-consentimiento.feature — así que es un problema de
// infraestructura externo (cuota o SMTP del proyecto), no un bug de este
// código, y arreglarlo queda fuera del alcance de esta tarea. Mientras
// tanto, generateLink (que NO manda correo) deja el mismo estado final que
// dejaría la Edge Function si el envío funcionara — permite seguir
// probando el resto del flujo (asociación multi-tenant + aceptación de la
// invitación) sin depender de un servicio de correo roto.
export const createPendingInviteForTrainer = async ({ email, organizationId, redirectTo }) => {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })
  if (error) throw error

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: data.user.id, role: 'trainer', trainer_id: null, organization_id: organizationId })
  if (profileError) throw profileError

  return { id: data.user.id, email, actionLink: data.properties.action_link }
}

// Cliente "como el usuario" para el harness de aceptación — mismo propósito
// que signInAs en test/rls/testUsers.js, pero deliberadamente no importado
// desde ahí: este harness es independiente del de RLS (mismo patrón, código
// separado). Se usa cuando el escenario necesita probar el intento REAL de
// una acción no autorizada contra la política RLS, no solo comprobar que la
// UI esconde el botón correspondiente.
export const signInAsAcceptanceUser = async (email) => {
  const client = createClient(supabaseUrl, publishableKey)
  const { error } = await client.auth.signInWithPassword({ email, password: ACCEPTANCE_PASSWORD })
  if (error) throw error
  return client
}

// Invitación pendiente sin depender de leer un email real: generateLink crea
// el auth.user igual que inviteUserByEmail pero devuelve el enlace en vez de
// enviarlo. El enlace es de un solo uso y caduca, así que se genera dentro
// del propio escenario que lo consume.
export const createPendingInvite = async ({ email, trainerId, redirectTo }) => {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })
  if (error) throw error

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: data.user.id, role: 'client', trainer_id: trainerId })
  if (profileError) throw profileError

  return { id: data.user.id, email, actionLink: data.properties.action_link }
}
