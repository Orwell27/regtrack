// app/(admin)/admin/sectores/SectoresClient.tsx
'use client'
import { useState } from 'react'

type Subcategoria = { id: number; slug: string; nombre: string; activo: boolean }
type Sector = { id: number; nombre: string; slug: string; subcategorias: Subcategoria[] }

export function SectoresClient({ sectores: initial }: { sectores: Sector[] }) {
  const [sectores, setSectores] = useState(initial)
  const [toggling, setToggling] = useState<number | null>(null)

  async function toggleSubcategoria(subcatId: number, activo: boolean) {
    setToggling(subcatId)
    // Apply optimistically before the request
    setSectores(prev =>
      prev.map(sector => ({
        ...sector,
        subcategorias: sector.subcategorias.map(s =>
          s.id === subcatId ? { ...s, activo } : s
        ),
      }))
    )
    const res = await fetch(`/api/admin/subcategorias/${subcatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    })
    if (!res.ok) {
      // Roll back on failure
      setSectores(prev =>
        prev.map(sector => ({
          ...sector,
          subcategorias: sector.subcategorias.map(s =>
            s.id === subcatId ? { ...s, activo: !activo } : s
          ),
        }))
      )
    }
    setToggling(null)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Sectores y subcategorías</h1>
      <div className="space-y-6">
        {sectores.map(sector => (
          <div key={sector.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-700">{sector.nombre}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {sector.subcategorias.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-slate-800">{sub.nombre}</p>
                    <p className="text-xs text-slate-400 font-mono">{sub.slug}</p>
                  </div>
                  <button
                    disabled={toggling === sub.id}
                    onClick={() => toggleSubcategoria(sub.id, !sub.activo)}
                    aria-label={sub.activo ? 'Desactivar' : 'Activar'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      sub.activo ? 'bg-sky-500' : 'bg-slate-200'
                    } ${toggling === sub.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        sub.activo ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
