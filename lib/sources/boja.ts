import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

export async function fetchBOJA(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch('https://www.juntadeandalucia.es/boja/distribucion/boja.xml')
    if (!res.ok) {
      console.error(`BOJA feed error: ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseBOJAAtom(xml)
  } catch (err) {
    console.error('BOJA fetch error:', err)
    return []
  }
}

export function parseBOJAAtom(xml: string): NormalizedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const entries = parsed?.feed?.entry ?? []
  const list = Array.isArray(entries) ? entries : [entries]

  return list
    .filter((entry: any) => entry.title && (entry.link || entry.id))
    .map((entry: any) => {
      const link = entry.link
      const url =
        typeof link === 'string'
          ? link
          : Array.isArray(link)
          ? String(link[0]?.['@_href'] ?? link[0] ?? entry.id ?? '')
          : String(link?.['@_href'] ?? entry.id ?? '')

      const titulo =
        typeof entry.title === 'object'
          ? String(entry.title['#text'] ?? '')
          : String(entry.title ?? '')

      return {
        id: String(entry.id ?? url),
        titulo: titulo.slice(0, 300),
        url,
        fuente: 'BOJA' as const,
        texto: entry.summary ? String(entry.summary).slice(0, 8000) : undefined,
      }
    })
    .filter(item => item.url)
}
