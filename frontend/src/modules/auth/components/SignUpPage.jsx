import { useState } from 'react'
import { useSignUpForm } from '../hooks/useSignUpForm'

export const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { submit, error } = useSignUpForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    await submit({ email, password })
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Crea tu cuenta de entrenador</h1>
        {error && <p className="text-red-600">{error}</p>}
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <button type="submit" className="w-full rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Crear cuenta
        </button>
      </form>
    </main>
  )
}
