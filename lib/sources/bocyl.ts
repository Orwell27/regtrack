import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOCYL(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch('https://bocyl.jcyl.es/rss')
    if (!res.ok) {
      console.error(`BOCYL RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseBOCYLRSS(xml)
  } catch (err) {
    console.error('BOCYL fetch error:', err)
    return []
  }
}

export function parseBOCYLRSS(xml: string): NormalizedItem[] {
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
      fuente: 'BOCYL' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
