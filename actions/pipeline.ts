import { createServerClient } from '@/lib/supabase'
import { fetchBOE } from '@/lib/sources/boe'
import { fetchBOCM } from '@/lib/sources/bocm'
import { fetchDOGC } from '@/lib/sources/dogc'
import { fetchBORM } from '@/lib/sources/borm'
import { fetchBOJA } from '@/lib/sources/boja'
import { fetchBOIB } from '@/lib/sources/boib'
import { fetchBOC_CANARIAS } from '@/lib/sources/boc_canarias'
import { fetchBOC_CANTABRIA } from '@/lib/sources/boc_cantabria'
import { fetchBOCYL } from '@/lib/sources/bocyl'
import { fetchDOE } from '@/lib/sources/doe'
import { fetchDOG } from '@/lib/sources/dog'
import { fetchBOPV } from '@/lib/sources/bopv'
import { fetchBOPA } from '@/lib/sources/bopa'
import { fetchBON } from '@/lib/sources/bon'
import { fetchBOR } from '@/lib/sources/bor'
import { classifyDocument, analyzeImpact } from '@/lib/claude'
import { buildAlertText } from '@/lib/sources/formatter'
import { notifyEditorial } from '@/lib/telegram'
import type { NormalizedItem } from '@/lib/sources/boe'
import type { Alerta } from '@/lib/supabase'

async function run() {
  const db = createServerClient()
  console.log('[pipeline] Iniciando ingestión...')

  // 1. Obtener items de todas las fuentes en paralelo
  const [
    boeItems, bocmItems, dogcItems, bormItems,
    bojaItems, boibItems, bocCanItems, bocCbItems,
    bocylItems, doeItems, dogItems, bopvItems,
    bopaItems, bonItems, borItems,
  ] = await Promise.all([
    fetchBOE(), fetchBOCM(), fetchDOGC(), fetchBORM(),
    fetchBOJA(), fetchBOIB(), fetchBOC_CANARIAS(), fetchBOC_CANTABRIA(),
    fetchBOCYL(), fetchDOE(), fetchDOG(), fetchBOPV(),
    fetchBOPA(), fetchBON(), fetchBOR(),
  ])
  const allItems: NormalizedItem[] = [
    ...boeItems, ...bocmItems, ...dogcItems, ...bormItems,
    ...bojaItems, ...boibItems, ...bocCanItems, ...bocCbItems,
    ...bocylItems, ...doeItems, ...dogItems, ...bopvItems,
    ...bopaItems, ...bonItems, ...borItems,
  ]
  console.log(
    `[pipeline] Total items: ${allItems.length}`,
    `(BOE:${boeItems.length} BOCM:${bocmItems.length} DOGC:${dogcItems.length} BORM:${bormItems.length}`,
    `BOJA:${bojaItems.length} BOIB:${boibItems.length} BOC-CN:${bocCanItems.length} BOC-CB:${bocCbItems.length}`,
    `BOCYL:${bocylItems.length} DOE:${doeItems.length} DOG:${dogItems.length} BOPV:${bopvItems.length}`,
    `BOPA:${bopaItems.length} BON:${bonItems.length} BOR:${borItems.length})`
  )

  // 2. Deduplicar: filtrar URLs ya procesadas
  const urls = allItems.map(i => i.url)
  const { data: existingAlerts } = await db
    .from('alertas')
    .select('url')
    .in('url', urls)

  const existingUrls = new Set((existingAlerts ?? []).map((a: { url: string }) => a.url))
  const newItems = allItems.filter(item => !existingUrls.has(item.url))
  console.log(`[pipeline] Items nuevos (sin duplicados): ${newItems.length}`)

  // 3. Procesar cada item
  let procesados = 0
  let relevantes = 0

  for (const item of newItems) {
    try {
      const texto = item.texto ?? ''

      // 4. Clasificar con Claude Haiku
      const classification = await classifyDocument(item.titulo, texto)

      if (!classification.relevante) {
        console.log(`[pipeline] Descartado: ${item.titulo.slice(0, 60)}`)
        continue
      }

      relevantes++
      console.log(`[pipeline] Relevante (${classification.subtema}): ${item.titulo.slice(0, 60)}`)

      // 5. Analizar impacto con Claude Sonnet
      const impact = await analyzeImpact(item.titulo, texto, item.fuente)

      if (!impact || impact.score_relevancia < 5) {
        console.log(`[pipeline] Score bajo (${impact?.score_relevancia ?? 0}): descartado`)
        continue
      }

      // 6. Generar textos de alerta
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

      // 7. Guardar en Supabase
      const { data: saved, error } = await db
        .from('alertas')
        .insert({ ...alertaBase, texto_alerta: free, texto_alerta_pro: pro })
        .select('id')
        .single()

      if (error) {
        console.error(`[pipeline] Error al guardar: ${error.message}`)
        continue
      }

      procesados++

      // 8. Notificar al editor por Telegram
      await notifyEditorial(item.titulo, impact.score_relevancia, saved.id)

    } catch (err) {
      console.error(`[pipeline] Error procesando "${item.titulo.slice(0, 60)}":`, err)

      // Marcar como no_procesable para no reintentar
      await Promise.resolve(
        db.from('alertas').insert({
          url: item.url,
          titulo: item.titulo,
          fuente: item.fuente,
          no_procesable: true,
          estado: 'descartada',
        })
      ).catch(() => {})
    }
  }

  console.log(`[pipeline] Completado. Guardados: ${procesados}, Relevantes detectados: ${relevantes}`)
}

run().catch(err => {
  console.error('[pipeline] Error fatal:', err)
  process.exit(1)
})
