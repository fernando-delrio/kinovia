import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSessionContext } from '../../auth/context/AuthSessionContext'
import { useMyProfile } from '../../auth/hooks/useMyProfile'

// isProfileLoading por sí solo no basta: cuando `session` pasa de null a un
// valor real, useMyProfile recibe un userId nuevo, pero su efecto (el que
// vuelve a poner isLoading=true, I2) no corre hasta después de este render
// — React no lo ejecuta de forma síncrona al cambiar la prop. Sin este
// guard extra, hay un render intermedio con isProfileLoading todavía en su
// valor previo (false) y profile aún null, que se cuela hasta el <Outlet />
// antes de que el perfil (y por tanto needsConsent) tengan datos reales.
// Comprobado con un test dirigido: sin esta condición, el contenido
// protegido llega a pintarse un instante antes del redirect a /consent.
export const isProfilePending = (session, profile, isProfileLoading, error) =>
  session && (isProfileLoading || (!profile && !error))

const loadingState = (isLoading) => isLoading && <p>Cargando…</p>
const unauthenticated = (session) => !session && <Navigate to="/login" replace />
const profileFailed = (error) => error && <p className="text-red-600">No se pudo cargar tu perfil. Inténtalo de nuevo.</p>
const needsConsent = (profile) => profile && !profile.consentAcceptedAt && <Navigate to="/consent" replace />

export const ProtectedRoute = () => {
  const { session, isLoading: isSessionLoading } = useAuthSessionContext()
  const { profile, isLoading: isProfileLoading, error } = useMyProfile(session?.user?.id)

  return (
    loadingState(isSessionLoading || isProfilePending(session, profile, isProfileLoading, error)) ||
    unauthenticated(session) ||
    profileFailed(error) ||
    needsConsent(profile) ||
    <Outlet />
  )
}
