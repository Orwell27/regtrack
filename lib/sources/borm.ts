import type { NormalizedItem } from './boe'

// Índices de campos en el JSON array-of-arrays de transparencia.carm.es.
// En 2026 el índice añadió una primera columna con el tipo («BOLETIN» / «SUPLEMENTO»)
// y otras intermedias, así que se aceptan los dos formatos.
type Campos = {
  ID_ANUNCIO: number
  FEC_PUBLICACION: number
  SUMARIO: number
  SECCION: number
  ANUNCIANTE: number
  RANGO: number
  NPE: number
  URL_HTML: number
}

const F_ANTIGUO: Campos = {
  ID_ANUNCIO: 0,
  FEC_PUBLICACION: 3,
  SUMARIO: 4,
  SECCION: 6,
  ANUNCIANTE: 8,
  RANGO: 10,
  NPE: 12,
  URL_HTML: 13,
}

const F_ACTUAL: Campos = {
  ID_ANUNCIO: 1,
  FEC_PUBLICACION: 4,
  SUMARIO: 5,
  SECCION: 7,
  ANUNCIANTE: 9,
  RANGO: 12,
  NPE: 16,
  URL_HTML: 17,
}

function camposDe(row: unknown[]): Campos {
  return row[0] === 'BOLETIN' || row[0] === 'SUPLEMENTO' ? F_ACTUAL : F_ANTIGUO
}

export async function fetchBORM(): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(
      'https://transparencia.carm.es/rest-services/services/restFile/BORMIndice.json'
    )
    if (!res.ok) {
      console.error(`BORM index error: ${res.status}`)
      return []
    }
    const data = await res.json()
    return parseBORMIndex(data)
  } catch (err) {
    console.error('BORM fetch error:', err)
    return []
  }
}

export function parseBORMIndex(data: unknown[][]): NormalizedItem[] {
  const now = new Date()
  const spainDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  const today = spainDate.toISOString().slice(0, 10) // YYYY-MM-DD

  return data
    .filter((row) => {
      const F = camposDe(row)
      const fecha = String(row[F.FEC_PUBLICACION] ?? '')
      return fecha.startsWith(today) && row[F.URL_HTML]
    })
    .map((row) => {
      const F = camposDe(row)
      const partes = [
        row[F.SECCION] ? `Sección: ${row[F.SECCION]}` : '',
        row[F.ANUNCIANTE] ? `Anunciante: ${row[F.ANUNCIANTE]}` : '',
        row[F.RANGO] ? `Tipo: ${row[F.RANGO]}` : '',
        String(row[F.SUMARIO] ?? ''),
      ].filter(Boolean).join('\n')

      return {
        id: `BORM-${row[F.NPE] || row[F.ID_ANUNCIO]}`,
        titulo: String(row[F.SUMARIO] ?? '').slice(0, 300),
        url: String(row[F.URL_HTML]),
        fuente: 'BORM' as const,
        texto: partes.slice(0, 8000),
      }
    })
}
