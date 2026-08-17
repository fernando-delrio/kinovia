// supabase/functions/invite-trainer/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// El navegador manda un preflight OPTIONS antes de cualquier POST con
// Authorization/Content-Type "no simples". Sin estas cabeceras en TODAS las
// respuestas (incluida la del preflight) el navegador descarta la respuesta
// real antes de que supabase-js la vea, aunque el servidor haya respondido
// bien — por eso este bug solo aparecía desde un navegador real, nunca con
// curl servidor-a-servidor.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// listUsers() sin paginar solo devuelve los 50 usuarios MÁS ANTIGUOS del
// proyecto (mismo bug que Task 24 encontró y arregló en testAccounts.js) —
// con cientos de usuarios reales, esta comprobación de duplicado nunca
// encontraba una cuenta ya existente si era reciente. Recorre todas las
// páginas hasta encontrar el email o agotarlas.
const findUserIdByEmail = async (admin, email) => {
  const perPage = 1000
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((user) => user.email === email)
    if (match) return match.id
    if (data.users.length < perPage) return null
    page += 1
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Falta el token de autenticación' }, 401)
  }

  // Cliente "como el que llama" — solo para averiguar quién es (auth.uid()),
  // nunca para tocar datos: eso lo hace admin (service_role) más abajo.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Token inválido' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // A diferencia de invite-client (que exige role='trainer' a secas), aquí
  // quien invita tiene que ser el admin de una organización — es decir,
  // el owner_id de una fila en organizations, no cualquier entrenador.
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

  const existingUserId = await findUserIdByEmail(admin, email)
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', existingUserId ?? '')
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
