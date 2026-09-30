import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { classifyDocument, analyzeImpact } from '@/lib/claude'
import { readFileSync } from 'fs'
import { documentText, impactResponse } from './fixtures/impact-response'

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

describe('regresiones del ensayo real, sin llamadas de pago', () => {
  function respond(payload: unknown) {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(payload) }] })
    ;(Anthropic as unknown as Mock).mockImplementation(function () { return { messages: { create } } })
    return create
  }
  it('el título aislado queda pendiente antes de consumir IA aunque una respuesta ficticia daría score4', async () => {
    const title = 'Decreto n.º 256/2019, de 10 de octubre, sobre viviendas de uso turístico'
    const create = respond({ ...impactResponse(), score_relevancia: 4, accion_recomendada: 'Registrar' })
    await expect(analyzeImpact(title, title, 'BORM')).rejects.toThrow(/revisión|texto/i)
    expect(create).not.toHaveBeenCalled()
  })
  it('el estado de insuficiencia domina una puntuación alta', async () => {
    respond({ ...impactResponse(), estado_analisis: 'requiere_revision', motivo_revision: 'Falta articulado', score_relevancia: 9, accion_recomendada: 'Registrar' })
    await expect(analyzeImpact('Decreto 256/2019', documentText, 'BORM')).rejects.toThrow(/Falta articulado/)
  })
  it('no convierte seis meses de adaptación en los veinte días de entrada en vigor', async () => {
    respond({ ...impactResponse(), plazo_adaptacion: 20, accion_recomendada: 'Adaptar' })
    const result = await analyzeImpact('Decreto 256/2019', documentText, 'BORM')
    expect(result?.plazo_adaptacion).toBeNull()
    expect(result?.impacto).toContain('6 meses')
  })
  it('no permite que una fecha de publicación inventada sustituya a la oficial', async () => {
    respond({ ...impactResponse(), fecha_publicacion: '2019-10-10', accion_recomendada: 'Adaptar' })
    const result = await analyzeImpact('Decreto 256/2019', documentText, 'BORM', { fecha_publicacion: '2019-10-19' })
    expect(result?.fecha_publicacion).toBe('2019-10-19')
  })
  it('una categoría no representable no se transforma en Real Decreto', async () => {
    respond({ ...impactResponse(), accion_recomendada: 'Adaptar' })
    expect((await analyzeImpact('Decreto 256/2019', documentText, 'BORM'))?.tipo_norma).toBeNull()
  })
  it('rechaza una cantidad numérica enviada como cadena', async () => {
    const result = { ...impactResponse(), accion_recomendada: 'Adaptar' }
    respond({ ...result, plazos_adaptacion: [{ ...result.plazos_adaptacion[0], cantidad: '6' }] })
    expect(await analyzeImpact('Decreto 256/2019', documentText, 'BORM')).toBeNull()
  })
  it('no admite una acción cuya cita no existe en la entrada', async () => {
    const result = impactResponse()
    respond({ ...result, accion_recomendada: 'Adaptar', acciones: [{ ...result.acciones[0], cita: 'Una cita que no aparece en el documento oficial.' }] })
    await expect(analyzeImpact('Decreto 256/2019', documentText, 'BORM')).rejects.toThrow(/cita|respaldo/i)
  })
})

describe('texto íntegro y respuestas mal formadas', () => {
  it('envía también la disposición final del decreto real a ambas etapas de IA', async () => {
    const document = readFileSync('tests/fixtures/borm-2019-6433.txt', 'utf8')
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify({
      relevante: true, subtema: 'arrendamiento', ambito_territorial: 'ccaa', motivo: 'Alojamiento turístico',
      estado_analisis: 'requiere_revision', motivo_revision: 'Respuesta simulada para verificar transporte íntegro',
    }) }] })
    ;(Anthropic as unknown as Mock).mockImplementation(function () { return { messages: { create } } })
    await classifyDocument('Decreto 256/2019', document)
    await expect(analyzeImpact('Decreto 256/2019', document, 'BORM')).rejects.toThrow('Respuesta simulada para verificar transporte íntegro')
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
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
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
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
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
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
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
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
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
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
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
    ;(Anthropic as unknown as Mock).mockImplementation(function () {
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
