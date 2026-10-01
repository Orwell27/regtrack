import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KnowledgeVault } from '@/lib/knowledge/vault'
import { boeQuery, ChangeDetection, OpenAleph, pushBasicMemory, pushGraphiti, ServiceHttp } from '@/lib/integrations/providers'
import { unwrapToolResult } from '@/lib/integrations/mcp'
import { endpointUrl } from '@/lib/integrations/config'

function record() { return new KnowledgeVault(mkdtempSync(join(tmpdir(), 'regtrack-adapter-'))).put({ kind: 'norma', title: 'Caso', sourceUrl: 'https://www.boe.es/ejemplo', publisher: 'BOE', observedAt: '2026-09-30T12:00:00Z', content: 'Texto', contentKind: 'texto_completo' }) }

describe('contratos de integraciones', () => {
  it('Basic Memory escribe y permite reintentar una nota propia sin pisar otras', async () => {
    const client = { call: vi.fn().mockResolvedValue({}) }, r = record()
    await pushBasicMemory(client, 'regtrack', r)
    expect(client.call).toHaveBeenCalledWith('write_note', expect.objectContaining({ project: 'regtrack', directory: 'regtrack', title: `RegTrack ${r.id}-${r.version}`, overwrite: true }))
  })
  it('Graphiti no llama al servidor sin permiso de IA y devuelve queued con procedencia', async () => {
    const client = { call: vi.fn().mockResolvedValue({ message: 'queued' }) }, r = record()
    await expect(pushGraphiti(client, 'regtrack', r, false)).rejects.toThrow('allow-model-calls')
    expect(client.call).not.toHaveBeenCalled()
    expect(await pushGraphiti(client, 'regtrack', r, true)).toMatchObject({ status: 'queued' })
    expect(client.call).toHaveBeenCalledWith('add_memory', expect.objectContaining({ group_id: 'regtrack', reference_time: r.observedAt, source_description: r.sourceUrl, episode_body: JSON.stringify(r) }))
    await expect(pushGraphiti(client, 'regtrack', { ...r, kind: 'reporte' }, true)).rejects.toThrow('informes propios')
  })
  it('OpenAleph envía FtM al bulk real y mantiene búsqueda dentro de la colección', async () => {
    const http = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(Response.json({ results: [] }))
    const service = new OpenAleph('https://aleph.example', 'token', 7, http)
    expect(await service.push(record())).toEqual({ status: 'accepted' })
    expect(http.mock.calls[0][0]).toBe('https://aleph.example/api/2/collections/7/_bulk')
    expect(http.mock.calls[0][1].headers.Authorization).toBe('ApiKey token')
    expect(JSON.parse(http.mock.calls[0][1].body)[0].schema).toBe('Document')
    await service.search('Empresa vivienda')
    expect(new URL(http.mock.calls[1][0]).searchParams.get('filter:collection_id')).toBe('7')
  })
  it('no convierte 401/503 en una importación correcta ni revela respuesta sensible', async () => {
    const http = vi.fn().mockResolvedValue(new Response('secret-in-response', { status: 401 }))
    await expect(new ServiceHttp('https://example.org', {}, http).request('/')).rejects.toThrow('HTTP 401')
  })
  it('ampliar nombres requiere opt-in y conserva el filtro de colección', async () => {
    const http = vi.fn().mockImplementation(async () => Response.json({ results: [] }))
    const service = new OpenAleph('https://aleph.example', 'token', 7, http)
    await service.search('Maruja')
    await service.search('Maruja', { synonyms: true })
    const queries = http.mock.calls.map(call => new URL(call[0]).searchParams)
    expect(queries[0].has('synonyms')).toBe(false)
    expect(queries[1].get('synonyms')).toBe('true')
    expect(queries.every(query => query.get('filter:collection_id') === '7')).toBe(true)
  })
  it('changedetection conserva todas las fechas disponibles y descarga el contenido real', async () => {
    const http = vi.fn().mockResolvedValueOnce(Response.json({ url: 'https://example.org/noticia', title: 'Noticia' }))
      .mockResolvedValueOnce(Response.json({ '1790769600': '/a', '1790856000': '/b' }))
      .mockResolvedValueOnce(new Response('Texto de noticia'))
    const snapshots = await new ChangeDetection('http://localhost:5000', 'key', http).snapshots('watch-1')
    expect(snapshots.timestamps).toHaveLength(2)
    expect(await snapshots.read(snapshots.timestamps[0])).toBe('Texto de noticia')
    expect(http.mock.calls[2][0]).toContain('/history/1790769600')
    expect(http.mock.calls[0][1].headers['x-api-key']).toBe('key')
  })
  it('un monitor bloqueado no se presenta como ausencia de cambios', async () => {
    const http = vi.fn().mockResolvedValueOnce(Response.json({ url: 'https://example.org', last_error: 'CAPTCHA' }))
    await expect(new ChangeDetection('http://localhost:5000', 'key', http).snapshots('id')).rejects.toThrow('con error')
    expect(http).toHaveBeenCalledTimes(1)
  })
  it('un monitor sin ninguna captura no acredita vigilancia', async () => {
    const http = vi.fn().mockResolvedValueOnce(Response.json({ url: 'https://example.org' }))
      .mockResolvedValueOnce(Response.json({}))
    await expect(new ChangeDetection('http://localhost:5000', 'key', http).snapshots('id')).rejects.toThrow('sin capturas')
  })
  it('MCP-BOE consulta y compara las herramientas correctas', async () => {
    const c = { call: vi.fn().mockResolvedValue('Texto') }
    await boeQuery(c, 'BOE-A-1994-26003')
    await boeQuery(c, 'BOE-A-1994-26003', '2020-01-01', '2026-09-30')
    expect(c.call.mock.calls.map(a => a[0])).toEqual(['get_consolidated_law', 'compare_law_versions'])
    await expect(boeQuery(c, 'BORME')).rejects.toThrow('Identificador')
    await expect(boeQuery(c, 'BOE-A-1994-26003', '2026-09-30', '2020-01-01')).rejects.toThrow('fechas')
  })
  it.each([{ isError: true }, { structuredContent: { error: 'denied' } }, { structuredContent: { result: 'Error: escritura rechazada' } }, { content: [{ type: 'text', text: 'Error interno: unavailable' }] }])('MCP no confunde errores de aplicación con éxito %j', value => {
    expect(() => unwrapToolResult(value)).toThrow()
  })
  it('solo permite HTTP sin cifrar en loopback y rechaza credenciales en URL', () => {
    expect(() => endpointUrl('http://remote.example/mcp')).toThrow('HTTPS')
    expect(() => endpointUrl('https://user:password@example.org')).toThrow('inválido')
    expect(endpointUrl('http://127.0.0.1:8000/mcp/').hostname).toBe('127.0.0.1')
  })
})
