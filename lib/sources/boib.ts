import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOIB(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch('https://www.caib.es/eboibfront/indexrss.do?lang=es')
    if (!res.ok) {
      console.error(`BOIB RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseBOIBRSS(xml)
  } catch (err) {
    console.error('BOIB fetch error:', err)
    return []
  }
}

export function parseBOIBRSS(xml: string): NormalizedItem[] {
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
      fuente: 'BOIB' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
