import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCommunity } from '@/lib/community/pages'
import { communityExecute } from '@/lib/community/server'
import {
  CommunityError,
  CATEGORIES,
  formatDate,
  type TopicDetail,
} from '@/lib/community/model'
import { CommandForm } from '@/components/community/CommandForm'
import { Hidden, TopicFields, ReplyFields } from '@/components/community/Fields'
import { RegulationCard } from '@/components/community/RegulationCard'
export default async function Conversation({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { actor } = await requireCommunity(false, `/comunidad/preguntas/${id}`)
  const page = Math.max(
    0,
    Math.min(1000, Math.floor(Number((await searchParams).page) || 0)),
  )
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  let detail: TopicDetail
  try {
    detail = await communityExecute<TopicDetail>(actor, 'topic', { id, page })
  } catch (e) {
    if (e instanceof CommunityError && e.status === 404) notFound()
    throw e
  }
  const { topic, replies, member, moderator, following } = detail
  const own = member?.id === topic.author_id
  return (
    <>
      <Link href="/comunidad/preguntas" className="rc-back">
        ← Todas las conversaciones
      </Link>
      <div className="rc-detail-grid">
        <article>
          <p className="rc-eyebrow">{CATEGORIES[topic.category]}</p>
          <h1>{topic.title}</h1>
          {topic.hidden ? (
            <p className="rc-error">
              Conversación oculta a los miembros. Visible aquí solo para
              moderación.
            </p>
          ) : null}
          <div className="rc-meta">
            <span>{topic.alias}</span>
            <span>{topic.region}</span>
            {topic.municipality && <span>{topic.municipality}</span>}
            <span>{formatDate(topic.created_at)}</span>
            {topic.revision > 1 ? (
              <span>Editado · versión {topic.revision}</span>
            ) : null}
          </div>
          <p className="rc-body">{topic.body}</p>
          {topic.alert_id && (
            <>
              {topic.reference_changed && (
                <p className="rc-error">
                  La referencia normativa ha cambiado o ya no está disponible.
                  Las aportaciones anteriores necesitan contrastarse de nuevo.
                </p>
              )}
              {topic.regulation ? (
                <RegulationCard regulation={topic.regulation} compact />
              ) : (
                <p>
                  La alerta vinculada ya no está publicada. Consulta al equipo
                  antes de utilizar las conclusiones de esta conversación.
                </p>
              )}
              {topic.reference_changed && topic.reference_snapshot && (
                <details className="rc-details">
                  <summary>
                    Referencia conservada al iniciar la conversación (histórica)
                  </summary>
                  <p>{topic.reference_snapshot.title}</p>
                  <p>
                    Esta copia identifica el contexto original; no acredita la
                    situación actual.
                  </p>
                </details>
              )}
            </>
          )}
          {own ? (
            <details className="rc-details">
              <summary>Editar mi pregunta</summary>
              <CommandForm action="edit_topic" label="Guardar pregunta">
                <Hidden name="topic_id" value={id} />
                <Hidden name="revision" value={topic.revision} />
                <TopicFields topic={topic} />
              </CommandForm>
            </details>
          ) : null}
          {topic.outcome ? (
            <section className="rc-outcome">
              <p className="rc-eyebrow">EL AUTOR CUENTA EL RESULTADO</p>
              <h2>Cómo terminó</h2>
              <p className="rc-body">{topic.outcome}</p>
            </section>
          ) : null}
          <section className="rc-section">
            <h2>{detail.reply_count} aportaciones</h2>
            {replies.slice(0, 20).map((reply) => (
              <article
                key={reply.id}
                className={`rc-reply ${reply.hidden ? 'rc-muted' : ''}`}
              >
                <div className="rc-meta">
                  <strong>{reply.alias}</strong>
                  <span>{formatDate(reply.created_at)}</span>
                  <span>
                    {
                      {
                        experiencia: 'Experiencia personal',
                        fuente: 'Fuente consultada',
                        profesional: 'Profesional · vinculación autodeclarada',
                      }[reply.kind]
                    }
                  </span>
                  {reply.hidden ? <span>Oculta a los miembros</span> : null}
                  {reply.useful ? (
                    <span className="rc-pill">Ayudó al autor</span>
                  ) : null}
                </div>
                <p className="rc-body">{reply.body}</p>
                {reply.source_url ? (
                  <a
                    href={reply.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Consultar fuente ↗
                  </a>
                ) : null}
                {reply.affiliation ? (
                  <p className="rc-muted">Vinculación: {reply.affiliation}</p>
                ) : null}
                {own && reply.author_id !== member?.id && !reply.hidden ? (
                  <CommandForm
                    action="useful"
                    label={
                      reply.useful
                        ? 'Retirar marca de utilidad'
                        : 'Esta respuesta me ayudó'
                    }
                    className="rc-inline"
                  >
                    <Hidden name="topic_id" value={id} />
                    <Hidden name="id" value={reply.id} />
                    <Hidden name="enabled" value={!reply.useful} />
                  </CommandForm>
                ) : null}
                {member?.id === reply.author_id && !reply.hidden ? (
                  <details className="rc-details">
                    <summary>Editar mi respuesta</summary>
                    <CommandForm action="edit_reply">
                      <Hidden name="topic_id" value={id} />
                      <Hidden name="id" value={reply.id} />
                      <Hidden name="revision" value={reply.revision} />
                      <ReplyFields reply={reply} />
                    </CommandForm>
                  </details>
                ) : null}
                {member && !reply.hidden ? (
                  <details className="rc-details">
                    <summary>Avisar sobre esta respuesta</summary>
                    <CommandForm
                      action="report"
                      label="Enviar aviso"
                      success="Aviso recibido. El equipo lo revisará."
                    >
                      <Hidden name="topic_id" value={id} />
                      <Hidden name="reply_id" value={reply.id} />
                      <label>
                        Motivo
                        <textarea
                          name="reason"
                          minLength={8}
                          maxLength={1000}
                          required
                        />
                      </label>
                    </CommandForm>
                  </details>
                ) : null}
                {moderator ? (
                  <details className="rc-details">
                    <summary>Moderar respuesta</summary>
                    <CommandForm
                      action="moderate"
                      label={
                        reply.hidden
                          ? 'Restaurar respuesta'
                          : 'Ocultar respuesta'
                      }
                    >
                      <Hidden name="topic_id" value={id} />
                      <Hidden name="reply_id" value={reply.id} />
                      <Hidden name="hidden" value={!reply.hidden} />
                      <label>
                        Motivo
                        <input
                          name="reason"
                          minLength={3}
                          maxLength={1000}
                          required
                        />
                      </label>
                    </CommandForm>
                  </details>
                ) : null}
              </article>
            ))}
            <nav className="rc-pagination" aria-label="Páginas de respuestas">
              {page > 0 ? (
                <Link href={`?page=${page - 1}`}>← Anteriores</Link>
              ) : null}
              {replies.length > 20 ? (
                <Link href={`?page=${page + 1}`}>Siguientes →</Link>
              ) : null}
            </nav>
          </section>
          {member ? (
            <section className="rc-card">
              <h2>Comparte lo que sabes</h2>
              <p>
                Una experiencia ayuda más cuando explica también sus límites.
              </p>
              <CommandForm action="reply" label="Publicar respuesta" reset>
                <Hidden name="topic_id" value={id} />
                <ReplyFields />
              </CommandForm>
            </section>
          ) : null}
        </article>
        <aside className="rc-detail-aside">
          <div className="rc-card">
            <h2>Cuida esta conversación</h2>
            <p>
              Las experiencias se refieren a una situación concreta. Contrasta
              lo que pueda cambiar según tu territorio.
            </p>
            {member ? (
              <>
                <CommandForm
                  action="follow"
                  label={following ? 'Dejar de seguir' : 'Seguir conversación'}
                >
                  <Hidden name="topic_id" value={id} />
                  <Hidden name="enabled" value={!following} />
                </CommandForm>
                {following ? (
                  <CommandForm action="seen" label="Marcar como leída">
                    <Hidden name="topic_id" value={id} />
                  </CommandForm>
                ) : null}
              </>
            ) : null}
            <Link href="/comunidad/normas">Cómo participamos →</Link>
          </div>
          {own ? (
            <div className="rc-card">
              <h2>Cierra el círculo</h2>
              <CommandForm action="outcome" label="Compartir resultado">
                <Hidden name="topic_id" value={id} />
                <label>
                  ¿Qué decidiste y qué ocurrió?
                  <textarea
                    name="outcome"
                    minLength={10}
                    maxLength={3000}
                    rows={4}
                    defaultValue={topic.outcome}
                    required
                  />
                </label>
              </CommandForm>
              <hr />
              <p>
                Permitir una ficha autoriza al equipo a resumir tu caso dentro
                de la comunidad, con revisión y atribución a tu alias. Puedes
                retirarlo.
              </p>
              <CommandForm
                action="consent"
                label={
                  topic.reuse_consent
                    ? 'Retirar permiso de reutilización'
                    : 'Permitir una ficha de mi caso'
                }
              >
                <Hidden name="topic_id" value={id} />
                <Hidden name="enabled" value={!topic.reuse_consent} />
              </CommandForm>
            </div>
          ) : null}
          {member ? (
            <details className="rc-card">
              <summary>Avisar sobre la pregunta</summary>
              <CommandForm action="report" label="Enviar aviso">
                <Hidden name="topic_id" value={id} />
                <label>
                  Motivo
                  <textarea
                    name="reason"
                    minLength={8}
                    maxLength={1000}
                    required
                  />
                </label>
              </CommandForm>
            </details>
          ) : null}
          {moderator ? (
            <div className="rc-card">
              <h2>Moderación</h2>
              <CommandForm
                action="moderate"
                label={
                  topic.hidden
                    ? 'Restaurar conversación'
                    : 'Ocultar conversación'
                }
              >
                <Hidden name="topic_id" value={id} />
                <Hidden name="hidden" value={!topic.hidden} />
                <label>
                  Motivo
                  <input
                    name="reason"
                    minLength={3}
                    maxLength={1000}
                    required
                  />
                </label>
              </CommandForm>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  )
}
