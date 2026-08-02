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

  it('un cliente NO puede auto-promocionarse a trainer', async () => {
    const asClientOfA = await signInAs(clientOfA.email)
    const { error } = await asClientOfA
      .from('profiles')
      .update({ role: 'trainer', trainer_id: null })
      .eq('id', clientOfA.id)
    expect(error).not.toBeNull()

    const { data: realRow } = await adminClient.from('profiles').select('role').eq('id', clientOfA.id).single()
    expect(realRow.role).toBe('client')
  })

  it('un usuario SÍ puede seguir actualizando su propio display_name', async () => {
    const asClientOfA = await signInAs(clientOfA.email)
    const { data, error } = await asClientOfA
      .from('profiles')
      .update({ display_name: 'Nombre actualizado' })
      .eq('id', clientOfA.id)
      .select('display_name')
    expect(error).toBeNull()
    expect(data[0].display_name).toBe('Nombre actualizado')
  })

  it('un entrenador puede crear su propia fila (self-insert), nunca de rol client', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { error: forbiddenInsert } = await asTrainerA
      .from('profiles')
      .insert({ id: trainerA.id, role: 'client', trainer_id: trainerA.id })
    expect(forbiddenInsert).not.toBeNull()
  })

  it('trainer B NO puede leer consent_accepted_at de un cliente de trainer A', async () => {
    const asTrainerB = await signInAs(trainerB.email)
    const { data, error } = await asTrainerB.from('profiles').select('consent_accepted_at').eq('id', clientOfA.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('un entrenador NO puede fijar consent_accepted_at en su propio self-insert', async () => {
    // createTestUser() no sirve aquí: siempre inserta la fila de profiles vía
    // adminClient (bypasea RLS) como parte del helper, así que la fila ya
    // existiría antes de intentar el insert prohibido — el segundo insert
    // fallaría por violar la primary key, no por el GRANT, dando un falso
    // positivo. En su lugar, se crea el usuario de auth a mano (sin fila de
    // profiles) y se intenta el self-insert prohibido directamente.
    const email = `rls-test-trainer-fake-consent-${Date.now()}-${Math.random().toString(36).slice(2)}@kinovia.test`
    const password = 'rls-test-password-123!'
    const { data, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    expect(createError).toBeNull()
    const fakeTrainerId = data.user.id

    try {
      const asFakeTrainer = await signInAs(email)
      const { error } = await asFakeTrainer
        .from('profiles')
        .insert({
          id: fakeTrainerId,
          role: 'trainer',
          trainer_id: null,
          display_name: 'trainer-fake-consent',
          consent_accepted_at: new Date().toISOString(),
        })
      expect(error).not.toBeNull()

      // confirma con el cliente admin que no quedó ninguna fila filtrada
      const { data: realRow } = await adminClient.from('profiles').select('id').eq('id', fakeTrainerId)
      expect(realRow).toHaveLength(0)
    } finally {
      await deleteTestUser(fakeTrainerId)
    }
  })

  it('accept_consent() fija el consentimiento propio con el timestamp del servidor', async () => {
    const freshUser = await createTestUser({ label: 'consent-accept', role: 'trainer' })
    const asFreshUser = await signInAs(freshUser.email)

    const { data, error } = await asFreshUser.rpc('accept_consent')
    expect(error).toBeNull()
    expect(data).not.toBeNull()

    const { data: row } = await adminClient.from('profiles').select('consent_accepted_at').eq('id', freshUser.id).single()
    expect(row.consent_accepted_at).toBe(data)

    await deleteTestUser(freshUser.id)
  })

  it('accept_consent() NO permite reaceptar ni retrodatar un consentimiento ya fijado', async () => {
    const freshUser = await createTestUser({ label: 'consent-reaccept', role: 'trainer' })
    const asFreshUser = await signInAs(freshUser.email)

    await asFreshUser.rpc('accept_consent')
    const { error: secondCallError } = await asFreshUser.rpc('accept_consent')
    expect(secondCallError).not.toBeNull()

    await deleteTestUser(freshUser.id)
  })

  it('un usuario ya NO puede fijar consent_accepted_at por UPDATE directo', async () => {
    const asTrainerA = await signInAs(trainerA.email)
    const { error } = await asTrainerA
      .from('profiles')
      .update({ consent_accepted_at: new Date().toISOString() })
      .eq('id', trainerA.id)
    expect(error).not.toBeNull()
  })
})
