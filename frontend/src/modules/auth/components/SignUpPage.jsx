import { useState } from 'react'
import { useSignUpForm } from '../hooks/useSignUpForm'

const isOrganization = (accountType) => accountType === 'organization'

export const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState('trainer')
  const [organizationName, setOrganizationName] = useState('')
  const { submit, error } = useSignUpForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    await submit({ email, password, accountType, organizationName })
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
        {error && <p className="text-red-600">{error}</p>}
        <fieldset className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="accountType" value="trainer" checked={accountType === 'trainer'} onChange={() => setAccountType('trainer')} />
            Entrenador independiente
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="accountType" value="organization" checked={accountType === 'organization'} onChange={() => setAccountType('organization')} />
            Gimnasio o clínica
          </label>
        </fieldset>
        {isOrganization(accountType) && (
          <input type="text" required placeholder="Nombre del gimnasio/clínica" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        )}
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <button type="submit" className="w-full rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Crear cuenta
        </button>
      </form>
    </main>
  )
}
