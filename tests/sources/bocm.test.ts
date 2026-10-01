import { afterEach, describe, it, expect, vi } from 'vitest'
import { BOCM_RSS_URL, fetchBOCM, parseBOCMRSS } from '@/lib/sources/bocm'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixture = readFileSync(join(process.cwd(), 'tests/fixtures/bocm-rss.xml'), 'utf-8')
const realFixture = readFileSync(join(process.cwd(), 'tests/fixtures/bocm-2026-09-30.xml'), 'utf-8')
afterEach(() => vi.unstubAllGlobals())

describe('parseBOCMRSS', () => {
  it('parsea un feed RSS con un solo item', () => {
    const items = parseBOCMRSS(fixture)
    expect(items).toHaveLength(1)
    expect(items[0].fuente).toBe('BOCM')
    expect(items[0].titulo).toContain('licencias urbanísticas')
  })

  it('devuelve array vacío para XML vacío', () => {
    const items = parseBOCMRSS('<rss><channel></channel></rss>')
    expect(items).toEqual([])
  })

  it('extrae el título sustantivo y la fecha del feed real de 30/09/2026', () => {
    const items = parseBOCMRSS(realFixture)
    expect(items).toHaveLength(2)
    expect(items[0].titulo).toContain('Corrección de errores de la Orden 1085/2026')
    expect(items[0].titulo).not.toContain('Orden Nº 3')
    expect(items.every((item) => item.fecha_publicacion === '2026-09-30')).toBe(true)
    expect(items[0].texto).not.toContain('<p>')
  })

  it('usa el canal de órdenes oficial y propaga los fallos HTTP', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(realFixture)).mockResolvedValueOnce(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetch)
    expect(await fetchBOCM()).toHaveLength(2)
    expect(fetch.mock.calls[0][0]).toBe(BOCM_RSS_URL)
    await expect(fetchBOCM()).rejects.toThrow('HTTP 404')
  })

  it('no convierte HTML, XML truncado ni elementos inválidos en una lista vacía', () => {
    expect(() => parseBOCMRSS('<html><body>Mantenimiento</body></html>')).toThrow('Canal RSS')
    expect(() => parseBOCMRSS('<rss><channel><item>')).toThrow('XML BOCM')
    expect(() => parseBOCMRSS('<rss><channel><item><title>Sin enlace</title></item></channel></rss>')).toThrow('sin título o enlace')
  })
})
