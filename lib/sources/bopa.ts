import type { NormalizedItem } from './boe'

const BASE = 'https://miprincipado.asturias.es'

export async function fetchBOPA(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(`${BASE}/ultimos-boletines?p_r_p_summaryLastBopa=true`)
    if (!res.ok) {
      console.error(`BOPA error: ${res.status}`)
      return []
    }
    const html = await res.text()
    return parseBOPAHtml(html)
  } catch (err) {
    console.error('BOPA fetch error:', err)
    return []
  }
}

export function parseBOPAHtml(html: string): NormalizedItem[] {
  const items: NormalizedItem[] = []
  // Links to individual dispositions contain p_r_p_dispositionText
  const linkRe = /href="([^"]*p_r_p_dispositionText[^"]+)"[^>]*>\s*([^<]{5,})/g
  let match: RegExpExecArray | null

  while ((match = linkRe.exec(html)) !== null) {
    const rawUrl = match[1].replace(/&amp;/g, '&')
    const titulo = match[2].trim().replace(/\s+/g, ' ')
    if (!rawUrl || !titulo) continue

    const url = rawUrl.startsWith('http') ? rawUrl : `${BASE}${rawUrl}`
    const id = `BOPA-${url}`

    if (!items.find(i => i.id === id)) {
      items.push({ id, titulo: titulo.slice(0, 300), url, fuente: 'BOPA' as const })
    }
  }
  return items
}
