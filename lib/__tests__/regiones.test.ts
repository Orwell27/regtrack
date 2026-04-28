import { describe, it, expect } from 'vitest'
import { REGIONES } from '../regiones'

describe('REGIONES', () => {
  it('has 17 entries', () => {
    expect(REGIONES).toHaveLength(17)
  })

  it('each region has required fields', () => {
    for (const r of REGIONES) {
      expect(r.id.length).toBeGreaterThan(0)
      expect(r.nombre.length).toBeGreaterThan(0)
      expect(r.fuente.length).toBeGreaterThan(0)
      expect(typeof r.disabled).toBe('boolean')
    }
  })

  it('has exactly 3 disabled regions', () => {
    expect(REGIONES.filter(r => r.disabled)).toHaveLength(3)
  })

  it('disabled regions are aragon, castilla-la-mancha, and valencia', () => {
    expect(REGIONES.filter(r => r.disabled).map(r => r.id).sort())
      .toEqual(['aragon', 'castilla-la-mancha', 'valencia'])
  })

  it('all ids are unique', () => {
    const ids = REGIONES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all fuentes are unique', () => {
    const fuentes = REGIONES.map(r => r.fuente)
    expect(new Set(fuentes).size).toBe(fuentes.length)
  })

  it('Galicia entry is correct', () => {
    const galicia = REGIONES.find(r => r.id === 'galicia')
    expect(galicia).toEqual({ id: 'galicia', nombre: 'Galicia', fuente: 'DOG', disabled: false })
  })

  it('BOE is not in REGIONES (it is separate)', () => {
    expect(REGIONES.find(r => r.fuente === 'BOE')).toBeUndefined()
  })
})
