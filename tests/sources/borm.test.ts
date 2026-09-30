import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseBORMIndex } from '@/lib/sources/borm'

// Filas reales del índice de transparencia.carm.es (septiembre de 2026), recortadas
const FILA_ACTUAL = ['BOLETIN', '4715', '845397', '226', '2026-09-30 00:00:00', 'Resolución de la Directora Gerente del Servicio Murciano de Salud, por la que se nombra personal estatutario fijo.', 'Comunidad Autónoma', 'I. Comunidad Autónoma', '2. Autoridades y Personal', 'Consejería de Salud - Servicio Murciano de Salud', '0', '2026', 'RESOLUCION', '2026-09-15 00:00:00', '2026', '', 'A-300926-4715', 'https://www.borm.es/#/home/anuncio/30-09-2026/4715', 'https://www.borm.es/services/anuncio/845397/pdf', '3', 1790757976049]
const SUPLEMENTO = ['SUPLEMENTO', '2482', '843164', '6', '2026-09-30 00:00:00', 'Decreto del Presidente n.º 5/2026, de Reorganización de la Administración Regional.', 'Comunidad Autónoma', 'I. Comunidad Autónoma', '1. Disposiciones Generales', 'Presidencia', '5', '2026', 'DECRETO DEL PRESIDENTE', '2026-09-30 00:00:00', '2026', '', 'A-300926-2482', 'https://www.borm.es/#/home/anuncio/30-09-2026/2482', 'https://www.borm.es/services/anuncio/843164/pdf', '5', 1790757976056]
const OTRO_DIA = [...FILA_ACTUAL.slice(0, 4), '2026-09-29 00:00:00', ...FILA_ACTUAL.slice(5)]
// Formato anterior, sin la columna de tipo
const FILA_ANTIGUA = ['1661', '842343', '86', '2026-09-30 00:00:00', 'Orden sobre viviendas de uso turístico', 'x', 'I. Comunidad Autónoma', 'x', 'Consejería de Turismo', 'x', 'ORDEN', 'x', 'A-300926-1661', 'https://www.borm.es/#/home/anuncio/30-09-2026/1661']

describe('parseBORMIndex', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T08:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('lee el formato actual (con columna de tipo) y solo los anuncios de hoy', () => {
    const items = parseBORMIndex([FILA_ACTUAL, SUPLEMENTO, OTRO_DIA])
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: 'BORM-A-300926-4715',
      url: 'https://www.borm.es/#/home/anuncio/30-09-2026/4715',
      fuente: 'BORM',
    })
    expect(items[0].titulo).toMatch(/^Resolución de la Directora Gerente/)
    expect(items[0].texto).toContain('Anunciante: Consejería de Salud')
    expect(items[0].texto).toContain('Tipo: RESOLUCION')
    expect(items[1].texto).toContain('Tipo: DECRETO DEL PRESIDENTE')
  })

  it('sigue leyendo el formato anterior', () => {
    const [item] = parseBORMIndex([FILA_ANTIGUA])
    expect(item).toMatchObject({ id: 'BORM-A-300926-1661', titulo: 'Orden sobre viviendas de uso turístico' })
  })
})
