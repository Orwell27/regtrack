export const REGIONS = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Illes Balears',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Comunitat Valenciana',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Comunidad de Madrid',
  'Región de Murcia',
  'Navarra',
  'País Vasco',
  'Ceuta',
  'Melilla',
  'Varias zonas',
  'Prefiero no indicarlo',
] as const
export const CATEGORIES = {
  cuidar: 'Cuidar y reformar',
  alquilar: 'Alquilar y gestionar',
  convivir: 'Convivir',
  decidir: 'Decidir sobre el patrimonio',
} as const
export const OWNER_KINDS = [
  'Vivienda habitual',
  'Vivienda alquilada',
  'Segunda residencia',
  'Vivienda turística',
  'Local u otro inmueble',
  'Varias situaciones',
] as const
export type Category = keyof typeof CATEGORIES
export type Member = { id: string; alias: string }
export type Regulation = {
  id: string
  version: string
  title: string
  url: string
  source: string
  scope: 'estatal' | 'ccaa' | 'municipal' | null
  territories: string[]
  published_on: string | null
  effective_on: string | null
  summary: string | null
  impact: string | null
  affected: string[]
  action: string | null
  modifies: string | null
  related: { id: string; title: string; url: string; relation: string }[]
}
export type Application = Member & {
  email: string
  region: string
  owner_kind: string
  need: string
  status: 'pending' | 'approved' | 'revoked'
  created_at: string
  activated_at: string | null
  last_seen_at: string | null
}
export type Topic = {
  alert_id: string | null
  municipality: string
  reference_snapshot: Regulation | null
  regulation?: Regulation | null
  reference_changed?: boolean
  id: string
  author_id: string
  alias: string
  title: string
  body: string
  category: Category
  region: string
  outcome: string
  reuse_consent: boolean
  hidden: boolean
  created_at: string
  updated_at: string
  revision: number
  replies: number
  following: boolean
  unread: boolean
}
export type Reply = {
  id: string
  author_id: string
  alias: string
  body: string
  kind: 'experiencia' | 'fuente' | 'profesional'
  source_url: string
  affiliation: string
  useful: boolean
  hidden: boolean
  created_at: string
  revision: number
}
export type Resource = {
  regulation?: Regulation | null
  municipality: string
  needs_review: boolean
  id: string
  topic_id: string
  title: string
  body: string
  scope: string
  source_url: string
  reviewed_at: string
  region: string
  alias: string
}
export type Pilot = {
  started_on: string | null
  owner_name: string
  weekly_hours: number
}
export type Snapshot = {
  status: 'visitor' | 'none' | 'pending' | 'approved' | 'revoked'
  moderator: boolean
  member: Member | null
  topics?: Topic[]
  resources?: Resource[]
  page?: number
  pilot?: Pilot
}
export type TopicDetail = {
  topic: Topic
  replies: Reply[]
  member: Member | null
  moderator: boolean
  following: boolean
  reply_page: number
  reply_count: number
}
export type AdminSnapshot = {
  members: Application[]
  member_count: number
  hidden: { id: string; title: string }[]
  reports: {
    id: string
    topic_id: string
    reply_id: string | null
    reason: string
    created_at: string
  }[]
  review: (Pick<
    Topic,
    'id' | 'title' | 'body' | 'outcome' | 'region' | 'revision' | 'alias'
  > & {
    regulation?: Regulation | null
    alert_id?: string | null
    municipality?: string
  })[]
  pilot: Pilot
  metrics: {
    topics: number
    useful: number
    helpers: number
    unanswered: number
  }
  audit: {
    action: string
    target: string
    reason: string
    created_at: string
  }[]
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(value))
}
export function safeReturnPath(value: string | null) {
  return (value === '/registro' || value === '/comunidad' ||
    value?.startsWith('/comunidad/') ||
    value?.startsWith('/comunidad?')) &&
    !value.includes('\\') &&
    !value.startsWith('//')
    ? value
    : '/'
}

