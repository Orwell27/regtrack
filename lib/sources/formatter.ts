import type { Alerta } from '@/lib/supabase'

export type AlertaFormatInput = Pick<Alerta,
  | 'titulo'
  | 'fuente'
  | 'urgencia'
  | 'territorios'
  | 'score_relevancia'
  | 'resumen'
  | 'impacto'
  | 'subtema'
  | 'fecha_entrada_vigor'
  | 'tipo_norma'
  | 'accion_recomendada'
>

const URGENCIA_EMOJI: Record<string, string> = {
  alta: '🔴',
  media: '🟡',
  baja: '🟢',
}

export function buildAlertText(alerta: AlertaFormatInput): { free: string; pro: string } {
  const emoji = URGENCIA_EMOJI[alerta.urgencia ?? 'baja'] ?? '⚪'
  const territorios = alerta.territorios?.join(', ') || 'España'
  const score = alerta.score_relevancia ?? 0
  const vigencia = alerta.fecha_entrada_vigor
    ? `Entra en vigor: ${alerta.fecha_entrada_vigor}`
    : ''

  const base = [
    `${emoji} *${alerta.titulo}*`,
    ``,
    alerta.resumen ? `📋 ${alerta.resumen}` : null,
    ``,
    alerta.impacto ? `⚡ *Impacto:* ${alerta.impacto}` : null,
    ``,
    `📍 ${territorios} | 🏷️ ${alerta.subtema ?? 'otro'} | ⭐ ${score}/10`,
    vigencia,
    `📰 Fuente: ${alerta.fuente} | ${alerta.tipo_norma ?? ''}`,
  ].filter(Boolean).join('\n')

  const free = base + '\n\n🔒 *Acción recomendada:* [Solo plan Pro]'
  const pro = base + `\n\n✅ *Acción recomendada:* ${alerta.accion_recomendada ?? 'Pendiente de análisis'}`

  return { free, pro }
}
