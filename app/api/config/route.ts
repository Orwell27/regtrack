import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'

export async function GET() {
  const db = createNextServerClient()
  const { data, error } = await db.from('config').select('clave, valor')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const config = Object.fromEntries((data ?? []).map((r: { clave: string; valor: unknown }) => [r.clave, r.valor]))
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>
  const db = createNextServerClient()

  const allowed = ['score_minimo', 'territorios_activos', 'fuentes_activas']
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  await Promise.all(
    updates.map(([clave, valor]) =>
      db.from('config')
        .upsert({ clave, valor, updated_at: new Date().toISOString() })
    )
  )

  return NextResponse.json({ ok: true })
}
