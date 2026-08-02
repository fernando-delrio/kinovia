import { describe, expect, it, vi } from 'vitest'

vi.mock('../../core/lib/api', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

import { supabase } from '../../core/lib/api'
import { signUp, signIn, acceptInvite } from './authService'

describe('authService', () => {
  it('signUp devuelve la sesión si Supabase no da error', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: { user: { id: '1' } } }, error: null })
    const session = await signUp({ email: 'a@a.com', password: 'x' })
    expect(session.user.id).toBe('1')
  })

  it('signUp lanza con el mensaje de Supabase si falla', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: null, error: { message: 'ya existe' } })
    await expect(signUp({ email: 'a@a.com', password: 'x' })).rejects.toThrow('ya existe')
  })

  it('signIn devuelve la sesión si Supabase no da error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: '1' } } }, error: null })
    const session = await signIn({ email: 'a@a.com', password: 'x' })
    expect(session.user.id).toBe('1')
  })

  it('acceptInvite devuelve el usuario si Supabase no da error', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: { user: { id: '2' } }, error: null })
    const user = await acceptInvite({ password: 'x' })
    expect(user.id).toBe('2')
  })
})
