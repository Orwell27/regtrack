import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchDOGC(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch('https://dogc.gencat.cat/ca/inici/rss.html')
    if (!res.ok) {
      console.error(`DOGC RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseDOGCRSS(xml)
  } catch (err) {
    console.error('DOGC fetch error:', err)
    return []
  }
}

export function parseDOGCRSS(xml: string): NormalizedItem[] {
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
      fuente: 'DOGC' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
