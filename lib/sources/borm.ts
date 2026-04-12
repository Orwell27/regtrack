import type { NormalizedItem } from './boe'

// Índices de campos en el JSON array-of-arrays de transparencia.carm.es
const F = {
  ID_ANUNCIO: 0,
  ID_OBJETO_DIGITAL: 1,
  FEC_PUBLICACION: 3,
  SUMARIO: 4,
  SECCION: 6,
  ANUNCIANTE: 8,
  RANGO: 10,
  NPE: 12,
  URL_HTML: 13,
} as const

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
      const fecha = String(row[F.FEC_PUBLICACION] ?? '')
      return fecha.startsWith(today) && row[F.URL_HTML]
    })
    .map((row) => {
      const partes = [
        row[F.SECCION] ? `Sección: ${row[F.SECCION]}` : '',
        row[F.ANUNCIANTE] ? `Anunciante: ${row[F.ANUNCIANTE]}` : '',
        row[F.RANGO] ? `Tipo: ${row[F.RANGO]}` : '',
        String(row[F.SUMARIO] ?? ''),
      ].filter(Boolean).join('\n')

      return {
        id: `BORM-${row[F.NPE] ?? row[F.ID_ANUNCIO]}`,
        titulo: String(row[F.SUMARIO] ?? '').slice(0, 300),
        url: String(row[F.URL_HTML]),
        fuente: 'BORM' as const,
        texto: partes.slice(0, 8000),
      }
    })
}
