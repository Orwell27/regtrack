import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { KnowledgeVault } from '../lib/knowledge/vault'
import { seedMemoryDemo } from '../lib/knowledge/demo'
const root = resolve('artifacts/mvp-demo/vault')
if (existsSync(root)) throw new Error('La demo ya existe; se conserva. No mezclar ni sustituir su historial.')
console.log(JSON.stringify({ directory: root, documentId: seedMemoryDemo(new KnowledgeVault(root)), fictitious: true }, null, 2))
