import type { NormalizedItem } from './boe'

const BASE = 'https://bon.navarra.es'

export async function fetchBON(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(`${BASE}/es/ultimo`)
    if (!res.ok) {
      console.error(`BON error: ${res.status}`)
      return []
    }
    const html = await res.text()
    return parseBONHtml(html)
  } catch (err) {
    console.error('BON fetch error:', err)
    return []
  }
}

export function parseBONHtml(html: string): NormalizedItem[] {
  const items: NormalizedItem[] = []
  // Links follow pattern /es/anuncio/-/texto/YYYY/NUM/INDEX
  const linkRe = /href="(\/es\/anuncio\/-\/texto\/\d{4}\/\d+\/\d+)"[^>]*>\s*([^<]{5,})/g
  let match: RegExpExecArray | null

  while ((match = linkRe.exec(html)) !== null) {
    const path = match[1]
    const titulo = match[2].trim().replace(/\s+/g, ' ')
    if (!path || !titulo) continue

    const url = `${BASE}${path}`
    if (!items.find(i => i.url === url)) {
      items.push({ id: `BON-${path}`, titulo: titulo.slice(0, 300), url, fuente: 'BON' as const })
    }
  }
  return items
}
