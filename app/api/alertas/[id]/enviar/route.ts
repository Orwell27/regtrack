import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { notifyUsers } from '@/lib/telegram'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createNextServerClient()

  const { data: alerta } = await db
    .from('alertas')
    .select('id, estado, texto_alerta, texto_alerta_pro, titulo')
    .eq('id', id)
    .single()

  if (!alerta) return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })
  if (alerta.estado !== 'aprobada') {
    return NextResponse.json({ error: 'Solo se pueden enviar alertas aprobadas' }, { status: 400 })
  }

  const { data: usuarios } = await db
    .from('usuarios')
    .select('id, telegram_id, plan')
    .eq('activo', true)
    .not('telegram_id', 'is', null)

  if (!usuarios || usuarios.length === 0) {
    return NextResponse.json({ error: 'No hay usuarios con Telegram configurado' }, { status: 422 })
  }

  await notifyUsers(
    usuarios.map((u: { telegram_id: string; plan: string }) => ({
      telegramId: u.telegram_id,
      texto: u.plan === 'pro' ? (alerta.texto_alerta_pro ?? alerta.texto_alerta ?? '') : (alerta.texto_alerta ?? ''),
    }))
  )

  const entregas = usuarios.map((u: { id: string }) => ({
    alerta_id: id,
    usuario_id: u.id,
    enviada_at: new Date().toISOString(),
  }))

  await db.from('entregas').insert(entregas)
  await db.from('alertas').update({ estado: 'enviada' }).eq('id', id)

  return NextResponse.json({ ok: true, enviados: usuarios.length })
}
