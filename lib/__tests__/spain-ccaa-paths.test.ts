import { describe, it, expect } from 'vitest'
import { REGIONES, FUENTE_TO_REGION } from '../spain-ccaa-paths'

describe('REGIONES centroids', () => {
  it('every region has a centroid array with two numbers', () => {
    for (const r of REGIONES) {
      expect(Array.isArray(r.centroid), `${r.id} missing centroid`).toBe(true)
      expect(r.centroid).toHaveLength(2)
      expect(typeof r.centroid[0]).toBe('number')
      expect(typeof r.centroid[1]).toBe('number')
    }
  })

  it('all centroids are within the viewBox bounds (0 0 613 544)', () => {
    for (const r of REGIONES) {
      const [x, y] = r.centroid
      expect(x, `${r.id} x out of bounds`).toBeGreaterThanOrEqual(0)
      expect(x, `${r.id} x out of bounds`).toBeLessThanOrEqual(613)
      expect(y, `${r.id} y out of bounds`).toBeGreaterThanOrEqual(0)
      expect(y, `${r.id} y out of bounds`).toBeLessThanOrEqual(544)
    }
  })
})

// BOE no tiene path SVG — es un botón pill en el componente, no una región del mapa
const FUENTES_CCAA = [
  'BOCM', 'DOGC', 'BORM', 'BOJA', 'BOIB',
  'BOC_CANARIAS', 'BOC_CANTABRIA', 'BOCYL', 'DOE',
  'DOG', 'BOPV', 'BOPA', 'BON', 'BOR',
]

describe('spain-ccaa-paths', () => {
  it('has a region for every active CCAA fuente', () => {
    const fuentes = REGIONES.map(r => r.fuente)
    for (const f of FUENTES_CCAA) {
      expect(fuentes).toContain(f)
    }
  })

  it('has disabled regions for Valencia, Aragón, Castilla-La Mancha', () => {
    const disabled = REGIONES.filter(r => r.disabled).map(r => r.id)
    expect(disabled).toContain('valencia')
    expect(disabled).toContain('aragon')
    expect(disabled).toContain('castilla-la-mancha')
  })

  it('FUENTE_TO_REGION maps every CCAA fuente to a region id', () => {
    for (const f of FUENTES_CCAA) {
      expect(FUENTE_TO_REGION[f]).toBeDefined()
    }
  })

  it('every region has a non-empty path string', () => {
    for (const r of REGIONES) {
      expect(typeof r.path).toBe('string')
      expect(r.path.length).toBeGreaterThan(100)
    }
  })
})
