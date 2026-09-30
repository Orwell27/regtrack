import { REGIONES } from '@/lib/regiones'

export type AlertFilters = { fuente?: string; urgencia?: string; page?: string; solo_intereses?: string; subcategoria?: string; q?: string }
const KEYS = ['fuente', 'urgencia', 'page', 'solo_intereses', 'subcategoria', 'q'] as const

export function parseAlertFilters(raw: Record<string, string | string[] | undefined>): AlertFilters {
  const params: AlertFilters = {}
  for (const key of KEYS) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) params[key] = value.trim()
  }
  const page = Number(params.page)
  params.page = String(Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1)
  if (!['alta', 'media', 'baja'].includes(params.urgencia ?? '')) delete params.urgencia
  const allowed = new Set(['BOE', ...REGIONES.filter(r => !r.disabled).map(r => r.fuente)])
  const fuentes = [...new Set(params.fuente?.split(',').filter(f => allowed.has(f)) ?? [])]
  params.fuente = fuentes.length ? fuentes.join(',') : undefined
  // Literal words only: never interpolate PostgREST expressions or user wildcards.
  params.q = params.q?.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || undefined
  return params
}

export function alertasHref(params: AlertFilters, changes: AlertFilters = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value && !(key === 'page' && value === '1')) query.set(key, value)
  }
  return `/alertas${query.size ? `?${query}` : ''}`
}

export function formatAlertDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha indicada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha indicada'
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' })
}

export function topicLabel(value: string | null | undefined) {
  return value ? value.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Normativa inmobiliaria'
}

export const URGENCY = {
  alta: { label: 'Urgencia alta', className: 'rt-urgency-high' },
  media: { label: 'Urgencia media', className: 'rt-urgency-medium' },
  baja: { label: 'Urgencia baja', className: 'rt-urgency-low' },
}
