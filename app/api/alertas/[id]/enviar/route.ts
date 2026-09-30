// app/api/alertas/[id]/enviar/route.ts
// Publica en la web una alerta aprobada. Los suscriptores la ven en /alertas; no hay envío por Telegram ni correo.
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const db = createNextServerClient()

  const { data: alerta } = await db
    .from('alertas')
    .select('id, estado')
    .eq('id', id)
    .single()

  if (!alerta) return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })
  if (alerta.estado !== 'aprobada') {
    return NextResponse.json({ error: 'Solo se pueden publicar alertas aprobadas' }, { status: 400 })
  }

  const { error } = await db.from('alertas').update({ estado: 'enviada' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
