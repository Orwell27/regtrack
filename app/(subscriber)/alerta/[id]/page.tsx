import Link from 'next/link'
import { communityConfig } from '@/lib/community/server'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertDetailView } from '@/components/subscriber/AlertDetailView'
import { alertasHref, parseAlertFilters } from '@/lib/alertas-ui'
import type { RelacionConAlerta } from '@/lib/correlacion/types'
interface RelRow {
  id: string
  alerta_id: string
  alerta_relacionada_id: string
  tipo_relacion: string
  score_similitud: number
  razon: string | null
  detectada_en: string
}
type AlertaMeta = {
  id: string
  titulo: string
  fuente: string
  fecha_publicacion: string | null
  url: string
}
export const dynamic = 'force-dynamic'
export default async function AlertaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ volver?: string }>
}) {
  const [user, { id }] = await Promise.all([getAuthUser(), params])
  if (!user) redirect('/login')

  const db = createNextServerClient()
  const { data: alerta, error: alertError } = await db
    .from('alertas')
    .select('*')
    .eq('id', id)
    .eq('estado', 'enviada')
    .single()

  if (alertError && alertError.code !== 'PGRST116')
    throw new Error('No se ha podido cargar la alerta')
  if (!alerta) notFound()

  // Fetch relations — two-step to avoid Supabase FK ambiguity (two FKs to alertas)
  const [{ data: asNew }, { data: asOld }] = await Promise.all([
    db
      .from('alerta_relaciones')
      .select(
        'id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en',
      )
      .eq('alerta_id', id),
    db
      .from('alerta_relaciones')
      .select(
        'id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en',
      )
      .eq('alerta_relacionada_id', id),
  ])

  const allRelRows: RelRow[] = [...(asNew ?? []), ...(asOld ?? [])]
  let relaciones: RelacionConAlerta[] = []

  if (allRelRows.length > 0) {
    const otherIds = allRelRows.map((r: RelRow) =>
      r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id,
    )
    const { data: alertasData } = await db
      .from('alertas')
      .select('id, titulo, fuente, fecha_publicacion, url')
      .in('id', otherIds)
      .eq('estado', 'enviada')

    const alertaMap = new Map(
      (alertasData ?? []).map((a: AlertaMeta) => [a.id, a]),
    )
    const seen = new Set<string>()

    relaciones = allRelRows
      .filter((r: RelRow) => {
        const key =
          r.alerta_id < r.alerta_relacionada_id
            ? `${r.alerta_id}-${r.alerta_relacionada_id}`
            : `${r.alerta_relacionada_id}-${r.alerta_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: RelRow) => {
        const otherId =
          r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
        const a = alertaMap.get(otherId)
        return {
          id: r.id,
          alerta_id: r.alerta_id,
          alerta_relacionada_id: r.alerta_relacionada_id,
          tipo_relacion: r.tipo_relacion,
          score_similitud: r.score_similitud,
          razon: r.razon,
          detectada_en: r.detectada_en,
          titulo: a?.titulo ?? '',
          fuente: a?.fuente ?? '',
          fecha_publicacion: a?.fecha_publicacion ?? null,
          url: a?.url ?? '',
        } as RelacionConAlerta
      })
  }

  const { volver } = await searchParams
  const returnTo =
    typeof volver === 'string' && volver.startsWith('/alertas?')
      ? alertasHref(
          parseAlertFilters(
            Object.fromEntries(new URLSearchParams(volver.slice(9))),
          ),
        )
      : '/alertas'
  return (
    <>
      <AlertDetailView
        alerta={alerta}
        plan={user.plan}
        relaciones={relaciones.filter((r) => r.titulo)}
        returnTo={returnTo}
      />
      {communityConfig().enabled && (
        <section className="mt-6 rounded-xl border p-6">
          <h2 className="text-lg font-semibold">
            ¿Cómo encaja esta norma en tu situación?
          </h2>
          <p className="my-3">
            Consulta su contexto y las preguntas de otros propietarios en la
            comunidad.
          </p>
          <Link className="underline" href={`/comunidad/novedades/${id}`}>
            Abrir en la comunidad →
          </Link>
        </section>
      )}
    </>
  )
}
