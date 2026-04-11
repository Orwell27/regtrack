import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyDocument, analyzeImpact } from '@/lib/claude'

// Mock del SDK de Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(function () {
      return { messages: { create: mockCreate } }
    }),
    __mockCreate: mockCreate,
  }
})

import Anthropic from '@anthropic-ai/sdk'

describe('classifyDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-instantiate mock after clear
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: JSON.stringify({
              relevante: true,
              subtema: 'arrendamiento',
              ambito_territorial: 'estatal',
              motivo: 'Afecta a contratos de alquiler residencial',
            })}],
          }),
        },
      }
    })
  })

  it('devuelve relevante: true cuando Claude responde correctamente', async () => {
    const result = await classifyDocument(
      'Real Decreto sobre alquiler',
      'Texto sobre contratos de arrendamiento...'
    )
    expect(result.relevante).toBe(true)
    expect(result.subtema).toBe('arrendamiento')
  })

  it('devuelve relevante: false para documentos irrelevantes', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: JSON.stringify({
              relevante: false,
              subtema: 'otro',
              ambito_territorial: 'estatal',
              motivo: 'Normativa de tráfico sin impacto inmobiliario',
            })}],
          }),
        },
      }
    })
    const result = await classifyDocument('Norma de tráfico', 'Texto sobre velocidad...')
    expect(result.relevante).toBe(false)
  })

  it('devuelve relevante: false si Claude devuelve JSON inválido', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'JSON inválido {' }],
          }),
        },
      }
    })
    const result = await classifyDocument('Título', 'Texto')
    expect(result.relevante).toBe(false)
  })

  it('devuelve relevante: false si Claude API lanza error', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('API error')),
        },
      }
    })
    const result = await classifyDocument('Título', 'Texto')
    expect(result.relevante).toBe(false)
  })
})

describe('analyzeImpact', () => {
  it('devuelve null si Claude API lanza error', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('API error')),
        },
      }
    })
    const result = await analyzeImpact('Título', 'Texto', 'BOE')
    expect(result).toBeNull()
  })

  it('devuelve null si Claude devuelve JSON inválido', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'no es json' }],
          }),
        },
      }
    })
    const result = await analyzeImpact('Título', 'Texto', 'BOE')
    expect(result).toBeNull()
  })
})
