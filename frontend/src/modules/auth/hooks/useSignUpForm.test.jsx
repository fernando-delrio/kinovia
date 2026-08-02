// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const navigateMock = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }))

vi.mock('../services/authService', () => ({ signUp: vi.fn() }))
vi.mock('../services/profileService', () => ({ createTrainerProfile: vi.fn() }))

import { signUp } from '../services/authService'
import { createTrainerProfile } from '../services/profileService'
import { useSignUpForm } from './useSignUpForm'

describe('useSignUpForm', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    signUp.mockReset()
    createTrainerProfile.mockReset()
  })

  it('crea el perfil y navega a /consent si signUp y createTrainerProfile tienen éxito', async () => {
    signUp.mockResolvedValue({ user: { id: 'user-1' } })
    createTrainerProfile.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSignUpForm())

    await act(async () => { await result.current.submit({ email: 'a@a.com', password: 'x' }) })

    expect(createTrainerProfile).toHaveBeenCalledWith('user-1')
    expect(navigateMock).toHaveBeenCalledWith('/consent')
    expect(result.current.error).toBeNull()
  })

  it('NO navega y expone el error si createTrainerProfile falla tras un signUp correcto', async () => {
    signUp.mockResolvedValue({ user: { id: 'user-1' } })
    createTrainerProfile.mockRejectedValue(new Error('fallo al crear perfil'))
    const { result } = renderHook(() => useSignUpForm())

    await act(async () => { await result.current.submit({ email: 'a@a.com', password: 'x' }) })

    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.error).toBe('fallo al crear perfil')
  })

  it('NO llama a createTrainerProfile si signUp falla', async () => {
    signUp.mockRejectedValue(new Error('email ya registrado'))
    const { result } = renderHook(() => useSignUpForm())

    await act(async () => { await result.current.submit({ email: 'a@a.com', password: 'x' }) })

    expect(createTrainerProfile).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.error).toBe('email ya registrado')
  })
})
