import { loadEnvConfig } from '@next/env'
import { parseArgs } from 'node:util'
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createServerClient } from '../lib/supabase'
import { KnowledgeVault } from '../lib/knowledge/vault'
import { pushSharedMemory, readSharedMemory } from '../lib/knowledge/cloud'

loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const { positionals, values } = parseArgs({ allowPositionals: true, options: { vault: { type: 'string' }, to: { type: 'string' } } })
async function main() {
  if (!['status', 'push', 'recover-content'].includes(positionals[0])) {
    console.log('memory:cloud status | push --vault RUTA | recover-content --to DIRECTORIO_NUEVO (no recupera acuses de integraciones)')
    return
  }
  const db = createServerClient()
  if (positionals[0] === 'push') {
    const root = values.vault || process.env.REGTRACK_KNOWLEDGE_DIR
    if (!root || !existsSync(resolve(root, '.records'))) throw new Error('Indicar un vault inicializado con --vault')
    console.log(JSON.stringify(await pushSharedMemory(db, new KnowledgeVault(root).list())))
    return
  }
  const records = await readSharedMemory(db)
  if (positionals[0] === 'status') {
    console.log(JSON.stringify({ versions: records.length, documents: new Set(records.map(r => r.id)).size, integrity: 'verified' }))
    return
  }
  if (!values.to) throw new Error('Falta --to DIRECTORIO_NUEVO')
  const target = resolve(values.to)
  if (existsSync(target)) throw new Error('El destino ya existe; no se sobrescribe')
  mkdirSync(dirname(target), { recursive: true })
  const stage = `${target}.partial-${randomUUID()}`, vault = new KnowledgeVault(stage)
  vault.init()
  for (const r of records) vault.put(r)
  if (vault.list().length !== records.length) throw new Error('No se pudieron recuperar todas las versiones')
  renameSync(stage, target)
  console.log(JSON.stringify({ versions: records.length, destination: target, note: 'Contenido recuperado; conservar el respaldo completo para recuperar acuses y evitar repetir integraciones.' }))
}
main().catch(() => { console.error('Memoria compartida: operación fallida. Revisar argumentos, configuración, conectividad, permisos e integridad.'); process.exitCode = 1 })
