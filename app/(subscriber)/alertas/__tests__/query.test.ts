import { describe, it, expect } from 'vitest'

function parseFuentes(param: string | undefined): string[] {
  if (!param) return []
  return param.split(',').filter(Boolean)
}

describe('parseFuentes', () => {
  it('returns empty array when param is undefined', () => {
    expect(parseFuentes(undefined)).toEqual([])
  })

  it('returns single fuente as array', () => {
    expect(parseFuentes('BOCM')).toEqual(['BOCM'])
  })

  it('returns multiple fuentes as array', () => {
    expect(parseFuentes('BOCM,DOGC,BOJA')).toEqual(['BOCM', 'DOGC', 'BOJA'])
  })

  it('filters empty strings from malformed param', () => {
    expect(parseFuentes('BOCM,,DOGC')).toEqual(['BOCM', 'DOGC'])
  })
})
