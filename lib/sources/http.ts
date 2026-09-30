/** Una fuente caída nunca equivale a una fuente sin novedades. */
export async function fetchSource(url: string, init: RequestInit = {}, allowMissing = false): Promise<Response> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
  if (response.url && /(?:^|\.)(?:perfdrive\.com|captcha\.[^/]+)$/.test(new URL(response.url).hostname)) {
    throw new Error(`Acceso automatizado bloqueado por CAPTCHA: ${new URL(url).hostname}; requiere una vía autorizada`)
  }
  if (allowMissing && response.status === 404) return response
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return response
}

export async function sourceText(url: string, format: 'rss' | 'atom' | 'html'): Promise<string> {
  const text = await (await fetchSource(url)).text()
  if (/<title>[^<]*(?:captcha|access denied|acceso denegado)/i.test(text)) throw new Error('Acceso automatizado bloqueado; requiere una vía autorizada')
  const expected = format === 'rss' ? /<rss[\s>]/i : format === 'atom' ? /<feed[\s>]/i : /<html[\s>]/i
  if (!expected.test(text)) throw new Error(`Formato ${format} no reconocido: ${url}`)
  return text
}

export const MAX_DOCUMENT_CHARS = 120_000

export function requireDocument(text: string): string {
  if (typeof text !== 'string' || text.trim().length < 80) throw new Error('Texto oficial vacío o insuficiente; requiere recuperación')
  if (text.length > MAX_DOCUMENT_CHARS) throw new Error(`Documento de ${text.length} caracteres: requiere análisis por partes, no se truncará`)
  if (/<(?:!doctype|html)[\s>]/i.test(text)) throw new Error('Se recibió una página HTML en lugar del texto oficial')
  return text.trim()
}
