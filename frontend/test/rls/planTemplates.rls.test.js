import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

describe('plan_templates RLS (personal)', () => {
  let trainerA
  let trainerB

  beforeAll(async () => {
    trainerA = await createTestUser({ label: 'templates-trainer-a', role: 'trainer' })
    trainerB = await createTestUser({ label: 'templates-trainer-b', role: 'trainer' })
  })

  afterAll(async () => {
    await Promise.all([trainerA, trainerB].filter(Boolean).map((user) => deleteTestUser(user.id)))
  })

  it('un entrenador crea y lee su propia plantilla', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data: inserted, error: insertError } = await asTrainerA
      .from('plan_templates')
      .insert({ name: 'Fuerza básica', content: { fases: [] } })
      .select('id')
      .single()
    expect(insertError).toBeNull()

    const { data, error } = await asTrainerA.from('plan_templates').select('id').eq('id', inserted.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)

    await adminClient.from('plan_templates').delete().eq('id', inserted.id)
  })

  it('trainer B NO ve las plantillas de trainer A', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data: inserted } = await asTrainerA
      .from('plan_templates')
      .insert({ name: 'Privada de A', content: { fases: [] } })
      .select('id')
      .single()

    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB.from('plan_templates').select('id').eq('id', inserted.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    await adminClient.from('plan_templates').delete().eq('id', inserted.id)
  })

  it('trainer B NO puede insertar una plantilla a nombre de trainer A', async () => {
    const asTrainerB = await signInAs(trainerB.email)
    const { error } = await asTrainerB
      .from('plan_templates')
      .insert({ trainer_id: trainerA.id, name: 'Suplantada', content: {} })
    expect(error).not.toBeNull()
  })

  it('trainer B NO puede actualizar la plantilla de trainer A', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data: inserted } = await asTrainerA
      .from('plan_templates')
      .insert({ name: 'Original', content: {} })
      .select('id')
      .single()

    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB
      .from('plan_templates')
      .update({ name: 'hackeada' })
      .eq('id', inserted.id)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    const { data: realRow } = await adminClient.from('plan_templates').select('name').eq('id', inserted.id).single()
    expect(realRow.name).toBe('Original')

    await adminClient.from('plan_templates').delete().eq('id', inserted.id)
  })

  it('trainer B NO puede borrar la plantilla de trainer A', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data: inserted } = await asTrainerA
      .from('plan_templates')
      .insert({ name: 'Persistente', content: {} })
      .select('id')
      .single()

    const asTrainerB = await signInAs(trainerB.email)
    await asTrainerB.from('plan_templates').delete().eq('id', inserted.id)

    const { data: stillThere } = await adminClient.from('plan_templates').select('id').eq('id', inserted.id)
    expect(stillThere).toHaveLength(1)

    await adminClient.from('plan_templates').delete().eq('id', inserted.id)
  })
})
