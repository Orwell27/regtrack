// lib/correlacion/guardar-relaciones.ts
import { createServerClient } from '@/lib/supabase'
import type { RelacionDetectada } from './types'

/**
 * Upserts detected relations into alerta_relaciones.
 * Errors are logged but not thrown — correlation never blocks the pipeline.
 */
export async function guardarRelaciones(
  alertaId: string,
  relaciones: RelacionDetectada[]
): Promise<void> {
  if (relaciones.length === 0) return

  const db = createServerClient()
  const rows = relaciones.map(r => ({
    alerta_id: alertaId,
    alerta_relacionada_id: r.alerta_relacionada_id,
    tipo_relacion: r.tipo_relacion,
    score_similitud: r.score_similitud,
    razon: r.razon,
  }))

  const { error } = await db
    .from('alerta_relaciones')
    .upsert(rows, { onConflict: 'alerta_id,alerta_relacionada_id' })

  if (error) {
    console.error('[correlacion] Error guardando relaciones:', error.message)
  } else {
    console.log(`[correlacion] ${rows.length} relación(es) guardada(s) para alerta ${alertaId}`)
  }
}
