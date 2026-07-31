import { useEffect, useState } from 'react'
import { getSession, onAuthStateChange } from '../services/authService'

export const useAuthSession = () => {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        setSession(await getSession())
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
    return onAuthStateChange(setSession)
  }, [])

  return { session, isLoading, error }
}
