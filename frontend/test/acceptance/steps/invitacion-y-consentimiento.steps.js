import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import {
  ACCEPTANCE_PASSWORD,
  createConfirmedUser,
  createPendingInvite,
  findAcceptanceUserByEmail,
  findProfileById,
} from '../support/testAccounts.js'

const ANA_EMAIL = 'ana@mailinator.com'

// --- Helpers de página: un nombre por intención, ningún selector suelto -----

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

const expectHeadingAbsent = async (page, name) => {
  const count = await page.getByRole('heading', { name }).count()
  assert.equal(count, 0, `No debería verse el encabezado "${name}"`)
}

const acceptPrivacyPolicy = (page) =>
  page.getByRole('button', { name: 'Acepto la política de privacidad' }).click()

const inviteClientThroughUi = async (page, email) => {
  await page.getByPlaceholder('Email del cliente').fill(email)
  await page.getByRole('button', { name: 'Invitar' }).click()
}

// --- Escenario 1: alta de entrenador + gate de consentimiento --------------

Given('no existe ninguna cuenta con el email {string}', async function (email) {
  // El hook Before ya purga el dominio de aceptación; este paso lo verifica
  // en vez de darlo por hecho — es la precondición literal del escenario.
  const user = await findAcceptanceUserByEmail(email)
  assert.equal(user, null, `Esperaba que ${email} no existiera y sí existe`)
  this.trainer = { email }
})

When('Ana se registra como entrenadora con ese email y una contraseña válida', async function () {
  await this.page.goto(this.url('/signup'))
  await fillCredentials(this.page, { email: this.trainer.email, password: ACCEPTANCE_PASSWORD })
  await this.page.getByRole('button', { name: 'Crear cuenta' }).click()
})

Then('Ana ve la pantalla de consentimiento, no el panel de entrenador', async function () {
  await this.page.waitForURL('**/consent')
  await expectHeadingVisible(this.page, 'Antes de continuar')
  await expectHeadingAbsent(this.page, 'Panel del entrenador')
})

When('Ana acepta la política de privacidad', async function () {
  await acceptPrivacyPolicy(this.page)
})

Then('Ana ve su panel de entrenador', async function () {
  await this.page.waitForURL('**/trainer')
  await expectHeadingVisible(this.page, 'Panel del entrenador')
})

// --- Escenario 2 y 4: invitación desde el panel del entrenador -------------

Given('Ana es una entrenadora autenticada y con consentimiento aceptado', async function () {
  // El alta pública de Ana ya la cubre el escenario 1. Aquí se crea con la
  // Admin API (que no manda email) para no gastar cuota de envío del plan
  // gratuito y para que el escenario sea independiente del anterior.
  this.trainer = await createConfirmedUser({ email: ANA_EMAIL, role: 'trainer', consentAccepted: true })
  await logInThroughUi(this, ANA_EMAIL)
  await this.page.waitForURL('**/trainer')
  await expectHeadingVisible(this.page, 'Panel del entrenador')
})

Given('ya existe una cuenta de entrenador con el email {string}', async function (email) {
  await createConfirmedUser({ email, role: 'trainer', consentAccepted: true })
})

When('Ana invita a {string} como cliente', async function (email) {
  this.invitedEmail = email
  await inviteClientThroughUi(this.page, email)
})

Then('se crea una invitación pendiente para {string} asociada a Ana', async function (email) {
  await this.page.getByText(`Invitación enviada a ${email}`).waitFor({ state: 'visible' })

  // La confirmación visual no basta: se comprueba la fila real que dejó la
  // Edge Function, que es donde vive el aislamiento multi-tenant.
  const invited = await findAcceptanceUserByEmail(email)
  assert.ok(invited, `No existe cuenta para ${email}`)

  const profile = await findProfileById(invited.id)
  assert.ok(profile, `No existe fila de profiles para ${email}`)
  assert.equal(profile.role, 'client')
  assert.equal(profile.trainer_id, this.trainer.id)
  assert.equal(profile.consent_accepted_at, null, 'La invitación debe quedar pendiente de consentimiento')
})

Then('la invitación se rechaza con un mensaje claro', async function () {
  const message = this.page.locator('p.text-red-600')
  await message.waitFor({ state: 'visible' })
  const text = await message.innerText()
  assert.match(text, /ya tiene cuenta/i, `Mensaje poco claro para el entrenador: "${text}"`)

  // Y el rechazo tiene que ser real: la cuenta existente sigue siendo la que era.
  const bruno = await findAcceptanceUserByEmail(this.invitedEmail)
  const profile = await findProfileById(bruno.id)
  assert.equal(profile.role, 'trainer', 'La invitación rechazada no debe tocar la cuenta existente')
  assert.equal(profile.trainer_id, null)
})

// --- Escenario 3: el cliente acepta la invitación --------------------------

Given('existe una invitación pendiente para {string} de Ana', async function (email) {
  this.trainer = await createConfirmedUser({ email: ANA_EMAIL, role: 'trainer', consentAccepted: true })
  // generateLink deja exactamente el mismo estado que la Edge Function
  // (auth.user invitado + fila profiles pendiente) pero devolviendo el enlace
  // en vez de mandarlo por correo — no hay forma de leer un email real aquí.
  this.invite = await createPendingInvite({
    email,
    trainerId: this.trainer.id,
    redirectTo: this.url('/accept-invite'),
  })
})

When('Laura abre el enlace de invitación y establece su contraseña', async function () {
  await this.page.goto(this.invite.actionLink)
  await this.page.waitForURL('**/accept-invite**')
  await this.waitForStoredSession()
  await this.page.getByPlaceholder('Contraseña').fill(ACCEPTANCE_PASSWORD)
  await this.page.getByRole('button', { name: 'Continuar' }).click()
})

Then('Laura ve la pantalla de consentimiento, no la vista de cliente', async function () {
  await this.page.waitForURL('**/consent')
  await expectHeadingVisible(this.page, 'Antes de continuar')
  await expectHeadingAbsent(this.page, 'Tu plan')
})

When('Laura acepta la política de privacidad', async function () {
  await acceptPrivacyPolicy(this.page)
})

Then('Laura ve su propia vista de cliente', async function () {
  await this.page.waitForURL('**/client')
  await expectHeadingVisible(this.page, 'Tu plan')
})
