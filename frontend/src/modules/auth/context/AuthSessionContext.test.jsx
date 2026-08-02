// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../services/authService', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
}))

import { getSession, onAuthStateChange } from '../services/authService'
import { AuthSessionProvider, useAuthSessionContext } from './AuthSessionContext'

describe('AuthSessionContext', () => {
  it('expone la sesión cargada a través del Provider', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } })
    onAuthStateChange.mockReturnValue(() => {})

    const wrapper = ({ children }) => <AuthSessionProvider>{children}</AuthSessionProvider>
    const { result } = renderHook(() => useAuthSessionContext(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.session.user.id).toBe('u1')
  })

  it('llama a getSession/onAuthStateChange una sola vez aunque varios consumidores lean el contexto', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } })
    onAuthStateChange.mockReturnValue(() => {})
    getSession.mockClear()
    onAuthStateChange.mockClear()

    const useTwoConsumers = () => {
      const a = useAuthSessionContext()
      const b = useAuthSessionContext()
      return { a, b }
    }
    const wrapper = ({ children }) => <AuthSessionProvider>{children}</AuthSessionProvider>
    const { result } = renderHook(() => useTwoConsumers(), { wrapper })

    await waitFor(() => expect(result.current.a.isLoading).toBe(false))
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(result.current.a.session).toBe(result.current.b.session)
  })

  it('lanza un error claro si se usa fuera del Provider', () => {
    const { result } = renderHook(() => {
      try {
        return useAuthSessionContext()
      } catch (err) {
        return err
      }
    })
    expect(result.current).toBeInstanceOf(Error)
    expect(result.current.message).toMatch(/AuthSessionProvider/)
  })
})
