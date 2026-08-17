import { supabase } from '../../core/lib/api'

export const createTemplate = async ({ name, content }) => {
  const { data, error } = await supabase
    .from('plan_templates')
    .insert({ name, content })
    .select('id, name, content')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listMyTemplates = async () => {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, name, content')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

const toOrganizationTemplate = (row) => ({
  id: row.id,
  name: row.name,
  content: row.content,
  status: row.status,
  createdBy: row.created_by,
})

export const createOrganizationTemplate = async ({ organizationId, name, content }) => {
  const { data, error } = await supabase
    .from('plan_templates')
    // trainer_id: null anula el default auth.uid() de la columna (Task 3) —
    // sin esto, el insert dejaría trainer_id Y organization_id set a la vez,
    // violando el constraint template_owner (Task 17).
    .insert({ organization_id: organizationId, trainer_id: null, name, content, status: 'draft' })
    .select('id, name, content, status')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listOrganizationTemplates = async (organizationId) => {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, name, content, status, created_by')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map(toOrganizationTemplate)
}

export const publishTemplate = async (templateId) => {
  const { error } = await supabase
    .from('plan_templates')
    .update({ status: 'published' })
    .eq('id', templateId)
  if (error) throw new Error(error.message)
}
