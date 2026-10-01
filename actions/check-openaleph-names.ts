import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { OpenAleph, ServiceHttp } from '../lib/integrations/providers'

const directory = 'artifacts/local-services'
const base = 'http://127.0.0.1:8081'
async function main() {
  // This collection was created by the local smoke test, never a production collection.
  const { collectionId } = JSON.parse(readFileSync(`${directory}/openaleph-result.json`, 'utf8')) as { collectionId: number }
  const { token } = JSON.parse(readFileSync('.knowledge/local-services/openaleph-identity.json', 'utf8').trim().split(/\r?\n/).at(-1)!) as { token: string }
  const api = new ServiceHttp(base, { Authorization: `ApiKey ${token}` })
  const service = new OpenAleph(base, token, collectionId)
  const savedPath = `${directory}/openaleph-names-result.json`
  const readOnly = process.argv.includes('--verify-saved')
  const saved = readOnly ? JSON.parse(readFileSync(savedPath, 'utf8')) as { mariaId: string; elenaId: string } : undefined
  if (!readOnly) {
    await api.request(`/api/2/collections/${collectionId}/_bulk`, 'POST', ['Maria', 'Elena'].map(name => ({
      id: `regtrack-synonym-proof-${name.toLowerCase()}`,
      schema: 'Person', properties: { name: [`${name} Pruebacodex`], country: ['es'], notes: ['PERSONA FICTICIA para comprobar el buscador. No es evidencia normativa ni una persona real.'] },
    })))
  }
  type Entity = { id: string; properties?: { name?: string[] } }
  async function find(query: string, synonyms = false) { return (await service.search(query, { synonyms }) as { results: Entity[] }).results }
  let maria: Entity | undefined
  let elena: Entity | undefined
  const until = Date.now() + 120_000
  while (Date.now() < until) {
    maria = (await find('Maria Pruebacodex')).find(e => e.properties?.name?.includes('Maria Pruebacodex'))
    elena = (await find('Elena Pruebacodex')).find(e => e.properties?.name?.includes('Elena Pruebacodex'))
    if (maria && elena) break
    await delay(2_000)
  }
  assert(maria && elena, 'No se recuperaron las dos personas ficticias por su nombre original')
  assert.equal((await find('Maruja Pruebacodex')).length, 0, 'Control: la búsqueda ordinaria no debe expandir nombres')
  const aliases = await find('Maruja Pruebacodex', true)
  assert.equal(aliases.length, 1, 'La variante debe encontrar solo la persona esperada')
  assert.equal(aliases[0].id, maria.id, 'La variante no recuperó el mismo ID')
  assert(!aliases.some(e => e.id === elena.id), 'La variante no debe mezclar las dos personas ficticias')
  assert.equal((await find('Zzxqnonexistent Pruebacodex', true)).length, 0, 'Control negativo: no basta compartir apellido')
  const configPath = `${directory}/openaleph-names.config.json`
  writeFileSync(configPath, JSON.stringify({ vault: `${directory}/names-cli-vault`, openAleph: { url: base, collectionId, tokenEnv: 'REGTRACK_ALEPH_SMOKE_KEY' } }))
  const tsx = createRequire(resolve('package.json')).resolve('tsx/cli')
  const { stdout } = await promisify(execFile)(process.execPath, [tsx, 'actions/knowledge.ts', 'search-aleph',
    '--config', configPath, '--query', 'Maruja Pruebacodex', '--synonyms'],
  { env: { ...process.env, REGTRACK_ALEPH_SMOKE_KEY: token }, timeout: 60_000 })
  const cli = JSON.parse(stdout) as { results: Entity[] }
  assert.equal(cli.results.length, 1)
  assert.equal(cli.results[0].id, maria.id, 'El comando CLI debe llegar al mismo resultado')
  if (saved) {
    assert.equal(maria.id, saved.mariaId)
    assert.equal(elena.id, saved.elenaId)
  }
  const result = { status: 'passed', at: new Date().toISOString(), collectionId, mariaId: maria.id, elenaId: elena.id,
    mode: readOnly ? 'recovered-without-reimport' : 'import-and-search', synonym: 'Maruja -> Maria', negativeControls: 3, cliVerified: true }
  writeFileSync(readOnly ? `${directory}/openaleph-names-restored.json` : savedPath, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
