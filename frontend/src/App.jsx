import { useAuthSession } from './modules/auth/hooks/useAuthSession'

const loadingState = ({ isLoading }) => isLoading && <p>Conectando con Supabase…</p>
const errorState = ({ error }) => error && <p className="text-red-600">Error: {error}</p>
const connectedState = ({ session }) => (
  <div className="space-y-2 text-center">
    <p className="text-emerald-600 font-semibold">✅ Conectado a Supabase</p>
    <p className="text-sm text-gray-500">
      {session ? `Sesión activa: ${session.user.email}` : 'Sin sesión activa (normal, todavía no hay login)'}
    </p>
  </div>
)

const App = () => {
  const auth = useAuthSession()

  return (
    <main className="flex min-h-screen items-center justify-center p-8 font-sans">
      {loadingState(auth) || errorState(auth) || connectedState(auth)}
    </main>
  )
}

export default App
