import { type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // 1. Autenticación
  const user = await getAuthUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Validar query
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 3) {
    return Response.json({ error: 'La búsqueda debe tener al menos 3 caracteres' }, { status: 400 })
  }
  if (q.length > 200) {
    return Response.json({ error: 'La búsqueda no puede superar 200 caracteres' }, { status: 400 })
  }

  // 3. Generar embedding de la query
  let embedding: number[]
  try {
    embedding = await generateEmbedding(q)
  } catch {
    return Response.json({ error: 'Error al procesar la búsqueda. Inténtalo de nuevo.' }, { status: 503 })
  }

  // 4. Búsqueda semántica en Supabase
  const db = createServerClient()
  const { data, error } = await db.rpc('match_alertas', {
    query_embedding: embedding,
    match_count: 8,
  })

  if (error) {
    return Response.json({ error: 'Error al buscar normativa. Inténtalo de nuevo.' }, { status: 500 })
  }

  return Response.json({ results: data ?? [] })
}
