import { useState } from 'react'
import { publishTemplate } from '../services/planTemplatesService'

export const usePublishTemplateAction = () => {
  const [status, setStatus] = useState(null)

  const publish = async (templateId) => {
    setStatus(null)
    try {
      await publishTemplate(templateId)
      setStatus({ type: 'success', message: 'Rutina publicada' })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { publish, status }
}
