import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, signInAs } from './testUsers'

// Test de aislamiento entre tenants — no negociable (NORMAS_INAMOVIBLES.md §6).
// Corre contra el proyecto Supabase real (no mocks): dos entrenadores y un
// cliente de prueba, confirmando que RLS y no la aplicación es quien aísla.
describe('profiles RLS', () => {
  let trainerA
  let trainerB
  let clientOfA

  beforeAll(async () => {
    trainerA = await createTestUser({ label: 'trainer-a', role: 'trainer' })
    trainerB = await createTestUser({ label: 'trainer-b', role: 'trainer' })
    clientOfA = await createTestUser({ label: 'client-of-a', role: 'client', trainerId: trainerA.id })
  })

  afterAll(async () => {
    await Promise.all(
      [trainerA, trainerB, clientOfA].filter(Boolean).map((user) => deleteTestUser(user.id)),
    )
  })

  it('un entrenador ve su propia fila', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data, error } = await asTrainerA.from('profiles').select('id').eq('id', trainerA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('un entrenador ve la fila de su propio cliente', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { data, error } = await asTrainerA.from('profiles').select('id').eq('id', clientOfA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('trainer B NO puede leer la fila de trainer A', async () => {
    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB.from('profiles').select('id').eq('id', trainerA.id)

    // RLS oculta la fila — no es un error 403 explícito, la respuesta viene vacía.
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('trainer B NO puede leer la fila del cliente de trainer A', async () => {
    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB.from('profiles').select('id').eq('id', clientOfA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('trainer B NO puede actualizar la fila de trainer A', async () => {
    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB
      .from('profiles')
      .update({ display_name: 'hackeado' })
      .eq('id', trainerA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    // confirma con el cliente admin que la fila real de trainer A no cambió
    const { data: realRow } = await adminClient.from('profiles').select('display_name').eq('id', trainerA.id).single()
    expect(realRow.display_name).toBe('trainer-a')
  })
})
