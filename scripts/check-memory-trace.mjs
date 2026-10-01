import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

// Must run after next build. Missing routes/zero coverage must never be green.
const root = process.cwd()
const traces = ['.next/server/app/(admin)/admin/memoria/page.js.nft.json', '.next/server/app/demo/memoria/page.js.nft.json']
let inspected = 0
const errors = []
for (const path of traces) {
  if (!existsSync(path)) { errors.push(`Falta el trace de la ruta: ${path}`); continue }
  const { files } = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(files) || !files.length) { errors.push(`Trace vacío: cobertura cero en ${path}`); continue }
  const leaked = files.map(file => relative(root, resolve(dirname(path), file)).replaceAll('\\', '/'))
    .filter(file => /(^|\/)(\.knowledge|artifacts|\.records|\.receipts|\.git)(\/|$)|(^|\/)\.env[^/]*$|(^|\/)integrations\/config\.local\.json$/.test(file))
  if (leaked.length) errors.push(`El paquete incluye ${leaked.length} archivos locales privados o de prueba en ${path}; no publicar`)
  inspected++
}
if (errors.length) throw new Error(errors.join('\n'))
console.log(`Memoria: ${inspected} rutas comprobadas, sin archivos locales privados/de prueba en sus paquetes`)
