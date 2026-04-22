import { describe, it, expect } from 'vitest'
import { getSubtemasGrupo } from '@/lib/correlacion/subtema-grupos'

describe('getSubtemasGrupo', () => {
  it('returns all subtemas in the same group as the given subtema', () => {
    const result = getSubtemasGrupo('urbanismo')
    expect(result).toContain('urbanismo')
    expect(result).toContain('construccion')
    expect(result).toContain('obra_nueva')
    expect(result).toContain('suelo')
    expect(result).toContain('rehabilitacion')
  })

  it('arrendamiento group includes hipotecas and vivienda_protegida', () => {
    const result = getSubtemasGrupo('arrendamiento')
    expect(result).toContain('arrendamiento')
    expect(result).toContain('hipotecas')
    expect(result).toContain('vivienda_protegida')
    expect(result).not.toContain('urbanismo')
  })

  it('returns array with just the subtema itself for solo groups', () => {
    const result = getSubtemasGrupo('fiscalidad')
    expect(result).toEqual(['fiscalidad'])
  })

  it('returns array with just the subtema for unknown subtemas', () => {
    const result = getSubtemasGrupo('otro')
    expect(result).toEqual(['otro'])
  })
})
