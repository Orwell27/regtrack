import type { NormalizedItem } from './boe'
import { fetchSource, requireDocument, type DocumentReadOptions } from './http'
import { madridDate } from '../pipeline/dates'

const BASE = 'https://www.borm.es/services'

async function bormJson(path: string, allowMissing = false): Promise<unknown> {
  const response = await fetchSource(`${BASE}/${path}`, { headers: { Accept: 'application/json' } }, allowMissing)
  // El 404 oficial se registra como vacío, sin dejar de consultar suplementos.
  if (allowMissing && response.status === 404) return null
  if (!response.ok) throw new Error(`BORM HTTP ${response.status}: ${path}`)
  return response.json()
}

export function parseBORMSumario(data: unknown, date: string): NormalizedItem[] {
  if (!data || typeof data !== 'object' || !('anunciosBoletin' in data) || !Array.isArray(data.anunciosBoletin)) {
    throw new Error('Formato del sumario BORM no reconocido')
  }
  const displayDate = date.split('-').reverse().join('-')
  return data.anunciosBoletin.map((row: Record<string, unknown>) => {
    if (!row || !Number.isInteger(row.id) || !Number.isInteger(row.numero) || typeof row.sumario !== 'string' || row.fechaPublicacion !== displayDate) {
      throw new Error('Anuncio BORM incompleto o de otra fecha')
    }
    return {
      id: `BORM-A-${displayDate.replace(/-/g, '')}-${row.numero}`,
      titulo: row.sumario,
      url: `https://www.borm.es/#/home/anuncio/${displayDate}/${row.numero}`,
      fuente: 'BORM',
      texto: [row.apartado, row.subApartado, row.anunciante, row.sumario].filter(Boolean).join('\n'),
      texto_url: `${BASE}/anuncio/${row.id}/txt`,
      fecha_publicacion: date,
    }
  })
}

/** API usada por la propia web: boletín ordinario y suplementos, por fecha. */
export async function fetchBORM(date = madridDate()): Promise<NormalizedItem[]> {
  const displayDate = date.split('-').reverse().join('-')
  const ordinary = await bormJson(`boletin/fecha/${displayDate}/sumario`, true)
  const supplements = await bormJson(`suplemento/fecha/${displayDate}`)
  if (!Array.isArray(supplements)) throw new Error('Formato de suplementos BORM no reconocido')
  const items = ordinary === null ? [] : parseBORMSumario(ordinary, date)
  for (const supplement of supplements) {
    if (!Number.isInteger(supplement?.numero) || supplement.fechaPublicacion !== displayDate) throw new Error('Suplemento BORM inválido')
    const data = await bormJson(`suplemento/${displayDate}/${supplement.numero}/sumario`)
    items.push(...parseBORMSumario(data, date))
  }
  return Array.from(new Map(items.map(item => [item.url, item])).values())
}

export async function fetchBORMText(url: string, options: DocumentReadOptions = {}): Promise<string> {
  if (!/^https:\/\/www\.borm\.es\/services\/anuncio\/\d+\/txt$/.test(url)) throw new Error('URL TXT BORM inválida')
  return requireDocument(await (await fetchSource(url)).text(), options)
}
