import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createNextServerClient()

  // Step 1: fetch raw relation rows from both directions
  const [{ data: asNew }, { data: asOld }] = await Promise.all([
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_id', id),
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_relacionada_id', id),
  ])

  const allRows = [...(asNew ?? []), ...(asOld ?? [])]
  if (allRows.length === 0) return NextResponse.json({ relaciones: [] })

  // Step 2: collect IDs of the "other" alert in each relation
  const otherIds = allRows.map(r =>
    r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
  )

  const { data: alertasData } = await db
    .from('alertas')
    .select('id, titulo, fuente, fecha_publicacion, url')
    .in('id', otherIds)

  const alertaMap = new Map((alertasData ?? []).map((a: any) => [a.id, a]))

  // Step 3: deduplicate and build response
  const seen = new Set<string>()
  const relaciones: RelacionConAlerta[] = allRows
    .filter(r => {
      const key = r.alerta_id < r.alerta_relacionada_id
        ? `${r.alerta_id}-${r.alerta_relacionada_id}`
        : `${r.alerta_relacionada_id}-${r.alerta_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(r => {
      const otherId = r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
      const alerta = alertaMap.get(otherId)
      return {
        id: r.id,
        alerta_id: r.alerta_id,
        alerta_relacionada_id: r.alerta_relacionada_id,
        tipo_relacion: r.tipo_relacion,
        score_similitud: r.score_similitud,
        razon: r.razon,
        detectada_en: r.detectada_en,
        titulo: alerta?.titulo ?? '',
        fuente: alerta?.fuente ?? '',
        fecha_publicacion: alerta?.fecha_publicacion ?? null,
        url: alerta?.url ?? '',
      }
    })

  return NextResponse.json({ relaciones })
}
