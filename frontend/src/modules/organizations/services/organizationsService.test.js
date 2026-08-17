import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

const invoke = vi.fn()
vi.mock('../../core/lib/api', () => ({
  supabase: {
    rpc: (...args) => rpc(...args),
    from: (...args) => from(...args),
    functions: { invoke: (...args) => invoke(...args) },
  },
}))

import {
  createOrganization,
  getMyOrganization,
  inviteTrainer,
  listOrganizationClients,
  reassignClient,
} from './organizationsService'

describe('organizationsService', () => {
  it('createOrganization llama a la función y devuelve el id creado', async () => {
    rpc.mockResolvedValue({ data: 'org-1', error: null })
    const id = await createOrganization('Gimnasio Central', 'gym')
    expect(rpc).toHaveBeenCalledWith('create_organization', { org_name: 'Gimnasio Central', org_type: 'gym' })
    expect(id).toBe('org-1')
  })

  it('createOrganization lanza con el mensaje de Supabase si falla', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'ya tienes una organización' } })
    await expect(createOrganization('X')).rejects.toThrow('ya tienes una organización')
  })

  it('getMyOrganization devuelve null si no hay organizationId', async () => {
    const org = await getMyOrganization(null)
    expect(org).toBeNull()
  })

  it('getMyOrganization normaliza la fila (camelCase)', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'org-1', name: 'Gimnasio Central', type: 'gym', owner_id: 'u1' }, error: null })
    const org = await getMyOrganization('org-1')
    expect(org).toEqual({ id: 'org-1', name: 'Gimnasio Central', type: 'gym', ownerId: 'u1' })
  })

  it('inviteTrainer llama a la Edge Function invite-trainer con el email', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    await inviteTrainer('nuevo@kinovia.test')
    expect(invoke).toHaveBeenCalledWith('invite-trainer', { body: { email: 'nuevo@kinovia.test' } })
  })

  it('inviteTrainer lanza con el mensaje real extraído de error.context', async () => {
    const context = { clone: () => ({ json: () => Promise.resolve({ error: 'Ese email ya tiene cuenta' }) }) }
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context } })
    await expect(inviteTrainer('x@x.com')).rejects.toThrow('Ese email ya tiene cuenta')
  })

  // listOrganizationClients no encadena .maybeSingle() — el .eq() se
  // await-ea directamente. El mock compartido de `eq` sigue sirviendo:
  // `mockResolvedValueOnce` sustituye, solo para esta llamada, el
  // `{ maybeSingle }` por defecto por una promesa que resuelve a
  // { data, error }, sin tocar el resto de tests que sí llaman a
  // `.maybeSingle()`.
  it('listOrganizationClients devuelve los clientes normalizados', async () => {
    eq.mockResolvedValueOnce({ data: [{ id: 'c1', display_name: 'Cliente Uno', trainer_id: 't1' }], error: null })
    const clients = await listOrganizationClients()
    expect(clients).toEqual([{ id: 'c1', displayName: 'Cliente Uno', trainerId: 't1' }])
  })

  it('reassignClient llama a la función reassign_client con los ids', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await reassignClient('c1', 't2')
    expect(rpc).toHaveBeenCalledWith('reassign_client', { target_client_id: 'c1', new_trainer_id: 't2' })
  })

  it('reassignClient lanza con el mensaje de Supabase si falla', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'el entrenador destino no pertenece a tu organización' } })
    await expect(reassignClient('c1', 't2')).rejects.toThrow('el entrenador destino no pertenece a tu organización')
  })
})
