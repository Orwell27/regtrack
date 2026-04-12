// app/api/pipeline/run/route.ts
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Lanzar pipeline en background — no esperamos a que termine
  void execAsync('npm run pipeline').catch(err => {
    console.error('[pipeline/run] Error:', err.message)
  })

  return NextResponse.json({ ok: true, message: 'Pipeline iniciado' })
}
