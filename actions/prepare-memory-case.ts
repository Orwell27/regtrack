import { parseArgs } from 'node:util'
import { KnowledgeVault } from '../lib/knowledge/vault'
import { archiveAnalysis } from '../lib/knowledge/archive'
import { murciaHistoricalReading } from '../eval/memory/murcia'

// Local only: preserves the source version already in the archive. No credentials or remote writes.
const { values } = parseArgs({ options: { vault: { type: 'string' } } })
if (!values.vault) throw new Error('Indicar --vault con el archivo que contiene la publicación de 2019')
const vault = new KnowledgeVault(values.vault)
const source = vault.list({ latest: true }).find(r => r.kind === 'norma' && r.sourceUrl === 'https://www.borm.es/services/anuncio/780550/txt')
if (!source) throw new Error('Falta la fuente del caso Murcia; no se descarga ni se inventa')
const reading = murciaHistoricalReading(source)
const existing = vault.list().find(r => r.kind === 'analisis' && r.content === JSON.stringify({ schema: 'regtrack.analysis.v1', sourceVersion: source.version, sourceHash: source.contentHash, analysis: reading }))
const record = existing ?? archiveAnalysis(vault, source, reading)!
console.log(JSON.stringify({ sourceId: source.id, sourceVersion: source.version, readingId: record.id, readingVersion: record.version, review: record.review, remoteWrites: false }))
