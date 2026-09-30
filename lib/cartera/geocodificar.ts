// lib/cartera/geocodificar.ts
// Sitúa una dirección en el mapa con Nominatim (OpenStreetMap). Uso bajo y con identificación, según su política.
import { municipioEnPunto } from './municipios'

export type Ubicacion = { lat: number; lon: number; municipio_ine: string | null }

export async function geocodificar(direccion: string): Promise<Ubicacion | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', direccion)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'es')

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RegTrack/0.1 (https://regtrack.vercel.app)', 'Accept-Language': 'es' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const [primero] = (await res.json()) as { lat: string; lon: string }[]
    if (!primero) return null
    const lat = Number(primero.lat)
    const lon = Number(primero.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return { lat, lon, municipio_ine: municipioEnPunto(lat, lon) }
  } catch (err) {
    console.error('[cartera] Error geocodificando:', err instanceof Error ? err.message : err)
    return null
  }
}
