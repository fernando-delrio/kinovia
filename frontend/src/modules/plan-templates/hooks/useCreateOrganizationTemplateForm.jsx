import { useState } from 'react'
import { createOrganizationTemplate } from '../services/planTemplatesService'

const PLACEHOLDER_CONTENT = { fases: [{ nombre: 'Fase 1', dias: [] }] }

export const useCreateOrganizationTemplateForm = (organizationId) => {
  const [status, setStatus] = useState(null)

  const submit = async (name) => {
    setStatus(null)
    try {
      await createOrganizationTemplate({ organizationId, name, content: PLACEHOLDER_CONTENT })
      setStatus({ type: 'success', message: `"${name}" creada como borrador` })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
