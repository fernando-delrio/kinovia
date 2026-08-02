import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../../auth/hooks/useAuthSession'

// Guard de solo sesión: exige estar logueado, pero NO exige consentimiento
// aceptado. Existe porque ProtectedRoute (que sí exige consentimiento)
// redirige precisamente a /consent cuando falta — si /consent estuviera
// dentro de ProtectedRoute, ese redirect se disparería contra sí mismo en
// bucle y la página nunca llegaría a montarse.
const loadingState = (isLoading) => isLoading && <p>Cargando…</p>
const unauthenticated = (session) => !session && <Navigate to="/login" replace />

export const SessionRoute = () => {
  const { session, isLoading } = useAuthSession()
  return loadingState(isLoading) || unauthenticated(session) || <Outlet />
}
