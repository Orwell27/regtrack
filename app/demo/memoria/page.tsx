import { notFound } from 'next/navigation'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { MemoryView, type MemoryQuery } from '@/components/knowledge/MemoryView'
import { KnowledgeVault } from '@/lib/knowledge/vault'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export default async function MemoryDemoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.REGTRACK_MEMORY_DEMO !== '1') notFound()
  // Fixed fictitious corpus; never reads REGTRACK_KNOWLEDGE_DIR or production data.
  const root = resolve('artifacts/mvp-demo/vault')
  const raw = await searchParams
  const query: MemoryQuery = Object.fromEntries(['q', 'tipo', 'id', 'version'].map(key => [key, typeof raw[key] === 'string' ? raw[key] : undefined]))
  const available = existsSync(join(root, '.records'))
  return <MemoryView demo base="/demo/memoria" records={available ? new KnowledgeVault(root).list() : []} query={query} status={available ? 'ready' : 'unavailable'} />
}
