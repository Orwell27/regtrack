'use client'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

type Estado =
  | { tipo: 'reposo' }
  | { tipo: 'lanzando' }
  | { tipo: 'lanzado'; url: string }
  | { tipo: 'error'; mensaje: string }

export function BotonPipeline() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'reposo' })

  async function lanzar() {
    setEstado({ tipo: 'lanzando' })
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST' })
      const data = await res.json()
      setEstado(res.ok ? { tipo: 'lanzado', url: data.url } : { tipo: 'error', mensaje: data.error ?? 'No se pudo lanzar el pipeline' })
    } catch {
      setEstado({ tipo: 'error', mensaje: 'No se pudo lanzar el pipeline' })
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={lanzar}
        disabled={estado.tipo === 'lanzando'}
        className="text-sm border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 px-3 py-1.5 rounded-lg text-slate-600 transition-colors"
      >
        {estado.tipo === 'lanzando' ? 'Lanzando…' : '↻ Ejecutar pipeline'}
      </button>
      {estado.tipo === 'lanzado' && (
        <a href={estado.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">
          Pipeline lanzado en GitHub Actions. Ver ejecución<ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      )}
      {estado.tipo === 'error' && <p className="text-xs text-red-700 max-w-xs text-right">{estado.mensaje}</p>}
    </div>
  )
}
