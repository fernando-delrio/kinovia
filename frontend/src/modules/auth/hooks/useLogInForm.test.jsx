// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const navigateMock = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }))

vi.mock('../services/authService', () => ({ signIn: vi.fn() }))
vi.mock('../services/profileService', () => ({ getMyProfile: vi.fn() }))

import { signIn } from '../services/authService'
import { getMyProfile } from '../services/profileService'
import { useLogInForm } from './useLogInForm'

describe('useLogInForm', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    signIn.mockReset()
    getMyProfile.mockReset()
  })

  it('navega a /consent si el perfil todavía no aceptó la política', async () => {
    signIn.mockResolvedValue({ user: { id: 'user-1' } })
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: null, displayName: null })
    const { result } = renderHook(() => useLogInForm())

    await act(async () => { await result.current.submit({ email: 'a@a.com', password: 'x' }) })

    expect(navigateMock).toHaveBeenCalledWith('/consent')
  })

  it('navega a /trainer si el perfil es de un entrenador con consentimiento aceptado', async () => {
    signIn.mockResolvedValue({ user: { id: 'user-1' } })
    getMyProfile.mockResolvedValue({ role: 'trainer', trainerId: null, consentAcceptedAt: '2026-08-01T00:00:00.000Z', displayName: null })
    const { result } = renderHook(() => useLogInForm())

    await act(async () => { await result.current.submit({ email: 'a@a.com', password: 'x' }) })

    expect(navigateMock).toHaveBeenCalledWith('/trainer')
  })

  it('navega a /client si el perfil es de un cliente con consentimiento aceptado', async () => {
    signIn.mockResolvedValue({ user: { id: 'user-2' } })
    getMyProfile.mockResolvedValue({ role: 'client', trainerId: 'trainer-1', consentAcceptedAt: '2026-08-01T00:00:00.000Z', displayName: null })
    const { result } = renderHook(() => useLogInForm())

    await act(async () => { await result.current.submit({ email: 'b@b.com', password: 'x' }) })

    expect(navigateMock).toHaveBeenCalledWith('/client')
  })

  it('NO navega y expone el error si signIn falla', async () => {
    signIn.mockRejectedValue(new Error('credenciales inválidas'))
    const { result } = renderHook(() => useLogInForm())

    await act(async () => { await result.current.submit({ email: 'a@a.com', password: 'x' }) })

    expect(getMyProfile).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.error).toBe('credenciales inválidas')
  })
})
