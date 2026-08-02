import { useState } from 'react'
import { useInviteClientForm } from '../hooks/useInviteClientForm'

export const TrainerDashboard = () => {
  const [email, setEmail] = useState('')
  const { submit, status } = useInviteClientForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(email)
    if (success) setEmail('')
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Panel del entrenador</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm gap-2">
        <input type="email" required placeholder="Email del cliente" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Invitar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
    </main>
  )
}
