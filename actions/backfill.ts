/**
 * Backfill histórico del BOE
 *
 * Uso:
 *   npx tsx actions/backfill.ts           # últimos 30 días (por defecto)
 *   npx tsx actions/backfill.ts --days 90 # últimos 90 días
 *   npx tsx actions/backfill.ts --from 20260101 --to 20260331  # rango concreto
 *
 * El script itera cada día laborable, fetcha el sumario del BOE,
 * clasifica con Claude Haiku y analiza impacto con Claude Sonnet,
 * igual que el pipeline diario. Ignora fechas ya procesadas (deduplicación por URL).
 */

import { createServerClient } from '@/lib/supabase'
import { parseBOESumario, fetchBOEText } from '@/lib/sources/boe'
import { classifyDocument, analyzeImpact } from '@/lib/claude'
import { buildAlertText } from '@/lib/sources/formatter'
import { notifyEditorial } from '@/lib/telegram'
import type { NormalizedItem } from '@/lib/sources/boe'
import type { Alerta } from '@/lib/supabase'

// ─── Helpers de fecha ───────────────────────────────────────────────────────

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function parseDateArg(arg: string): Date {
  // Acepta YYYYMMDD o YYYY-MM-DD
  const clean = arg.replace(/-/g, '')
  return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`)
}

function buildDateRange(fromDate: Date, toDate: Date): string[] {
  const dates: string[] = []
  let cur = new Date(fromDate)
  while (cur <= toDate) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) {
      // El BOE no se publica sábados ni domingos
      dates.push(toYYYYMMDD(cur))
    }
    cur = addDays(cur, 1)
  }
  return dates
}

// ─── Fetch sumario de una fecha concreta ────────────────────────────────────

async function fetchBOEForDate(dateStr: string): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${dateStr}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      if (res.status === 404) return [] // día sin publicación (festivo, etc.)
      console.error(`[backfill] BOE ${dateStr} error: ${res.status}`)
      return []
    }
    const data = await res.json()
    const items = parseBOESumario(data)

    // Texto en batches de 5
    const results: NormalizedItem[] = []
    for (let i = 0; i < items.length; i += 5) {
      const batch = items.slice(i, i + 5)
      const withText = await Promise.all(
        batch.map(async (item) => ({
          ...item,
          texto: await fetchBOEText(item.id),
        }))
      )
      results.push(...withText)
    }
    return results
  } catch (err) {
    console.error(`[backfill] Error fetching BOE ${dateStr}:`, err)
    return []
  }
}

// ─── Procesar un item (igual que pipeline.ts) ────────────────────────────────

async function processItem(
  db: ReturnType<typeof createServerClient>,
  item: NormalizedItem
): Promise<'saved' | 'discarded' | 'low_score' | 'error'> {
  try {
    const texto = item.texto ?? ''
    const classification = await classifyDocument(item.titulo, texto)

    if (!classification.relevante) return 'discarded'

    const impact = await analyzeImpact(item.titulo, texto, item.fuente)
    if (!impact || impact.score_relevancia < 5) return 'low_score'

    const alertaBase = {
      url: item.url,
      titulo: item.titulo,
      fuente: item.fuente,
      ambito: classification.ambito_territorial,
      subtema: classification.subtema,
      resumen: impact.resumen,
      impacto: impact.impacto,
      afectados: impact.afectados,
      urgencia: impact.urgencia,
      tipo_norma: impact.tipo_norma,
      fecha_publicacion: impact.fecha_publicacion,
      fecha_entrada_vigor: impact.fecha_entrada_vigor,
      plazo_adaptacion: impact.plazo_adaptacion,
      deroga_modifica: impact.deroga_modifica,
      territorios: impact.territorios,
      accion_recomendada: impact.accion_recomendada,
      score_relevancia: impact.score_relevancia,
      estado: 'pendiente_revision' as const,
      no_procesable: false,
    }

    const { free, pro } = buildAlertText(alertaBase as unknown as Alerta)

    const { data: saved, error } = await db
      .from('alertas')
      .insert({ ...alertaBase, texto_alerta: free, texto_alerta_pro: pro })
      .select('id')
      .single()

    if (error) {
      console.error(`[backfill] Error guardando: ${error.message}`)
      return 'error'
    }

    // No notificamos por Telegram en backfill para no spam
    return 'saved'
  } catch (err) {
    console.error(`[backfill] Error procesando "${item.titulo.slice(0, 60)}":`, err)
    return 'error'
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  // Parsear argumentos
  const args = process.argv.slice(2)
  let fromDate: Date
  let toDate: Date

  const fromIdx = args.indexOf('--from')
  const toIdx = args.indexOf('--to')
  const daysIdx = args.indexOf('--days')

  if (fromIdx !== -1 && toIdx !== -1) {
    fromDate = parseDateArg(args[fromIdx + 1])
    toDate = parseDateArg(args[toIdx + 1])
  } else {
    const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) : 30
    toDate = new Date()
    fromDate = addDays(toDate, -days)
  }

  const dates = buildDateRange(fromDate, toDate)
  console.log(`[backfill] Procesando ${dates.length} días (${toYYYYMMDD(fromDate)} → ${toYYYYMMDD(toDate)})`)

  const db = createServerClient()

  let totalItems = 0
  let totalSaved = 0
  let totalDiscarded = 0

  for (const dateStr of dates) {
    console.log(`\n[backfill] ── ${dateStr} ──────────────────`)

    const items = await fetchBOEForDate(dateStr)
    if (items.length === 0) {
      console.log(`[backfill] Sin publicaciones`)
      continue
    }

    // Deduplicar contra lo ya guardado
    const urls = items.map(i => i.url)
    const { data: existing } = await db.from('alertas').select('url').in('url', urls)
    const existingUrls = new Set((existing ?? []).map((a: { url: string }) => a.url))
    const newItems = items.filter(i => !existingUrls.has(i.url))

    console.log(`[backfill] ${items.length} items, ${newItems.length} nuevos`)
    totalItems += newItems.length

    for (const item of newItems) {
      const result = await processItem(db, item)
      if (result === 'saved') {
        totalSaved++
        console.log(`  ✓ [${item.id}] ${item.titulo.slice(0, 70)}`)
      } else if (result === 'discarded' || result === 'low_score') {
        totalDiscarded++
      }
    }
  }

  console.log(`\n[backfill] ══════════════════════════════════`)
  console.log(`[backfill] Completado.`)
  console.log(`[backfill]   Items procesados : ${totalItems}`)
  console.log(`[backfill]   Alertas guardadas: ${totalSaved}`)
  console.log(`[backfill]   Descartados      : ${totalDiscarded}`)
}

run().catch(err => {
  console.error('[backfill] Error fatal:', err)
  process.exit(1)
})
