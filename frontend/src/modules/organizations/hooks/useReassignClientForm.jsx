import { useState } from 'react'
import { reassignClient } from '../services/organizationsService'

export const useReassignClientForm = () => {
  const [status, setStatus] = useState(null)

  const submit = async (clientId, newTrainerId) => {
    setStatus(null)
    try {
      await reassignClient(clientId, newTrainerId)
      setStatus({ type: 'success', message: 'Cliente reasignado' })
      return true
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return false
    }
  }

  return { submit, status }
}
