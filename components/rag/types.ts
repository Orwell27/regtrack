export type WidgetState = 'closed' | 'open'

export interface RagMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export interface AlertaSource {
  id: string
  titulo: string
  fuente: string
  similarity: number
}

export interface AlertaResult {
  id: string
  titulo: string
  resumen: string
  fuente: string
  subtema: string
  ambito: string
  score_relevancia: number
  urgencia: string
  territorios: unknown
  created_at: string
  similarity: number
}
