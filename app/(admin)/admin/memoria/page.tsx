import { MemoryView, type MemoryQuery } from '@/components/knowledge/MemoryView'
import { readPrivateMemory } from '@/lib/knowledge/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export default async function MemoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readPrivateMemory()
  const raw = await searchParams
  const query: MemoryQuery = Object.fromEntries(['q', 'tipo', 'id', 'version'].map(key => [key, typeof raw[key] === 'string' ? raw[key] : undefined]))
  return <MemoryView {...state} query={query} />
}
