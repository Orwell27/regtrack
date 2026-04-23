'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { REGIONES } from '@/lib/spain-ccaa-paths'

export function MapaEspaña() {
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
    router.push(`${pathname}?${params.toString()}`)
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

  // viewBox from lib/spain-ccaa-paths.ts — "0 0 613 544"
  const VIEWBOX = '0 0 613 544'

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
          const isSelected = selectedFuentes.includes(region.fuente)
          return (
            <path
              key={region.id}
              d={region.path}
              role={region.disabled ? undefined : 'button'}
              aria-label={region.nombre}
              aria-pressed={region.disabled ? undefined : isSelected}
              tabIndex={region.disabled ? -1 : 0}
              onClick={() => !region.disabled && toggleFuente(region.fuente)}
              onKeyDown={e => {
                if (!region.disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  toggleFuente(region.fuente)
                }
              }}
              strokeWidth="1"
              className={[
                'transition-colors',
                region.disabled
                  ? 'fill-slate-100 stroke-slate-200 cursor-not-allowed'
                  : isSelected
                  ? 'fill-sky-400 stroke-sky-600 cursor-pointer'
                  : 'fill-slate-200 stroke-slate-400 cursor-pointer hover:fill-slate-300',
              ].join(' ')}
            >
              <title>
                {region.disabled
                  ? `${region.nombre} — Próximamente`
                  : region.nombre}
              </title>
            </path>
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
