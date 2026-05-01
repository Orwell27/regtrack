import { NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()

  const { data: intereses, error: interesesError } = await db
    .from('suscriptor_intereses')
    .select('subcategoria_id')
    .eq('usuario_id', user.usuarioId)

  if (interesesError) {
    console.error('[mis-grupos] suscriptor_intereses query failed:', interesesError.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const ids = (intereses ?? []).map(i => i.subcategoria_id)
  if (ids.length === 0) return NextResponse.json([])

  const { data: grupos, error: gruposError } = await db
    .from('telegram_grupos')
    .select('id, nombre, invite_link, subcategorias(nombre)')
    .in('subcategoria_id', ids)
    .eq('activo', true)

  if (gruposError) {
    console.error('[mis-grupos] telegram_grupos query failed:', gruposError.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json(grupos ?? [])
}
