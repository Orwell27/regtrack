'use client'

import { useState, useCallback } from 'react'
import type { WidgetState, RagMessage, AlertaSource } from './types'
import { RagTrigger } from './RagTrigger'
import { RagPanel } from './RagPanel'

export function RagWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>('closed')
  const [messages, setMessages] = useState<RagMessage[]>([])
  const [sources, setSources] = useState<AlertaSource[]>([])
  const [isLoading, setIsLoading] = useState(false)

  function open() {
    setWidgetState('open')
  }

  function close() {
    setWidgetState('closed')
    setMessages([])
    setSources([])
  }

  const handleQuery = useCallback(async (query: string) => {
    if (isLoading) return

    setWidgetState('open')
    setIsLoading(true)

    // Añadir mensaje del usuario
    const userMsg: RagMessage = { role: 'user', content: query }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    // Placeholder de respuesta con streaming
    const assistantMsg: RagMessage = { role: 'assistant', content: '', isStreaming: true }
    setMessages([...newMessages, assistantMsg])

    try {
      const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const event = JSON.parse(data)
            if (event.type === 'text') {
              fullText += event.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText, isStreaming: true }
                return updated
              })
            } else if (event.type === 'sources') {
              setSources(event.sources)
            } else if (event.type === 'error') {
              fullText = 'Lo siento, ha ocurrido un error al generar la respuesta.'
            }
          } catch { /* JSON malformado, ignorar */ }
        }
      }

      // Finalizar streaming
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: fullText || 'Sin respuesta.', isStreaming: false }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Lo siento, no he podido conectar con el servidor. Inténtalo de nuevo.',
          isStreaming: false,
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  if (widgetState === 'closed') {
    return <RagTrigger onClick={open} />
  }

  return (
    <>
      <RagTrigger onClick={close} />
      <RagPanel
        messages={messages}
        sources={sources}
        isLoading={isLoading}
        onQuery={handleQuery}
        onClose={close}
      />
    </>
  )
}
