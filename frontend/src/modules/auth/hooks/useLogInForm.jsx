import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../services/authService'
import { getMyProfile } from '../services/profileService'

const destinationFor = (profile) => {
  if (!profile.consentAcceptedAt) return '/consent'
  return profile.role === 'trainer' ? '/trainer' : '/client'
}

export const useLogInForm = () => {
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async ({ email, password }) => {
    try {
      const session = await signIn({ email, password })
      const profile = await getMyProfile(session.user.id)
      navigate(destinationFor(profile))
    } catch (err) {
      setError(err.message)
    }
  }

  return { submit, error }
}
