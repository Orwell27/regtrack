import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBOCM } from '@/lib/sources/bocm'
import { fetchBORM, fetchBORMText } from '@/lib/sources/borm'
import { ScanReport } from '@/lib/pipeline/report'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fetchSource, requireDocument } from '@/lib/sources/http'
import { fetchBOE, fetchBOEText } from '@/lib/sources/boe'

afterEach(() => vi.unstubAllGlobals())

describe('fuentes: ausencia y fallo son distintos', () => {
  it('el BOE rechaza HTML antes de quitar etiquetas y enviarlo a la IA', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><body>' + 'Mantenimiento '.repeat(50) + '</body></html>')))
    await expect(fetchBOEText('BOE-A-2026-1')).rejects.toThrow('No se pudo leer')
  })
  it('el BOE permite un domingo sin boletín, pero no oculta un sábado con HTTP 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('', { status: 404 })))
    expect(await fetchBOE('2026-09-27', false)).toEqual([])
    await expect(fetchBOE('2026-09-26', false)).rejects.toThrow('404')
  })
  it('identifica el bloqueo real de CAPTCHA sin intentar sortearlo ni guardar su URL de sesión', async () => {
    const response = new Response('<html><title>Radware Captcha Page</title></html>')
    Object.defineProperty(response, 'url', { value: 'https://validate.perfdrive.com/?session=not-for-logs' })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchSource('https://www.borm.es/services/anuncio/780550/txt')).rejects.toThrow('bloqueado por CAPTCHA: www.borm.es')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('el HTTP 404 de Madrid no se convierte en cero novedades', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(fetchBOCM()).rejects.toThrow('404')
  })
  it('una página HTML de mantenimiento no se acepta como RSS vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Mantenimiento</html>')))
    await expect(fetchBOCM()).rejects.toThrow('Formato')
  })
  it('un índice BORM con formato inesperado no se considera vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'mantenimiento' })))
    await expect(fetchBORM()).rejects.toThrow()
  })
  it('lee el TXT oficial completo del BORM, también lo que viene después de 8000 caracteres', async () => {
    const body = 'Texto oficial '.repeat(800) + 'DISPOSICIÓN FINAL: entra en vigor mañana.'
    const fetchMock = vi.fn().mockResolvedValue(new Response(body))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchBORMText('https://www.borm.es/services/anuncio/845397/txt')).toBe(body)
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.borm.es/services/anuncio/845397/txt')
  })
  it('conserva las fuentes sanas cuando falla otra y marca cobertura incompleta', async () => {
    const report = new ScanReport(['2026-09-30'])
    const results = await Promise.all([
      report.source('BOCM', 'reciente', () => Promise.reject(new Error('HTTP 404'))),
      report.source('BORM', '2026-09-30', async () => [{ id: '1', titulo: 'Norma', fuente: 'BORM', url: 'https://www.borm.es/1' }]),
    ])
    expect(results.flat()).toHaveLength(1)
    expect(report.incomplete).toBe(true)
    expect(report.sources.find(s => s.source === 'BOCM')?.status).toBe('error')
  })
  it('caso real: conserva la disposición final del Decreto 256/2019, que no cabe en los primeros 8000 caracteres', async () => {
    const body = readFileSync(resolve('tests/fixtures/borm-2019-6433.txt'), 'utf8')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)))
    const text = await fetchBORMText('https://www.borm.es/services/anuncio/780550/txt')
    expect(text.length).toBeGreaterThan(40_000)
    expect(text).toContain('El presente decreto entrará en vigor a los veinte días')
    expect(text.indexOf('Disposición final primera. Entrada en vigor.')).toBeGreaterThan(8000)
    expect(text).toContain('A-191019-6433')
  })
  it('un texto vacío, HTML de error o documento excesivo queda pendiente, nunca se recorta silenciosamente', () => {
    expect(() => requireDocument('')).toThrow()
    expect(() => requireDocument('<html>' + 'error '.repeat(30) + '</html>')).toThrow()
    expect(() => requireDocument('x'.repeat(120_001))).toThrow('no se truncará')
  })
})
