import { useState } from 'react'
import { useInviteClientForm } from '../hooks/useInviteClientForm'
import { useAuthSessionContext } from '../../auth/context/AuthSessionContext'
import { useMyProfile } from '../../auth/hooks/useMyProfile'
import { useMyOrganization } from '../../organizations/hooks/useMyOrganization'
import { useInviteTrainerForm } from '../../organizations/hooks/useInviteTrainerForm'
import { useOrganizationClients } from '../../organizations/hooks/useOrganizationClients'
import { useReassignClientForm } from '../../organizations/hooks/useReassignClientForm'
import { useOrganizationTemplates } from '../../plan-templates/hooks/useOrganizationTemplates'
import { useCreateOrganizationTemplateForm } from '../../plan-templates/hooks/useCreateOrganizationTemplateForm'
import { usePublishTemplateAction } from '../../plan-templates/hooks/usePublishTemplateAction'

const InviteTrainerSection = () => {
  const [email, setEmail] = useState('')
  const { submit, status } = useInviteTrainerForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(email)
    if (success) setEmail('')
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold">Invitar entrenador a tu organización</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex max-w-sm gap-2">
        <input type="email" required placeholder="Email del entrenador" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Invitar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
    </section>
  )
}

const ReassignClientSection = ({ isAdmin }) => {
  const { clients } = useOrganizationClients(isAdmin)
  const [clientId, setClientId] = useState('')
  const [newTrainerId, setNewTrainerId] = useState('')
  const { submit, status } = useReassignClientForm()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(clientId, newTrainerId)
    if (success) {
      setClientId('')
      setNewTrainerId('')
    }
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold">Reasignar cliente</h2>
      <ul className="mt-4 space-y-1 text-sm text-neutral-600">
        {clients.map((client) => (
          <li key={client.id}>{client.displayName} — entrenador actual: {client.trainerId}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="mt-4 flex max-w-lg gap-2">
        <input type="text" required placeholder="ID del cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <input type="text" required placeholder="ID del nuevo entrenador" value={newTrainerId} onChange={(e) => setNewTrainerId(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#5B7B6B] px-4 py-2 text-sm font-semibold text-white">
          Reasignar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
    </section>
  )
}

const StandardRoutinesSection = ({ organizationId, isAdmin }) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { templates } = useOrganizationTemplates(organizationId, refreshKey)
  const [name, setName] = useState('')
  const { submit, status: createStatus } = useCreateOrganizationTemplateForm(organizationId)
  const { publish, status: publishStatus } = usePublishTemplateAction()

  const handleCreate = async (event) => {
    event.preventDefault()
    const success = await submit(name)
    if (success) {
      setName('')
      setRefreshKey((key) => key + 1)
    }
  }

  const handlePublish = async (templateId) => {
    const success = await publish(templateId)
    if (success) setRefreshKey((key) => key + 1)
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold">Rutinas estándar del gimnasio</h2>
      <form onSubmit={handleCreate} className="mt-4 flex max-w-sm gap-2">
        <input type="text" required placeholder="Nombre de la rutina" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Proponer
        </button>
      </form>
      {createStatus && (
        <p className={createStatus.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{createStatus.message}</p>
      )}
      <ul className="mt-4 space-y-2">
        {templates.map((template) => (
          <li key={template.id} className="flex items-center gap-3 text-sm">
            <span>{template.name} — {template.status}</span>
            {isAdmin && template.status === 'draft' && (
              <button type="button" onClick={() => handlePublish(template.id)} className="rounded bg-[#5B7B6B] px-2 py-1 text-xs font-semibold text-white">
                Publicar
              </button>
            )}
          </li>
        ))}
      </ul>
      {publishStatus && (
        <p className={publishStatus.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{publishStatus.message}</p>
      )}
    </section>
  )
}

export const TrainerDashboard = () => {
  const [email, setEmail] = useState('')
  const { submit, status } = useInviteClientForm()
  const { session } = useAuthSessionContext()
  const { profile } = useMyProfile(session?.user?.id)
  const { organization, isAdmin } = useMyOrganization(profile?.organizationId, session?.user?.id)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await submit(email)
    if (success) setEmail('')
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Panel del entrenador</h1>
      {organization && <p className="mt-1 text-neutral-500">{organization.name}</p>}
      <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm gap-2">
        <input type="email" required placeholder="Email del cliente" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border px-4 py-2" />
        <button type="submit" className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">
          Invitar
        </button>
      </form>
      {status && (
        <p className={status.type === 'success' ? 'mt-3 text-emerald-600' : 'mt-3 text-red-600'}>{status.message}</p>
      )}
      {isAdmin && <InviteTrainerSection />}
      {isAdmin && <ReassignClientSection isAdmin={isAdmin} />}
      {profile?.organizationId && <StandardRoutinesSection organizationId={profile.organizationId} isAdmin={isAdmin} />}
    </main>
  )
}