export class CommunityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function parseCommand(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new CommunityError(400, 'Revisa los datos del formulario.')
  const raw = input as Record<string, unknown>
  const action = String(raw.action ?? '')
  const p: Record<string, unknown> = {}
  const text = (key: string, min: number, max: number, optional = false) => {
    const value = typeof raw[key] === 'string' ? raw[key].trim() : ''
    if (
      (!optional || value !== '') &&
      (value.length < min || value.length > max)
    )
      throw new CommunityError(400, `Revisa el campo ${key}.`)
    p[key] = value
    return value
  }
  const id = (key: string) => {
    const v = text(key, 36, 36)
    if (!uuid.test(v)) throw new CommunityError(400, 'Identificador no válido.')
  }
  const choice = (key: string, values: readonly string[]) => {
    if (!values.includes(text(key, 1, 100)))
      throw new CommunityError(400, 'Selecciona una opción válida.')
  }
  const bool = (key: string) => {
    if (raw[key] !== true && raw[key] !== false)
      throw new CommunityError(400, 'Confirma la opción seleccionada.')
    p[key] = raw[key]
  }
  const revision = () => {
    if (!Number.isInteger(raw.revision) || Number(raw.revision) < 1)
      throw new CommunityError(400, 'Recarga la conversación.')
    p.revision = raw.revision
  }
  const url = () => {
    const v = text('source_url', 0, 1000, true)
    if (v) {
      try {
        const u = new URL(v)
        if (
          !['https:', 'http:'].includes(u.protocol) ||
          u.username ||
          u.password
        )
          throw 0
      } catch {
        throw new CommunityError(400, 'Utiliza un enlace http o https válido.')
      }
    }
  }
  const topicFields = () => {
    text('title', 8, 160)
    text('body', 20, 6000)
    choice('category', Object.keys(CATEGORIES))
    choice('region', REGIONS)
    text('municipality', 0, 120, true)
  }
  const replyFields = () => {
    text('body', 5, 4000)
    choice('kind', ['experiencia', 'fuente', 'profesional'])
    url()
    text('affiliation', 0, 160, true)
    if (p.kind === 'fuente' && !p.source_url)
      throw new CommunityError(400, 'Añade el enlace a la fuente.')
    if (p.kind === 'profesional' && String(p.affiliation).length < 3)
      throw new CommunityError(400, 'Indica tu vinculación profesional.')
  }
  if (action === 'apply') {
    const email = text('email', 3, 254).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new CommunityError(400, 'Revisa el correo electrónico.')
    p.email = email
    text('alias', 2, 60)
    choice('region', REGIONS)
    choice('owner_kind', OWNER_KINDS)
    text('need', 0, 1000, true)
    bool('consent')
    if (!p.consent)
      throw new CommunityError(
        400,
        'Confirma que quieres que te contactemos sobre el piloto.',
      )
    if (raw.website)
      throw new CommunityError(400, 'No se ha podido enviar la solicitud.')
    return { action, payload: p }
  }
  id('request_id')
  switch (action) {
    case 'purge':
      break
    case 'ask':
      topicFields()
      if (raw.alert_id) {
        id('alert_id')
        text('regulation_version', 32, 32)
      }
      break
    case 'reply':
      id('topic_id')
      replyFields()
      break
    case 'edit_reply':
      id('topic_id')
      id('id')
      revision()
      replyFields()
      break
    case 'edit_topic':
      id('topic_id')
      revision()
      topicFields()
      break
    case 'outcome':
      id('topic_id')
      text('outcome', 10, 3000)
      break
    case 'consent':
    case 'follow':
      id('topic_id')
      bool('enabled')
      break
    case 'seen':
      id('topic_id')
      break
    case 'useful':
      id('topic_id')
      id('id')
      bool('enabled')
      break
    case 'report':
      id('topic_id')
      if (raw.reply_id) id('reply_id')
      text('reason', 8, 1000)
      break
    case 'admit':
    case 'revoke':
    case 'resolve_report':
      id('id')
      text('reason', 3, 1000)
      break
    case 'moderate':
      id('topic_id')
      if (raw.reply_id) id('reply_id')
      bool('hidden')
      text('reason', 3, 1000)
      break
    case 'publish':
      id('topic_id')
      revision()
      text('title', 8, 160)
      text('body', 20, 6000)
      text('scope', 10, 1000)
      url()
      text('regulation_version', 0, 32, true)
      break
    case 'pilot': {
      const date = text('started_on', 0, 10, true)
      if (
        date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          Number.isNaN(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      )
        throw new CommunityError(400, 'Fecha no válida.')
      text('owner_name', 2, 80)
      if (
        !Number.isInteger(raw.weekly_hours) ||
        Number(raw.weekly_hours) < 1 ||
        Number(raw.weekly_hours) > 40
      )
        throw new CommunityError(400, 'Indica de 1 a 40 horas semanales.')
      p.weekly_hours = raw.weekly_hours
      break
    }
    default:
      throw new CommunityError(400, 'Acción no válida.')
  }
  return { action, payload: p }
}
