'use client'

import { useState, useRef } from 'react'

interface Props {
  alertaId: string
}

export function AsistenteAlerta({ alertaId }: Props) {
  const [pregunta, setPregunta] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [cargando, setCargando] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pregunta.trim() || cargando) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setRespuesta('')
    setCargando(true)

    try {
      const res = await fetch(`/api/alertas/${alertaId}/asistente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setRespuesta('Error al consultar al asistente.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setRespuesta(prev => prev + decoder.decode(value))
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setRespuesta('Error de conexión.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Asistente IA</h3>
      <p className="text-xs text-gray-500 mb-4">
        Consulta sobre esta norma — cumplimiento, plazos, documentación requerida.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={pregunta}
          onChange={e => setPregunta(e.target.value)}
          placeholder="¿Qué documentación necesito preparar? ¿Me afecta si soy promotor en Madrid?"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <button
          type="submit"
          disabled={!pregunta.trim() || cargando}
          className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cargando ? 'Consultando…' : 'Consultar'}
        </button>
      </form>
      {respuesta && (
        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {respuesta}
        </div>
      )}
    </div>
  )
}
