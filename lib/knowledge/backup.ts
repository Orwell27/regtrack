import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { KnowledgeVault } from './vault'

interface FileEntry { path: string; sha256: string; bytes: number }
interface Manifest { format: 'regtrack-vault-1'; createdAt: string; records: number; files: FileEntry[] }
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')
const validPath = (path: string) => path.split('/').every(p => p && p !== '.' && p !== '..' && !/[\\:\x00-\x1f]/.test(p)) && !isAbsolute(path)

function inventory(root: string, prefix = ''): FileEntry[] {
  if (lstatSync(root).isSymbolicLink()) throw new Error('No se admiten enlaces simbólicos en un respaldo')
  return readdirSync(root).sort().flatMap(name => {
    const path = prefix ? `${prefix}/${name}` : name
    if (!validPath(path) || name.endsWith('.lock') || name.endsWith('.tmp')) throw new Error('Vault ocupado o ruta no admitida; detener escritores antes del respaldo')
    const full = join(root, name), stat = lstatSync(full)
    if (stat.isSymbolicLink()) throw new Error('No se admiten enlaces simbólicos en un respaldo')
    if (stat.isDirectory()) return inventory(full, path)
    if (!stat.isFile()) throw new Error('Tipo de archivo no admitido')
    const bytes = readFileSync(full)
    return [{ path, sha256: hash(bytes), bytes: bytes.length }]
  })
}

function newTarget(path: string, source: string) {
  const target = resolve(path)
  if (existsSync(target)) throw new Error('El destino ya existe; no se sobrescribe')
  // Resolve existing parent symlinks too, so an alias cannot place the copy inside its source.
  let ancestor = dirname(target)
  while (!existsSync(ancestor)) ancestor = dirname(ancestor)
  const canonical = resolve(realpathSync(ancestor), relative(ancestor, target))
  const rel = relative(realpathSync(source), canonical)
  if (!rel || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) throw new Error('El destino debe estar fuera del origen')
  mkdirSync(dirname(target), { recursive: true })
  return target
}

function copyChecked(source: string, target: string, files: FileEntry[]) {
  for (const file of files) {
    const data = readFileSync(join(source, file.path))
    if (data.length !== file.bytes || hash(data) !== file.sha256) throw new Error('El origen cambió durante la copia')
    const dest = join(target, file.path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, data, { flag: 'wx', mode: 0o600 })
  }
}

export function verifyBackup(directory: string): Manifest {
  const root = realpathSync(directory)
  const raw = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as Manifest
  if (raw.format !== 'regtrack-vault-1' || !Number.isSafeInteger(raw.records) || raw.records < 0 || !Array.isArray(raw.files)) throw new Error('Manifiesto de respaldo inválido')
  const names = new Set<string>()
  for (const file of raw.files) {
    if (!file || typeof file.path !== 'string' || !validPath(file.path) || names.has(file.path.toLowerCase()) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Ruta o huella de respaldo inválida')
    names.add(file.path.toLowerCase())
  }
  const actual = inventory(join(root, 'vault'))
  if (JSON.stringify(actual) !== JSON.stringify(raw.files)) throw new Error('Respaldo incompleto o alterado')
  if (new KnowledgeVault(join(root, 'vault')).list().length !== raw.records) throw new Error('Número de versiones incorrecto')
  return raw
}

export function backupVault(vault: KnowledgeVault, destination: string) {
  if (!existsSync(join(vault.root, '.records'))) throw new Error('No hay un vault inicializado para respaldar')
  const target = newTarget(destination, vault.root)
  const records = vault.list().length, files = inventory(vault.root)
  const stage = `${target}.partial-${randomUUID()}`
  mkdirSync(join(stage, 'vault'), { recursive: true })
  copyChecked(vault.root, join(stage, 'vault'), files)
  if (JSON.stringify(inventory(vault.root)) !== JSON.stringify(files)) throw new Error('El vault cambió durante el respaldo; repetir con el escritor detenido')
  // Keep empty canonical folders as well (an initialized, empty vault is valid).
  new KnowledgeVault(join(stage, 'vault')).init()
  const manifest: Manifest = { format: 'regtrack-vault-1', createdAt: new Date().toISOString(), records, files: inventory(join(stage, 'vault')) }
  writeFileSync(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 })
  verifyBackup(stage)
  renameSync(stage, target)
  return { directory: target, records, files: manifest.files.length }
}

export function restoreBackup(directory: string, destination: string) {
  const manifest = verifyBackup(directory)
  const target = newTarget(destination, directory), stage = `${target}.partial-${randomUUID()}`
  mkdirSync(stage)
  copyChecked(join(directory, 'vault'), stage, manifest.files)
  new KnowledgeVault(stage).init()
  if (new KnowledgeVault(stage).list().length !== manifest.records) throw new Error('Restauración inválida')
  renameSync(stage, target)
  return { directory: target, records: manifest.records }
}
