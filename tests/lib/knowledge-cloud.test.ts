import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { KnowledgeVault } from '@/lib/knowledge/vault'
import { seedMemoryDemo } from '@/lib/knowledge/demo'
import { pushSharedMemory, readSharedMemory } from '@/lib/knowledge/cloud'

function fixture() {
  const vault = new KnowledgeVault(mkdtempSync(join(tmpdir(), 'regtrack-cloud-')))
  seedMemoryDemo(vault)
  const rows = new Map<string, { key: string; record: unknown; markdown: string }>()
  const state = { failWrite: false, failRead: false, omitLast: false, cap: 2, calls: 0 }
  // Real supabase-js query serialization, simulated PostgREST transport. SQL permissions tested separately.
  const db = createClient('https://memory.example.test', 'test-service-key', { global: { fetch: async (input, options) => {
    const url = new URL(String(input)); state.calls++
    if (options?.method === 'POST') {
      expect(new Headers(options.headers).get('prefer')).toContain('resolution=ignore-duplicates')
      expect(url.searchParams.get('on_conflict')).toBe('key')
      if (state.failWrite) return Response.json({ message: 'down' }, { status: 503 })
      for (const r of JSON.parse(String(options.body))) if (!rows.has(r.key)) rows.set(r.key, r)
      return new Response(null, { status: 201 })
    }
    if (state.failRead) return Response.json({ message: 'denied' }, { status: 403 })
    let result = [...rows.values()].sort((a, b) => a.key.localeCompare(b.key))
    const key = url.searchParams.get('key') ?? ''
    if (key.startsWith('gt.')) result = result.filter(r => r.key > key.slice(3)).slice(0, state.cap)
    if (key.startsWith('in.')) result = result.filter(r => key.includes(r.key))
    if (state.omitLast) result = result.slice(0, -1)
    return Response.json(result)
  } }, auth: { persistSession: false, autoRefreshToken: false } })
  return { vault, rows, db, state }
}
describe('memoria compartida', () => {
  it('conserva versiones y Markdown, lee más de una página y no duplica al repetir', async () => {
    const { vault, rows, db, state } = fixture(), records = vault.list()
    expect((await pushSharedMemory(db, records)).verified).toBe(records.length)
    expect((await pushSharedMemory(db, records)).verified).toBe(records.length)
    expect(rows.size).toBe(records.length)
    const recovered = await readSharedMemory(db)
    expect(recovered.map(r => r.version).sort()).toEqual(records.map(r => r.version).sort())
    expect(state.calls).toBeGreaterThan(5)
  })
  it('un emisor con un subconjunto no elimina el historial remoto', async () => {
    const { vault, db, rows } = fixture(), records = vault.list()
    await pushSharedMemory(db, records)
    await pushSharedMemory(db, [records[0]])
    expect(rows.size).toBe(records.length)
  })
  it('la copia dañada no se acepta ni se sobrescribe aunque coincida la clave', async () => {
    const { vault, rows, db } = fixture()
    await pushSharedMemory(db, vault.list())
    const first = rows.values().next().value!
    first.markdown += '\ncorrupto'
    await expect(readSharedMemory(db)).rejects.toThrow('Integridad')
    await expect(pushSharedMemory(db, vault.list())).rejects.toThrow('Integridad')
    expect(first.markdown).toContain('corrupto')
  })
  it('fallos de escritura, lectura o confirmación parcial impiden confirmar éxito', async () => {
    const { vault, db, state } = fixture()
    state.failWrite = true
    await expect(pushSharedMemory(db, vault.list())).rejects.toThrow('conservar')
    state.failWrite = false; state.omitLast = true
    await expect(pushSharedMemory(db, vault.list())).rejects.toThrow('verificar')
    state.omitLast = false; state.failRead = true
    await expect(readSharedMemory(db)).rejects.toThrow('leer')
  })
  it('rechaza registros alterados antes de enviar y admite archivo remoto vacío', async () => {
    const { vault, db, state } = fixture(), r = vault.list()[0]
    await expect(pushSharedMemory(db, [{ ...r, content: 'alterado' }])).rejects.toThrow('Integridad')
    await expect(pushSharedMemory(db, [])).rejects.toThrow('No hay versiones')
    expect(state.calls).toBe(0)
    expect(await readSharedMemory(db)).toEqual([])
  })
})
