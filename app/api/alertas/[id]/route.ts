import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { accion } = await request.json() as { accion: 'aprobar' | 'descartar' }
  if (!['aprobar', 'descartar'].includes(accion)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const db = createNextServerClient()
  const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'descartada'

  const { error } = await db
    .from('alertas')
    .update({ estado: nuevoEstado })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, estado: nuevoEstado })
}
