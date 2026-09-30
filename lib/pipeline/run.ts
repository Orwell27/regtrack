import { APIError } from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { VigilanteApi } from '@/lib/pipeline/vigilante-api'
import { classifyDocument, analyzeImpact } from '@/lib/claude'
import { buildAlertText } from '@/lib/sources/formatter'
import { detectarRelaciones } from '@/lib/correlacion/detectar-relaciones'
import { guardarRelaciones } from '@/lib/correlacion/guardar-relaciones'
import { clasificarSectorial } from '@/lib/sectorial/clasificar'
import type { Alerta } from '@/lib/supabase'

import { collectSources, hydrateDocument } from './sources'
import { ScanReport } from './report'
import { SourceAccessBlockedError } from '../sources/http'

export async function runPipeline(dates: string[], options: { scanOnly?: boolean; historical?: boolean; reportDir?: string } = {}) {
  const report = new ScanReport(dates)
  report.mode = options.scanOnly ? 'sources_only' : 'full'
  const save = () => report.save(options.reportDir)
  try {
    save()
    console.log('[pipeline] Iniciando ingestión...')

    const allItems = await collectSources(report, options.historical)
    for (const item of allItems) report.decision(item, 'unprocessed', 'Pendiente de procesamiento')
    save()
    if (options.scanOnly) {
      // Diagnóstico sin IA ni escrituras en la base de datos.
      report.decisions = []
      return report
    }
    const db = createServerClient()

    // 2. Deduplicar: filtrar URLs ya procesadas
    const existingUrls = new Set<string>()
    for (let offset = 0; offset < allItems.length; offset += 100) {
      const { data, error } = await db.from('alertas').select('url').in('url', allItems.slice(offset, offset + 100).map(item => item.url))
      if (error) throw new Error('No se pudo comprobar qué alertas existen: ' + error.message)
      for (const row of data ?? []) existingUrls.add(row.url)
    }
    for (const item of allItems.filter(item => existingUrls.has(item.url))) report.decision(item, 'existing', 'Ya guardado')
    const newItems = allItems.filter(item => !existingUrls.has(item.url))
    console.log(`[pipeline] Items nuevos (sin duplicados): ${newItems.length}`)

    // 3. Procesar cada item
    let procesados = 0
    let relevantes = 0
    const api = new VigilanteApi()

    for (const rawItem of newItems) {
      if (Date.now() - Date.parse(report.startedAt) > 24 * 60_000) {
        report.fatal.push('Límite de 24 minutos: quedan documentos pendientes; recuperar el intervalo indicado en el informe')
        break
      }
      let item = rawItem
      try {
        const blocked = report.blockedReason(item.fuente)
        if (blocked) {
          report.decision(item, 'unprocessed', `Acceso bloqueado en esta ejecución; sin reintento: ${blocked}`)
          continue
        }
        item = await hydrateDocument(rawItem)
        const texto = item.texto ?? ''

        // 4. Clasificar con Claude Haiku
        const meta = item.fuente === 'BOE' ? {
          departamento: item.departamento,
          epigrafe: item.epigrafe,
          rango: item.rango,
        } : undefined
        const classification = await classifyDocument(item.titulo, texto, meta)
        api.exito()

        if (!classification.relevante) {
          report.decision(item, 'discarded', classification.motivo)
          console.log(`[pipeline] Descartado: ${item.titulo.slice(0, 60)}`)
          continue
        }

        relevantes++
        console.log(`[pipeline] Relevante (${classification.subtema}): ${item.titulo.slice(0, 60)}`)

        // 5. Analizar impacto con Claude Sonnet
        const impact = await analyzeImpact(item.titulo, texto, item.fuente, meta)
        api.exito()

        if (!impact) {
          report.decision(item, 'error', 'Análisis de impacto inválido o incompleto; pendiente de reintento')
          console.error(`[pipeline] Sin análisis de impacto válido, no se guarda: ${item.titulo.slice(0, 60)}`)
          continue
        }
        if (impact.score_relevancia < 4) {
          report.decision(item, 'low_score', `Score ${impact.score_relevancia}: ${impact.resumen}`)
          console.log(`[pipeline] Score bajo (${impact.score_relevancia}): descartado`)
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
          fecha_publicacion: item.fecha_publicacion ?? impact.fecha_publicacion,
          fecha_entrada_vigor: impact.fecha_entrada_vigor,
          plazo_adaptacion: impact.plazo_adaptacion,
          deroga_modifica: impact.deroga_modifica,
          territorios: impact.territorios,
          accion_recomendada: impact.accion_recomendada,
          score_relevancia: impact.score_relevancia,
          estado: 'pendiente_revision' as const,
          no_procesable: false,
          boe_id: item.boe_id ?? null,
          departamento: item.departamento ?? null,
          epigrafe: item.epigrafe ?? null,
          rango: item.rango ?? impact.tipo_norma ?? null,
          referencias_boe: item.referencias_boe ?? [],
        }

        const { free, pro } = buildAlertText(alertaBase as unknown as Alerta)

        // 7. Guardar en Supabase
        const { data: saved, error } = await db
          .from('alertas')
          .insert({ ...alertaBase, texto_alerta: free, texto_alerta_pro: pro })
          .select('id')
          .single()

        if (error) {
          report.decision(item, 'error', `No se pudo guardar: ${error.message}`)
          console.error(`[pipeline] Error al guardar: ${error.message}`)
          continue
        }

        procesados++
        report.decision(item, 'saved', 'Guardada para revisión editorial')

        // 8.0 Correlación ground-truth (referencias directas del BOE)
        if (item.fuente === 'BOE' && item.referencias_boe && item.referencias_boe.length > 0) {
          try {
            const refIds = item.referencias_boe
              .filter(r => r.tipo === 'modifica' || r.tipo === 'deroga')
              .map(r => r.boe_id)

            if (refIds.length > 0) {
              const { data: matches } = await db
                .from('alertas')
                .select('id, boe_id')
                .in('boe_id', refIds)

              for (const match of matches ?? []) {
                const ref = item.referencias_boe.find(r => r.boe_id === match.boe_id)
                if (!ref) continue
                const { error: relErr } = await db
                  .from('alerta_relaciones')
                  .upsert({
                    alerta_id: saved.id,
                    alerta_relacionada_id: match.id,
                    tipo_relacion: ref.tipo as 'modifica' | 'deroga',
                    score_similitud: 100,
                    razon: `Referencia directa BOE: ${ref.descripcion}`,
                  }, { onConflict: 'alerta_id,alerta_relacionada_id' })
                if (relErr) {
                  console.error('[pipeline] Error en correlación ground-truth:', relErr.message)
                } else {
                  console.log(`[pipeline] Relación ground-truth (${ref.tipo}): ${saved.id} → ${match.id}`)
                }
              }
            }
          } catch (gtErr) {
            console.error('[pipeline] Error en correlación ground-truth (no bloqueante):', gtErr)
          }
        }

        // 8. Detectar y guardar correlaciones (no bloquea el pipeline si falla)
        try {
          const relaciones = await detectarRelaciones({
            id: saved.id,
            titulo: alertaBase.titulo,
            subtema: alertaBase.subtema,
            territorios: alertaBase.territorios ?? [],
            resumen: alertaBase.resumen ?? null,
          })
          await guardarRelaciones(saved.id, relaciones)
        } catch (corrErr) {
          console.error(`[pipeline] Error en correlación (no bloqueante):`, corrErr)
        }

        // 8.5. Clasificación sectorial (no bloquea el pipeline si falla)
        await new Promise(r => setTimeout(r, 1500))
        try {
          await clasificarSectorial(saved.id, alertaBase.titulo, alertaBase.resumen ?? null)
        } catch (sectErr) {
          console.error(`[pipeline] Error en clasificación sectorial (no bloqueante):`, sectErr)
        }

      } catch (err) {
        if (err instanceof SourceAccessBlockedError) report.blockSource(item.fuente, err.message)
        report.decision(item, 'error', err instanceof Error ? err.message : String(err))
        if (err instanceof APIError) {
          console.error(`[pipeline] Error de la API de Claude en "${item.titulo.slice(0, 60)}": ${err.status ?? 'sin conexión'} ${err.message}`)
          // Sin marcar como no procesable, para poder recuperarlo después (backfill)
          if (api.error(err)) break
          continue
        }

        console.error(`[pipeline] Error procesando "${item.titulo.slice(0, 60)}":`, err)

        // No insertar una falsa alerta descartada: el documento debe poder reintentarse.
      } finally {
        save()
      }
    }

    console.log(`[pipeline] Completado. Guardados: ${procesados}, Relevantes detectados: ${relevantes}, Errores de la API de Claude: ${api.total}`)

    // Que la ejecución falle en GitHub Actions (y llegue el correo) en vez de terminar en verde sin procesar nada
    if (api.abortado) {
      throw new Error(`Pipeline detenido por errores de la API de Claude (${api.describirUltimo()})`)
    }
    return report
  } catch (error) {
    report.fatal.push(error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    report.finished = true
    report.save(options.reportDir, true)
  }
}
