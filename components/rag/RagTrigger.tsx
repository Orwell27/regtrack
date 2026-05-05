'use client'

interface Props {
  onClick: () => void
}

export function RagTrigger({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Buscar normativa"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  )
}
