import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { parseAlertFilters } from '@/lib/alertas-ui'
import { AlertListView } from '@/components/subscriber/AlertListView'

export const dynamic = 'force-dynamic'
type Subcategory = { id: number; slug: string; nombre: string }
type SubEntry = { alerta_id: string; subcategorias: { nombre: string; slug: string } | null }

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [user, rawParams] = await Promise.all([getAuthUser(), searchParams])
  if (!user) redirect('/login')
  const params = parseAlertFilters(rawParams)
  const page = Number(params.page) - 1
  const db = createNextServerClient()
  const [interests, categories] = await Promise.all([
    db.from('suscriptor_intereses').select('subcategoria_id').eq('usuario_id', user.usuarioId),
    db.from('subcategorias').select('id, slug, nombre').eq('activo', true).order('nombre'),
  ])
  const interesIds = (interests.data ?? []).map(i => i.subcategoria_id)
  const subcats: Subcategory[] = categories.data ?? []
  const category = subcats.find(s => s.slug === params.subcategoria)
  const emptyId = '00000000-0000-0000-0000-000000000000'
  let failed = Boolean(interests.error || categories.error)
  let query = db.from('alertas').select('*', { count: 'exact' }).eq('estado', 'enviada')
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * 20, page * 20 + 19)
  if (params.fuente) query = query.in('fuente', params.fuente.split(','))
  if (params.urgencia) query = query.eq('urgencia', params.urgencia)
  if (params.q) query = query.or(`titulo.ilike.%${params.q}%,resumen.ilike.%${params.q}%`)

  // Apply both conditions independently: category AND personal interests.
  if (params.subcategoria) {
    const matching = category ? await db.from('alerta_sectores').select('alerta_id').eq('subcategoria_id', category.id) : { data: [], error: null }
    failed ||= Boolean(matching.error)
    const ids = (matching.data ?? []).map(row => row.alerta_id)
    query = query.in('id', ids.length ? ids : [emptyId])
  }
  if (params.solo_intereses === 'true') {
    const matching = interesIds.length ? await db.from('alerta_sectores').select('alerta_id').in('subcategoria_id', interesIds) : { data: [], error: null }
    failed ||= Boolean(matching.error)
    const ids = (matching.data ?? []).map(row => row.alerta_id)
    query = query.in('id', ids.length ? ids : [emptyId])
  }

  const result = await query
  failed ||= Boolean(result.error)
  const alertas = result.data ?? []
  const ids = alertas.map(a => a.id)
  const relevantIds: string[] = []
  const subsByAlerta: Record<string, Array<{ nombre: string; slug: string }>> = {}
  if (ids.length) {
    const labels = await db.from('alerta_sectores').select('alerta_id, subcategoria_id, subcategorias(nombre, slug)').in('alerta_id', ids)
    failed ||= Boolean(labels.error)
    for (const row of labels.data ?? []) {
      if (interesIds.includes(row.subcategoria_id)) relevantIds.push(row.alerta_id)
      const sub = (row as unknown as SubEntry).subcategorias
      if (sub) (subsByAlerta[row.alerta_id] ??= []).push(sub)
    }
  }
  return <AlertListView alertas={alertas} count={result.count ?? 0} params={params} plan={user.plan} subcats={subcats} interestCount={interesIds.length} relevantIds={relevantIds} subsByAlerta={subsByAlerta} error={failed} />
}
