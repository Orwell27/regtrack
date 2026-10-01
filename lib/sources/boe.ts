import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { fetchSource, requireDocument, SourceAccessBlockedError, type DocumentReadOptions } from './http'
import { madridDate } from '../pipeline/dates'

export const RELEVANT_SECTIONS = ['1', '3'] as const // I: Disposiciones generales, III: Otras disposiciones

function mapOrden(orden: string): ReferenciaBOE['tipo'] {
  const o = (orden ?? '').toUpperCase()
  if (o.startsWith('MODIFICA')) return 'modifica'
  if (o.startsWith('DEROGA')) return 'deroga'
  if (o.startsWith('AÑADE') || o.startsWith('ANADE')) return 'complementa'
  return 'otro'
}

export function parseReferencesBOE(xml: string): ReferenciaBOE[] {
  if (!xml) return []
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = parser.parse(xml)
    const raw = parsed?.documento?.referencias?.anteriores?.anterior
    if (!raw) return []
    const items = Array.isArray(raw) ? raw : [raw]
    return items
      .filter((r: any) => r?.['@_referencia'])
      .map((r: any) => ({
        boe_id: String(r['@_referencia']),
        tipo: mapOrden(String(r['@_orden'] ?? '')),
        descripcion: String(r['#text'] ?? r['_text'] ?? '').trim(),
      }))
  } catch {
    return []
  }
}

export interface ReferenciaBOE {
  boe_id: string
  tipo: 'modifica' | 'deroga' | 'complementa' | 'otro'
  descripcion: string
}

export interface NormalizedItem {
  id: string
  titulo: string
  url: string
  fuente: 'BOE' | 'BOCM' | 'DOGC' | 'BORM' | 'BOJA' | 'BOIB' | 'BOC_CANARIAS' | 'BOC_CANTABRIA' | 'BOCYL' | 'DOE' | 'DOG' | 'BOPV' | 'BOPA' | 'BON' | 'BOR'
  texto?: string
  contenido?: 'texto_completo' | 'sumario'
  texto_url?: string
  fecha_publicacion?: string
  _xmlUrl?: string // URL interna para fetchBOEText, no se persiste
  // Solo BOE:
  boe_id?: string
  departamento?: string
  epigrafe?: string
  rango?: string
  referencias_boe?: ReferenciaBOE[]
}

type JsonNode = Record<string, unknown>

