import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente admin: SOLO se usa aquí, en setup/cleanup de test. Nunca en código
// que Vite empaquete para el navegador (service_role salta todo RLS).
export const adminClient = createClient(supabaseUrl, serviceRoleKey)

const TEST_PASSWORD = 'rls-test-password-123!'

const randomEmail = (label) => `rls-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@kinovia.test`

export const createTestUser = async ({ label, role, trainerId }) => {
  const email = randomEmail(label)
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: data.user.id, role, trainer_id: trainerId ?? null, display_name: label })
  if (profileError) throw profileError

  return { id: data.user.id, email }
}

// Cliente "como el usuario" — usa la publishable key (la única que usa
// también el frontend real) más una sesión iniciada, para que RLS aplique
// de verdad como aplicaría en producción.
export const signInAs = async (email) => {
  const client = createClient(supabaseUrl, publishableKey)
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) throw error
  return client
}

export const deleteTestUser = async (userId) => {
  await adminClient.auth.admin.deleteUser(userId)
}
