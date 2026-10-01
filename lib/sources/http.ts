export class SourceAccessBlockedError extends Error {}

function rejectChallenge(target: string, source: string) {
  if (/(?:^|\.)perfdrive\.com$|^captcha\./i.test(new URL(target).hostname)) {
    throw new SourceAccessBlockedError(`Acceso automatizado bloqueado por CAPTCHA: ${new URL(source).hostname}; requiere una vía autorizada`)
  }
}

/** Una fuente caída nunca equivale a una fuente sin novedades. */
export async function fetchSource(url: string, init: RequestInit = {}, allowMissing = false): Promise<Response> {
  const signal = AbortSignal.timeout(30_000)
  let target = url
  const request: RequestInit = { ...init, redirect: 'manual', signal }
  for (let redirects = 0; redirects <= 5; redirects++) {
    rejectChallenge(target, url)
    const response = await fetch(target, request)
    if (response.url) rejectChallenge(response.url, url)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) throw new Error(`Redirección sin destino: ${url}`)
      const next = new URL(location, target)
      rejectChallenge(next.href, url)
      if (!['http:', 'https:'].includes(next.protocol)) throw new Error(`Protocolo de redirección no permitido: ${url}`)
      const method = (request.method ?? 'GET').toUpperCase()
      if ((response.status === 303 && method !== 'GET' && method !== 'HEAD') || ([301, 302].includes(response.status) && method === 'POST')) {
        request.method = 'GET'
        request.body = undefined
        const headers = new Headers(request.headers)
        headers.delete('content-type')
        headers.delete('content-length')
        request.headers = headers
      }
      if (next.origin !== new URL(target).origin) {
        const headers = new Headers(request.headers)
        for (const name of ['authorization', 'proxy-authorization', 'cookie']) headers.delete(name)
        request.headers = headers
      }
      target = next.href
      continue
    }
    if (allowMissing && response.status === 404) return response
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
    return response
  }
  throw new Error(`Demasiadas redirecciones: ${url}`)
}

export async function sourceText(url: string, format: 'rss' | 'atom' | 'html'): Promise<string> {
  const text = await (await fetchSource(url)).text()
  if (/<title>[^<]*(?:captcha|access denied|acceso denegado)/i.test(text)) throw new SourceAccessBlockedError('Acceso automatizado bloqueado; requiere una vía autorizada')
  const expected = format === 'rss' ? /<rss[\s>]/i : format === 'atom' ? /<feed[\s>]/i : /<html[\s>]/i
  if (!expected.test(text)) throw new Error(`Formato ${format} no reconocido: ${url}`)
  return text
}

export const MAX_DOCUMENT_CHARS = 120_000
const MAX_ARCHIVE_CHARS = 1_000_000
export interface DocumentReadOptions { forArchive?: boolean }

export function requireDocument(text: string, options: DocumentReadOptions = {}): string {
  if (typeof text !== 'string' || text.trim().length < 80) throw new Error('Texto oficial vacío o insuficiente; requiere recuperación')
  const limit = options.forArchive ? MAX_ARCHIVE_CHARS : MAX_DOCUMENT_CHARS
  if (text.length > limit) throw new Error(`Documento de ${text.length} caracteres: supera el límite de ${options.forArchive ? 'captura' : 'análisis'} (${limit}), no se truncará`)
  if (/<(?:!doctype|html)[\s>]/i.test(text)) throw new Error('Se recibió una página HTML en lugar del texto oficial')
  return text.trim()
}
