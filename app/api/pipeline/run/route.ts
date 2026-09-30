// app/api/pipeline/run/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  const rechazo = await requireAdmin()
  if (rechazo) return rechazo

  // Lanzar pipeline en background — no esperamos a que termine
  void execAsync('npm run pipeline').catch(err => {
    console.error('[pipeline/run] Error:', err.message)
  })

  return NextResponse.json({ ok: true, message: 'Pipeline iniciado' })
}
