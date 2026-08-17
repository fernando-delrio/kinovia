import { describe, expect, it, vi } from 'vitest'

const single = vi.fn()
const eq = vi.fn(() => ({ single }))
const select = vi.fn(() => ({ eq }))
const updateEq = vi.fn(() => ({ select: () => ({ single }) }))
const update = vi.fn(() => ({ eq: updateEq }))
const insert = vi.fn()
const from = vi.fn(() => ({ select, update, insert }))
const rpc = vi.fn()

vi.mock('../../core/lib/api', () => ({ supabase: { from: (...args) => from(...args), rpc: (...args) => rpc(...args) } }))

import { getMyProfile, acceptConsent, createTrainerProfile } from './profileService'

describe('profileService', () => {
  it('getMyProfile normaliza la fila de profiles', async () => {
    single.mockResolvedValue({
      data: { role: 'trainer', trainer_id: null, consent_accepted_at: null, display_name: null, organization_id: 'org-1' },
      error: null,
    })
    const profile = await getMyProfile('1')
    expect(profile).toEqual({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null, organizationId: 'org-1' })
  })

  it('getMyProfile lanza con el mensaje de Supabase si falla', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'no encontrado' } })
    await expect(getMyProfile('1')).rejects.toThrow('no encontrado')
  })

  it('acceptConsent llama a la función accept_consent y devuelve el timestamp', async () => {
    rpc.mockResolvedValue({ data: '2026-08-01T00:00:00.000Z', error: null })
    const acceptedAt = await acceptConsent()
    expect(rpc).toHaveBeenCalledWith('accept_consent')
    expect(acceptedAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('acceptConsent lanza con el mensaje de Supabase si falla', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'ya estaba aceptado' } })
    await expect(acceptConsent()).rejects.toThrow('ya estaba aceptado')
  })

  it('createTrainerProfile inserta la fila con role trainer y trainer_id null', async () => {
    insert.mockResolvedValue({ error: null })
    await createTrainerProfile('user-1')
    expect(insert).toHaveBeenCalledWith({ id: 'user-1', role: 'trainer', trainer_id: null })
  })

  it('createTrainerProfile lanza con el mensaje de Supabase si falla', async () => {
    insert.mockResolvedValue({ error: { message: 'ya existe' } })
    await expect(createTrainerProfile('user-1')).rejects.toThrow('ya existe')
  })
})
