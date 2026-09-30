import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { classifyDocument, analyzeImpact } from '@/lib/claude'

// Mock del SDK de Anthropic
vi.mock('@anthropic-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@anthropic-ai/sdk')>()
  const mockCreate = vi.fn()
  return {
    ...actual,
    default: vi.fn().mockImplementation(function () {
      return { messages: { create: mockCreate } }
    }),
    __mockCreate: mockCreate,
  }
})

import Anthropic, { BadRequestError } from '@anthropic-ai/sdk'

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

describe('errores de la API de Claude', () => {
  const sinSaldo = () => new BadRequestError(400, { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low' } }, 'Your credit balance is too low', new Headers())

  beforeEach(() => {
    vi.clearAllMocks()
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
      return { messages: { create: vi.fn().mockRejectedValue(sinSaldo()) } }
    })
  })

  it('classifyDocument relanza el error en vez de dar el documento por irrelevante', async () => {
    await expect(classifyDocument('Título', 'Texto')).rejects.toBeInstanceOf(BadRequestError)
  })

  it('analyzeImpact relanza el error en vez de devolver null', async () => {
    await expect(analyzeImpact('Título', 'Texto', 'BOE')).rejects.toBeInstanceOf(BadRequestError)
  })
})

describe('analyzeImpact con respuestas largas', () => {
  it('pide margen suficiente y descarta una respuesta cortada por max_tokens', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: '{"resumen": "texto cortado a med' }],
    })
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
      return { messages: { create } }
    })
    const res = await analyzeImpact('Real Decreto-ley 26/2026', 'Texto', 'BOE')
    expect(res).toBeNull()
    expect(create.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(4096)
  })
})
