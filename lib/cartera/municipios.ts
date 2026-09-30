// lib/cartera/municipios.ts
// Municipios de la Región de Murcia: viviendas turísticas (INE) y límites municipales (IGN).
import geojson from './data/murcia-municipios.json'

export type DatosMunicipio = {
  nombre: string
  /** Viviendas turísticas, mayo de 2026 */
  vut: number
  /** Viviendas turísticas, mayo de 2025 */
  vutHaceUnAno: number
  plazas: number
  /** Porcentaje de viviendas turísticas sobre el total de viviendas censadas */
  pctViviendas: number
}

export const FUENTE_INE = {
  titulo: 'INE, Medición del número de viviendas turísticas (tablas 39363 y 39366), mayo de 2026',
  url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=39363',
}

export const FUENTE_IGN = 'Límites municipales: © Instituto Geográfico Nacional (CC BY 4.0)'

export const MUNICIPIOS_MURCIA: Record<string, DatosMunicipio> = {
  '30001': { nombre: 'Abanilla', vut: 6, vutHaceUnAno: 15, plazas: 27, pctViviendas: 0.12 },
  '30002': { nombre: 'Abarán', vut: 10, vutHaceUnAno: 3, plazas: 59, pctViviendas: 0.14 },
  '30003': { nombre: 'Águilas', vut: 426, vutHaceUnAno: 519, plazas: 2221, pctViviendas: 1.63 },
  '30004': { nombre: 'Albudeite', vut: 0, vutHaceUnAno: 0, plazas: 0, pctViviendas: 0.0 },
  '30005': { nombre: 'Alcantarilla', vut: 12, vutHaceUnAno: 13, plazas: 71, pctViviendas: 0.07 },
  '30006': { nombre: 'Aledo', vut: 6, vutHaceUnAno: 6, plazas: 29, pctViviendas: 0.62 },
  '30007': { nombre: 'Alguazas', vut: 0, vutHaceUnAno: 4, plazas: 0, pctViviendas: 0.0 },
  '30008': { nombre: 'Alhama de Murcia', vut: 137, vutHaceUnAno: 197, plazas: 644, pctViviendas: 0.92 },
  '30009': { nombre: 'Archena', vut: 23, vutHaceUnAno: 18, plazas: 108, pctViviendas: 0.25 },
  '30010': { nombre: 'Beniel', vut: 0, vutHaceUnAno: 0, plazas: 0, pctViviendas: 0.0 },
  '30011': { nombre: 'Blanca', vut: 16, vutHaceUnAno: 13, plazas: 98, pctViviendas: 0.41 },
  '30012': { nombre: 'Bullas', vut: 17, vutHaceUnAno: 26, plazas: 100, pctViviendas: 0.24 },
  '30013': { nombre: 'Calasparra', vut: 16, vutHaceUnAno: 19, plazas: 114, pctViviendas: 0.26 },
  '30014': { nombre: 'Campos del Río', vut: 1, vutHaceUnAno: 2, plazas: 8, pctViviendas: 0.08 },
  '30015': { nombre: 'Caravaca de la Cruz', vut: 73, vutHaceUnAno: 102, plazas: 438, pctViviendas: 0.5 },
  '30016': { nombre: 'Cartagena', vut: 1307, vutHaceUnAno: 1655, plazas: 6961, pctViviendas: 1.04 },
  '30017': { nombre: 'Cehegín', vut: 36, vutHaceUnAno: 53, plazas: 245, pctViviendas: 0.39 },
  '30018': { nombre: 'Ceutí', vut: 8, vutHaceUnAno: 2, plazas: 24, pctViviendas: 0.15 },
  '30019': { nombre: 'Cieza', vut: 10, vutHaceUnAno: 12, plazas: 61, pctViviendas: 0.06 },
  '30020': { nombre: 'Fortuna', vut: 41, vutHaceUnAno: 49, plazas: 226, pctViviendas: 0.66 },
  '30021': { nombre: 'Fuente Álamo de Murcia', vut: 89, vutHaceUnAno: 125, plazas: 442, pctViviendas: 0.89 },
  '30022': { nombre: 'Jumilla', vut: 16, vutHaceUnAno: 19, plazas: 76, pctViviendas: 0.12 },
  '30023': { nombre: 'Librilla', vut: 4, vutHaceUnAno: 9, plazas: 29, pctViviendas: 0.11 },
  '30024': { nombre: 'Lorca', vut: 67, vutHaceUnAno: 95, plazas: 373, pctViviendas: 0.16 },
  '30025': { nombre: 'Lorquí', vut: 2, vutHaceUnAno: 6, plazas: 20, pctViviendas: 0.05 },
  '30026': { nombre: 'Mazarrón', vut: 495, vutHaceUnAno: 637, plazas: 2497, pctViviendas: 1.57 },
  '30027': { nombre: 'Molina de Segura', vut: 27, vutHaceUnAno: 48, plazas: 154, pctViviendas: 0.08 },
  '30028': { nombre: 'Moratalla', vut: 70, vutHaceUnAno: 86, plazas: 578, pctViviendas: 1.0 },
  '30029': { nombre: 'Mula', vut: 10, vutHaceUnAno: 14, plazas: 51, pctViviendas: 0.1 },
  '30030': { nombre: 'Murcia', vut: 777, vutHaceUnAno: 1002, plazas: 3690, pctViviendas: 0.35 },
  '30031': { nombre: 'Ojós', vut: 2, vutHaceUnAno: 3, plazas: 18, pctViviendas: 0.38 },
  '30032': { nombre: 'Pliego', vut: 9, vutHaceUnAno: 8, plazas: 57, pctViviendas: 0.34 },
  '30033': { nombre: 'Puerto Lumbreras', vut: 8, vutHaceUnAno: 10, plazas: 60, pctViviendas: 0.1 },
  '30034': { nombre: 'Ricote', vut: 7, vutHaceUnAno: 8, plazas: 48, pctViviendas: 0.43 },
  '30035': { nombre: 'San Javier', vut: 940, vutHaceUnAno: 1330, plazas: 4778, pctViviendas: 2.27 },
  '30036': { nombre: 'San Pedro del Pinatar', vut: 436, vutHaceUnAno: 503, plazas: 2276, pctViviendas: 2.03 },
  '30037': { nombre: 'Torre-Pacheco', vut: 681, vutHaceUnAno: 713, plazas: 3379, pctViviendas: 3.11 },
  '30038': { nombre: 'Las Torres de Cotillas', vut: 4, vutHaceUnAno: 8, plazas: 29, pctViviendas: 0.04 },
  '30039': { nombre: 'Totana', vut: 18, vutHaceUnAno: 12, plazas: 104, pctViviendas: 0.12 },
  '30040': { nombre: 'Ulea', vut: 1, vutHaceUnAno: 1, plazas: 5, pctViviendas: 0.14 },
  '30041': { nombre: 'La Unión', vut: 15, vutHaceUnAno: 16, plazas: 76, pctViviendas: 0.16 },
  '30042': { nombre: 'Villanueva del Río Segura', vut: 26, vutHaceUnAno: 11, plazas: 106, pctViviendas: 1.11 },
  '30043': { nombre: 'Yecla', vut: 37, vutHaceUnAno: 38, plazas: 182, pctViviendas: 0.19 },
  '30901': { nombre: 'Santomera', vut: 4, vutHaceUnAno: 7, plazas: 24, pctViviendas: 0.06 },
  '30902': { nombre: 'Los Alcázares', vut: 492, vutHaceUnAno: 522, plazas: 2480, pctViviendas: 2.27 },
}

