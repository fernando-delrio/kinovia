// supabase/functions/invite-client/index.ts
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

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()
  if (callerProfileError || callerProfile?.role !== 'trainer') {
    return jsonResponse({ error: 'Solo un entrenador puede invitar clientes' }, 403)
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
    .insert({ id: invited.user.id, role: 'client', trainer_id: callerData.user.id })
  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500)
  }

  return jsonResponse({ ok: true }, 200)
})
