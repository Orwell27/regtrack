import Link from 'next/link'
import { requireCommunity } from '@/lib/community/pages'
import { communityExecute } from '@/lib/community/server'
import { type AdminSnapshot, formatDate } from '@/lib/community/model'
import { CommandForm } from '@/components/community/CommandForm'
import { Hidden } from '@/components/community/Fields'

import { RegulationCard } from '@/components/community/RegulationCard'

const weeks = [
  [
    'Preparación',
    'Reunir las primeras 12–15 personas de distintas zonas. Conversar con cada una, conocer su necesidad y confirmar quién atenderá el piloto.',
  ],
  [
    'Semana 1 · Llegar',
    'Dar la bienvenida personalmente. Ayudar a cada participante a plantear una duda concreta o compartir una experiencia.',
  ],
  [
    'Semana 2 · Responder',
    'Revisar cada día las preguntas sin respuesta. Invitar a aportar solo a quien tenga una experiencia relacionada.',
  ],
  [
    'Semana 3 · Conectar',
    'Poner en común situaciones parecidas de distintos territorios y explicar qué cambia según el contexto.',
  ],
  [
    'Semana 4 · Cerrar el círculo',
    'Pedir a los autores que cuenten qué decidieron y qué ocurrió. Marcar las respuestas que les ayudaron.',
  ],
  [
    'Semana 5 · Conservar',
    'Proponer fichas a partir de los resultados. Pedir permiso, resumir sin datos personales y revisar ámbito y fuentes.',
  ],
  [
    'Semana 6 · Decidir',
    'Entrevistar a participantes, revisar la ayuda entre miembros y decidir si mantener, ampliar o ajustar el grupo.',
  ],
]
export default async function CommunityAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { actor } = await requireCommunity(true)
  const query = await searchParams
  const page = Math.max(0, Math.min(1000, Math.floor(Number(query.page) || 0)))
  const status = ['pending', 'approved', 'revoked'].includes(query.status ?? '')
    ? query.status!
    : ''
  const data = await communityExecute<AdminSnapshot>(actor, 'admin', {
    page,
    status,
  })
  return (
    <>
      <p className="rc-eyebrow">MESA DE COMUNIDAD · SOLO EQUIPO</p>
      <h1>
        Un grupo cuidado,
        <br />
        <em>paso a paso.</em>
      </h1>
      <p className="rc-lead">
        Solicitudes, conversaciones y aprendizajes en un mismo lugar. Los datos
        corresponden a actividad real; las metas del piloto son hipótesis de
        trabajo.
      </p>
      <nav className="rc-admin-nav" aria-label="Gestión de comunidad">
        {[
          ['pulso', 'Pulso'],
          ['solicitudes', 'Solicitudes'],
          ['moderacion', 'Moderación'],
          ['aprendizajes', 'Fichas'],
          ['piloto', 'Plan del piloto'],
          ['captacion', 'Primeros miembros'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section id="pulso" className="rc-section">
        <h2>¿Se están ayudando?</h2>
        <div className="rc-stats">
          {[
            [data.metrics.topics, 'Preguntas visibles'],
            [data.metrics.unanswered, 'Sin respuesta visible'],
            [data.metrics.useful, 'Respuestas marcadas útiles'],
            [data.metrics.helpers, 'Personas que han ayudado'],
          ].map(([n, label]) => (
            <div className="rc-stat" key={label}>
              <strong>{n}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="rc-muted">
          Acumulados desde la apertura. «Útil» lo marca el autor de la pregunta.
          La activación de una persona se registra al realizar su primera
          acción; no equivale a leer ni a recibir ayuda.
        </p>
        <Link href="/comunidad/preguntas">Revisar conversaciones →</Link>
      </section>
      <section id="solicitudes" className="rc-section">
        <h2>Formar el primer grupo</h2>
        <p>
          Admite por encaje y capacidad de atención. Comprueba el correo con la
          persona antes de aprobar. El acceso exige una cuenta con ese mismo
          correo confirmado. Esta pantalla no envía correos.
        </p>
        <form className="rc-filters">
          <label>
            Estado
            <select name="status" defaultValue={status}>
              <option value="">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Admitidos</option>
              <option value="revoked">Acceso retirado</option>
            </select>
          </label>
          <button className="rc-button">Filtrar solicitudes</button>
        </form>
        <p>
          {data.member_count} solicitudes · página {page + 1}
        </p>
        <div className="rc-list">
          {data.members.map((m) => (
            <article className="rc-card rc-admin-row" key={m.id}>
              <div>
                <h3>{m.alias}</h3>
                <p>
                  {m.email}
                  <br />
                  {m.region} · {m.owner_kind}
                </p>
                <p className="rc-body">
                  {m.need || 'Sin necesidad indicada todavía.'}
                </p>
                <p className="rc-muted">
                  {
                    {
                      pending: 'Pendiente',
                      approved: 'Admitido',
                      revoked: 'Acceso retirado',
                    }[m.status]
                  }{' '}
                  · solicitud {formatDate(m.created_at)}
                  {m.activated_at
                    ? ` · primera acción ${formatDate(m.activated_at)}`
                    : ''}
                </p>
              </div>
              <div>
                <CommandForm
                  action={m.status === 'approved' ? 'revoke' : 'admit'}
                  label={
                    m.status === 'approved'
                      ? 'Retirar acceso'
                      : 'Admitir en el piloto'
                  }
                >
                  <Hidden name="id" value={m.id} />
                  <label>
                    Motivo de la decisión
                    <input
                      name="reason"
                      minLength={3}
                      maxLength={1000}
                      required
                      placeholder="Encaje, conversación previa o motivo de baja"
                    />
                  </label>
                </CommandForm>
              </div>
            </article>
          ))}
        </div>
        {!data.members.length ? (
          <div className="rc-empty">
            Todavía no hay solicitudes en este estado.
          </div>
        ) : null}
        <nav className="rc-pagination" aria-label="Páginas de solicitudes">
          {page > 0 ? (
            <Link href={`?status=${status}&page=${page - 1}#solicitudes`}>
              ← Anterior
            </Link>
          ) : null}
          {(page + 1) * 50 < data.member_count ? (
            <Link href={`?status=${status}&page=${page + 1}#solicitudes`}>
              Siguiente →
            </Link>
          ) : null}
        </nav>
      </section>
      <section id="moderacion" className="rc-section">
        <h2>Cuidar las conversaciones</h2>
        <p>
          Revisa el contexto, intervén con una explicación y deja constancia.
          Ocultar contenido y cerrar un aviso son decisiones separadas.
        </p>
        <div className="rc-list">
          {data.reports.map((r) => (
            <article className="rc-card" key={r.id}>
              <p className="rc-body">{r.reason}</p>
              <p className="rc-muted">
                {formatDate(r.created_at)} ·{' '}
                {r.reply_id
                  ? 'Aviso sobre una respuesta'
                  : 'Aviso sobre una pregunta'}
              </p>
              <Link href={`/comunidad/preguntas/${r.topic_id}`}>
                Abrir conversación →
              </Link>
              <CommandForm action="resolve_report" label="Cerrar aviso">
                <Hidden name="id" value={r.id} />
                <label>
                  Qué se ha revisado y decidido
                  <textarea
                    name="reason"
                    minLength={3}
                    maxLength={1000}
                    required
                  />
                </label>
              </CommandForm>
            </article>
          ))}
        </div>
        {!data.reports.length ? (
          <p className="rc-empty">No hay avisos pendientes.</p>
        ) : (
          <p className="rc-muted">
            Se muestran los 100 avisos más antiguos pendientes. Al resolverlos
            aparecen los siguientes.
          </p>
        )}
        {data.hidden.length ? (
          <details className="rc-card">
            <summary>Conversaciones ocultas ({data.hidden.length})</summary>
            {data.hidden.map((t) => (
              <div key={t.id}>
                <h3>{t.title}</h3>
                <Link href={`/comunidad/preguntas/${t.id}`}>
                  Revisar conversación →
                </Link>
                <CommandForm action="moderate" label="Restaurar conversación">
                  <Hidden name="topic_id" value={t.id} />
                  <Hidden name="hidden" value={false} />
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
                <hr />
              </div>
            ))}
          </details>
        ) : null}
      </section>
      <section id="aprendizajes" className="rc-section">
        <h2>De una experiencia a una ficha útil</h2>
        <p>
          Solo aparecen casos cuyo autor ha dado permiso. Resume únicamente su
          aportación; las respuestas de otras personas requieren su permiso
          aparte. Elimina datos personales y distingue experiencia, fuente y
          alcance territorial. Si el autor edita su caso o retira el permiso, la
          ficha deja de mostrarse hasta una nueva revisión.
        </p>
        <div className="rc-list">
          {data.review.map((t) => (
            <details
              className="rc-card"
              key={`${t.id}-${t.revision}-${t.regulation?.version ?? ''}`}
            >
              <summary>
                {t.title} · {t.alias}
              </summary>
              <p className="rc-body">{t.body}</p>
              {t.regulation && <RegulationCard regulation={t.regulation} />}
              {t.alert_id && !t.regulation && (
                <p className="rc-error">
                  La referencia se ha retirado. La ficha no puede publicarse
                  mientras no vuelva a estar disponible.
                </p>
              )}
              {t.outcome ? (
                <p className="rc-outcome">Resultado: {t.outcome}</p>
              ) : null}
              <Link href={`/comunidad/preguntas/${t.id}`}>
                Revisar conversación original →
              </Link>
              <CommandForm
                action="publish"
                label="Publicar ficha revisada"
                success="Ficha publicada en Lo aprendido."
              >
                <Hidden name="topic_id" value={t.id} />
                <Hidden name="revision" value={t.revision} />
                <Hidden
                  name="regulation_version"
                  value={t.regulation?.version ?? ''}
                />
                <label>
                  Título
                  <input
                    name="title"
                    minLength={8}
                    maxLength={160}
                    required
                    defaultValue={t.title}
                  />
                </label>
                <label>
                  Resumen revisado, sin datos personales
                  <textarea
                    name="body"
                    minLength={20}
                    maxLength={6000}
                    required
                    rows={5}
                  />
                </label>
                <label>
                  Ámbito, fecha y límites de la experiencia
                  <textarea
                    name="scope"
                    minLength={10}
                    maxLength={1000}
                    required
                    placeholder={`Experiencia en ${t.region}. Explica cuándo se produjo y qué no se puede generalizar.`}
                  />
                </label>
                <label>
                  Fuente que permite contrastarlo, si existe
                  <input name="source_url" type="url" maxLength={1000} />
                </label>
              </CommandForm>
            </details>
          ))}
        </div>
        {!data.review.length ? (
          <p className="rc-empty">
            Aún no hay casos con permiso para preparar una ficha.
          </p>
        ) : (
          <p className="rc-muted">
            Hasta 100 casos con permiso pendientes de ficha, empezando por los
            más antiguos. Las fichas publicadas se consultan en «Lo aprendido».
          </p>
        )}
      </section>
      <section id="piloto" className="rc-section">
        <h2>Seis semanas, con una persona al frente</h2>
        <div className="rc-admin-row">
          <div>
            <p>
              La captación empieza antes del reloj del piloto. Activa la fecha
              cuando haya 12–15 personas interesadas y capacidad para darles la
              bienvenida. Ampliar hacia 30–50 es una opción si la atención se
              sostiene.
            </p>
            <p>
              Reserva inicialmente unas cinco horas semanales: atender
              preguntas, conectar experiencias, moderar y recoger resultados.
              Ajusta esa estimación al trabajo real.
            </p>
          </div>
          <CommandForm action="pilot" label="Guardar organización">
            <label>
              Responsable del piloto
              <input
                name="owner_name"
                minLength={2}
                maxLength={80}
                required
                defaultValue={data.pilot.owner_name}
              />
            </label>
            <label>
              Fecha de inicio (vacía mientras se prepara)
              <input
                name="started_on"
                type="date"
                defaultValue={data.pilot.started_on ?? ''}
              />
            </label>
            <label>
              Horas reservadas a la semana
              <input
                name="weekly_hours"
                type="number"
                min={1}
                max={40}
                required
                defaultValue={data.pilot.weekly_hours}
              />
            </label>
          </CommandForm>
        </div>
        <div className="rc-plan">
          {weeks.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className="rc-outcome">
          <h3>Criterio de continuidad</h3>
          <p>
            Al terminar, busca ejemplos verificables de ayuda entre miembros,
            personas que vuelven y una carga de atención sostenible. Entrevista
            también a quienes solo leyeron o dejaron de entrar. Los registros de
            actividad por sí solos no demuestran pertenencia ni impacto.
          </p>
        </div>
      </section>
      <section id="captacion" className="rc-section">
        <h2>Conseguir los primeros contactos</h2>
        <p>
          Empieza por asociaciones de propietarios, cámaras de la propiedad y
          profesionales que ya atienden a este público. Propón que compartan la
          invitación con personas interesadas; cada persona decide si solicita
          acceso. Usa la misma entrada nacional:{' '}
          <Link href="/comunidad#participar">/comunidad</Link>.
        </p>
        <div className="rc-copy">
          Estamos formando el primer grupo de propietarios de RegTrack, una
          comunidad nacional para compartir dudas y experiencias sobre el
          cuidado y la gestión de inmuebles. El piloto durará seis semanas y
          tendrá acompañamiento del equipo. Buscamos situaciones y territorios
          diversos. ¿Podríais compartir la invitación con personas a las que
          pueda resultarles útil? La participación se solicita directamente en
          RegTrack.
        </div>
        <h3>Primeras conversaciones al incorporarse</h3>
        <ol>
          <li>¿Qué decisión sobre tu inmueble tienes ahora entre manos?</li>
          <li>
            ¿Qué experiencia podrías compartir con alguien que está empezando?
          </li>
          <li>¿Qué te haría volver a este espacio dentro de dos semanas?</li>
        </ol>
        <p>
          Bienvenida sugerida: «Gracias por sumarte. Cuéntanos qué tienes entre
          manos y qué necesitas decidir. Puedes empezar leyendo; no hace falta
          compartir direcciones, contratos ni datos de otras personas».
        </p>
      </section>
      <section className="rc-section">
        <details className="rc-card">
          <summary>Registro de decisiones y mantenimiento</summary>
          <div className="rc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((a, i) => (
                  <tr key={i}>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      {{
                        admit: 'Admisión',
                        revoke: 'Retirada',
                        moderate: 'Moderación',
                        resolve_report: 'Aviso resuelto',
                        publish: 'Ficha revisada',
                        pilot: 'Organización',
                        purge: 'Limpieza',
                      }[a.action] ?? a.action}
                    </td>
                    <td>{a.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rc-muted">
            Últimas 30 decisiones. El registro completo se conserva en la base
            de datos.
          </p>
          <h3>Retención de solicitudes</h3>
          <p>
            Revisa esta tarea semanalmente. Elimina solicitudes pendientes de
            más de 90 días que no tengan aportaciones, contadores caducados y
            claves de reintento de más de 30 días. No elimina cuentas de acceso
            ni conversaciones.
          </p>
          <CommandForm
            action="purge"
            label="Eliminar solicitudes caducadas"
            success="Limpieza completada."
          />
        </details>
      </section>
    </>
  )
}
