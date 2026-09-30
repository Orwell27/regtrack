import { sourceText } from './http'
import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

// Sección 1 = Disposiciones Generales (más relevante para seguimiento normativo)
const DOE_RSS_URL = 'https://doe.juntaex.es/rss/rss.php?seccion=1'

export async function fetchDOE(): Promise<NormalizedItem[]> {
  return parseDOERSS(await sourceText(DOE_RSS_URL, 'rss'))
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
