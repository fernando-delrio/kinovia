import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('plan_templates RLS (organización)', () => {
  let orgAId
  let orgBId
  let adminA
  let adminB
  let trainerInA
  let trainerInB
  let clientInA
  let independentTrainer

  beforeAll(async () => {
    adminA = await createTestUser({ label: 'pt-org-admin-a', role: 'trainer' })
    const asAdminA = await signInAs(adminA.email)
    const { data: newOrgA, error: orgAError } = await asAdminA.rpc('create_organization', { org_name: 'PT Org A', org_type: 'gym' })
    if (orgAError) throw orgAError
    orgAId = newOrgA

    adminB = await createTestUser({ label: 'pt-org-admin-b', role: 'trainer' })
    const asAdminB = await signInAs(adminB.email)
    const { data: newOrgB, error: orgBError } = await asAdminB.rpc('create_organization', { org_name: 'PT Org B', org_type: 'gym' })
    if (orgBError) throw orgBError
    orgBId = newOrgB

    trainerInA = await createTestUser({ label: 'pt-trainer-in-a', role: 'trainer', organizationId: orgAId })
    trainerInB = await createTestUser({ label: 'pt-trainer-in-b', role: 'trainer', organizationId: orgBId })
    clientInA = await createTestUser({ label: 'pt-client-in-a', role: 'client', trainerId: trainerInA.id, organizationId: orgAId })
    independentTrainer = await createTestUser({ label: 'pt-trainer-independent', role: 'trainer' })
  })

  afterAll(async () => {
    await Promise.all(
      [adminA, adminB, trainerInA, trainerInB, clientInA, independentTrainer].filter(Boolean).map((user) => deleteTestUser(user.id)),
    )
    await adminClient.from('organizations').delete().in('id', [orgAId, orgBId].filter(Boolean))
  })

  const insertDraft = async (asTrainer, organizationId, createdBy, name) => {
    const { data, error } = await asTrainer
      .from('plan_templates')
      .insert({ organization_id: organizationId, trainer_id: null, name, content: {}, status: 'draft', created_by: createdBy })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }

  it('un entrenador de la organización ve un draft propuesto por otro entrenador de la misma organización', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft visible para la org')

    const asAdminA = await signInAs(adminA.email)
    const { data, error } = await asAdminA.from('plan_templates').select('id').eq('id', draftId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('un cliente de la organización NO ve un draft, solo plantillas publicadas', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft oculto al cliente')

    const asClientInA = await signInAs(clientInA.email)
    const { data: draftView, error: draftError } = await asClientInA.from('plan_templates').select('id').eq('id', draftId)
    expect(draftError).toBeNull()
    expect(draftView).toHaveLength(0)

    await adminClient.from('plan_templates').update({ status: 'published' }).eq('id', draftId)
    const { data: publishedView, error: publishedError } = await asClientInA.from('plan_templates').select('id').eq('id', draftId)
    expect(publishedError).toBeNull()
    expect(publishedView).toHaveLength(1)

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('un entrenador de otra organización NO ve el draft (aislamiento entre organizaciones)', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft ajeno a org B')

    const asTrainerInB = await signInAs(trainerInB.email)
    const { data, error } = await asTrainerInB.from('plan_templates').select('id').eq('id', draftId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('el creador puede editar name/content de su draft mientras siga en draft', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft editable')

    const { error } = await asTrainerInA.from('plan_templates').update({ name: 'Draft editado', content: { fases: [1] } }).eq('id', draftId)
    expect(error).toBeNull()

    const { data: row } = await adminClient.from('plan_templates').select('name').eq('id', draftId).single()
    expect(row.name).toBe('Draft editado')

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('el creador NO puede auto-publicar su propio draft (cambiar status)', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft que no debe auto-publicarse')

    const { error } = await asTrainerInA.from('plan_templates').update({ status: 'published' }).eq('id', draftId)
    expect(error).not.toBeNull()

    const { data: row } = await adminClient.from('plan_templates').select('status').eq('id', draftId).single()
    expect(row.status).toBe('draft')

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('el admin de la organización puede publicar un draft propuesto por otro entrenador', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft que el admin publica')

    const asAdminA = await signInAs(adminA.email)
    const { error } = await asAdminA.from('plan_templates').update({ status: 'published' }).eq('id', draftId)
    expect(error).toBeNull()

    const { data: row } = await adminClient.from('plan_templates').select('status').eq('id', draftId).single()
    expect(row.status).toBe('published')

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('un entrenador independiente NO puede proponer una plantilla de organización ajena', async () => {
    const asIndependent = await signInAs(independentTrainer.email)
    const { error } = await asIndependent
      .from('plan_templates')
      .insert({ organization_id: orgAId, trainer_id: null, name: 'Intrusa', content: {}, status: 'draft', created_by: independentTrainer.id })
    expect(error).not.toBeNull()
  })

  it('un entrenador de la organización NO puede insertar una plantilla ya publicada directamente', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { error } = await asTrainerInA
      .from('plan_templates')
      .insert({ organization_id: orgAId, trainer_id: null, name: 'Trampa publicada', content: {}, status: 'published', created_by: trainerInA.id })
    expect(error).not.toBeNull()
  })

  it('regresión (dirección simétrica): un entrenador NO puede convertir su plantilla PERSONAL en una de organización', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const { data: personal, error: insertError } = await asTrainerInA
      .from('plan_templates')
      .insert({ name: 'Plantilla personal de A', content: {} })
      .select('id')
      .single()
    expect(insertError).toBeNull()

    const { error: convertError } = await asTrainerInA
      .from('plan_templates')
      .update({ trainer_id: null, organization_id: orgAId })
      .eq('id', personal.id)
    expect(convertError).not.toBeNull()

    const { data: row } = await adminClient.from('plan_templates').select('trainer_id, organization_id').eq('id', personal.id).single()
    expect(row.trainer_id).toBe(trainerInA.id)
    expect(row.organization_id).toBeNull()

    await adminClient.from('plan_templates').delete().eq('id', personal.id)
  })

  it('un compañero de la organización (ni creador ni admin) NO puede editar el draft de otro entrenador', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft de A, no tocar')

    const colleagueInA = await createTestUser({ label: 'pt-colleague-in-a', role: 'trainer', organizationId: orgAId })
    const asColleague = await signInAs(colleagueInA.email)
    const { data, error } = await asColleague
      .from('plan_templates')
      .update({ name: 'Tocado por un compañero' })
      .eq('id', draftId)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    const { data: row } = await adminClient.from('plan_templates').select('name').eq('id', draftId).single()
    expect(row.name).toBe('Draft de A, no tocar')

    await deleteTestUser(colleagueInA.id)
    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('regresión: un entrenador NO puede mover el organization_id de su propio draft a otra organización', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft objetivo de secuestro cross-org')

    const { error } = await asTrainerInA.from('plan_templates').update({ organization_id: orgBId }).eq('id', draftId)
    expect(error).not.toBeNull()

    const { data: row } = await adminClient.from('plan_templates').select('organization_id').eq('id', draftId).single()
    expect(row.organization_id).toBe(orgAId)

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })

  it('regresión: un entrenador NO puede privatizar su draft de organización (trainer_id propio + organization_id null) para auto-publicarlo después', async () => {
    const asTrainerInA = await signInAs(trainerInA.email)
    const draftId = await insertDraft(asTrainerInA, orgAId, trainerInA.id, 'Draft objetivo de privatización')

    const { error: privatizeError } = await asTrainerInA
      .from('plan_templates')
      .update({ trainer_id: trainerInA.id, organization_id: null })
      .eq('id', draftId)
    expect(privatizeError).not.toBeNull()

    const { data: row } = await adminClient.from('plan_templates').select('trainer_id, organization_id, status').eq('id', draftId).single()
    expect(row.trainer_id).toBeNull()
    expect(row.organization_id).toBe(orgAId)
    expect(row.status).toBe('draft')

    await adminClient.from('plan_templates').delete().eq('id', draftId)
  })
})
