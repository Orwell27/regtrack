import assert from 'node:assert/strict'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer, type Server } from 'node:http'
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { KnowledgeVault } from '../lib/knowledge/vault'
import { ChangeDetection } from '../lib/integrations/providers'
import { pullWatch } from '../lib/integrations/pull-watch'

// No .env loading, external sources, notifications or model calls. All state is isolated.
const runtime = ['--offline', '--python', '3.12', '--prerelease=allow', '--from', 'changedetection.io==0.60.8']
const root = resolve('artifacts/changedetection-smoke')
mkdirSync(root, { recursive: true })
const dir = mkdtempSync(join(root, 'run-'))
const checks: string[] = []
let child: ChildProcess | undefined
let processError: Error | undefined
let fixture: Server | undefined
let fixtureText = 'PRUEBA FICTICIA. Vivienda: plazo inicial de veinte días.'
let unavailable = false
const env: NodeJS.ProcessEnv = { NODE_ENV: 'test' }
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'UV_CACHE_DIR', 'UV_PYTHON_INSTALL_DIR']) {
  if (process.env[key]) env[key] = process.env[key]
}
Object.assign(env, { FETCH_WORKERS: '1', DISABLE_VERSION_CHECK: 'true', DEFAULT_FETCH_BACKEND: 'html_requests',
  // Only this disposable server can fetch the loopback fixture. Never use this in production.
  ALLOW_IANA_RESTRICTED_ADDRESSES: 'true', PYTHONUTF8: '1', NO_PROXY: '127.0.0.1,localhost' })

async function listen(server: Server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert(address && typeof address !== 'string')
  return address.port
}

async function until<T>(label: string, check: () => Promise<T | false>): Promise<T> {
  const end = Date.now() + 60_000
  while (Date.now() < end) {
    if (processError) throw processError
    if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error(`changedetection terminó durante ${label}; consultar service.log`)
    const result = await check()
    if (result !== false) return result
    await delay(1_000)
  }
  throw new Error(`Tiempo agotado: ${label}; consultar service.log`)
}

async function stopService() {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return
  const done = once(child, 'exit')
  if (process.platform === 'win32') {
    // Kill only the process tree created by this script, including Python fetch workers.
    const stopped = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'pipe', timeout: 15_000 })
    if (stopped.status !== 0 && child.exitCode === null) throw new Error('No se pudo detener el servidor de prueba propio')
  } else process.kill(-child.pid, 'SIGTERM')
  await Promise.race([done, delay(10_000).then(() => { if (child?.exitCode === null && child.signalCode === null) throw new Error('Servidor de prueba no terminó') })])
  child = undefined
}

