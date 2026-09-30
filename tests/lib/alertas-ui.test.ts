import { describe, expect, it } from 'vitest'
import { alertasHref, parseAlertFilters, formatAlertDate } from '@/lib/alertas-ui'

describe('alert navigation', () => {
  it('keeps BOE and Murcia together and removes unavailable sources', () => {
    expect(parseAlertFilters({ fuente: 'BORM,BOE,BORM,DOGV,unknown' }).fuente).toBe('BORM,BOE')
  })
  it.each(['-1', 'NaN', '0', '1.5'])('normalizes invalid page %s', page => {
    expect(parseAlertFilters({ page }).page).toBe('1')
  })
  it('ignores repeated input and limits search to literal words', () => {
    const value = parseAlertFilters({ urgencia: ['alta', 'baja'], q: 'alquiler%,estado.neq.enviada', page: '2' })
    expect(value.q).toBe('alquiler estado neq enviada')
    expect(value.urgencia).toBeUndefined()
  })
  it('preserves search and source on pagination; can explicitly remove filters', () => {
    expect(alertasHref({ fuente: 'BOE,BORM', q: 'vivienda', page: '3' }, { page: '1', q: undefined })).toBe('/alertas?fuente=BOE%2CBORM')
  })
  it('does not print Invalid Date', () => {
    expect(formatAlertDate('wrong')).toBe('Sin fecha indicada')
    expect(formatAlertDate(null)).toBe('Sin fecha indicada')
  })
})
