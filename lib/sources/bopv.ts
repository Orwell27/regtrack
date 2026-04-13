import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOPV(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch('https://www.euskadi.eus/bopv2/datos/Ultimo.xml')
    if (!res.ok) {
      console.error(`BOPV RSS error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseBOPVRSS(xml)
  } catch (err) {
    console.error('BOPV fetch error:', err)
    return []
  }
}

export function parseBOPVRSS(xml: string): NormalizedItem[] {
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
      fuente: 'BOPV' as const,
      texto: item.description ? String(item.description).slice(0, 8000) : undefined,
    }))
}
