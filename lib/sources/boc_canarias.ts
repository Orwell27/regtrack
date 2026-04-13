import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOC_CANARIAS(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(
      'https://www.gobiernodecanarias.org/boc/feeds/capitulo/disposiciones_generales.rss'
    )
    if (!res.ok) {
      console.error(`BOC Canarias RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseBOCCanariasRSS(xml)
  } catch (err) {
    console.error('BOC Canarias fetch error:', err)
    return []
  }
}

export function parseBOCCanariasRSS(xml: string): NormalizedItem[] {
  const parser = new XMLParser()
  const parsed = parser.parse(xml)
  const items = parsed?.rss?.channel?.item ?? []
  const list = Array.isArray(items) ? items : [items]

  return list
    .filter((item: any) => item.title && item.link)
    .map((item: any) => ({
      id: String(item.link),
      titulo: String(item.title),
      url: String(item.link),
      fuente: 'BOC_CANARIAS' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
