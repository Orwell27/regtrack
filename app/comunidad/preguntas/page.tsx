import Link from 'next/link'
import { requireCommunity } from '@/lib/community/pages'
import { communityExecute } from '@/lib/community/server'
import {
  CATEGORIES,
  REGIONS,
  formatDate,
  type Snapshot,
} from '@/lib/community/model'
export default async function Conversations({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const member = await requireCommunity()
  const query = await searchParams
  const page = Math.min(1000, Math.max(0, Math.floor(Number(query.page) || 0)))
  const data = await communityExecute<Snapshot>(member.actor, 'read', {
    q: (query.q ?? '').slice(0, 100),
    category: query.category ?? '',
    region: query.region ?? '',
    following: query.following ?? '',
    alert_id: query.alert_id ?? '',
    page,
  })
  const items = (data.topics ?? []).slice(0, 20)
  const pageLink = (p: number) =>
    `/comunidad/preguntas?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)), page: String(p) })}`
  return (
    <>
      <div className="rc-page-title">
        <div>
          <p className="rc-eyebrow">CONVERSACIONES ENTRE PROPIETARIOS</p>
          <h1>
            Una duda compartida.
            <br />
            Más caminos posibles.
          </h1>
        </div>
        {member.member ? (
          <Link href="/comunidad/preguntas/nueva" className="rc-button">
            Plantear una pregunta
          </Link>
        ) : null}
      </div>
      <form className="rc-card rc-filters" action="/comunidad/preguntas">
        {query.alert_id && (
          <input type="hidden" name="alert_id" value={query.alert_id} />
        )}
        <label>
          Buscar
          <input
            name="q"
            defaultValue={query.q}
            maxLength={100}
            placeholder="¿Qué necesitas resolver?"
          />
        </label>
        <label>
          Tema
          <select name="category" defaultValue={query.category ?? ''}>
            <option value="">Todos los temas</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Territorio
          <select name="region" defaultValue={query.region ?? ''}>
            <option value="">Toda España</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="rc-checkbox">
          <input
            name="following"
            type="checkbox"
            value="true"
            defaultChecked={query.following === 'true'}
          />
          Solo lo que sigo
        </label>
        <button className="rc-button">Filtrar</button>
      </form>
      <div className="rc-list">
        {query.alert_id && (
          <p>
            Conversaciones vinculadas a una norma.{' '}
            <Link
              href={`/comunidad/novedades/${encodeURIComponent(query.alert_id)}`}
            >
              Volver a la referencia
            </Link>{' '}
            · <Link href="/comunidad/preguntas">Quitar filtro</Link>
          </p>
        )}
        {items.length ? (
          items.map((t) => (
            <article key={t.id} className="rc-conversation">
              <div>
                <span className="rc-eyebrow">{CATEGORIES[t.category]}</span>
                {t.unread ? (
                  <span className="rc-pill">Nuevas respuestas</span>
                ) : null}
                <h2>
                  <Link href={`/comunidad/preguntas/${t.id}`}>{t.title}</Link>
                </h2>
                <p className="rc-excerpt">{t.body}</p>
                <div className="rc-meta">
                  <span>{t.alias}</span>
                  <span>{t.region}</span>
                  {t.municipality && <span>{t.municipality}</span>}
                  {t.alert_id && (
                    <Link href={`/comunidad/novedades/${t.alert_id}`}>
                      Con referencia normativa
                    </Link>
                  )}
                  <span>{formatDate(t.created_at)}</span>
                  {t.outcome ? <span>Con resultado</span> : null}
                </div>
              </div>
              <aside>
                <strong>{t.replies}</strong>
                <span>{t.replies === 1 ? 'respuesta' : 'respuestas'}</span>
                <Link href={`/comunidad/preguntas/${t.id}`}>
                  Leer conversación →
                </Link>
              </aside>
            </article>
          ))
        ) : (
          <div className="rc-empty">
            <h2>
              {query.q || query.category || query.region || query.following
                ? 'No hay conversaciones con estos filtros'
                : 'La primera conversación puede ser la tuya'}
            </h2>
            <p>
              Una situación concreta es un buen punto de partida. Aquí
              aparecerán las preguntas reales del grupo.
            </p>
            <Link href="/comunidad/preguntas/nueva">
              Plantear una pregunta →
            </Link>
          </div>
        )}
      </div>
      <nav className="rc-pagination" aria-label="Páginas">
        {page > 0 ? (
          <Link href={pageLink(page - 1)}>← Anterior</Link>
        ) : (
          <span />
        )}
        <span>Página {page + 1}</span>
        {(data.topics?.length ?? 0) > 20 ? (
          <Link href={pageLink(page + 1)}>Siguiente →</Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  )
}
