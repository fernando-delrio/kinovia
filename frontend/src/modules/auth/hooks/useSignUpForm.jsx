import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp } from '../services/authService'
import { createTrainerProfile } from '../services/profileService'

export const useSignUpForm = () => {
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async ({ email, password }) => {
    try {
      const session = await signUp({ email, password })
      await createTrainerProfile(session.user.id)
      navigate('/consent')
    } catch (err) {
      setError(err.message)
    }
  }

  return { submit, error }
}
