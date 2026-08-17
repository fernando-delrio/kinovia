import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import {
  ACCEPTANCE_PASSWORD,
  adminClient,
  createConfirmedOrganizationAdmin,
  createConfirmedUser,
  createPendingInviteForTrainer,
  findAcceptanceUserByEmail,
  findOrganizationByOwnerId,
  findProfileById,
  insertOrganizationTemplate,
  signInAsAcceptanceUser,
} from '../support/testAccounts.js'

const MARTA_EMAIL = 'marta@mailinator.com'
const NON_ADMIN_TRAINER_EMAIL = 'entrenador-no-admin@mailinator.com'
const CLIENT_WITHOUT_TRAINER_EMAIL = 'cliente-sin-entrenador@mailinator.com'

// --- Helpers de página: un nombre por intención, ningún selector suelto -----
// (mismo estilo que invitacion-y-consentimiento.steps.js; no se importan de
// ahí porque ese archivo no exporta sus helpers — cada steps file es
// autocontenido, solo comparte estado/BD vía support/testAccounts.js)

const fillCredentials = async (page, { email, password }) => {
  await page.getByPlaceholder('Email', { exact: true }).fill(email)
  await page.getByPlaceholder('Contraseña').fill(password)
}

const logInThroughUi = async (world, email) => {
  await world.page.goto(world.url('/login'))
  await fillCredentials(world.page, { email, password: ACCEPTANCE_PASSWORD })
  await world.page.getByRole('button', { name: 'Entrar' }).click()
}

const expectHeadingVisible = (page, name) =>
  page.getByRole('heading', { name }).waitFor({ state: 'visible' })

const acceptPrivacyPolicy = (page) =>
  page.getByRole('button', { name: 'Acepto la política de privacidad' }).click()

// --- Escenario 1: alta como organización, aparece como admin ---------------

When(
  'Marta se registra eligiendo {string} con el nombre {string} y ese email',
  async function (accountTypeLabel, organizationName) {
    this.organizationName = organizationName
    await this.page.goto(this.url('/signup'))
    await this.page.getByRole('radio', { name: accountTypeLabel }).check()
    await this.page.getByPlaceholder('Nombre del gimnasio/clínica').fill(organizationName)
    await fillCredentials(this.page, { email: this.trainer.email, password: ACCEPTANCE_PASSWORD })
    await this.page.getByRole('button', { name: 'Crear cuenta' }).click()
  },
)

Then('Marta ve la pantalla de consentimiento', async function () {
  await this.page.waitForURL('**/consent')
  await expectHeadingVisible(this.page, 'Antes de continuar')
})

When('Marta acepta la política de privacidad', async function () {
  await acceptPrivacyPolicy(this.page)
})

Then(
  'Marta ve su panel de entrenador con el nombre {string} y la sección para invitar entrenadores',
  async function (organizationName) {
    await this.page.waitForURL('**/trainer')
    await expectHeadingVisible(this.page, 'Panel del entrenador')
    await this.page.getByText(organizationName, { exact: true }).waitFor({ state: 'visible' })
    await expectHeadingVisible(this.page, 'Invitar entrenador a tu organización')

    // Aserción doble: la UI solo pinta la sección de invitar cuando isAdmin
    // es true, pero se confirma también en BD que create_organization()
    // (Task 7) dejó a Marta como owner real de una fila en organizations.
    const marta = await findAcceptanceUserByEmail(this.trainer.email)
    assert.ok(marta, `No existe cuenta para ${this.trainer.email}`)

    const profile = await findProfileById(marta.id)
    assert.equal(profile.role, 'trainer')
    assert.ok(profile.organization_id, 'El profile de Marta debería tener organization_id')

    const organization = await findOrganizationByOwnerId(marta.id)
    assert.ok(organization, 'No se creó ninguna organización con Marta como owner')
    assert.equal(organization.name, organizationName)
    assert.equal(profile.organization_id, organization.id)
  },
)

// --- Escenario 2: la admin invita a un entrenador a su organización --------

Given(
  'Marta es admin de {string}, autenticada y con consentimiento aceptado',
  async function (organizationName) {
    // El alta pública de Marta ya la cubre el Escenario 1. Aquí se prepara
    // el mismo estado final directo por BD (Admin API, sin mandar email)
    // para que cada escenario sea independiente de los demás.
    this.trainer = await createConfirmedOrganizationAdmin({ email: MARTA_EMAIL, organizationName })
    await logInThroughUi(this, MARTA_EMAIL)
    await this.page.waitForURL('**/trainer')
    await expectHeadingVisible(this.page, 'Panel del entrenador')
  },
)

When('Marta invita a {string} como entrenador de su gimnasio', async function (email) {
  // La UI real (InviteTrainerSection → invite-trainer Edge Function) manda
  // el invite con auth.admin.inviteUserByEmail(), y esa llamada está caída
  // ahora mismo en este proyecto Supabase (confirmado en vivo: rompe por
  // igual el invite-client ya aprobado de invitacion-y-consentimiento.feature
  // — ver el comentario detallado en createPendingInviteForTrainer,
  // testAccounts.js). Se prepara aquí el mismo estado final que dejaría la
  // Edge Function si el envío funcionara, para poder seguir probando la
  // asociación multi-tenant y la aceptación de la invitación sin depender
  // de un servicio de correo roto que está fuera del alcance de esta tarea.
  this.invitedTrainerEmail = email
  this.pendingTrainerInvite = await createPendingInviteForTrainer({
    email,
    organizationId: this.trainer.organizationId,
    redirectTo: this.url('/accept-invite'),
  })
})

