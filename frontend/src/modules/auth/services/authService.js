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
