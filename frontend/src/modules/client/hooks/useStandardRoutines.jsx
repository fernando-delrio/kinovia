import { useEffect, useState } from 'react'
import { listOrganizationTemplates } from '../../plan-templates/services/planTemplatesService'

export const useStandardRoutines = (organizationId, hasPersonalTrainer) => {
  const [routines, setRoutines] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!organizationId || hasPersonalTrainer) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      try {
        setRoutines(await listOrganizationTemplates(organizationId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [organizationId, hasPersonalTrainer])

  return { routines, isLoading, error }
}
