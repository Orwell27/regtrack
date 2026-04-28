import { describe, it, expect } from 'vitest'
import { REGIONES } from '../regiones'

describe('REGIONES', () => {
  it('has 17 entries', () => {
    expect(REGIONES).toHaveLength(17)
  })

  it('each region has required fields', () => {
    for (const r of REGIONES) {
      expect(typeof r.id).toBe('string')
      expect(typeof r.nombre).toBe('string')
      expect(typeof r.fuente).toBe('string')
      expect(typeof r.disabled).toBe('boolean')
    }
  })

  it('has exactly 3 disabled regions', () => {
    expect(REGIONES.filter(r => r.disabled)).toHaveLength(3)
  })

  it('BOE is not in REGIONES (it is separate)', () => {
    expect(REGIONES.find(r => r.fuente === 'BOE')).toBeUndefined()
  })
})
