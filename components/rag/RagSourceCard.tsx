'use client'

import type { AlertaSource } from './types'

interface Props {
  source: AlertaSource
}

const FUENTE_COLORS: Record<string, string> = {
  BOE: 'bg-blue-100 text-blue-800',
  BOCM: 'bg-purple-100 text-purple-800',
  DOGC: 'bg-green-100 text-green-800',
  DEFAULT: 'bg-slate-100 text-slate-700',
}

export function RagSourceCard({ source }: Props) {
  const colorClass = FUENTE_COLORS[source.fuente] ?? FUENTE_COLORS.DEFAULT
  const pct = Math.round(source.similarity * 100)

  return (
    <a
      href={`/alerta/${source.id}`}
      className="block rounded-lg border border-slate-200 p-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
          {source.fuente}
        </span>
        <span className="text-xs text-slate-400">{pct}% relevante</span>
      </div>
      <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{source.titulo}</p>
    </a>
  )
}
