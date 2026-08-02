import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.test' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

const listAcceptanceUsers = async () => {
  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) throw error
  return data.users.filter((user) => user.email?.endsWith(ACCEPTANCE_EMAIL_DOMAIN))
}

// El borrado va en dos pasadas por el CHECK `client_has_trainer`: al borrar
// primero un entrenador, la FK `trainer_id ... on delete set null` dejaría a
// su cliente con trainer_id null y rompería el CHECK. Se borran antes las
// filas de clientes, después las de entrenadores, y por último los auth.users.
export const purgeAcceptanceUsers = async () => {
  const users = await listAcceptanceUsers()
  const ids = users.map((user) => user.id)
  if (ids.length === 0) return []

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
    .select('id, role, trainer_id, consent_accepted_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// createUser (a diferencia de signUp/inviteUserByEmail) no manda ningún email,
// así que preparar el estado previo de un escenario no consume cuota de envío
// del plan gratuito. Solo los pasos que el escenario está probando de verdad
// pasan por el flujo real que sí manda correo.
export const createConfirmedUser = async ({ email, role, trainerId = null, consentAccepted = false }) => {
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
    consent_accepted_at: consentAccepted ? new Date().toISOString() : null,
  })
  if (profileError) throw profileError

  return { id: data.user.id, email }
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
