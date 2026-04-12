import { createServerClient } from '@/lib/supabase'
import { matchAlertas } from '@/lib/matching'
import { sendMessage } from '@/lib/telegram'

async function run() {
  const db = createServerClient()
  const today = new Date().toISOString().slice(0, 10)
  console.log('[delivery] Iniciando delivery para', today)

  // 1. Alertas aprobadas
  const { data: alertas, error: errAlertas } = await db
    .from('alertas')
    .select('*')
    .eq('estado', 'aprobada')

  if (errAlertas) throw errAlertas
  if (!alertas?.length) {
    console.log('[delivery] No hay alertas aprobadas. Fin.')
    return
  }
  console.log(`[delivery] Alertas aprobadas: ${alertas.length}`)

  // 2. Usuarios activos
  const { data: usuarios, error: errUsuarios } = await db
    .from('usuarios')
    .select('*')
    .eq('activo', true)

  if (errUsuarios) throw errUsuarios
  if (!usuarios?.length) {
    console.log('[delivery] No hay usuarios activos. Fin.')
    return
  }
  console.log(`[delivery] Usuarios activos: ${usuarios.length}`)

  // 3. Contar entregas de hoy por usuario (para límite Free)
  const { data: entregasHoy } = await db
    .from('entregas')
    .select('usuario_id')
    .gte('enviada_at', `${today}T00:00:00Z`)

  const entregasCount: Record<string, number> = {}
  for (const e of entregasHoy ?? []) {
    entregasCount[e.usuario_id] = (entregasCount[e.usuario_id] ?? 0) + 1
  }

  // 4. Matching
  const deliveries = matchAlertas(alertas, usuarios, entregasCount)
  console.log(`[delivery] Matches encontrados: ${deliveries.length}`)

  // 5. Enviar y registrar
  for (const delivery of deliveries) {
    try {
      await sendMessage(delivery.chat_id, delivery.texto)

      await db.from('entregas').insert({
        alerta_id: delivery.alerta_id,
        usuario_id: delivery.usuario_id,
      })

      console.log(`[delivery] Enviado a usuario ${delivery.usuario_id}, alerta ${delivery.alerta_id}`)
    } catch (err) {
      console.error(`[delivery] Error enviando a ${delivery.usuario_id}:`, err)
    }
  }

  // 6. Marcar alertas como enviadas (las que tuvieron al menos 1 entrega hoy)
  const alertasConEntrega = [...new Set(deliveries.map(d => d.alerta_id))]
  if (alertasConEntrega.length > 0) {
    await db
      .from('alertas')
      .update({ estado: 'enviada' })
      .in('id', alertasConEntrega)
  }

  console.log(`[delivery] Completado. Entregas realizadas: ${deliveries.length}`)
}

run().catch(err => {
  console.error('[delivery] Error fatal:', err)
  process.exit(1)
})
