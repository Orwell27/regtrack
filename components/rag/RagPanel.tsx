'use client'

import { useRef, useEffect, useState } from 'react'
import type { RagMessage, AlertaSource } from './types'
import { RagMessage as RagMessageBubble } from './RagMessage'
import { RagSourceCard } from './RagSourceCard'
import { RagEmptyState } from './RagEmptyState'
import { RagSearchBar } from './RagSearchBar'

interface Props {
  messages: RagMessage[]
  sources: AlertaSource[]
  isLoading: boolean
  onQuery: (query: string) => void
  onClose: () => void
}

export function RagPanel({ messages, sources, isLoading, onQuery, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed bottom-20 right-6 z-50 w-[420px] max-md:w-[calc(100vw-2rem)] max-md:right-4 h-[560px] max-md:h-[70dvh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-sm font-semibold text-slate-900">RegTrack IA</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Contenido principal */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <RagEmptyState onSuggestion={onQuery} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <RagMessageBubble key={i} message={msg} />
            ))}
          </>
        )}
      </div>

      {/* Fuentes colapsables (solo cuando hay fuentes) */}
      {sources.length > 0 && (
        <div className="border-t border-slate-100 shrink-0">
          <button
            onClick={() => setSourcesOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>Fuentes consultadas ({sources.length})</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sourcesOpen && (
            <div className="px-3 pb-2 space-y-1.5 max-h-36 overflow-y-auto">
              {sources.map(s => (
                <RagSourceCard key={s.id} source={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de input */}
      <RagSearchBar
        onSubmit={onQuery}
        isLoading={isLoading}
        autoFocus
      />
    </div>
  )
}
