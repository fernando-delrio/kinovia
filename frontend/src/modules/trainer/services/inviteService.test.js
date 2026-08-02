import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../../core/lib/api', () => ({ supabase: { functions: { invoke: (...args) => invoke(...args) } } }))

import { inviteClient } from './inviteService'

describe('inviteService', () => {
  it('llama a la Edge Function invite-client con el email', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    await inviteClient('laura@kinovia.test')
    expect(invoke).toHaveBeenCalledWith('invite-client', { body: { email: 'laura@kinovia.test' } })
  })

  it('lanza con el mensaje genérico si el error no trae context (sin cuerpo que leer)', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'ese email ya tiene cuenta' } })
    await expect(inviteClient('bruno@kinovia.test')).rejects.toThrow('ese email ya tiene cuenta')
  })

  it('lanza con el mensaje real extraído de error.context (cuerpo de la respuesta) en vez del texto genérico', async () => {
    const context = {
      clone: () => ({ json: () => Promise.resolve({ error: 'Ese email ya tiene cuenta' }) }),
    }
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context },
    })
    await expect(inviteClient('bruno@kinovia.test')).rejects.toThrow('Ese email ya tiene cuenta')
  })

  it('cae al mensaje genérico si error.context.clone().json() falla (cuerpo no es JSON válido)', async () => {
    const context = {
      clone: () => ({ json: () => Promise.reject(new Error('body is not valid JSON')) }),
    }
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context },
    })
    await expect(inviteClient('bruno@kinovia.test')).rejects.toThrow('Edge Function returned a non-2xx status code')
  })

  it('cae al mensaje genérico sin reventar si error.context no es un Response clonable (fallo de red, no HTTP)', async () => {
    // FunctionsFetchError deja algo en `context` que no es la Response de un
    // servidor real (la petición nunca llegó a completarse) — sin `.clone`,
    // llamarlo a pelo lanzaría un TypeError síncrono que ningún try/catch
    // del service debería tener que atrapar (el service nunca usa try/catch).
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Failed to send a request to the Edge Function', context: { some: 'non-response-object' } },
    })
    await expect(inviteClient('bruno@kinovia.test')).rejects.toThrow('Failed to send a request to the Edge Function')
  })
})
