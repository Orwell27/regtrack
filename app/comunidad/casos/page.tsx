import Link from 'next/link'
import { requireCommunity } from '@/lib/community/pages'
import { communityExecute } from '@/lib/community/server'
import { type Snapshot, formatDate } from '@/lib/community/model'
import { RegulationCard } from '@/components/community/RegulationCard'
export default async function Cases({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const member = await requireCommunity()
  const page = Math.max(
    0,
    Math.min(1000, Math.floor(Number((await searchParams).page) || 0)),
  )
  const data = await communityExecute<Snapshot>(member.actor, 'read', { page })
  return (
    <>
      <p className="rc-eyebrow">LA MEMORIA DEL GRUPO</p>
      <h1>
        Lo que aprendimos
        <br />
        puede servirte después.
      </h1>
      <p className="rc-lead">
        Casos compartidos con permiso, revisados por el equipo y con sus límites
        visibles.
      </p>
      <div className="rc-case-grid">
        {data.resources?.length ? (
          data.resources.slice(0, 20).map((r) => (
            <article key={r.id} className="rc-card">
              <p className="rc-eyebrow">
                {r.region}
                {r.municipality ? ` · ${r.municipality}` : ''} · Revisión:{' '}
                {formatDate(r.reviewed_at)}
              </p>
              <h2>{r.title}</h2>
              <p className="rc-muted">A partir del caso de {r.alias}</p>
              {r.needs_review ? (
                <p className="rc-error">
                  Pendiente de nueva revisión: la referencia normativa ha
                  cambiado o se ha retirado. Las conclusiones quedan ocultas
                  hasta que el equipo las contraste.
                </p>
              ) : (
                <p className="rc-body">{r.body}</p>
              )}
              {r.regulation && (
                <RegulationCard regulation={r.regulation} compact />
              )}
              <div className="rc-outcome">
                <strong>Alcance de la revisión</strong>
                <p>{r.scope}</p>
              </div>
              {r.source_url ? (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  Fuente consultada ↗
                </a>
              ) : null}
              <Link href={`/comunidad/preguntas/${r.topic_id}`}>
                Ver el caso original →
              </Link>
            </article>
          ))
        ) : (
          <div className="rc-empty">
            <h2>Los primeros aprendizajes se están por escribir</h2>
            <p>
              Cuando un miembro permita resumir su caso y el equipo lo revise,
              aparecerá aquí. Cada ficha partirá de una experiencia real.
            </p>
            <Link href="/comunidad/preguntas">Explorar conversaciones →</Link>
          </div>
        )}
      </div>
      <nav className="rc-pagination" aria-label="Páginas de aprendizajes">
        {page > 0 ? <Link href={`?page=${page - 1}`}>← Anteriores</Link> : null}
        {(data.resources?.length ?? 0) > 20 ? (
          <Link href={`?page=${page + 1}`}>Siguientes →</Link>
        ) : null}
      </nav>
    </>
  )
}
