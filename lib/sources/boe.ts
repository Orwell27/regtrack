import { XMLParser } from 'fast-xml-parser'

export const RELEVANT_SECTIONS = ['1', '3'] as const // I: Disposiciones generales, III: Otras disposiciones

export interface NormalizedItem {
  id: string
  titulo: string
  url: string
  fuente: 'BOE' | 'BOCM' | 'DOGC' | 'BORM' | 'BOJA' | 'BOIB' | 'BOC_CANARIAS' | 'BOC_CANTABRIA' | 'BOCYL' | 'DOE' | 'DOG' | 'BOPV' | 'BOPA' | 'BON' | 'BOR'
  texto?: string
  _xmlUrl?: string // URL interna para fetchBOEText, no se persiste
}

export function parseBOESumario(data: any): NormalizedItem[] {
  const items: NormalizedItem[] = []
  const secciones = data?.data?.sumario?.diario?.[0]?.seccion ?? []

  for (const seccion of secciones) {
    const codigo = String(seccion.codigo ?? seccion.num ?? '')
    if (!RELEVANT_SECTIONS.includes(codigo as '1' | '3')) continue

    const departamentos = Array.isArray(seccion.departamento)
      ? seccion.departamento
      : seccion.departamento ? [seccion.departamento] : []

    for (const dept of departamentos) {
      const epigrafes = Array.isArray(dept.epigrafe)
        ? dept.epigrafe
        : dept.epigrafe ? [dept.epigrafe] : []

      for (const epigrafe of epigrafes) {
        const docItems = Array.isArray(epigrafe.item)
          ? epigrafe.item
          : epigrafe.item ? [epigrafe.item] : []

        for (const item of docItems) {
          const url = item.url_html?.texto ?? item.url_html
          const xmlUrl = item.url_xml?.texto ?? item.url_xml
          const id = item.identificador ?? item.id
          if (url && id) {
            items.push({
              id,
              titulo: item.titulo ?? '',
              url: typeof url === 'string' ? url : String(url),
              fuente: 'BOE',
              _xmlUrl: xmlUrl ? (typeof xmlUrl === 'string' ? xmlUrl : String(xmlUrl)) : undefined,
            })
          }
        }
      }
    }
  }
  return items
}

export async function fetchBOEText(id: string, xmlUrl?: string): Promise<string> {
  // Usar url_xml directamente si está disponible (más fiable que la API /id/)
  const targetUrl = xmlUrl ?? `https://www.boe.es/diario_boe/xml.php?id=${id}`
  try {
    const res = await fetch(targetUrl)
    if (!res.ok) return ''
    const xml = await res.text()
    // Extraer todo el texto legible del XML eliminando tags
    const sinTags = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    // Eliminar la cabecera XML y metadatos hasta llegar al contenido
    const idxTitulo = sinTags.indexOf('Jefatura') !== -1
      ? sinTags.indexOf('Jefatura')
      : sinTags.indexOf('TEXTO')
    const texto = idxTitulo > 0 ? sinTags.slice(idxTitulo) : sinTags
    return texto.slice(0, 8000)
  } catch {
    return ''
  }
}

export async function fetchBOE(): Promise<NormalizedItem[]> {
  const now = new Date()
  const spainDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  const today = spainDate.toISOString().slice(0, 10).replace(/-/g, '')

  let data: any
  try {
    const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${today}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      console.error(`BOE API error: ${res.status}`)
      return []
    }
    data = await res.json()
  } catch (err) {
    console.error('BOE fetch error:', err)
    return []
  }

  const items = parseBOESumario(data)

  // Obtener texto de cada item en batches de 5
  const results: NormalizedItem[] = []
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5)
    const withText = await Promise.all(
      batch.map(async (item) => {
        const { _xmlUrl, ...rest } = item
        return { ...rest, texto: await fetchBOEText(item.id, _xmlUrl) }
      })
    )
    results.push(...withText)
  }
  return results
}
