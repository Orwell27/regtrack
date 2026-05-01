// lib/sectorial/telegram-grupos.ts
import { createServerClient } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'

export async function notifyGrupos(
  alertaId: string,
  titulo: string,
  resumen: string | null,
  score: number,
  territorios: string[],
  fuente: string,
  alertaUrl: string
): Promise<void> {
  // Called from the enviar route when admin sends an alert to subscribers
  const db = createServerClient()

  const { data: subcats, error: subcatsError } = await db
    .from('alerta_sectores')
    .select('subcategoria_id, subcategorias(nombre)')
    .eq('alerta_id', alertaId)

  if (subcatsError) {
    console.error('[sectorial] Error consultando alerta_sectores:', subcatsError.message)
    return
  }
  if (!subcats || subcats.length === 0) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://regtrack.vercel.app'

  for (const subcat of subcats) {
    const nombre = (subcat.subcategorias as unknown as { nombre: string } | null)?.nombre
    if (!nombre) continue

    const { data: grupos, error: gruposError } = await db
      .from('telegram_grupos')
      .select('chat_id')
      .eq('subcategoria_id', subcat.subcategoria_id)
      .eq('activo', true)

    if (gruposError) {
      console.error('[sectorial] Error consultando telegram_grupos:', gruposError.message)
      continue
    }
    if (!grupos || grupos.length === 0) continue

    const territorioStr = territorios.length > 0 ? territorios.join(', ') : 'Nacional'
    const text = [
      `🏠 <b>${nombre}</b>`,
      ``,
      `<b>${titulo}</b>`,
      `📍 ${territorioStr} · ${fuente}`,
      `⚡ Impacto: ${score}/10`,
      ``,
      resumen ? resumen.slice(0, 300) : '',
    ].join('\n')

    const keyboard = [[
      { text: '📄 Ver alerta', url: `${appUrl}/alerta/${alertaId}` },
      { text: '📰 Doc oficial', url: alertaUrl },
    ]]

    for (const grupo of grupos) {
      await sendMessage(grupo.chat_id, text, 'HTML', keyboard)
    }
  }
}
