'use client'

const SUGGESTIONS = [
  '¿Qué novedades hay en arrendamiento urbano este mes?',
  'Normativa reciente sobre obra nueva en Cataluña',
  'Cambios en comunidades de propietarios 2026',
]

interface Props {
  onSuggestion: (text: string) => void
}

export function RagEmptyState({ onSuggestion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-900 mb-1">Busca normativa</p>
      <p className="text-xs text-slate-500 mb-4">
        Pregunta sobre regulación inmobiliaria o busca alertas por tema
      </p>
      <div className="w-full space-y-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="w-full text-left text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
