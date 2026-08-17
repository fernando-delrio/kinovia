import { useEffect, useState } from 'react'
import { listOrganizationClients } from '../services/organizationsService'

export const useOrganizationClients = (isAdmin) => {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      try {
        setClients(await listOrganizationClients())
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [isAdmin])

  return { clients, isLoading, error }
}
