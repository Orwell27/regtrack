import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOC_CANTABRIA(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch('https://www.cantabria.es/o/BOC/feed/6802081')
    if (!res.ok) {
      console.error(`BOC Cantabria RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseBOCCantabriaRSS(xml)
  } catch (err) {
    console.error('BOC Cantabria fetch error:', err)
    return []
  }
}

export function parseBOCCantabriaRSS(xml: string): NormalizedItem[] {
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
      fuente: 'BOC_CANTABRIA' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
