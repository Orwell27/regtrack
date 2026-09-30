import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { classifyDocument, analyzeImpact } from '@/lib/claude'
import { readFileSync } from 'fs'

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

describe('texto íntegro y respuestas mal formadas', () => {
  it('envía también la disposición final del decreto real a ambas etapas de IA', async () => {
    const document = readFileSync('tests/fixtures/borm-2019-6433.txt', 'utf8')
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify({
      relevante: true, subtema: 'turismo', ambito_territorial: 'autonomico', motivo: 'Alojamiento turístico',
      resumen: 'Resumen', impacto: 'Impacto', afectados: [], territorios: [], accion_recomendada: 'Revisar', score_relevancia: 7,
    }) }] })
    ;(Anthropic as unknown as Mock).mockImplementation(function () { return { messages: { create } } })
    await classifyDocument('Decreto 256/2019', document)
    expect(await analyzeImpact('Decreto 256/2019', document, 'BORM')).not.toBeNull()
    for (const [request] of create.mock.calls) expect(request.messages[0].content).toContain(document)
  })
  it('una clasificación con JSON válido pero sin campos no se convierte en descarte', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{}' }] })
    ;(Anthropic as unknown as Mock).mockImplementation(function () { return { messages: { create } } })
    await expect(classifyDocument('Título', 'Texto')).rejects.toThrow()
  })
})

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

  it('no descarta el documento si Claude devuelve JSON inválido', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'JSON inválido {' }],
          }),
        },
      }
    })
    await expect(classifyDocument('Título', 'Texto')).rejects.toThrow()
  })

  it('conserva el error para reintentar, aunque no sea APIError', async () => {
    ;(Anthropic as any).mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('API error')),
        },
      }
    })
    await expect(classifyDocument('Título', 'Texto')).rejects.toThrow()
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
