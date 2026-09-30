import type { SupabaseClient } from '@supabase/supabase-js'
import { markdown, parseRecord, type KnowledgeRecord } from './vault'

export const MEMORY_TABLE = 'regtrack_memory_records'
const PAGE_SIZE = 100
const MAX_RECORDS = 5_000
const MAX_BYTES = 20 * 1024 * 1024
const MAX_BATCH_BYTES = 4 * 1024 * 1024
type Row = { key: string; record: KnowledgeRecord; markdown: string }
const keyOf = (r: KnowledgeRecord) => `${r.id}-${r.version}`
const size = (v: unknown) => Buffer.byteLength(JSON.stringify(v), 'utf8')
const fail = (operation: string) => new Error(`Memoria compartida: no se pudo ${operation}; comprobar conexión, permisos y migración`)

function parseRow(value: unknown): Row {
  if (!value || typeof value !== 'object') throw new Error('Fila de memoria inválida')
  const row = value as Row, record = parseRecord(row.record)
  if (row.key !== keyOf(record) || row.markdown !== markdown(record)) throw new Error('Integridad de memoria compartida incorrecta')
  return { key: row.key, record, markdown: row.markdown }
}

export async function readSharedMemory(db: SupabaseClient): Promise<KnowledgeRecord[]> {
  const records: KnowledgeRecord[] = []
  let after = '', bytes = 0
  // Stop only at an empty page, not at the server's potentially smaller response cap.
  while (true) {
    const { data, error } = await db.from(MEMORY_TABLE).select('key,record,markdown').gt('key', after).order('key').limit(PAGE_SIZE)
    if (error || !Array.isArray(data)) throw fail('leer el archivo')
    if (!data.length) return records
    for (const value of data) {
      const row = parseRow(value)
      if (row.key <= after) throw new Error('La paginación de memoria no avanza')
      after = row.key
      bytes += size(row)
      records.push(row.record)
      if (records.length > MAX_RECORDS || bytes > MAX_BYTES) throw new Error('Memoria superior al límite de lectura del MVP; no se muestra un archivo truncado')
    }
  }
}

export async function pushSharedMemory(db: SupabaseClient, records: KnowledgeRecord[]) {
  if (!records.length) throw new Error('No hay versiones locales para sincronizar')
  const rows = records.map(value => { const record = parseRecord(value); return { key: keyOf(record), record, markdown: markdown(record) } })
  if (new Set(rows.map(r => r.key)).size !== rows.length) throw new Error('Versiones duplicadas en el lote local')
  if (rows.some(row => size(row) > MAX_BATCH_BYTES)) throw new Error('Una versión supera el límite de envío del MVP')
  let verified = 0, batch: Row[] = [], bytes = 0
  async function send() {
    if (!batch.length) return
    // INSERT ON CONFLICT DO NOTHING. Never replace a capture, delete remote history or trust a local receipt.
    const { error } = await db.from(MEMORY_TABLE).upsert(batch, { onConflict: 'key', ignoreDuplicates: true })
    if (error) throw fail('conservar las versiones')
    const { data, error: readError } = await db.from(MEMORY_TABLE).select('key,record,markdown').in('key', batch.map(r => r.key))
    if (readError || !Array.isArray(data) || data.length !== batch.length) throw fail('verificar las versiones guardadas')
    const returned = new Map(data.map(value => { const row = parseRow(value); return [row.key, row] }))
    if (returned.size !== batch.length || batch.some(row => returned.get(row.key)?.record.version !== row.record.version)) throw new Error('La lectura posterior no coincide con el envío')
    verified += batch.length
    batch = []; bytes = 0
  }
  for (const row of rows) {
    const n = size(row)
    if (batch.length >= 25 || bytes + n > MAX_BATCH_BYTES) await send()
    batch.push(row); bytes += n
  }
  await send()
  return { verified }
}
