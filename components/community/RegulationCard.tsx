import Link from 'next/link'
import type { Regulation } from '@/lib/community/model'

export function sourceLink(value: string) {
  try {
    const u = new URL(value)
    return ['https:', 'http:'].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : null
  } catch {
    return null
  }
}
const scopeNames = {
  estatal: 'Estatal',
  ccaa: 'Autonómico',
  municipal: 'Municipal',
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(value))
    : 'No consta en la alerta'
}
export function RegulationCard({
  regulation: r,
  compact = false,
}: {
  regulation: Regulation
  compact?: boolean
}) {
  const url = sourceLink(r.url)
  return (
    <section className="rc-card rc-regulation">
      <p className="rc-eyebrow">REFERENCIA NORMATIVA · {r.source}</p>
      <h2>
        <Link href={`/comunidad/novedades/${r.id}`}>{r.title}</Link>
      </h2>
      <div className="rc-meta">
        <span>{r.scope ? scopeNames[r.scope] : 'Ámbito sin precisar'}</span>
        <span>
          {r.territories.length
            ? r.territories.join(' · ')
            : 'Territorios sin precisar'}
        </span>
      </div>
      <dl>
        <dt>Publicación</dt>
        <dd>{date(r.published_on)}</dd>
        <dt>Entrada en vigor registrada</dt>
        <dd>{date(r.effective_on)}</dd>
      </dl>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Consultar publicación oficial ↗
        </a>
      ) : (
        <p>El enlace a la publicación necesita revisión.</p>
      )}
      {!compact && (
        <>
          <h3>Explicación de RegTrack</h3>
          <p className="rc-body">
            {r.summary || 'Todavía no hay un resumen disponible.'}
          </p>
          {r.impact && (
            <>
              <h3>Qué puede cambiar</h3>
              <p className="rc-body">{r.impact}</p>
            </>
          )}
          {!!r.affected.length && (
            <>
              <h3>Perfiles señalados en la alerta</h3>
              <p>{r.affected.join(' · ')}</p>
            </>
          )}
          {r.action && (
            <>
              <h3>Qué conviene comprobar</h3>
              <p className="rc-body">{r.action}</p>
            </>
          )}
          {r.modifies && (
            <p className="rc-body">
              Relación indicada con otras normas: {r.modifies}
            </p>
          )}
          {!!r.related.length && (
            <>
              <h3>Otras publicaciones relacionadas</h3>
              <p>
                Una relación detectada no determina por sí sola qué norma se
                aplica a tu caso.
              </p>
              <ul>
                {r.related.map((a, i) => (
                  <li key={`${a.id}-${i}`}>
                    <Link href={`/comunidad/novedades/${a.id}`}>{a.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <p className="rc-muted">
        La explicación de RegTrack orienta la lectura. Comprueba el texto
        oficial, sus condiciones y las reglas aplicables a tu territorio. La
        fecha registrada no acredita por sí sola la vigencia actual ni resuelve
        tu caso.
      </p>
    </section>
  )
}
