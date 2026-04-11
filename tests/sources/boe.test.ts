import { describe, it, expect } from 'vitest'
import { parseBOESumario, RELEVANT_SECTIONS } from '@/lib/sources/boe'
import fixture from '../fixtures/boe-sumario.json'

describe('parseBOESumario', () => {
  it('extrae solo items de secciones relevantes (I y III)', () => {
    const items = parseBOESumario(fixture)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('BOE-A-2026-1234')
    expect(items[0].titulo).toBe('Real Decreto 123/2026 sobre actualización de renta en contratos de arrendamiento')
    expect(items[0].fuente).toBe('BOE')
  })

  it('incluye la url correcta', () => {
    const items = parseBOESumario(fixture)
    expect(items[0].url).toBe('https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-1234')
  })

  it('devuelve array vacío si no hay secciones relevantes', () => {
    const emptyFixture = { data: { sumario: { diario: [{ seccion: [] }] } } }
    expect(parseBOESumario(emptyFixture)).toEqual([])
  })

  it('omite items sin url_html', () => {
    const fixtureWithMissingUrl = {
      data: {
        sumario: {
          diario: [{
            seccion: [{
              num: '1',
              nombre: 'I. Disposiciones generales',
              departamento: [{
                nombre: 'TEST',
                epigrafe: [{
                  nombre: 'Test',
                  item: [
                    { id: 'BOE-A-2026-GOOD', titulo: 'Con URL', url_html: 'https://boe.es/1', url_pdf: '' },
                    { id: 'BOE-A-2026-BAD', titulo: 'Sin URL', url_html: '', url_pdf: '' },
                  ]
                }]
              }]
            }]
          }]
        }
      }
    }
    const items = parseBOESumario(fixtureWithMissingUrl)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('BOE-A-2026-GOOD')
  })
})

describe('RELEVANT_SECTIONS', () => {
  it('incluye sección I y III', () => {
    expect(RELEVANT_SECTIONS).toContain('1')
    expect(RELEVANT_SECTIONS).toContain('3')
  })
})
