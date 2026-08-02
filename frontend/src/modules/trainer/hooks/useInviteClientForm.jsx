import { useState } from 'react'
import { inviteClient } from '../services/inviteService'

export const useInviteClientForm = () => {
  const [status, setStatus] = useState(null)

  const submit = async (email) => {
    setStatus(null)
    try {
      await inviteClient(email)
      setStatus({ type: 'success', message: `Invitación enviada a ${email}` })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
