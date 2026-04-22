import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RelacionDetectada } from '@/lib/correlacion/types'

// Mock Supabase
const mockSelect = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}))
vi.mock('@/lib/supabase', () => ({
  createServerClient: () => ({ from: mockFrom }),
}))

// Mock Anthropic
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// Mock prompt loader
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mocked prompt'),
}))

const { detectarRelaciones } = await import('@/lib/correlacion/detectar-relaciones')

describe('detectarRelaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no SQL candidates found', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns empty array when Haiku returns no relations with score >= 40', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'old-id', titulo: 'Old norm', subtema: 'urbanismo', territorios: ['Madrid'], tipo_norma: 'Decreto', fecha_publicacion: '2024-01-01', resumen: 'Old summary' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ "relaciones": [{ "id": "old-id", "tipo": "progresion", "score": 30, "razon": "Weak link" }] }' }],
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toEqual([])
  })

  it('returns valid relations with score >= 40 that match SQL candidates', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'old-id', titulo: 'Old norm', subtema: 'urbanismo', territorios: ['Madrid'], tipo_norma: 'Decreto', fecha_publicacion: '2024-01-01', resumen: 'Old summary' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ "relaciones": [{ "id": "old-id", "tipo": "progresion", "score": 75, "razon": "Continúa la regulación urbanística" }] }' }],
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<RelacionDetectada>({
      alerta_relacionada_id: 'old-id',
      tipo_relacion: 'progresion',
      score_similitud: 75,
      razon: 'Continúa la regulación urbanística',
    })
  })

  it('ignores Haiku-returned IDs not in SQL candidates (security: no hallucinated IDs)', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'real-candidate', titulo: 'Real', subtema: 'urbanismo', territorios: ['Madrid'], tipo_norma: 'Ley', fecha_publicacion: '2024-01-01', resumen: 'Summary' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ "relaciones": [{ "id": "hallucinated-id", "tipo": "deroga", "score": 90, "razon": "fake" }] }' }],
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toEqual([])
  })
})
