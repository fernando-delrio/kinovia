import { supabase } from '../../core/lib/api'

// supabase-js sustituye error.message por un texto genérico en cualquier
// respuesta no-2xx de una Edge Function; el cuerpo real ("Ese email ya
// tiene cuenta", etc.) vive en error.context (el objeto Response). Sin
// try/catch (regla del proyecto: el service lanza, nunca atrapa) — se usa
// el segundo argumento de .then() como manejador de rechazo.
const extractErrorMessage = (error) =>
  typeof error?.context?.clone === 'function'
    ? error.context.clone().json().then((body) => body?.error ?? error.message, () => error.message)
    : Promise.resolve(error.message)

export const inviteClient = async (email) => {
  const { error } = await supabase.functions.invoke('invite-client', { body: { email } })
  if (error) throw new Error(await extractErrorMessage(error))
}
