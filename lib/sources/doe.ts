import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

// Sección 1 = Disposiciones Generales (más relevante para seguimiento normativo)
const DOE_RSS_URL = 'https://doe.juntaex.es/rss/rss.php?seccion=1'

export async function fetchDOE(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(DOE_RSS_URL)
    if (!res.ok) {
      console.error(`DOE RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseDOERSS(xml)
  } catch (err) {
    console.error('DOE fetch error:', err)
    return []
  }
}

export function parseDOERSS(xml: string): NormalizedItem[] {
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
      fuente: 'DOE' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
