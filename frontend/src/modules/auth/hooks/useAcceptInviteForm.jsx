import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { acceptInvite } from '../services/authService'

export const useAcceptInviteForm = () => {
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async ({ password }) => {
    try {
      await acceptInvite({ password })
      navigate('/consent')
    } catch (err) {
      setError(err.message)
    }
  }

  return { submit, error }
}
