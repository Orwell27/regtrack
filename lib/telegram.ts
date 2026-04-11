const BASE = 'https://api.telegram.org'

export async function sendMessage(
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' | undefined = 'Markdown'
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado')

  try {
    const res = await fetch(`${BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`Telegram sendMessage error ${res.status}: ${body}`)
    }
  } catch (err) {
    console.error(`Telegram fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function notifyEditorial(titulo: string, score: number, alertaId: string): Promise<void> {
  const chatId = process.env.TELEGRAM_EDITORIAL_CHAT_ID
  if (!chatId) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://regtrack.vercel.app'
  const text = [
    `📋 *Nueva alerta pendiente de revisión*`,
    ``,
    `*${titulo}*`,
    `Score: ${score}/10`,
    ``,
    `→ Revisar: ${appUrl}/editorial`,
  ].join('\n')

  await sendMessage(chatId, text)
}
