// @vitest-environment jsdom
// Excepción deliberada a CLAUDE.md §10 ("testea el hook, nunca el
// componente"): ProtectedRoute es la frontera de seguridad entre sesión sin
// perfil cargado y contenido protegido, y no tiene un hook propio que
// exponga esa lógica — es la propia composición de useAuthSession +
// useMyProfile en el guard clause lo que hay que verificar. Nace de un bug
// real encontrado en la revisión final de rama (I2+I3): sin el guard
// isProfilePending, hay un render intermedio donde el contenido protegido
// llega a pintarse antes de que el perfil (y su redirect a /consent)
// resuelvan, por un desfase de un render entre el cambio de userId y el
// efecto de useMyProfile que corrige isLoading.
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../auth/services/authService', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
}))
vi.mock('../../auth/services/profileService', () => ({
  getMyProfile: vi.fn(),
  acceptConsent: vi.fn(),
}))

import { getSession, onAuthStateChange } from '../../auth/services/authService'
import { getMyProfile } from '../../auth/services/profileService'
import { AuthSessionProvider } from '../../auth/context/AuthSessionContext'
import { ProtectedRoute, isProfilePending } from './ProtectedRoute'

// Re-revisión acotada de la rama (2 agosto 2026): el test de más abajo, con
// muestreo de 3 puntos sobre un render async, NO detecta de forma fiable el
// render intermedio que isProfilePending existe para evitar — verificado
// reproduciendo el mismo cuerpo contra la versión sin el guard (5/5
// ejecuciones en verde, sin fallar). La tabla de verdad de la función pura
// sí es una red fiable: no depende de en qué tick exacto React decide
// re-renderizar.
describe('isProfilePending — tabla de verdad', () => {
  const session = { user: { id: 'u1' } }
  const profile = { role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null }

  it('sin sesión, nunca está pendiente (unauthenticated ya lo cubre)', () => {
    expect(isProfilePending(null, null, false, null)).toBeFalsy()
    expect(isProfilePending(null, null, true, null)).toBeFalsy()
  })

  it('con sesión y el fetch en curso, está pendiente', () => {
    expect(isProfilePending(session, null, true, null)).toBeTruthy()
  })

  it('con sesión, fetch terminado, pero sin perfil NI error (el hueco de un render), está pendiente', () => {
    expect(isProfilePending(session, null, false, null)).toBeTruthy()
  })

  it('con sesión, fetch terminado y perfil resuelto, ya NO está pendiente', () => {
    expect(isProfilePending(session, profile, false, null)).toBeFalsy()
  })

  it('con sesión, fetch terminado y error resuelto, ya NO está pendiente (lo toma profileFailed)', () => {
    expect(isProfilePending(session, null, false, 'algún error')).toBeFalsy()
  })
})

const flushTicks = async (count) => {
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('ProtectedRoute — race de sesión sin perfil resuelto', () => {
  it('nunca pinta el contenido protegido antes de que el perfil resuelva (caso: falta consentimiento)', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } })
    onAuthStateChange.mockReturnValue(() => {})
    let resolveProfile
    getMyProfile.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve }))

    const seenTexts = []
    const recordText = () => seenTexts.push(document.body.textContent)

    render(
      <AuthSessionProvider>
        <MemoryRouter initialEntries={['/trainer']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/trainer" element={<div>PROTECTED_CONTENT</div>} />
            </Route>
            <Route path="/consent" element={<div>CONSENT_PAGE</div>} />
          </Routes>
        </MemoryRouter>
      </AuthSessionProvider>
    )
    recordText()
    await flushTicks(20)
    recordText()

    resolveProfile({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    await flushTicks(20)
    recordText()

    expect(seenTexts.some((text) => text.includes('PROTECTED_CONTENT'))).toBe(false)
    expect(seenTexts.some((text) => text.includes('CONSENT_PAGE'))).toBe(true)
  })

  it('nunca pinta el contenido protegido si getMyProfile falla', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } })
    onAuthStateChange.mockReturnValue(() => {})
    let rejectProfile
    getMyProfile.mockReturnValue(new Promise((_resolve, reject) => { rejectProfile = reject }))

    const seenTexts = []
    const recordText = () => seenTexts.push(document.body.textContent)

    render(
      <AuthSessionProvider>
        <MemoryRouter initialEntries={['/trainer']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/trainer" element={<div>PROTECTED_CONTENT</div>} />
            </Route>
            <Route path="/consent" element={<div>CONSENT_PAGE</div>} />
          </Routes>
        </MemoryRouter>
      </AuthSessionProvider>
    )
    recordText()
    await flushTicks(20)
    recordText()

    rejectProfile(new Error('fila profiles inexistente'))
    await flushTicks(20)
    recordText()

    expect(seenTexts.some((text) => text.includes('PROTECTED_CONTENT'))).toBe(false)
    expect(seenTexts.some((text) => text.includes('No se pudo cargar tu perfil'))).toBe(true)
  })
})
