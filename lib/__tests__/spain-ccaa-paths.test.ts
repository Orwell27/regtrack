import { describe, it, expect } from 'vitest'
import { REGIONES, FUENTE_TO_REGION } from '../spain-ccaa-paths'

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
