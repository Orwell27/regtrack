'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Alerta } from '@/lib/supabase'
import { CardNormativaRelacionada } from '@/components/admin/CardNormativaRelacionada'

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

const BORDER_STYLE: Record<string, string> = {
  alta: 'border-l-red-400',
  media: 'border-l-amber-400',
  baja: 'border-l-emerald-400',
}

type Estado = 'pendiente_revision' | 'aprobada' | 'descartada' | 'enviada'

export function AlertaRow({ alerta }: { alerta: Alerta }) {
  const [estado, setEstado] = useState<Estado>(alerta.estado)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAccion(accion: 'aprobar' | 'descartar' | 'enviar') {
    setLoading(accion)
    setError(null)
    try {
      if (accion === 'enviar') {
        const res = await fetch(`/api/alertas/${alerta.id}/enviar`, { method: 'POST' })
        if (res.ok) {
          setEstado('enviada')
        } else {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? `Error ${res.status}`)
        }
      } else {
        const res = await fetch(`/api/alertas/${alerta.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion }),
        })
        if (res.ok) {
          setEstado(accion === 'aprobar' ? 'aprobada' : 'descartada')
        } else {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? `Error ${res.status}`)
        }
      }
    } finally {
      setLoading(null)
    }
  }

  if (estado === 'enviada') {
    return (
      <div className="px-4 py-3 flex items-center gap-3 opacity-60">
        <span className="text-xs text-emerald-600 font-medium">✓ Enviada</span>
        <p className="text-sm text-slate-500 truncate flex-1">{alerta.titulo}</p>
      </div>
    )
  }

  if (estado === 'descartada') {
    return (
      <div className="px-4 py-3 flex items-center gap-3 opacity-50">
        <span className="text-xs text-slate-400 font-medium">✕ Descartada</span>
        <p className="text-sm text-slate-400 truncate flex-1">{alerta.titulo}</p>
      </div>
    )
  }

  return (
    <div className={`border-l-2 ${BORDER_STYLE[alerta.urgencia ?? 'baja']} bg-white rounded-lg p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-slate-900 text-sm leading-snug flex-1">{alerta.titulo}</h3>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCIA_STYLE[alerta.urgencia ?? 'baja']}`}>
            {alerta.urgencia}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.score_relevancia}/10
          </span>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-slate-500">
        <span>📰 {alerta.fuente}</span>
        <span>🏷️ {alerta.subtema}</span>
        <span>📍 {alerta.territorios?.join(', ')}</span>
      </div>

      <p className="text-xs text-slate-600 line-clamp-2">{alerta.resumen}</p>
      <p className="text-xs text-sky-700"><strong>Acción:</strong> {alerta.accion_recomendada}</p>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        {estado === 'pendiente_revision' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => handleAccion('aprobar')}
              disabled={!!loading}
            >
              {loading === 'aprobar' ? '...' : '✓ Aprobar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleAccion('descartar')}
              disabled={!!loading}
            >
              {loading === 'descartar' ? '...' : '✕ Descartar'}
            </Button>
          </>
        )}
        {estado === 'aprobada' && (
          <>
            <span className="text-xs text-emerald-600 font-medium self-center">✓ Aprobada</span>
            <Button
              size="sm"
              className="ml-auto bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => handleAccion('enviar')}
              disabled={!!loading}
            >
              {loading === 'enviar' ? 'Enviando...' : '→ Enviar ahora'}
            </Button>
          </>
        )}
      </div>

      {/* ── Normativa relacionada ── */}
      <CardNormativaRelacionada alertaId={alerta.id} />
    </div>
  )
}
