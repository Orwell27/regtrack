'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { REGIONES } from '@/lib/regiones'

const ENABLED = REGIONES.filter(r => !r.disabled).sort((a, b) =>
  a.nombre.localeCompare(b.nombre, 'es')
)
const DISABLED = REGIONES.filter(r => r.disabled).sort((a, b) =>
  a.nombre.localeCompare(b.nombre, 'es')
)

function FiltroRegionesInner() {
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
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Filtrar por región
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleFuente('BOE')}
          aria-pressed={isBoeSelected}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            isBoeSelected
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🇪🇸 España (BOE)
        </button>

        {ENABLED.map(region => {
          const isSelected = selectedFuentes.includes(region.fuente)
          return (
            <button
              key={region.id}
              onClick={() => toggleFuente(region.fuente)}
              aria-pressed={isSelected}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {region.nombre}
            </button>
          )
        })}

        {DISABLED.map(region => (
          <button
            key={region.id}
            disabled
            title="Próximamente"
            className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-300 cursor-not-allowed"
          >
            {region.nombre}
          </button>
        ))}
      </div>

      {selectedFuentes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
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

export function FiltroRegiones() {
  return (
    <Suspense fallback={<div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 h-24 animate-pulse" />}>
      <FiltroRegionesInner />
    </Suspense>
  )
}
