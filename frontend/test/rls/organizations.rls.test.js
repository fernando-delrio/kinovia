import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('organizations RLS', () => {
  let adminA
  let orgAId
  let trainerInA
  let trainerIndependent

  beforeAll(async () => {
    adminA = await createTestUser({ label: 'org-admin-a', role: 'trainer' })
    const asAdminA = await signInAs(adminA.email)
    const { data: newOrgId, error } = await asAdminA.rpc('create_organization', { org_name: 'Gimnasio de prueba A', org_type: 'gym' })
    if (error) throw error
    orgAId = newOrgId

    trainerInA = await createTestUser({ label: 'org-trainer-in-a', role: 'trainer', organizationId: orgAId })
    trainerIndependent = await createTestUser({ label: 'org-trainer-independent', role: 'trainer' })
  })

  afterAll(async () => {
    await Promise.all([adminA, trainerInA, trainerIndependent].filter(Boolean).map((user) => deleteTestUser(user.id)))
    if (orgAId) await adminClient.from('organizations').delete().eq('id', orgAId)
  })

  it('create_organization() deja al que llama como owner_id y le asigna organization_id', async () => {
    const { data: orgRow } = await adminClient.from('organizations').select('owner_id').eq('id', orgAId).single()
    expect(orgRow.owner_id).toBe(adminA.id)

    const { data: adminProfile } = await adminClient.from('profiles').select('organization_id').eq('id', adminA.id).single()
    expect(adminProfile.organization_id).toBe(orgAId)
  })

  it('un entrenador de la organización ve la organización (nombre)', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { data, error } = await asTrainerInA.from('organizations').select('name').eq('id', orgAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('un entrenador independiente NO ve una organización ajena', async () => {
    const asIndependent = await signInAs(trainerIndependent.email)
    const { data, error } = await asIndependent.from('organizations').select('name').eq('id', orgAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('un entrenador ya con organización NO puede crear otra', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { error } = await asTrainerInA.rpc('create_organization', { org_name: 'Otra', org_type: 'gym' })
    expect(error).not.toBeNull()
  })

  it('ningún entrenador puede insertar una organización directamente (sin política de insert)', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { error } = await asTrainerInA.from('organizations').insert({ name: 'Directo', type: 'gym', owner_id: trainerInA.id })
    expect(error).not.toBeNull()
  })
})
