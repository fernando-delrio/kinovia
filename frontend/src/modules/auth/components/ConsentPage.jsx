import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession'
import { useMyProfile } from '../hooks/useMyProfile'

export const ConsentPage = () => {
  const { session } = useAuthSession()
  const { profile, accept, error, isLoading } = useMyProfile(session?.user?.id)
  const navigate = useNavigate()

  const handleAccept = async () => {
    const success = await accept()
    if (!success) return
    navigate(profile?.role === 'trainer' ? '/trainer' : '/client')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Antes de continuar</h1>
        <p className="text-neutral-600">
          Lee la <a href="/privacidad" className="underline">política de privacidad</a> antes de aceptar.
        </p>
        {error && <p className="text-red-600">{error}</p>}
        <button type="button" onClick={handleAccept} disabled={isLoading} className="rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">
          Acepto la política de privacidad
        </button>
      </div>
    </main>
  )
}
