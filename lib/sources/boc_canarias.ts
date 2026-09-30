import { sourceText } from './http'
import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOC_CANARIAS(): Promise<NormalizedItem[]> {
  return parseBOCCanariasRSS(await sourceText('https://www.gobiernodecanarias.org/boc/feeds/capitulo/disposiciones_generales.rss', 'rss'))
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