export const MUNICIPIO = {
  cartagena: '30016',
  mazarron: '30026',
  sanJavier: '30035',
} as const

type Anillo = number[][]
type Geometria =
  | { type: 'Polygon'; coordinates: Anillo[] }
  | { type: 'MultiPolygon'; coordinates: Anillo[][] }

export type MunicipioFeature = {
  type: 'Feature'
  id: string
  properties: { ine: string; nombre: string }
  geometry: Geometria
}

export const LIMITES_MURCIA = geojson as unknown as { type: 'FeatureCollection'; features: MunicipioFeature[] }

function dentroDeAnillo(lon: number, lat: number, anillo: Anillo): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    const cruza = (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (cruza) dentro = !dentro
  }
  return dentro
}

function dentroDePoligono(lon: number, lat: number, poligono: Anillo[]): boolean {
  const [exterior, ...huecos] = poligono
  return dentroDeAnillo(lon, lat, exterior) && !huecos.some(h => dentroDeAnillo(lon, lat, h))
}

/** Código INE del municipio de la Región de Murcia que contiene el punto, o null si está fuera */
export function municipioEnPunto(lat: number, lon: number): string | null {
  for (const f of LIMITES_MURCIA.features) {
    const poligonos = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    if (poligonos.some(p => dentroDePoligono(lon, lat, p))) return f.properties.ine
  }
  return null
}
