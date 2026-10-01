import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { XMLParser } from 'fast-xml-parser'
import { parseBOCYLRSS } from '@/lib/sources/bocyl'

const fixture = readFileSync(join(process.cwd(), 'tests/fixtures/bocyl-live.xml'), 'utf8')
const pdf = 'https://bocyl.jcyl.es/boletines/2026/09/30/pdf/BOCYL-D-30092026-190-1.pdf'
const single = (title = 'Norma &amp; ayudas', link = pdf) => `<rss><channel><item><title>${title}</title><link>${link}</link><description>Sumario</description></item></channel></rss>`

describe('BOCYL: RSS agregado oficial', () => {
  it('reproduce el fallo original con más de 1.000 referencias ordinarias', () => {
    expect(() => new XMLParser().parse(fixture)).toThrow('Entity expansion limit exceeded')
  })

  it('recupera las 43 disposiciones del RSS real, incluida la última después de 8k', () => {
    const items = parseBOCYLRSS(fixture)
    expect(items).toHaveLength(43)
    expect(new Set(items.map(item => item.url)).size).toBe(43)
    expect(items[0].url).toBe(pdf)
    expect(items[42].url).toBe('https://bocyl.jcyl.es/boletines/2026/09/30/pdf/BOCYL-D-30092026-190-43.pdf')
    expect(items[42].titulo).toContain('construcción de piscinas municipales')
    expect(items.every(item => item.fecha_publicacion === '2026-09-30')).toBe(true)
    expect(items.every(item => item.texto?.includes('no es el texto íntegro'))).toBe(true)
    expect(items[0].texto).not.toContain('<p')
  })

  it('decodifica referencias XML simples sin expandir recursivamente', () => {
    expect(parseBOCYLRSS(single('Ayudas &amp; I+D &#xE1; &#241; &amp;lt;'))[0].titulo).toBe('Ayudas & I+D á ñ &lt;')
  })

  it('conserva un canal explícitamente vacío como cero elementos', () => {
    expect(parseBOCYLRSS('<rss><channel/></rss>')).toEqual([])
  })

  it.each([
    '<html><body>Mantenimiento</body></html>',
    '<rss><channel><description>Mantenimiento</description></channel></rss>',
    '<rss><channel><item><title>Cambio de estructura</title></item></channel></rss>',
    '<rss><channel><item></channel></rss>',
    fixture.replace(/&lt;li /g, '&lt;section ').replace(/&lt;\/li&gt;/g, '&lt;/section&gt;'),
    fixture.replace('Expte.: 164/2026.&lt;/p&gt;', 'Expte.: 164/2026.'),
  ])('falla explícitamente ante HTML, items incompletos o cambios de estructura', xml => {
    expect(() => parseBOCYLRSS(xml)).toThrow()
  })

  it.each([
    '<!DOCTYPE rss [<!ENTITY a "boom"><!ENTITY b "&a;&a;">]>',
    '<!DOCTYPE rss SYSTEM "https://example.test/external.dtd">',
    '<!ENTITY a SYSTEM "file:///etc/passwd">',
  ])('rechaza DTD y declaraciones de entidades antes del parser', declaration => {
    expect(() => parseBOCYLRSS(declaration + single())).toThrow('DTD y entidades declaradas no admitidos')
  })

  it.each(['&unknown;', '&#0;', '&#xD800;', '&#1114112;'])('rechaza referencias no válidas: %s', entity => {
    expect(() => parseBOCYLRSS(single(entity))).toThrow()
  })

  it('mantiene un límite de tamaño y la protección contra anidamiento excesivo', () => {
    expect(() => parseBOCYLRSS(' '.repeat(2_000_001))).toThrow('demasiado grande')
    expect(() => parseBOCYLRSS('<rss><channel>' + '<nested>'.repeat(101) + '</nested>'.repeat(101) + '</channel></rss>')).toThrow()
  })

  it('rechaza dominios ajenos y fechas inconsistentes con el boletín', () => {
    expect(() => parseBOCYLRSS(single('Norma', pdf.replace('bocyl.jcyl.es', 'example.test')))).toThrow('enlace ajeno')
    expect(() => parseBOCYLRSS(fixture.replace('fechaBoletin=30/09/2026', 'fechaBoletin=29/09/2026'))).toThrow('fecha de disposición distinta')
  })
})
