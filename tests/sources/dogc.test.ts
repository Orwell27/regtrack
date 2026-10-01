import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fetchDOGC, parseDOGCSummary } from '@/lib/sources/dogc'

const fixture = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/dogc-9761.json'), 'utf8'))
afterEach(() => vi.unstubAllGlobals())

describe('DOGC: servicio público de sumarios', () => {
  it('recupera documentos directos y de subcabeceras con la fecha oficial', () => {
    const items = parseDOGCSummary(fixture)
    expect(items).toHaveLength(92)
    expect(items.find((item) => item.id === 'DOGC-1055429')?.titulo).toContain('escritura de compraventa')
    const nested = items.find((item) => item.id === 'DOGC-1055400')
    expect(nested?.titulo).toContain('hardware')
    expect(nested?.titulo).not.toContain('<i>')
    expect(nested?.texto).toContain('Oficina de Apoyo a la Iniciativa Cultural')
    expect(nested?.url).toBe('https://dogc.gencat.cat/es/document-del-dogc/?documentId=1055400')
    expect(items.every((item) => item.fecha_publicacion === '2026-09-30')).toBe(true)
    expect(new Set(items.map((item) => item.url)).size).toBe(items.length)
  })

  it('rechaza un formato desconocido, fechas imposibles y documentos sin enlace', () => {
    expect(() => parseDOGCSummary({ errorCode: '500' })).toThrow('sin sumarios')
    expect(() => parseDOGCSummary({ sumaris: [] })).toThrow('sin sumarios')
    expect(() => parseDOGCSummary({ sumaris: [{ ...fixture.sumaris[0], section: [] }] })).toThrow('secciones no reconocidas')
    expect(() => parseDOGCSummary({ sumaris: [{ ...fixture.sumaris[0], dateDOGC: '31/02/2026' }] })).toThrow('fecha de publicación no válida')
    const invalid = structuredClone(fixture)
    delete invalid.sumaris[0].section[0].header[0].document[0].linkDownloadDocumentPDF
    expect(() => parseDOGCSummary(invalid)).toThrow('sin título o enlace')
  })

  it('no omite una sección cuya estructura ha cambiado', () => {
    const invalid = structuredClone(fixture)
    invalid.sumaris[0].section.push({ title: 'Nueva estructura', entries: [] })
    expect(() => parseDOGCSummary(invalid)).toThrow('sin documentos ni subsecciones')
  })

  it('lee el último boletín anunciado mediante los POST de consulta del portal', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ sumaris: [{ numDOGC: '9761' }] }))
      .mockResolvedValueOnce(Response.json(fixture))
    vi.stubGlobal('fetch', fetch)
    const items = await fetchDOGC()
    expect(items).toEqual(parseDOGCSummary(fixture))
    expect(fetch.mock.calls[0][0]).toBe('https://portaldogc.gencat.cat/eadop-rest/api/dogc/summaryLastPublishedDOGC')
    expect(fetch.mock.calls[1][0]).toBe('https://portaldogc.gencat.cat/eadop-rest/api/dogc/summaryDOGC')
    expect(fetch.mock.calls[1][1].method).toBe('POST')
    expect(fetch.mock.calls[1][1].body.get('numDOGC')).toBe('9761')
    expect(fetch.mock.calls[1][1].body.get('language')).toBe('es')
  })

  it('conserva anexos anunciados y elimina documentos repetidos entre respuestas', async () => {
    const annex = structuredClone(fixture)
    annex.sumaris[0].numDOGC = '9761A'
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ sumaris: [{ numDOGC: '9761' }, { numDOGC: '9761A' }] }))
      .mockResolvedValueOnce(Response.json(fixture))
      .mockResolvedValueOnce(Response.json(annex))
    vi.stubGlobal('fetch', fetch)
    expect(await fetchDOGC()).toHaveLength(parseDOGCSummary(fixture).length)
    expect(fetch.mock.calls[2][1].body.get('numDOGC')).toBe('9761A')
  })

  it('no acepta otro boletín ni una caída del segundo servicio como ausencia de novedades', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ sumaris: [{ numDOGC: '9760' }] }))
      .mockResolvedValueOnce(Response.json(fixture))
      .mockResolvedValueOnce(Response.json({ sumaris: [{ numDOGC: '9761' }] }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    await expect(fetchDOGC()).rejects.toThrow('no corresponde')
    await expect(fetchDOGC()).rejects.toThrow('HTTP 503')
  })
})
