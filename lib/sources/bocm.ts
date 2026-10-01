import { sourceText } from './http'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

// Canal de órdenes del día enlazado por https://www.bocm.es/rss.
export const BOCM_RSS_URL = 'https://www.bocm.es/ultimo-boletin.xml'

export async function fetchBOCM(): Promise<NormalizedItem[]> {
  return parseBOCMRSS(await sourceText(BOCM_RSS_URL, 'rss'))
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseBOCMRSS(xml: string): NormalizedItem[] {
  if (XMLValidator.validate(xml) !== true) throw new Error('XML BOCM no válido')
  const parsed = new XMLParser().parse(xml)
  const channel = parsed?.rss?.channel
  if (channel === undefined || channel === null) throw new Error('Canal RSS BOCM no reconocido')
  const items = channel.item ?? []
  const list: unknown[] = Array.isArray(items) ? items : [items]

  return list.map((value): NormalizedItem => {
    if (!value || typeof value !== 'object') throw new Error('Orden BOCM no reconocida')
    const item = value as Record<string, unknown>
    if (typeof item.title !== 'string' || !item.title.trim() || typeof item.link !== 'string') {
      throw new Error('Orden BOCM sin título o enlace')
    }
    const url = new URL(item.link)
    if (url.protocol !== 'https:' || !['www.bocm.es', 'bocm.es'].includes(url.hostname)) {
      throw new Error('Enlace de orden BOCM no reconocido')
    }
    const description = typeof item.description === 'string' ? item.description : ''
    // El título RSS es «Orden Nº…»; el título sustantivo está en el primer párrafo.
    const firstParagraph = description.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]
    const titulo = firstParagraph ? plainText(firstParagraph) : plainText(item.title)
    const dateParts = url.pathname.match(/bocm-(\d{4})(\d{2})(\d{2})-\d+/i)
    const fecha = dateParts ? `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}` : undefined
    if (fecha && (Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha)) {
      throw new Error('Fecha BOCM no válida')
    }
    return {
      id: item.link,
      titulo,
      url: item.link,
      fuente: 'BOCM',
      texto: description ? plainText(description) : undefined,
      fecha_publicacion: fecha,
    }
  })
}
