import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { KnowledgeVault } from '../lib/knowledge/vault'
import { OpenAleph } from '../lib/integrations/providers'

// Only the dedicated local service. Never reads .env or connects to a remote collection.
const base = 'http://127.0.0.1:8081'
const dir = resolve('artifacts/local-services')
mkdirSync(dir, { recursive: true })
async function main() {
  const readyUntil = Date.now() + 180_000
  let ready = false
  while (Date.now() < readyUntil) {
    try {
      const response = await fetch(`${base}/api/2/metadata`, { signal: AbortSignal.timeout(5_000), redirect: 'error' })
      if (response.ok) { ready = true; break }
    } catch { /* The API may still be starting after a restart. */ }
    await delay(2_000)
  }
  assert(ready, 'API local no preparada en 180 segundos')
  const identity = readFileSync('.knowledge/local-services/openaleph-identity.json', 'utf8').trim().split(/\r?\n/).at(-1)!
  const { token } = JSON.parse(identity) as { token: string }
  assert(token)
  if (process.argv.includes('--verify-saved')) {
    const saved = JSON.parse(readFileSync(join(dir, 'openaleph-result.json'), 'utf8')) as { collectionId: number; query: string; remoteEntityId: string; sha256: string }
    const service = new OpenAleph(base, token, saved.collectionId)
    const data = await service.search(saved.query) as { results?: { id: string; properties?: Record<string, string[]> }[] }
    const entity = data.results?.find(r => r.id === saved.remoteEntityId)
    assert.equal(data.results?.length, 1, 'El reintento debe conservar un único resultado')
    assert(entity?.properties?.notes?.some(n => { try { return JSON.parse(n).sha256 === saved.sha256 } catch { return false } }), 'No se recuperó la misma evidencia tras reiniciar')
    writeFileSync(join(dir, 'openaleph-restored.json'), JSON.stringify({ status: 'passed', at: new Date().toISOString(), collectionId: saved.collectionId, remoteEntityId: saved.remoteEntityId }, null, 2))
    console.log('OpenAleph: misma evidencia recuperada tras reiniciar, sin reimportar')
    return
  }
  const headers = { Authorization: `ApiKey ${token}`, 'Content-Type': 'application/json' }
  const query = `REGTRACKPROOF${randomUUID().replaceAll('-', '')}`
  const created = await fetch(`${base}/api/2/collections`, { method: 'POST', headers,
    body: JSON.stringify({ label: `Prueba ficticia ${query}`, foreign_id: query.toLowerCase(), category: 'other', countries: ['es'], languages: ['spa'] }),
    signal: AbortSignal.timeout(30_000), redirect: 'error' })
  if (!created.ok) {
    const detail = await created.json() as { errors?: unknown; message?: string }
    throw new Error(`Crear colección: HTTP ${created.status}; ${JSON.stringify(detail.errors ?? detail.message ?? 'sin detalle')}`)
  }
  const collection = await created.json() as { id: number | string }
  const collectionId = Number(collection.id)
  assert(Number.isSafeInteger(collectionId) && collectionId > 0)
  const anonymous = await fetch(`${base}/api/2/collections/${collectionId}`, { signal: AbortSignal.timeout(10_000), redirect: 'error' })
  assert([403, 404].includes(anonymous.status), 'La colección ficticia debe ser privada')
  const vault = new KnowledgeVault(join(dir, `vault-${query}`))
  const record = vault.put({ kind: 'noticia', title: query, sourceUrl: `urn:regtrack:proof:${query}`, publisher: 'Fixture RegTrack',
    observedAt: new Date().toISOString(), contentKind: 'extracto', content: `PRUEBA FICTICIA ${query}. Vivienda: plazo de treinta días. No es una norma ni una noticia real.` })
  const service = new OpenAleph(base, token, collectionId)
  assert.equal((await service.push(record)).status, 'accepted')
  let entity: { id: string; properties?: Record<string, string[]>; collection?: { id: number | string } } | undefined
  const end = Date.now() + 120_000
  while (Date.now() < end) {
    const data = await service.search(query) as { results?: typeof entity[] }
    entity = data.results?.find(r => r?.properties?.title?.includes(query))
    if (entity) break
    await delay(2_000)
  }
  assert(entity, 'Documento aceptado pero no recuperado por búsqueda en 120 segundos')
  const notes = entity.properties?.notes?.map(n => { try { return JSON.parse(n) } catch { return null } })
  assert(notes?.some(n => n?.sha256 === record.contentHash), 'La búsqueda debe recuperar la procedencia y huella exacta')
  assert.equal(Number(entity.collection?.id), collectionId)
  await service.push(record)
  await delay(2_000)
  const retry = await service.search(query) as { results?: { id: string }[] }
  assert.equal(retry.results?.length, 1)
  assert.equal(retry.results?.filter(r => r.id === entity!.id).length, 1)
  const result = { status: 'passed', at: new Date().toISOString(), collectionId, remoteEntityId: entity.id,
    localId: record.id, version: record.version, sha256: record.contentHash, query,
    checks: ['colección privada ante lectura anónima', 'importación mediante adaptador real', 'documento indexado y recuperado con huella y procedencia', 'reintento sin duplicado visible'] }
  writeFileSync(join(dir, 'openaleph-result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
