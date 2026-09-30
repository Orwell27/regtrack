import { fetchSource } from './http'
import type { NormalizedItem } from './boe'

// Servicios públicos de lectura usados por el portal oficial (ver fixture .source.md).
const DOGC_API = 'https://portaldogc.gencat.cat/eadop-rest/api/dogc/'

function record(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`DOGC: ${context} no reconocido`)
  return value as Record<string, unknown>
}

function summaries(value: unknown): Record<string, unknown>[] {
  const root = record(value, 'respuesta')
  if (!Array.isArray(root.sumaris) || root.sumaris.length === 0) throw new Error('DOGC: respuesta sin sumarios')
  return root.sumaris.map((summary) => record(summary, 'sumario'))
}

function bulletinNumber(value: unknown): string {
  if (typeof value !== 'string' || !/^\d+(?:[A-Z])?$/.test(value)) throw new Error('DOGC: número de boletín no reconocido')
  return value
}

async function dogcRead(method: string, fields: Record<string, string>): Promise<unknown> {
  const response = await fetchSource(`${DOGC_API}${method}`, {
    method: 'POST',
    body: new URLSearchParams({ language: 'es', ...fields }),
  })
  return response.json()
}

export async function fetchDOGC(): Promise<NormalizedItem[]> {
  const latest = summaries(await dogcRead('summaryLastPublishedDOGC', {}))
  const numbers = [...new Set(latest.map((summary) => bulletinNumber(summary.numDOGC)))]
  const items: NormalizedItem[] = []
  for (const number of numbers) {
    const data = await dogcRead('summaryDOGC', { numDOGC: number })
    if (!summaries(data).some((summary) => summary.numDOGC === number)) {
      throw new Error(`DOGC: el sumario recibido no corresponde al boletín ${number}`)
    }
    items.push(...parseDOGCSummary(data))
  }
  return [...new Map(items.map((item) => [item.url, item])).values()]
}

export function parseDOGCSummary(value: unknown): NormalizedItem[] {
  const items: NormalizedItem[] = []
  for (const summary of summaries(value)) {
    bulletinNumber(summary.numDOGC)
    const date = typeof summary.dateDOGC === 'string' ? summary.dateDOGC.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null
    if (!date) throw new Error('DOGC: fecha de publicación no reconocida')
    const fecha = `${date[3]}-${date[2]}-${date[1]}`
    if (Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) throw new Error('DOGC: fecha de publicación no válida')
    if (!Array.isArray(summary.section) || summary.section.length === 0) throw new Error('DOGC: secciones no reconocidas')

    function documents(node: Record<string, unknown>, context: string[], depth: number): void {
      if (depth > 3) throw new Error('DOGC: estructura del sumario no reconocida')
      const path = typeof node.title === 'string' ? [...context, node.title] : context
      if (node.document !== undefined) {
        if (!Array.isArray(node.document)) throw new Error('DOGC: documentos no reconocidos')
        for (const raw of node.document) {
          const doc = record(raw, 'documento')
          if (typeof doc.title !== 'string' || !doc.title.trim() || typeof doc.linkDownloadDocumentPDF !== 'string') {
            throw new Error('DOGC: documento sin título o enlace')
          }
          const link = new URL(doc.linkDownloadDocumentPDF)
          const id = link.searchParams.get('documentId')
          if (link.protocol !== 'https:' || link.hostname !== 'portaldogc.gencat.cat' || !id || !/^\d+$/.test(id)) {
            throw new Error('DOGC: enlace de documento no reconocido')
          }
          const title = doc.title.replace(/<[^>]*>/g, '').trim()
          const url = `https://dogc.gencat.cat/es/document-del-dogc/?documentId=${id}`
          items.push({
            id: `DOGC-${id}`,
            titulo: title,
            url,
            fuente: 'DOGC',
            // El sumario aporta título y organismo, no el articulado completo.
            texto: `${title}\n${path.join(' — ')}`,
            fecha_publicacion: fecha,
          })
        }
      }
      for (const childKey of ['header', 'subheader'] as const) {
        if (node[childKey] !== undefined) {
          if (!Array.isArray(node[childKey])) throw new Error(`DOGC: ${childKey} no reconocido`)
          for (const child of node[childKey]) documents(record(child, childKey), path, depth + 1)
        }
      }
      if (node.document === undefined && node.header === undefined && node.subheader === undefined) {
        throw new Error('DOGC: sección sin documentos ni subsecciones reconocibles')
      }
    }

    for (const section of summary.section) documents(record(section, 'sección'), [], 0)
  }
  return [...new Map(items.map((item) => [item.url, item])).values()]
}
