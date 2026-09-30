import { sourceText } from './http'
import type { NormalizedItem } from './boe'

const BASE = 'https://web.larioja.org'

export async function fetchBOR(): Promise<NormalizedItem[]> {
  return parseBORHtml(await sourceText(`${BASE}/bor-portada`, 'html'))
}

export function parseBORHtml(html: string): NormalizedItem[] {
  const items: NormalizedItem[] = []
  // BOR item links typically contain /bor/ in the path and have a title
  const linkRe = /href="((?:https?:\/\/(?:web|ias1)\.larioja\.org)?\/bor[^"]+)"[^>]*>\s*([^<]{10,})/g
  let match: RegExpExecArray | null

  while ((match = linkRe.exec(html)) !== null) {
    const rawUrl = match[1].replace(/&amp;/g, '&')
    const titulo = match[2].trim().replace(/\s+/g, ' ')
    if (!rawUrl || !titulo) continue

    const url = rawUrl.startsWith('http') ? rawUrl : `${BASE}${rawUrl}`
    if (!items.find(i => i.url === url)) {
      items.push({ id: `BOR-${url}`, titulo: titulo.slice(0, 300), url, fuente: 'BOR' as const })
    }
  }
  return items
}
