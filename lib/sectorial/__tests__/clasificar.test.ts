import { describe, it, expect } from 'vitest'

function filterClasificaciones(
  raw: Array<{ subcategoria_slug: string; confianza: number }>,
  validSlugs: Set<string>
) {
  return raw.filter(r => r.confianza >= 60 && validSlugs.has(r.subcategoria_slug))
}

function extractJsonArray(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('[')) return stripped
  const match = stripped.match(/\[[\s\S]*\]/)
  if (match) return match[0]
  return '[]'
}

describe('filterClasificaciones', () => {
  const slugs = new Set(['arrendamiento_residencial', 'urbanismo', 'fiscalidad_itp'])

  it('keeps entries with confianza >= 60 and valid slug', () => {
    const raw = [
      { subcategoria_slug: 'arrendamiento_residencial', confianza: 85 },
      { subcategoria_slug: 'urbanismo', confianza: 45 },
      { subcategoria_slug: 'fiscalidad_itp', confianza: 72 },
    ]
    const result = filterClasificaciones(raw, slugs)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.subcategoria_slug)).toEqual(['arrendamiento_residencial', 'fiscalidad_itp'])
  })

  it('rejects unknown slugs even with high confidence', () => {
    const raw = [{ subcategoria_slug: 'laboral_convenio', confianza: 95 }]
    expect(filterClasificaciones(raw, slugs)).toHaveLength(0)
  })

  it('returns empty array for non-real-estate content', () => {
    expect(filterClasificaciones([], slugs)).toHaveLength(0)
  })
})

describe('extractJsonArray', () => {
  it('parses clean JSON array', () => {
    const input = '[{"subcategoria_slug":"urbanismo","confianza":80}]'
    const result = JSON.parse(extractJsonArray(input))
    expect(result[0].subcategoria_slug).toBe('urbanismo')
  })

  it('strips markdown fences', () => {
    const input = '```json\n[{"subcategoria_slug":"suelo","confianza":65}]\n```'
    const result = JSON.parse(extractJsonArray(input))
    expect(result[0].subcategoria_slug).toBe('suelo')
  })

  it('returns empty array string for no-match', () => {
    const result = JSON.parse(extractJsonArray('[]'))
    expect(result).toHaveLength(0)
  })
})
