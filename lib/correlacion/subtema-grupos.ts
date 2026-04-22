// lib/correlacion/subtema-grupos.ts
import type { Subtema } from '@/lib/supabase'

const GRUPOS: Subtema[][] = [
  ['urbanismo', 'construccion', 'obra_nueva', 'suelo', 'rehabilitacion'],
  ['arrendamiento', 'hipotecas', 'vivienda_protegida'],
  ['registro_notaria', 'comunidades_propietarios'],
  ['fiscalidad'],
]

/**
 * Given a subtema, returns all subtemas in the same thematic group.
 * Falls back to [subtema] if the subtema is not in any group (e.g. 'otro').
 */
export function getSubtemasGrupo(subtema: Subtema): Subtema[] {
  const grupo = GRUPOS.find(g => g.includes(subtema))
  return grupo ?? [subtema]
}
