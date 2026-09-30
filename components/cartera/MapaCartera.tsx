'use client'
// Mapa de la cartera: municipios coloreados por peso de la vivienda turística (INE) y los inmuebles encima.
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { Layer, PathOptions, LatLngBoundsExpression } from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import { LIMITES_MURCIA, MUNICIPIOS_MURCIA, FUENTE_IGN } from '@/lib/cartera/municipios'
import { ETIQUETA_CLASE } from '@/lib/cartera/clasificar'
import type { Clase } from '@/lib/cartera/tipos'
import { COLOR_CLASE, colorPct } from './colores'

export type PuntoMapa = { id: string; nombre: string; lat: number; lon: number; clase: Clase }

const REGION: LatLngBoundsExpression = [[37.37, -2.35], [38.76, -0.64]]

const IGN_GRIS =
  'https://www.ign.es/wmts/ign-base?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=IGNBase-gris&STYLE=default' +
  '&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg'

function Encuadre({ puntos }: { puntos: PuntoMapa[] }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length === 0) {
      map.fitBounds(REGION)
    } else if (puntos.length === 1) {
      map.setView([puntos[0].lat, puntos[0].lon], 13)
    } else {
      map.fitBounds(puntos.map(p => [p.lat, p.lon] as [number, number]), { padding: [48, 48], maxZoom: 14 })
    }
  }, [map, puntos])
  return null
}

function formatoPct(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MapaCartera({ puntos, seleccionado, onSeleccionar }: {
  puntos: PuntoMapa[]
  seleccionado?: string | null
  onSeleccionar?: (id: string) => void
}) {
  const estilo = useMemo(() => (f?: Feature): PathOptions => {
    const ine = String(f?.properties?.ine ?? '')
    const pct = MUNICIPIOS_MURCIA[ine]?.pctViviendas ?? 0
    return { fillColor: colorPct(pct), fillOpacity: 0.45, color: '#ffffff', weight: 1 }
  }, [])

  const alCrear = (f: Feature, layer: Layer) => {
    const ine = String(f.properties?.ine ?? '')
    const m = MUNICIPIOS_MURCIA[ine]
    if (!m) return
    const variacion = m.vutHaceUnAno > 0 ? Math.round(((m.vut - m.vutHaceUnAno) / m.vutHaceUnAno) * 100) : null
    const lineas = [
      `<strong>${m.nombre}</strong>`,
      `${m.vut.toLocaleString('es-ES')} viviendas turísticas (${formatoPct(m.pctViviendas)} % del parque)`,
      variacion === null ? '' : `${variacion > 0 ? '+' : ''}${variacion} % en un año`,
    ].filter(Boolean)
    layer.bindTooltip(lineas.join('<br>'), { sticky: true })
  }

  return (
    <MapContainer bounds={REGION} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer url={IGN_GRIS} attribution={`Mapa base: © Instituto Geográfico Nacional de España · ${FUENTE_IGN} · Viviendas turísticas: INE`} maxZoom={19} />
      <GeoJSON data={LIMITES_MURCIA as unknown as FeatureCollection} style={estilo} onEachFeature={alCrear} />
      {puntos.map(p => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lon]}
          radius={seleccionado === p.id ? 11 : 8}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: COLOR_CLASE[p.clase], fillOpacity: 1 }}
          eventHandlers={{ click: () => onSeleccionar?.(p.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <strong>{p.nombre}</strong><br />{ETIQUETA_CLASE[p.clase]}
          </Tooltip>
        </CircleMarker>
      ))}
      <Encuadre puntos={puntos} />
    </MapContainer>
  )
}
