// lib/correlacion/types.ts

import type { TipoRelacion } from '@/lib/supabase'
export type { TipoRelacion }

/** One relationship returned by Haiku */
export interface RelacionDetectada {
  /** UUID of the existing (older) alert */
  alerta_relacionada_id: string
  tipo_relacion: TipoRelacion
  /** 0–100, only relations >= 40 are saved */
  score_similitud: number
  razon: string | null
}

/** Shape of a row in alerta_relaciones joined with alerta data for display */
export interface RelacionConAlerta {
  id: string
  alerta_id: string
  alerta_relacionada_id: string
  tipo_relacion: TipoRelacion
  score_similitud: number
  razon: string | null
  detectada_en: string
  /** Joined from alertas */
  titulo: string
  fuente: string
  fecha_publicacion: string | null
  url: string
}
