export const RELEVANT_SECTIONS = ['1', '3'] as const // I: Disposiciones generales, III: Otras disposiciones

export interface NormalizedItem {
  id: string
  titulo: string
  url: string
  fuente: 'BOE' | 'BOCM' | 'DOGC' | 'BORM' | 'BOJA' | 'BOIB' | 'BOC_CANARIAS' | 'BOC_CANTABRIA' | 'BOCYL' | 'DOE' | 'DOG' | 'BOPV' | 'BOPA' | 'BON' | 'BOR'
  texto?: string
}

export function parseBOESumario(data: any): NormalizedItem[] {
  const items: NormalizedItem[] = []
  const secciones = data?.data?.sumario?.diario?.[0]?.seccion ?? []

  for (const seccion of secciones) {
    // La API usa 'codigo' (no 'num'). Secciones relevantes: 1 = Disposiciones generales, 3 = Otras disposiciones
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
          const id = item.identificador ?? item.id
          if (url && id) {
            items.push({
              id,
              titulo: item.titulo ?? '',
              url: typeof url === 'string' ? url : String(url),
              fuente: 'BOE',
            })
          }
        }
      }
    }
  }
  return items
}

export async function fetchBOEText(id: string): Promise<string> {
  try {
    const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/id/${id}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return ''
    const data = await res.json()
    const texto: string = data?.data?.documento?.texto ?? ''
    return texto.slice(0, 8000)
  } catch {
    return ''
  }
}

export async function fetchBOE(): Promise<NormalizedItem[]> {
  // Usar fecha en zona horaria España (CET/CEST, UTC+1/+2) para no pedir el BOE de ayer
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

  // Obtener texto de cada item en paralelo (máx 5 a la vez)
  const results: NormalizedItem[] = []
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5)
    const withText = await Promise.all(
      batch.map(async (item) => ({
        ...item,
        texto: await fetchBOEText(item.id),
      }))
    )
    results.push(...withText)
  }
  return results
}
