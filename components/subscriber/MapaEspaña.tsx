'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { REGIONES } from '@/lib/spain-ccaa-paths'
import { getHeatColor } from '@/lib/heatmap'

// viewBox from lib/spain-ccaa-paths.ts — "0 0 613 544"
const VIEWBOX = '0 0 613 544'

type MapStats = {
  countByFuente: Record<string, number>
  todayFuentes: string[]
  maxCount: number
}

function MapaEspañaInner({ stats }: { stats: MapStats }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedFuentes = searchParams.get('fuente')?.split(',').filter(Boolean) ?? []

  const updateFuentes = useCallback((fuentes: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (fuentes.length > 0) {
      params.set('fuente', fuentes.join(','))
    } else {
      params.delete('fuente')
    }
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const toggleFuente = useCallback((fuente: string) => {
    if (fuente === 'BOE') {
      updateFuentes(selectedFuentes.includes('BOE') ? [] : ['BOE'])
      return
    }
    const withoutBoe = selectedFuentes.filter(f => f !== 'BOE')
    const isSelected = withoutBoe.includes(fuente)
    updateFuentes(isSelected ? withoutBoe.filter(f => f !== fuente) : [...withoutBoe, fuente])
  }, [selectedFuentes, updateFuentes])

  const isBoeSelected = selectedFuentes.includes('BOE')

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Filtrar por región
        </span>
        <button
          onClick={() => toggleFuente('BOE')}
          aria-pressed={isBoeSelected}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            isBoeSelected
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🇪🇸 España (Gobierno central / BOE)
        </button>
      </div>

      <svg
        viewBox={VIEWBOX}
        width="100%"
        className="block"
        aria-label="Mapa de España por comunidades autónomas"
      >
        {REGIONES.map(region => {
          const count = stats.countByFuente[region.fuente] ?? 0
          const isSelected = selectedFuentes.includes(region.fuente)
          const ratio = stats.maxCount > 0 ? count / stats.maxCount : 0
          const textColor = isSelected
            ? '#ffffff'
            : ratio >= 0.4
            ? '#ffffff'
            : '#7c2d12'

          return (
            <g key={region.id}>
              <path
                d={region.path}
                role={region.disabled ? undefined : 'button'}
                aria-hidden={region.disabled ? true : undefined}
                aria-label={region.disabled ? undefined : region.nombre}
                aria-pressed={region.disabled ? undefined : isSelected}
                tabIndex={region.disabled ? -1 : 0}
                onClick={region.disabled ? undefined : () => toggleFuente(region.fuente)}
                onKeyDown={region.disabled ? undefined : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleFuente(region.fuente)
                  }
                }}
                strokeWidth="1"
                style={
                  !region.disabled && !isSelected && count > 0
                    ? { fill: getHeatColor(count, stats.maxCount) }
                    : undefined
                }
                className={[
                  'transition-colors',
                  region.disabled
                    ? 'fill-slate-100 stroke-slate-200 cursor-not-allowed'
                    : isSelected
                    ? 'fill-sky-400 stroke-sky-600 cursor-pointer'
                    : count === 0
                    ? 'fill-slate-200 stroke-slate-400 cursor-pointer hover:fill-slate-300'
                    : 'stroke-slate-400 cursor-pointer',
                ].join(' ')}
              >
                <title>
                  {region.disabled
                    ? `${region.nombre} — Próximamente`
                    : region.nombre}
                </title>
              </path>

              {/* Region name label */}
              <text
                x={region.centroid[0]}
                y={region.centroid[1] - 6}
                textAnchor="middle"
                fontSize="6"
                fontWeight="600"
                fill={textColor}
                pointerEvents="none"
              >
                {region.nombre.toUpperCase()}
              </text>

              {/* Alert count */}
              {!region.disabled && count > 0 && (
                <text
                  x={region.centroid[0]}
                  y={region.centroid[1] + 6}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={textColor}
                  pointerEvents="none"
                >
                  {count}
                </text>
              )}

              {/* Mini progress bar */}
              {!region.disabled && count > 0 && (
                <g pointerEvents="none">
                  <rect
                    x={region.centroid[0] - 15}
                    y={region.centroid[1] + 10}
                    width="30"
                    height="3"
                    rx="1.5"
                    fill="rgba(0,0,0,0.15)"
                  />
                  <rect
                    x={region.centroid[0] - 15}
                    y={region.centroid[1] + 10}
                    width={30 * ratio}
                    height="3"
                    rx="1.5"
                    fill="rgba(255,255,255,0.7)"
                  />
                </g>
              )}

              {/* Pulsing dot — today activity */}
              {!region.disabled && stats.todayFuentes.includes(region.fuente) && (
                <g pointerEvents="none">
                  <circle
                    cx={region.centroid[0] + 18}
                    cy={region.centroid[1] - 18}
                    r="4"
                    fill="#fef08a"
                  />
                  <circle
                    cx={region.centroid[0] + 18}
                    cy={region.centroid[1] - 18}
                    r="4"
                    fill="#fef08a"
                    opacity="0.5"
                  >
                    <animate attributeName="r" from="4" to="9" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {selectedFuentes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {selectedFuentes.map(fuente => {
            const region = REGIONES.find(r => r.fuente === fuente)
            const label = fuente === 'BOE' ? 'España (BOE)' : (region?.nombre ?? fuente)
            return (
              <span
                key={fuente}
                className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full"
              >
                {label}
                <button
                  onClick={() => toggleFuente(fuente)}
                  className="hover:text-sky-900 leading-none"
                  aria-label={`Quitar ${label}`}
                >
                  ×
                </button>
              </span>
            )
          })}
          <button
            onClick={() => updateFuentes([])}
            className="text-xs text-slate-400 hover:text-slate-600 px-1"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}

export function MapaEspaña({ stats }: { stats: MapStats }) {
  return (
    <Suspense fallback={<div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 h-48 animate-pulse" />}>
      <MapaEspañaInner stats={stats} />
    </Suspense>
  )
}