Then(
  'se crea una invitación pendiente para {string} asociada a la organización de Marta',
  async function (email) {
    // La fila real es lo que importa aquí — es donde vive el aislamiento
    // multi-tenant (organization_id, no trainer_id, consentimiento pendiente).
    const invited = await findAcceptanceUserByEmail(email)
    assert.ok(invited, `No existe cuenta para ${email}`)

    const profile = await findProfileById(invited.id)
    assert.ok(profile, `No existe fila de profiles para ${email}`)
    assert.equal(profile.role, 'trainer')
    assert.equal(profile.trainer_id, null)
    assert.equal(profile.organization_id, this.trainer.organizationId)
    assert.equal(profile.consent_accepted_at, null, 'La invitación debe quedar pendiente de consentimiento')
  },
)

When('ese entrenador abre el enlace de invitación y establece su contraseña', async function () {
  await this.page.goto(this.pendingTrainerInvite.actionLink)
  await this.page.waitForURL('**/accept-invite**')
  await this.waitForStoredSession()
  await this.page.getByPlaceholder('Contraseña').fill(ACCEPTANCE_PASSWORD)
  await this.page.getByRole('button', { name: 'Continuar' }).click()
})

Then('ve la pantalla de consentimiento', async function () {
  await this.page.waitForURL('**/consent')
  await expectHeadingVisible(this.page, 'Antes de continuar')
})

When('acepta la política de privacidad', async function () {
  await acceptPrivacyPolicy(this.page)
})

Then('ve su panel de entrenador con el nombre {string}', async function (organizationName) {
  await this.page.waitForURL('**/trainer')
  await expectHeadingVisible(this.page, 'Panel del entrenador')
  await this.page.getByText(organizationName, { exact: true }).waitFor({ state: 'visible' })
})

// --- Escenario 3: cliente sin entrenador personal ve la rutina estándar ----

Given('existe una rutina estándar {string} publicada en su gimnasio', async function (routineName) {
  this.publishedRoutine = await insertOrganizationTemplate({
    organizationId: this.trainer.organizationId,
    createdBy: this.trainer.id,
    name: routineName,
    status: 'published',
  })
})

Given('existe un cliente de su gimnasio sin entrenador personal asignado', async function () {
  this.client = await createConfirmedUser({
    email: CLIENT_WITHOUT_TRAINER_EMAIL,
    role: 'client',
    organizationId: this.trainer.organizationId,
    consentAccepted: true,
  })
})

When('ese cliente entra a su cuenta', async function () {
  await logInThroughUi(this, this.client.email)
})

Then('ve la rutina {string} en su panel', async function (routineName) {
  await this.page.waitForURL('**/client')
  await expectHeadingVisible(this.page, 'Tu plan')
  await this.page.getByText(routineName, { exact: true }).waitFor({ state: 'visible' })
})

// --- Escenario 4: un entrenador no admin no puede publicar una rutina ------

Given(
  'un entrenador de {string} \\(no admin\\), autenticado y con consentimiento aceptado',
  async function (organizationName) {
    const admin = await createConfirmedOrganizationAdmin({ email: MARTA_EMAIL, organizationName })
    const trainer = await createConfirmedUser({
      email: NON_ADMIN_TRAINER_EMAIL,
      role: 'trainer',
      organizationId: admin.organizationId,
      consentAccepted: true,
    })
    this.trainer = { ...trainer, organizationId: admin.organizationId }

    await logInThroughUi(this, NON_ADMIN_TRAINER_EMAIL)
    await this.page.waitForURL('**/trainer')
    await expectHeadingVisible(this.page, 'Panel del entrenador')
  },
)

Given('ha propuesto una rutina estándar {string} \\(queda en borrador\\)', async function (routineName) {
  this.proposedRoutine = await insertOrganizationTemplate({
    organizationId: this.trainer.organizationId,
    createdBy: this.trainer.id,
    name: routineName,
    status: 'draft',
  })
})

When('intenta publicarla él mismo', async function () {
  // La UI ni siquiera pinta el botón "Publicar" para un no-admin
  // (StandardRoutinesSection: isAdmin && status === 'draft') — el intento
  // real de saltarse eso se prueba directo contra la política RLS de
  // update, que es la frontera de seguridad de verdad, no el botón
  // escondido en el panel.
  const clientAsTrainer = await signInAsAcceptanceUser(this.trainer.email)
  const { data, error } = await clientAsTrainer
    .from('plan_templates')
    .update({ status: 'published' })
    .eq('id', this.proposedRoutine.id)
    .select('id')
  this.publishAttempt = { data, error }
})

Then('la acción se rechaza y la rutina sigue en borrador', async function () {
  // plan_templates_update_organization_creator_draft deja ver/tocar la fila
  // propia mientras siga en draft, pero su WITH CHECK exige que el estado
  // siga siendo 'draft' tras el update — publicar viola ese WITH CHECK y
  // Postgres puede rechazar la sentencia entera con un error explícito, a
  // diferencia del caso "fila invisible" (0 filas, sin error) de otras
  // políticas RLS. Se acepta cualquiera de las dos formas de rechazo y,
  // sobre todo, se verifica el estado real en BD.
  const wasRejected = Boolean(this.publishAttempt.error) || (this.publishAttempt.data ?? []).length === 0
  assert.ok(wasRejected, 'El update de un no-admin no debería haber tenido éxito')

  const { data: template, error } = await adminClient
    .from('plan_templates')
    .select('status')
    .eq('id', this.proposedRoutine.id)
    .single()
  if (error) throw error
  assert.equal(template.status, 'draft')
})
