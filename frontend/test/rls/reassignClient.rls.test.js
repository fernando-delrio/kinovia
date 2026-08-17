import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('reassign_client() RLS', () => {
  let orgAdmin
  let orgId
  let trainerOne
  let trainerTwo
  let client
  let outsideTrainer

  // Segunda organización real (no solo un entrenador huérfano) — hallazgo
  // de la revisión de la Task 16: el caso "otra organización" de más abajo
  // usaba un entrenador SIN organización, que no ejercita de verdad el
  // aislamiento organización-contra-organización. Estos objetos cierran
  // ese hueco.
  let otherOrgAdmin
  let otherOrgId
  let otherOrgTrainer
  let otherOrgClient

  beforeAll(async () => {
    orgAdmin = await createTestUser({ label: 'reassign-admin', role: 'trainer' })
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { data: newOrgId } = await asOrgAdmin.rpc('create_organization', { org_name: 'Gimnasio reasignación', org_type: 'gym' })
    orgId = newOrgId

    trainerOne = await createTestUser({ label: 'reassign-trainer-one', role: 'trainer', organizationId: orgId })
    trainerTwo = await createTestUser({ label: 'reassign-trainer-two', role: 'trainer', organizationId: orgId })
    client = await createTestUser({ label: 'reassign-client', role: 'client', trainerId: trainerOne.id })
    outsideTrainer = await createTestUser({ label: 'reassign-outside-trainer', role: 'trainer' })

    otherOrgAdmin = await createTestUser({ label: 'reassign-other-admin', role: 'trainer' })
    const asOtherOrgAdmin = await signInAs(otherOrgAdmin.email)
    const { data: newOtherOrgId } = await asOtherOrgAdmin.rpc('create_organization', { org_name: 'Gimnasio ajeno', org_type: 'gym' })
    otherOrgId = newOtherOrgId
    otherOrgTrainer = await createTestUser({ label: 'reassign-other-trainer', role: 'trainer', organizationId: otherOrgId })
    otherOrgClient = await createTestUser({ label: 'reassign-other-client', role: 'client', trainerId: otherOrgTrainer.id })
  })

  afterAll(async () => {
    await Promise.all(
      [orgAdmin, trainerOne, trainerTwo, client, outsideTrainer, otherOrgAdmin, otherOrgTrainer, otherOrgClient]
        .filter(Boolean)
        .map((u) => deleteTestUser(u.id)),
    )
    await adminClient.from('organizations').delete().in('id', [orgId, otherOrgId].filter(Boolean))
  })

  it('el admin reasigna el cliente de un entrenador a otro de la misma organización', async () => {
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { error } = await asOrgAdmin.rpc('reassign_client', { target_client_id: client.id, new_trainer_id: trainerTwo.id })
    expect(error).toBeNull()

    const { data: row } = await adminClient.from('profiles').select('trainer_id').eq('id', client.id).single()
    expect(row.trainer_id).toBe(trainerTwo.id)
  })

  it('falla si el entrenador destino es de OTRA organización', async () => {
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { error } = await asOrgAdmin.rpc('reassign_client', { target_client_id: client.id, new_trainer_id: outsideTrainer.id })
    expect(error).not.toBeNull()
  })

  it('falla si quien llama NO es admin de ninguna organización', async () => {
    const asTrainerOne = await signInAs(trainerOne.email)
    const { error } = await asTrainerOne.rpc('reassign_client', { target_client_id: client.id, new_trainer_id: trainerTwo.id })
    expect(error).not.toBeNull()
  })

  it('el admin de una organización NO puede robar el cliente de OTRA organización real', async () => {
    const asOrgAdmin = await signInAs(orgAdmin.email)
    const { error } = await asOrgAdmin.rpc('reassign_client', {
      target_client_id: otherOrgClient.id,
      new_trainer_id: trainerTwo.id,
    })
    expect(error).not.toBeNull()

    const { data: row } = await adminClient.from('profiles').select('trainer_id').eq('id', otherOrgClient.id).single()
    expect(row.trainer_id).toBe(otherOrgTrainer.id)
  })
})
