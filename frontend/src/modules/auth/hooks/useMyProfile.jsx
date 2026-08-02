import { useEffect, useState } from 'react'
import { acceptConsent, getMyProfile } from '../services/profileService'

export const useMyProfile = (userId) => {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const load = async () => {
      try {
        setProfile(await getMyProfile(userId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId])

  const accept = async () => {
    try {
      const consentAcceptedAt = await acceptConsent()
      setProfile((current) => ({ ...current, consentAcceptedAt }))
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  return { profile, isLoading, error, accept }
}
