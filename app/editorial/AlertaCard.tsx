'use client'
import { useState } from 'react'
import type { Alerta } from '@/lib/supabase'

const URGENCIA_COLOR: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-green-100 text-green-800',
}

export default function AlertaCard({ alerta }: { alerta: Alerta }) {
  const [estado, setEstado] = useState(alerta.estado)

  async function handleAccion(accion: 'aprobar' | 'descartar') {
    const res = await fetch(`/api/alertas/${alerta.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion }),
    })
    if (res.ok) {
      setEstado(accion === 'aprobar' ? 'aprobada' : 'descartada')
    }
  }

  if (estado !== 'pendiente_revision') {
    return (
      <div className="border rounded-lg p-4 opacity-50">
        <span className="text-sm text-gray-500">
          {estado === 'aprobada' ? '✅ Aprobada' : '❌ Descartada'}
        </span>
        <p className="font-medium">{alerta.titulo}</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-lg">{alerta.titulo}</h2>
        <div className="flex gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${URGENCIA_COLOR[alerta.urgencia ?? 'baja']}`}>
            {alerta.urgencia}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
            {alerta.score_relevancia}/10
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-600 grid grid-cols-3 gap-2">
        <span>📰 {alerta.fuente}</span>
        <span>🏷️ {alerta.subtema}</span>
        <span>📍 {alerta.territorios?.join(', ')}</span>
      </div>

      <p className="text-sm">{alerta.resumen}</p>
      <p className="text-sm text-gray-700"><strong>Impacto:</strong> {alerta.impacto}</p>
      <p className="text-sm text-blue-700"><strong>Acción:</strong> {alerta.accion_recomendada}</p>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleAccion('aprobar')}
          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium"
        >
          ✅ Aprobar
        </button>
        <button
          onClick={() => handleAccion('descartar')}
          className="flex-1 bg-red-100 text-red-700 py-2 rounded hover:bg-red-200 font-medium"
        >
          ❌ Descartar
        </button>
      </div>
    </div>
  )
}
