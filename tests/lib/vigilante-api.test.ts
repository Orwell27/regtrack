import { describe, it, expect } from 'vitest'
import { AuthenticationError, BadRequestError, PermissionDeniedError, InternalServerError } from '@anthropic-ai/sdk'
import { VigilanteApi, MAX_ERRORES_API_SEGUIDOS } from '@/lib/pipeline/vigilante-api'

const cabeceras = new Headers()
const sinSaldo = () => new BadRequestError(400, { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low' } }, 'Your credit balance is too low', cabeceras)

describe('VigilanteApi', () => {
  it('aborta de inmediato con una clave inválida', () => {
    const v = new VigilanteApi()
    expect(v.error(new AuthenticationError(401, undefined, 'invalid x-api-key', cabeceras))).toBe(true)
    expect(v.abortado).toBe(true)
  })

  it('aborta de inmediato sin permisos', () => {
    expect(new VigilanteApi().error(new PermissionDeniedError(403, undefined, 'forbidden', cabeceras))).toBe(true)
  })

  it('aborta cuando los errores se repiten seguidos (p. ej. sin saldo)', () => {
    const v = new VigilanteApi()
    for (let i = 1; i < MAX_ERRORES_API_SEGUIDOS; i++) expect(v.error(sinSaldo())).toBe(false)
    expect(v.error(sinSaldo())).toBe(true)
    expect(v.total).toBe(MAX_ERRORES_API_SEGUIDOS)
    expect(v.describirUltimo()).toContain('400')
  })

  it('un éxito entre medias reinicia la cuenta', () => {
    const v = new VigilanteApi()
    v.error(new InternalServerError(500, undefined, 'overloaded', cabeceras))
    v.error(new InternalServerError(500, undefined, 'overloaded', cabeceras))
    v.exito()
    expect(v.error(new InternalServerError(500, undefined, 'overloaded', cabeceras))).toBe(false)
    expect(v.total).toBe(3)
    expect(v.abortado).toBe(false)
  })
})
