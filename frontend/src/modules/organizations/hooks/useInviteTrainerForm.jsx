import { useState } from 'react'
import { inviteTrainer } from '../services/organizationsService'

export const useInviteTrainerForm = () => {
  const [status, setStatus] = useState(null)

  const submit = async (email) => {
    setStatus(null)
    try {
      await inviteTrainer(email)
      setStatus({ type: 'success', message: `Invitación enviada a ${email}` })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
