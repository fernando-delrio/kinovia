import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp } from '../services/authService'
import { createTrainerProfile } from '../services/profileService'
import { createOrganization } from '../../organizations/services/organizationsService'

export const useSignUpForm = () => {
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async ({ email, password, accountType, organizationName }) => {
    try {
      const session = await signUp({ email, password })
      await createTrainerProfile(session.user.id)
      if (accountType === 'organization') {
        await createOrganization(organizationName)
      }
      navigate('/consent')
    } catch (err) {
      setError(err.message)
    }
  }

  return { submit, error }
}
