import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createNextServerClient } from '@/lib/supabase'
import { KnowledgeVault, type KnowledgeRecord } from './vault'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readSharedMemory } from './cloud'

export async function readPrivateMemory(): Promise<{ status: 'ready' | 'unconfigured' | 'unavailable'; records: KnowledgeRecord[] }> {
  const cookieStore = await cookies()
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll() },
  })
  // Verify with Auth before either the role query or reading any private file.
  const { data: { user }, error: authError } = await auth.auth.getUser()
  if (authError || !user) redirect('/login')
  const db = createNextServerClient()
  const { data: profile, error } = await db.from('usuarios').select('rol').eq('auth_id', user.id).single()
  if (error || profile?.rol !== 'admin') notFound()
  const backend = process.env.REGTRACK_MEMORY_BACKEND?.trim()
  if (backend === 'supabase') {
    try { return { status: 'ready', records: await readSharedMemory(db) } }
    catch { return { status: 'unavailable', records: [] } }
  }
  if (backend && backend !== 'filesystem') return { status: 'unavailable', records: [] }
  const root = process.env.REGTRACK_KNOWLEDGE_DIR?.trim()
  if (!root) return { status: 'unconfigured', records: [] }
  // A missing mount is not an empty, successfully scanned corpus.
  if (!existsSync(join(root, '.records'))) return { status: 'unavailable', records: [] }
  try { return { status: 'ready', records: new KnowledgeVault(root).list() } }
  catch { return { status: 'unavailable', records: [] } }
}
