import OpenAI from 'openai'

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * Construye el texto que se embebe para una alerta.
 * Usa resumen + impacto (más semántico que el título, más corto que texto_alerta).
 */
export function buildEmbeddingText(resumen: string, impacto: string | null): string {
  const parts = [resumen, impacto].filter((p): p is string => Boolean(p))
  return parts.join(' ')
}

/**
 * Genera un embedding de 1536 dimensiones para el texto dado.
 * Usa text-embedding-3-small de OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getClient()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}
