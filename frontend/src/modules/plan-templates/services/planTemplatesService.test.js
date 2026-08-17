import { describe, expect, it, vi } from 'vitest'

const single = vi.fn()
// select ahora devuelve un objeto con tanto .order() como .eq() para soportar
// tanto listMyTemplates como listOrganizationTemplates (Task 19)
const select = vi.fn(() => ({
  order: () => Promise.resolve({ data: [], error: null }),
  eq: vi.fn(() => ({
    order: () => Promise.resolve({ data: [], error: null }),
  })),
}))
const insertSelect = vi.fn(() => ({ single }))
const insert = vi.fn(() => ({ select: insertSelect }))
const from = vi.fn(() => ({ select, insert }))

vi.mock('../../core/lib/api', () => ({ supabase: { from: (...args) => from(...args) } }))

import { createTemplate, listMyTemplates, createOrganizationTemplate, listOrganizationTemplates, publishTemplate } from './planTemplatesService'

describe('planTemplatesService', () => {
  it('createTemplate inserta y devuelve la plantilla creada', async () => {
    single.mockResolvedValue({
      data: { id: 't1', name: 'Plantilla base', content: { fases: [] } },
      error: null,
    })
    const template = await createTemplate({ name: 'Plantilla base', content: { fases: [] } })
    expect(insert).toHaveBeenCalledWith({ name: 'Plantilla base', content: { fases: [] } })
    expect(template).toEqual({ id: 't1', name: 'Plantilla base', content: { fases: [] } })
  })

  it('createTemplate lanza con el mensaje de Supabase si falla', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'nombre requerido' } })
    await expect(createTemplate({ name: '', content: {} })).rejects.toThrow('nombre requerido')
  })

  it('listMyTemplates devuelve la lista (vacía si no hay ninguna)', async () => {
    const templates = await listMyTemplates()
    expect(templates).toEqual([])
  })

  it('createOrganizationTemplate inserta con organization_id, status draft y trainer_id anulado', async () => {
    single.mockResolvedValue({
      data: { id: 'ot1', name: 'Rutina estándar', content: { fases: [] }, status: 'draft' },
      error: null,
    })
    const template = await createOrganizationTemplate({ organizationId: 'org-1', name: 'Rutina estándar', content: { fases: [] } })
    expect(insert).toHaveBeenCalledWith({ organization_id: 'org-1', trainer_id: null, name: 'Rutina estándar', content: { fases: [] }, status: 'draft' })
    expect(template).toEqual({ id: 'ot1', name: 'Rutina estándar', content: { fases: [] }, status: 'draft' })
  })

  it('listOrganizationTemplates devuelve la lista normalizada', async () => {
    // Mockear select().eq().order() para devolver una fila con las 5 columnas esperadas
    // (Task 19 brief Step 1 comment: "ajusta el mock para que .eq(...) resuelva
    // { data: [{ id, name, content, status, created_by }], error: null }")
    select.mockReturnValueOnce({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [
            { id: 'ot1', name: 'Rutina estándar', content: { fases: [] }, status: 'draft', created_by: 'trainer-123' },
          ],
          error: null,
        })),
      })),
    })
    const templates = await listOrganizationTemplates('org-1')
    expect(Array.isArray(templates)).toBe(true)
    expect(templates).toHaveLength(1)
    // Verificar que created_by se mapea a createdBy (toOrganizationTemplate funciona)
    expect(templates[0]).toEqual({
      id: 'ot1',
      name: 'Rutina estándar',
      content: { fases: [] },
      status: 'draft',
      createdBy: 'trainer-123',
    })
  })

  it('publishTemplate actualiza el status a published', async () => {
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    from.mockReturnValueOnce({ update })
    await publishTemplate('ot1')
    expect(update).toHaveBeenCalledWith({ status: 'published' })
  })
})