function objectNode(value: unknown, context: string): JsonNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Formato BOE no reconocido: ${context}`)
  return value as JsonNode
}

function children(node: JsonNode, key: string): JsonNode[] {
  // La API intercala «texto» cuando un nodo XML solo tiene un hijo.
  while (!(key in node) && node.texto && typeof node.texto === 'object' && !Array.isArray(node.texto)) {
    node = node.texto as JsonNode
  }
  if (!(key in node)) throw new Error(`Formato BOE no reconocido: falta ${key}`)
  const values = Array.isArray(node[key]) ? node[key] as unknown[] : [node[key]]
  return values.map(value => objectNode(value, key))
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function linkText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  return value && typeof value === 'object' && !Array.isArray(value)
    ? optionalString((value as JsonNode).texto) : undefined
}

export function parseBOESumario(data: unknown): NormalizedItem[] {
  const items: NormalizedItem[] = []
  const root = objectNode(data, 'respuesta')
  const payload = objectNode(root.data, 'data')
  const sumario = objectNode(payload.sumario, 'sumario')

  for (const diario of children(sumario, 'diario')) {
    for (const seccion of children(diario, 'seccion')) {
      const codigo = String(seccion.codigo ?? seccion.num ?? '')
      if (!codigo) throw new Error('Formato BOE no reconocido: sección sin código')
      if (!RELEVANT_SECTIONS.includes(codigo as '1' | '3')) continue

      for (const dept of children(seccion, 'departamento')) {
        for (const epigrafe of children(dept, 'epigrafe')) {
          for (const item of children(epigrafe, 'item')) {
            const url = linkText(item.url_html)
            const xmlUrl = linkText(item.url_xml)
            const id = optionalString(item.identificador ?? item.id)
            const titulo = optionalString(item.titulo)
            if (!url || !id || !titulo) throw new Error('Formato BOE no reconocido: documento sin identificador, URL o título')
            items.push({
              id,
              titulo,
              url,
              fuente: 'BOE',
              boe_id: id,
              departamento: optionalString(dept.nombre ?? dept.titulo),
              epigrafe: optionalString(epigrafe.nombre ?? epigrafe.titulo),
              rango: optionalString(item.rango),
              _xmlUrl: xmlUrl,
            })
          }
        }
      }
    }
  }
  return Array.from(new Map(items.map(item => [item.url, item])).values())
}

interface OrderedXmlNode { [key: string]: string | OrderedXmlNode[] }

function plainXmlText(nodes: OrderedXmlNode[]): string {
  return nodes.flatMap(node => Object.entries(node).map(([key, value]) =>
    key === '#text' && typeof value === 'string' ? value : Array.isArray(value) ? plainXmlText(value) : ''
  )).join(' ')
}

export async function fetchBOEText(
  id: string,
  xmlUrl?: string,
  options: DocumentReadOptions = {}
): Promise<{ texto: string; referencias_boe: ReferenciaBOE[] }> {
  const targetUrl = xmlUrl ?? `https://www.boe.es/diario_boe/xml.php?id=${id}`
  try {
    const res = await fetchSource(targetUrl)
    const xml = await res.text()
    if (!/<documento[\s>]/i.test(xml) || /<(?:!doctype|html)[\s>]/i.test(xml)) {
      throw new Error('Se esperaba el XML oficial del BOE, no una página de error')
    }
    if (XMLValidator.validate(xml) !== true) throw new Error('XML BOE incompleto o inválido')
    const parsed = new XMLParser({ preserveOrder: true, ignoreAttributes: true, parseTagValue: false, trimValues: false }).parse(xml) as OrderedXmlNode[]
    const document = parsed.find(node => Array.isArray(node.documento))?.documento
    const body = Array.isArray(document) ? document.find(node => Array.isArray(node.texto))?.texto : undefined
    if (!Array.isArray(body)) throw new Error('El XML BOE no contiene el nodo de texto oficial')
    const referencias_boe = parseReferencesBOE(xml)
    const texto = plainXmlText(body).replace(/\s+/g, ' ').trim()
    return { texto: requireDocument(texto, options), referencias_boe }
  } catch (error) {
    if (error instanceof SourceAccessBlockedError) throw error
    throw new Error(`No se pudo leer el texto BOE ${id}`, { cause: error })
  }
}

export async function fetchBOE(date = madridDate(), hydrate = true): Promise<NormalizedItem[]> {
  const today = date.replace(/-/g, '')

  let data: any
  try {
    const res = await fetchSource(`https://www.boe.es/datosabiertos/api/boe/sumario/${today}`, {
      headers: { Accept: 'application/json' },
    }, true)
    if (!res.ok) {
      if (res.status === 404 && new Date(`${date}T12:00:00Z`).getUTCDay() === 0) return []
      throw new Error(`BOE ${date}: HTTP ${res.status}`)
    }
    data = await res.json()
  } catch (err) {
    console.error('BOE fetch error:', err)
    throw err
  }

  if (!data?.data?.sumario?.diario) throw new Error(`BOE ${date}: formato de sumario no reconocido`)
  const items = parseBOESumario(data).map(item => ({ ...item, fecha_publicacion: date }))
  if (!hydrate) return items

  // Obtener texto de cada item en batches de 5
  const results: NormalizedItem[] = []
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5)
    const withText = await Promise.all(
      batch.map(async (item) => {
        const { _xmlUrl, ...rest } = item
        const { texto, referencias_boe } = await fetchBOEText(item.id, _xmlUrl)
        return { ...rest, texto, referencias_boe }
      })
    )
    results.push(...withText)
  }
  return results
}