async function main() {
  console.log(`Prueba real changedetection.io 0.60.8; artefactos: ${dir}`)
  const python = spawnSync(process.env.REGTRACK_UVX || 'uvx', [...runtime, 'python', '-c', 'import sys; print(sys.executable)'],
    { env, windowsHide: true, encoding: 'utf8', timeout: 60_000 })
  if (python.status !== 0 || !python.stdout.trim()) throw new Error('Preparar antes uvx --python 3.12 --prerelease=allow --from changedetection.io==0.60.8 python -c "import changedetectionio"')
  fixture = createServer((_req, res) => {
    res.writeHead(unavailable ? 503 : 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(`<html><body><main>${unavailable ? 'Fuente de prueba no disponible' : fixtureText}</main></body></html>`)
  })
  const source = `http://127.0.0.1:${await listen(fixture)}/prueba`
  const reservation = createServer()
  const port = await listen(reservation)
  await new Promise<void>(r => reservation.close(() => r()))
  const base = `http://127.0.0.1:${port}`
  const data = join(dir, 'datastore')
  let token = ''
  const api = async (path: string) => {
    const res = await fetch(`${base}/api/v1${path}`, { headers: { 'x-api-key': token }, signal: AbortSignal.timeout(5_000), redirect: 'error' })
    assert.equal(res.status, 200, `API ${path}`)
    return res.json()
  }
  async function start(initial: boolean) {
    const log = openSync(join(dir, 'service.log'), 'a')
    const args = [resolve('integrations/changedetection/server.py'), '-h', '127.0.0.1', '-p', String(port), '-d', data, '-C', '-l', 'WARNING']
    if (initial) args.push('-u', source, '-u0', JSON.stringify({ title: 'Prueba ficticia RegTrack', fetch_backend: 'html_requests', paused: true, notification_urls: [] }))
    processError = undefined
    child = spawn(python.stdout.trim(), args, { env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', log, log] })
    child.on('error', e => { processError = e })
    closeSync(log)
    await until('arranque y autenticación', async () => {
      try {
        token = JSON.parse(readFileSync(join(data, 'changedetection.json'), 'utf8')).settings.application.api_access_token
        if (!token) return false
        const res = await fetch(`${base}/api/v1/watch`, { signal: AbortSignal.timeout(2_000) })
        if (res.status !== 403) throw new Error('La API de prueba debe exigir autenticación')
        return true
      } catch (e) {
        if (e instanceof Error && e.message.includes('exigir autenticación')) throw e
        return false
      }
    })
  }
  await start(true)
  checks.push('API sin clave rechazada con 403')
  const watches = await api('/watch')
  assert.equal(Object.keys(watches).length, 1, 'Solo debe existir la página ficticia')
  const id = Object.keys(watches)[0]
  const service = new ChangeDetection(base, token)
  const vault = new KnowledgeVault(join(dir, 'vault'))
  await assert.rejects(pullWatch(service, vault, id), /sin capturas/)
  checks.push('Monitor aún no comprobado rechazado como vigilancia no verificada')
  async function scan(count: number) {
    await api(`/watch/${id}?recheck=1`)
    await until(`instantánea ${count}`, async () => {
      const watch = await api(`/watch/${id}`)
      if (watch.last_error) throw new Error(`Falló la captura ficticia; consultar service.log`)
      return Object.keys(await api(`/watch/${id}/history`)).length >= count
    })
  }
  await scan(1)
  assert.equal((await pullWatch(service, vault, id)).saved, 1)
  const first = vault.list()[0]
  assert(first.content.includes('veinte días'))
  checks.push('Primera captura importada mediante el adaptador real')
  await delay(1_100) // The upstream history keys have second precision.
  fixtureText = 'PRUEBA FICTICIA. Vivienda: plazo ampliado a treinta días.'
  await scan(2)
  assert.equal((await pullWatch(service, vault, id)).saved, 1)
  assert(vault.search('treinta días')[0]?.content.includes('treinta días'))
  assert.equal(vault.search('treinta días', first.observedAt).length, 0)
  assert(vault.search('veinte días', first.observedAt)[0]?.content.includes('veinte días'))
  assert.equal((await pullWatch(service, vault, id)).saved, 0)
  checks.push('Cambio recuperado, consulta temporal correcta y reintento sin duplicados')
  await stopService()
  await start(false)
  const restarted = new ChangeDetection(base, token)
  assert.equal((await restarted.snapshots(id)).timestamps.length, 2)
  assert.equal((await pullWatch(restarted, new KnowledgeVault(vault.root), id)).saved, 0)
  checks.push('Historial y memoria conservados tras reiniciar el servidor')
  unavailable = true
  await api(`/watch/${id}?recheck=1`)
  await until('error de la fuente', async () => Boolean((await api(`/watch/${id}`)).last_error))
  await assert.rejects(pullWatch(restarted, vault, id), /con error/)
  assert.equal(vault.list().length, 2)
  checks.push('Fuente HTTP 503 rechazada como error, sin fabricar ausencia de novedades')
  console.log(checks.join('\n'))
}

main().finally(async () => {
  try { await stopService() }
  finally { if (fixture) await new Promise<void>(r => fixture!.close(() => r())) }
}).then(() => writeFileSync(join(dir, 'result.json'), JSON.stringify({ status: 'passed', at: new Date().toISOString(), checks }, null, 2)))
  .catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1
    writeFileSync(join(dir, 'result.json'), JSON.stringify({ status: 'failed', at: new Date().toISOString(), checks }, null, 2)) })
