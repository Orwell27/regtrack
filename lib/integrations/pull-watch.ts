import { KnowledgeVault } from '../knowledge/vault'
import { ChangeDetection } from './providers'

/** A failed source must fail the import, even if older snapshots still exist. */
export async function pullWatch(service: ChangeDetection, vault: KnowledgeVault, id: string, limit = 20) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Límite entre 1 y 100')
  const snapshot = await service.snapshots(id)
  const known = new Set(vault.list().filter(r => r.kind === 'cambio_web' && r.sourceUrl === snapshot.watch.url).map(r => r.observedAt))
  let saved = 0, remaining = 0
  for (const timestamp of snapshot.timestamps) {
    const observedAt = new Date(Number(timestamp) * 1000).toISOString()
    if (known.has(observedAt)) continue
    if (saved >= limit) { remaining++; continue }
    vault.put({ kind: 'cambio_web', title: snapshot.watch.title || snapshot.watch.url!, publisher: 'changedetection.io',
      sourceUrl: snapshot.watch.url, observedAt, contentKind: 'extracto', content: await snapshot.read(timestamp) })
    saved++
  }
  return { saved, remaining, note: 'Instantáneas de páginas; no equivalen a cambios normativos verificados.' }
}
