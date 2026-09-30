// app/api/pipeline/run/route.ts
// Lanza el pipeline en GitHub Actions. En Vercel no se puede ejecutar el script dentro de la función.
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { lanzarPipeline } from '@/lib/github'

export async function POST() {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const resultado = await lanzarPipeline(process.env.GITHUB_WORKFLOW_TOKEN)
  if (!resultado.ok) {
    console.error('[pipeline/run]', resultado.error)
    return NextResponse.json({ error: resultado.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, url: resultado.url })
}
