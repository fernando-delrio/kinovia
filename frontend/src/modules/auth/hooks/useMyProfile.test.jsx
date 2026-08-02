// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../services/profileService', () => ({
  getMyProfile: vi.fn(),
  acceptConsent: vi.fn(),
}))

import { getMyProfile, acceptConsent } from '../services/profileService'
import { useMyProfile } from './useMyProfile'

describe('useMyProfile', () => {
  it('carga el perfil al montar', async () => {
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    const { result } = renderHook(() => useMyProfile('1'))
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.profile.role).toBe('trainer')
  })

  it('vuelve a isLoading=true cuando userId pasa de undefined a un valor real', async () => {
    let resolveProfile
    getMyProfile.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve }))
    const { result, rerender } = renderHook(({ userId }) => useMyProfile(userId), {
      initialProps: { userId: undefined },
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    rerender({ userId: '1' })
    expect(result.current.isLoading).toBe(true)

    resolveProfile({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('accept() actualiza consentAcceptedAt en el estado y resuelve a true', async () => {
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    acceptConsent.mockResolvedValue('2026-08-01T00:00:00.000Z')
    const { result } = renderHook(() => useMyProfile('1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    let acceptResult
    await act(async () => { acceptResult = await result.current.accept() })
    expect(result.current.profile.consentAcceptedAt).toBe('2026-08-01T00:00:00.000Z')
    expect(acceptResult).toBe(true)
  })

  it('accept() resuelve a false y setea error cuando acceptConsent falla', async () => {
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    acceptConsent.mockRejectedValue(new Error('No se pudo guardar el consentimiento'))
    const { result } = renderHook(() => useMyProfile('1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    let acceptResult
    await act(async () => { acceptResult = await result.current.accept() })
    expect(acceptResult).toBe(false)
    expect(result.current.error).toBe('No se pudo guardar el consentimiento')
  })
})
