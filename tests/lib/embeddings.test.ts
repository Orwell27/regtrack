import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del SDK de OpenAI antes de importar el módulo bajo prueba
vi.mock('openai', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  }
})

import OpenAI from 'openai'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'

describe('buildEmbeddingText', () => {
  it('concatena resumen e impacto con espacio', () => {
    const result = buildEmbeddingText('resumen aquí', 'impacto aquí')
    expect(result).toBe('resumen aquí impacto aquí')
  })

  it('usa solo resumen si impacto es null', () => {
    const result = buildEmbeddingText('solo resumen', null)
    expect(result).toBe('solo resumen')
  })

  it('usa solo resumen si impacto es cadena vacía', () => {
    const result = buildEmbeddingText('solo resumen', '')
    expect(result).toBe('solo resumen')
  })
})

describe('generateEmbedding', () => {
  const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001)

  beforeEach(() => {
    vi.clearAllMocks()
    ;(OpenAI as any).mockImplementation(function () {
      return {
        embeddings: {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: fakeEmbedding }],
          }),
        },
      }
    })
  })

  it('devuelve un array de 1536 números', async () => {
    const result = await generateEmbedding('normativa sobre alquiler')
    expect(result).toHaveLength(1536)
    expect(typeof result[0]).toBe('number')
  })

  it('llama a OpenAI con el modelo correcto', async () => {
    const mockInstance = { embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: fakeEmbedding }] }) } }
    ;(OpenAI as any).mockImplementation(function () {
      return mockInstance
    })

    await generateEmbedding('texto de prueba')

    expect(mockInstance.embeddings.create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'texto de prueba',
    })
  })

  it('lanza error si el texto está vacío', async () => {
    await expect(generateEmbedding('')).rejects.toThrow('generateEmbedding: text must not be empty')
  })

  it('lanza error si el texto es solo espacios', async () => {
    await expect(generateEmbedding('   ')).rejects.toThrow('generateEmbedding: text must not be empty')
  })
})
