import { readFileSync } from 'fs'
import { join } from 'path'

// Cargar .env.local (mismo patrón que pipeline.ts)
;(function loadLocalEnv() {
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
  } catch { /* sin .env.local, ignorar */ }
})()

import { createServerClient } from '@/lib/supabase'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'

const BATCH_SIZE = 50
const DELAY_MS = 200

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  const db = createServerClient()

  console.log('[backfill] Buscando alertas sin embedding...')
  const { data: alertas, error } = await db
    .from('alertas')
    .select('id, resumen, impacto')
    .is('embedding', null)
    .in('estado', ['aprobada', 'enviada'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[backfill] Error al consultar alertas:', error.message)
    process.exit(1)
  }

  const total = alertas?.length ?? 0
  console.log(`[backfill] ${total} alertas sin embedding`)

  if (total === 0) {
    console.log('[backfill] Nada que procesar. Saliendo.')
    return
  }

  let procesadas = 0
  let errores = 0

  for (let i = 0; i < alertas!.length; i += BATCH_SIZE) {
    const batch = alertas!.slice(i, i + BATCH_SIZE)
    console.log(`[backfill] Procesando lote ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} alertas)...`)

    for (const alerta of batch) {
      try {
        const text = buildEmbeddingText(alerta.resumen ?? '', alerta.impacto ?? null)
        if (!text.trim()) {
          console.log(`[backfill] Saltando ${alerta.id} — texto vacío`)
          continue
        }

        const embedding = await generateEmbedding(text)

        const { error: updateError } = await db
          .from('alertas')
          .update({ embedding })
          .eq('id', alerta.id)

        if (updateError) {
          console.error(`[backfill] Error al actualizar ${alerta.id}:`, updateError.message)
          errores++
        } else {
          procesadas++
          console.log(`[backfill] ${procesadas}/${total} — ${alerta.id}`)
        }
      } catch (err) {
        console.error(`[backfill] Error en ${alerta.id}:`, err)
        errores++
      }
    }

    if (i + BATCH_SIZE < alertas!.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`[backfill] Completado. Procesadas: ${procesadas}, Errores: ${errores}`)
}

run().catch(err => {
  console.error('[backfill] Error fatal:', err)
  process.exit(1)
})
