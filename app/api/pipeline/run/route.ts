// app/api/pipeline/run/route.ts
// Lanza el pipeline en GitHub Actions. En Vercel no se puede ejecutar el script dentro de la función.
import { NextResponse } from 'next/server'
import { requireAdmin, rejectForeignOrigin } from '@/lib/auth'
import { lanzarPipeline } from '@/lib/github'

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const originError = rejectForeignOrigin(req)
  if (originError) return originError

  const resultado = await lanzarPipeline(process.env.GITHUB_WORKFLOW_TOKEN)
  if (!resultado.ok) {
    console.error('[pipeline/run]', resultado.error)
    return NextResponse.json({ error: resultado.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, url: resultado.url })
}
