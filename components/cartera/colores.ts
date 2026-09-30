// components/cartera/colores.ts
// Colores del mapa y de la leyenda, sin depender de Leaflet (se usa también en el servidor).
import type { Clase } from '@/lib/cartera/tipos'

// Escala secuencial de un solo tono (sky), de claro a oscuro
export const TRAMOS_PCT: { hasta: number; color: string; etiqueta: string }[] = [
  { hasta: 0, color: '#f1f5f9', etiqueta: 'Sin datos o 0 %' },
  { hasta: 0.5, color: '#e0f2fe', etiqueta: 'Hasta 0,5 %' },
  { hasta: 1, color: '#bae6fd', etiqueta: '0,5 – 1 %' },
  { hasta: 2, color: '#38bdf8', etiqueta: '1 – 2 %' },
  { hasta: 3, color: '#0284c7', etiqueta: '2 – 3 %' },
  { hasta: Infinity, color: '#075985', etiqueta: 'Más de 3 %' },
]

export const COLOR_CLASE: Record<Clase, string> = {
  solida: '#059669',
  vigilancia: '#d97706',
  fragil: '#dc2626',
}

export function colorPct(pct: number) {
  return TRAMOS_PCT.find(t => pct <= t.hasta)?.color ?? TRAMOS_PCT[TRAMOS_PCT.length - 1].color
}
