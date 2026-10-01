import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { atomicWrite, digest, KnowledgeVault, type KnowledgeRecord } from '../knowledge/vault'

export interface Receipt { status: 'written' | 'accepted' | 'queued'; uuid?: string }
export async function syncRecords(vault: KnowledgeVault, destination: string, send: (r: KnowledgeRecord) => Promise<Receipt>, options: { limit: number; include?: (r: KnowledgeRecord) => boolean }) {
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error('Límite entre 1 y 100')
  vault.init()
  const lock = join(vault.root, '.receipts', `${digest(destination)}.lock`)
  try { writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 }) }
  catch { throw new Error('Sincronización bloqueada: otro proceso o candado pendiente; comprobar antes de reintentar') }
  try {
    const result = { sent: 0, skipped: 0, remaining: 0, receipts: [] as Receipt[] }
    for (const record of vault.list().reverse()) {
      if (options.include && !options.include(record)) continue
      const path = join(vault.root, '.receipts', `${digest(destination)}-${record.id}-${record.version}.json`)
      if (existsSync(path)) {
        // Un acuse en cola impide reenvíos que volverían a consumir IA. No implica terminado.
        const receipt = JSON.parse(readFileSync(path, 'utf8')) as Receipt
        if (!['written', 'accepted', 'queued'].includes(receipt.status)) throw new Error('Acuse de sincronización inválido')
        result.skipped++; continue
      }
      if (result.sent >= options.limit) { result.remaining++; continue }
      const receipt = await send(record)
      atomicWrite(path, JSON.stringify({ ...receipt, record: record.id, version: record.version, sentAt: new Date().toISOString() }, null, 2))
      result.receipts.push(receipt)
      result.sent++
    }
    return result
  } finally { unlinkSync(lock) }
}
