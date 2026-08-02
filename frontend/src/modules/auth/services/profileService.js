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

export const createTrainerProfile = async (userId) => {
  const { error } = await supabase
    .from('profiles')
    .insert({ id: userId, role: 'trainer', trainer_id: null })
  if (error) throw new Error(error.message)
}

export const acceptConsent = async () => {
  const { data, error } = await supabase.rpc('accept_consent')
  if (error) throw new Error(error.message)
  return data
}
