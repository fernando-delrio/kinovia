import { useAuthSessionContext } from '../../auth/context/AuthSessionContext'
import { useMyProfile } from '../../auth/hooks/useMyProfile'
import { useStandardRoutines } from '../hooks/useStandardRoutines'

export const ClientDashboard = () => {
  const { session } = useAuthSessionContext()
  const { profile } = useMyProfile(session?.user?.id)
  const hasPersonalTrainer = Boolean(profile?.trainerId)
  const { routines } = useStandardRoutines(profile?.organizationId, hasPersonalTrainer)

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Tu plan</h1>
      {hasPersonalTrainer ? (
        <p className="mt-2 text-neutral-600">Todavía no tienes ningún plan asignado.</p>
      ) : (
        <>
          <p className="mt-2 text-neutral-600">No tienes entrenador personal asignado — estas son las rutinas estándar de tu gimnasio:</p>
          <ul className="mt-4 space-y-1">
            {routines.map((routine) => (
              <li key={routine.id} className="text-sm">{routine.name}</li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
