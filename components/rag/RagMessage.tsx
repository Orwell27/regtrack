'use client'

import type { RagMessage } from './types'

interface Props {
  message: RagMessage
}

export function RagMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
        }`}
      >
        <span
          dangerouslySetInnerHTML={{ __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
        {message.isStreaming && (
          <span className="inline-block w-1 h-3.5 ml-0.5 bg-current animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}
