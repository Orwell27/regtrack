import { sourceText } from './http'
import { XMLParser } from 'fast-xml-parser'
import type { NormalizedItem } from './boe'

const MAX_RSS_CHARS = 2_000_000
const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

// Solo sustituciones que reducen el texto, sin entidades declaradas ni expansión recursiva.
function decodeReferences(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z\d]*);/gi, (_, reference: string) => {
    if (Object.hasOwn(XML_ENTITIES, reference)) return XML_ENTITIES[reference]
    if (!reference.startsWith('#')) throw new Error(`BOCYL: referencia XML no admitida: &${reference};`)
    const point = reference.startsWith('#x')
      ? Number.parseInt(reference.slice(2), 16)
      : Number.parseInt(reference.slice(1), 10)
    if (![9, 10, 13].includes(point) && !(point >= 0x20 && point <= 0xd7ff) &&
      !(point >= 0xe000 && point <= 0xfffd) && !(point >= 0x10000 && point <= 0x10ffff)) {
      throw new Error('BOCYL: referencia XML con carácter no válido')
    }
    return String.fromCodePoint(point)
  })
}

function plainText(html: string): string {
  return decodeReferences(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function officialUrl(value: string): URL {
  const url = new URL(value)
  if (url.origin !== 'https://bocyl.jcyl.es' || url.username || url.password) {
    throw new Error('BOCYL: enlace ajeno al boletín oficial')
  }
  return url
}

function documentItem(url: URL, titulo: string, contexto?: string): NormalizedItem {
  const match = url.pathname.match(/^\/boletines\/(\d{4})\/(\d{2})\/(\d{2})\/pdf\/BOCYL-D-(\d{2})(\d{2})(\d{4})-\d+-\d+\.pdf$/)
  if (!match || match[1] !== match[6] || match[2] !== match[5] || match[3] !== match[4] || !titulo) {
    throw new Error('BOCYL: disposición sin título o enlace PDF reconocible')
  }
  const fecha = `${match[1]}-${match[2]}-${match[3]}`
  if (!Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) {
    throw new Error('BOCYL: fecha de publicación no válida')
  }
  return {
    id: url.href,
    titulo,
    url: url.href,
    fuente: 'BOCYL',
    // El RSS proporciona sumarios, no el contenido íntegro de los PDF.
    texto: `Sumario oficial del BOCYL (no es el texto íntegro).\n${contexto ? `${contexto}\n` : ''}${titulo}`,
    fecha_publicacion: fecha,
  }
}

export async function fetchBOCYL(): Promise<NormalizedItem[]> {
  return parseBOCYLRSS(await sourceText('https://bocyl.jcyl.es/rss', 'rss'))
}

export function parseBOCYLRSS(xml: string): NormalizedItem[] {
  if (xml.length > MAX_RSS_CHARS) throw new Error('BOCYL: RSS demasiado grande')
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('BOCYL: DTD y entidades declaradas no admitidos')
  // El RSS agrega todas las disposiciones en HTML escapado. Más de 1.000 referencias
  // ordinarias &lt;/&gt; activaban el límite global del parser. No ampliamos ese límite:
  // rechazamos DTD y decodificamos únicamente referencias simples en una pasada acotada.
  const parsed = new XMLParser({ processEntities: false, parseTagValue: false }).parse(xml, true)
  const channel = parsed?.rss?.channel
  if (!channel || typeof channel !== 'object' || Array.isArray(channel)) {
    // Un canal RSS explícitamente vacío sí puede representar ausencia de novedades.
    if (channel === '') return []
    throw new Error('BOCYL: estructura RSS no reconocida')
  }
  const rawItems: unknown = channel.item
  if (rawItems === undefined) {
    throw new Error('BOCYL: contenido RSS sin disposiciones; revisar estructura')
  }
  const items = Array.isArray(rawItems) ? rawItems : [rawItems]
  const documents: NormalizedItem[] = []
  for (const item of items) {
    if (!item || typeof item.title !== 'string' || typeof item.link !== 'string' || typeof item.description !== 'string') {
      throw new Error('BOCYL: item RSS incompleto')
    }
    const url = officialUrl(decodeReferences(item.link))
    const description = decodeReferences(item.description)
    if (url.pathname !== '/boletin.do') {
      documents.push(documentItem(url, decodeReferences(item.title)))
      continue
    }
    const entries = [...description.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)]
    if (!entries.length || entries.length !== (description.match(/<li\b/gi) ?? []).length) {
      throw new Error('BOCYL: boletín sin disposiciones reconocibles; revisar estructura')
    }
    for (const [, entry] of entries) {
      const paragraphs = [...entry.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
      const links = [...entry.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)]
      if (paragraphs.length !== 2 || links.length !== 1) {
        throw new Error('BOCYL: disposición con estructura inesperada')
      }
      const document = documentItem(officialUrl(decodeReferences(links[0][2])), plainText(paragraphs[1][1]), plainText(paragraphs[0][1]))
      const [year, month, day] = document.fecha_publicacion!.split('-')
      if (url.searchParams.get('fechaBoletin') !== `${day}/${month}/${year}`) {
        throw new Error('BOCYL: fecha de disposición distinta a la del boletín')
      }
      documents.push(document)
    }
  }
  return [...new Map(documents.map(item => [item.url, item])).values()]
}
