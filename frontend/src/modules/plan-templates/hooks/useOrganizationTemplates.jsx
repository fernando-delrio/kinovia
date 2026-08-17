import { useEffect, useState } from 'react'
import { listOrganizationTemplates } from '../services/planTemplatesService'

export const useOrganizationTemplates = (organizationId, refreshKey) => {
  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      try {
        setTemplates(await listOrganizationTemplates(organizationId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [organizationId, refreshKey])

  return { templates, isLoading, error }
}
