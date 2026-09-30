export function madridDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function dateRange(from: string, to: string): string[] {
  for (const value of [from, to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) {
      throw new Error(`Fecha inválida: ${value}`)
    }
  }
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000
  if (days < 0 || days > 30) throw new Error('El intervalo debe contener entre 1 y 31 días; dividir recuperaciones mayores')
  return Array.from({ length: days + 1 }, (_, i) => new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10))
}

export function scanDates(args: string[], now = new Date()): string[] {
  const from = args.indexOf('--from')
  const to = args.indexOf('--to')
  if (from !== -1 || to !== -1) {
    if (from === -1 || to === -1) throw new Error('Indicar --from y --to juntos')
    return dateRange(args[from + 1] ?? '', args[to + 1] ?? '')
  }
  // Ventana solapada: permite recuperar una ejecución perdida sin saltarse el sábado.
  const end = madridDate(now)
  const start = new Date(Date.parse(end) - 2 * 86_400_000).toISOString().slice(0, 10)
  return dateRange(start, end)
}
