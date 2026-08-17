import { supabase } from '../../core/lib/api'

export const createOrganization = async (name, type = 'gym') => {
  const { data, error } = await supabase.rpc('create_organization', { org_name: name, org_type: type })
  if (error) throw new Error(error.message)
  return data
}

export const getMyOrganization = async (organizationId) => {
  if (!organizationId) return null
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type, owner_id')
    .eq('id', organizationId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { id: data.id, name: data.name, type: data.type, ownerId: data.owner_id } : null
}

const extractErrorMessage = (error) =>
  typeof error?.context?.clone === 'function'
    ? error.context.clone().json().then((body) => body?.error ?? error.message, () => error.message)
    : Promise.resolve(error.message)

export const inviteTrainer = async (email) => {
  const { error } = await supabase.functions.invoke('invite-trainer', { body: { email } })
  if (error) throw new Error(await extractErrorMessage(error))
}

export const listOrganizationClients = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, trainer_id')
    .eq('role', 'client')
  if (error) throw new Error(error.message)
  return data.map((row) => ({ id: row.id, displayName: row.display_name, trainerId: row.trainer_id }))
}

export const reassignClient = async (clientId, newTrainerId) => {
  const { error } = await supabase.rpc('reassign_client', { target_client_id: clientId, new_trainer_id: newTrainerId })
  if (error) throw new Error(error.message)
}
