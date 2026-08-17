import { useEffect, useState } from 'react'
import { getMyOrganization } from '../services/organizationsService'

export const useMyOrganization = (organizationId, userId) => {
  const [organization, setOrganization] = useState(null)
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
        setOrganization(await getMyOrganization(organizationId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [organizationId])

  const isAdmin = Boolean(organization && organization.ownerId === userId)
  return { organization, isAdmin, isLoading, error }
}
