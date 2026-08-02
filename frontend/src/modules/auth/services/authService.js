import { supabase } from '../../core/lib/api'

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export const onAuthStateChange = (callback) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return data.subscription.unsubscribe
}

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
