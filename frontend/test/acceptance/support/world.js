import { After, Before, setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber'
import { chromium } from 'playwright'
import { purgeAcceptanceUsers } from './testAccounts.js'

// Cada paso habla con Supabase real y con un navegador real: los 5 s por
// defecto de Cucumber se quedan cortos en cuanto hay una red de por medio.
setDefaultTimeout(60_000)

const BASE_URL = process.env.ACCEPTANCE_BASE_URL ?? 'http://localhost:5173'
const HEADLESS = process.env.ACCEPTANCE_HEADED !== 'true'

export class KinoviaWorld extends World {
  browser = null
  context = null
  page = null
  // Estado que un paso deja preparado para el siguiente dentro del escenario
  trainer = null
  invite = null

  url = (path) => `${BASE_URL}${path}`

  open = async () => {
    this.browser = await chromium.launch({ headless: HEADLESS })
    // Contexto nuevo por escenario: localStorage limpio, así que ninguna
    // sesión de Supabase se filtra de un escenario al siguiente.
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()
  }

  close = async () => {
    await this.browser?.close()
  }

  // supabase-js detecta el hash #access_token=... al cargar la página y crea
  // la sesión de forma asíncrona. Escribir la contraseña antes de que termine
  // haría fallar updateUser con "Auth session missing", así que se espera a
  // ver la sesión persistida en localStorage.
  waitForStoredSession = () =>
    this.page.waitForFunction(() =>
      Object.keys(window.localStorage).some((key) => key.startsWith('sb-') && key.includes('auth-token')),
    )
}

setWorldConstructor(KinoviaWorld)

// Se limpia antes y después: antes para que un escenario no herede la basura
// de una ejecución anterior abortada, después para no dejar cuentas huérfanas
// en el proyecto Supabase real.
Before(async function () {
  await purgeAcceptanceUsers()
  await this.open()
})

After(async function () {
  await this.close()
  await purgeAcceptanceUsers()
})
