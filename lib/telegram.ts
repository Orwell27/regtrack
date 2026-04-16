const BASE = 'https://api.telegram.org'

type InlineButton = { text: string; url: string }
type InlineKeyboard = InlineButton[][]

export async function sendMessage(
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' | undefined = 'Markdown',
  inlineKeyboard?: InlineKeyboard
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
        ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
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
  ].join('\n')

  const keyboard: InlineKeyboard = [
    [{ text: '✏️ Revisar en editorial', url: `${appUrl}/admin/editorial` }],
  ]

  await sendMessage(chatId, text, 'Markdown', keyboard)
}

export async function notifyUsers(
  recipients: { telegramId: string; texto: string; alertaId: string; urlOficial: string }[]
) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://regtrack.vercel.app'

  const results = await Promise.allSettled(
    recipients.map(({ telegramId, texto, alertaId, urlOficial }) => {
      const keyboard: InlineKeyboard = [
        [
          { text: '📄 Ver alerta completa', url: `${appUrl}/alerta/${alertaId}` },
          { text: '📰 Doc oficial', url: urlOficial },
        ],
      ]
      return fetch(`${BASE}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: texto,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        }),
      })
    })
  )

  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) console.warn(`[telegram] ${failed}/${recipients.length} envíos fallaron`)
}
