import type { Alerta, Usuario, Urgencia } from './supabase'

export interface DeliveryItem {
  alerta_id: string
  usuario_id: string
  chat_id: string
  texto: string
}

const URGENCIA_ORDER: Record<Urgencia, number> = { alta: 3, media: 2, baja: 1 }

function urgenciaCumple(alertaUrgencia: Urgencia, minima: Urgencia): boolean {
  return URGENCIA_ORDER[alertaUrgencia] >= URGENCIA_ORDER[minima]
}

function territorioCumple(alerta: Alerta, usuario: Usuario): boolean {
  if (alerta.ambito === 'estatal') return true
  if (usuario.territorios.includes('Nacional')) return true
  const alertaTerrs = alerta.territorios ?? []
  return usuario.territorios.some(t => alertaTerrs.includes(t))
}

export function matchAlertas(
  alertas: Alerta[],
  usuarios: Usuario[],
  entregasHoy: Record<string, number>  // usuario_id → número de entregas hoy
): DeliveryItem[] {
  const items: DeliveryItem[] = []

  for (const alerta of alertas) {
    for (const usuario of usuarios) {
      if (!usuario.activo) continue
      if (!usuario.telegram_id) continue
      if (!usuario.subtemas.includes(alerta.subtema ?? '')) continue
      if (!territorioCumple(alerta, usuario)) continue
      if ((alerta.score_relevancia ?? 0) < usuario.score_minimo) continue
      if (!urgenciaCumple(alerta.urgencia ?? 'baja', usuario.urgencia_minima)) continue

      // Límite diario para Free
      if (usuario.plan === 'free') {
        const enviadas = entregasHoy[usuario.id] ?? 0
        if (enviadas >= 3) continue
      }

      items.push({
        alerta_id: alerta.id,
        usuario_id: usuario.id,
        chat_id: usuario.telegram_id,
        texto: usuario.plan === 'pro'
          ? (alerta.texto_alerta_pro ?? alerta.texto_alerta ?? '')
          : (alerta.texto_alerta ?? ''),
      })
    }
  }

  return items
}
