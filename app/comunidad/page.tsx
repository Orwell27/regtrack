import Link from 'next/link'
import {
  ArrowUpRight,
  MessagesSquare,
  BookOpen,
  HeartHandshake,
} from 'lucide-react'
import { communityContext } from '@/lib/community/pages'
import { communityConfig } from '@/lib/community/server'
import { CommandForm } from '@/components/community/CommandForm'
import { ApplicationFields } from '@/components/community/Fields'
import { CATEGORIES } from '@/lib/community/model'
export default async function CommunityPage() {
  const { snapshot, error, user } = await communityContext()
  const config = communityConfig()
  const approved = snapshot.status === 'approved'
  return (
    <>
      <section className="rc-hero">
        <div>
          <p className="rc-eyebrow">NORMATIVA Y COMUNIDAD DE PROPIETARIOS</p>
          <h1>
            Entiende qué cambia.
            <br />
            <em>Decide con más contexto.</em>
          </h1>
          <p className="rc-lead">
            Consulta las fuentes, entiende su alcance y comparte cómo lo estás
            resolviendo. Una comunidad de propietarios de toda España.
          </p>
          <div className="rc-actions">
            {approved ? (
              <>
                <Link className="rc-button" href="/comunidad/preguntas">
                  Entrar a las conversaciones <ArrowUpRight size={18} />
                </Link>
                <Link href="/comunidad/preguntas/nueva">
                  Plantear una pregunta
                </Link>
              </>
            ) : (
              <>
                <a className="rc-button" href="#participar">
                  Quiero participar <ArrowUpRight size={18} />
                </a>
                <Link href="/comunidad/normas">Conoce la comunidad</Link>
              </>
            )}
          </div>
        </div>
        <aside className="rc-hero-note">
          <span className="rc-pill">
            {snapshot.pilot?.started_on ? 'Piloto en marcha' : 'Primer grupo'}
          </span>
          <h2>
            De la norma a tu pregunta.
            <br />
            De tu caso al aprendizaje.
            <br />
            Siempre con territorio y fecha.
          </h2>
          <p>
            Las alertas publicadas abren conversaciones. Las experiencias
            revisadas ayudan al siguiente propietario.
          </p>
          <div className="rc-note-line">
            <span>01</span> La publicación oficial, a mano.
          </div>
          <div className="rc-note-line">
            <span>02</span> La explicación, con sus límites.
          </div>
          <div className="rc-note-line">
            <span>03</span> Las experiencias, con contexto.
          </div>
        </aside>
      </section>
      {error ? (
        <div role="alert" className="rc-error">
          {error} <Link href="/comunidad">Volver a intentar</Link>
        </div>
      ) : null}
      <section className="rc-section">
        <div className="rc-section-heading">
          <div>
            <p className="rc-eyebrow">NOS UNEN DECISIONES REALES</p>
            <h2>¿Qué tienes entre manos?</h2>
          </div>
          <p>
            Viviendas, locales y segundas residencias.
            <br />
            Distintas situaciones, conocimiento compartido.
          </p>
        </div>
        <div className="rc-topic-grid">
          {Object.entries(CATEGORIES).map(([key, label], i) => (
            <Link
              key={key}
              href={
                approved
                  ? `/comunidad/preguntas?category=${key}`
                  : '#participar'
              }
              className="rc-topic-tile"
            >
              <span>0{i + 1}</span>
              <h3>{label}</h3>
              <p>
                {
                  [
                    'Obras, permisos y decisiones sobre una reforma.',
                    'Alquiler, obligaciones y trámites que necesitas entender.',
                    'Comunidad de propietarios, acuerdos y responsabilidades.',
                    'Fiscalidad, cambios de uso y decisiones sobre tu inmueble.',
                  ][i]
                }
              </p>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </section>
      <section className="rc-section rc-three">
        <article>
          <MessagesSquare />
          <h3>Una norma con contexto</h3>
          <p>
            Consulta qué cambia, la publicación oficial y el territorio
            señalado. La cobertura depende de las fuentes incorporadas; no es
            exhaustiva.
          </p>
        </article>
        <article>
          <HeartHandshake />
          <h3>Una experiencia compartida</h3>
          <p>
            Aprende de quien ha pasado por algo parecido y aporta lo que a ti te
            ha servido.
          </p>
        </article>
        <article>
          <BookOpen />
          <h3>Un aprendizaje que queda</h3>
          <p>
            Con permiso del autor y revisión, un caso puede convertirse en guía.
            Si cambia su referencia en RegTrack, se señala para volver a
            revisarlo.
          </p>
        </article>
      </section>
      <section id="participar" className="rc-section rc-join">
        <div>
          <p className="rc-eyebrow">CONSTRUYAMOS EL PRIMER GRUPO</p>
          <h2>
            La comunidad empieza
            <br />
            con vuestras preguntas.
          </h2>
          <p>
            El piloto dura seis semanas desde su apertura. Primero reunimos a
            las personas interesadas y conocemos qué necesitan.
          </p>
          <p>
            Puedes leer, preguntar o compartir una experiencia. No necesitas
            publicar detalles de tu patrimonio.
          </p>
        </div>
        <div className="rc-card">
          {approved && snapshot.member ? (
            <>
              <h3>Ya formas parte de la comunidad</h3>
              <p>Tu próxima aportación puede ayudar a alguien.</p>
              <Link className="rc-button" href="/comunidad/preguntas">
                Ver conversaciones
              </Link>
            </>
          ) : snapshot.status === 'pending' ? (
            <>
              <h3>Tu solicitud está pendiente</h3>
              <p>
                Ya tenemos tu interés registrado. El equipo está formando el
                primer grupo. Al aprobar tu acceso, podrás entrar desde aquí.
              </p>
            </>
          ) : snapshot.status === 'revoked' ? (
            <>
              <h3>Tu acceso está retirado</h3>
              <p>Puedes consultar tu situación con el equipo.</p>
              {config.contact ? (
                <a href={`mailto:${config.contact}`}>Contactar</a>
              ) : null}
            </>
          ) : config.enabled && config.controller && config.contact ? (
            <>
              <h3>Solicita una invitación</h3>
              <p>
                Te contactaremos sobre tu solicitud. Todavía no supone una plaza
                confirmada.
              </p>
              <CommandForm
                action="apply"
                label="Solicitar invitación"
                success="Hemos recibido tu solicitud. Te contactaremos para concretar los siguientes pasos."
                reset
              >
                <ApplicationFields />
              </CommandForm>
              {user ? null : (
                <p className="rc-muted">
                  ¿Ya estás admitido?{' '}
                  <Link href="/login?next=/comunidad">
                    Accede con tu cuenta
                  </Link>
                  . Si aún no tienes cuenta,{' '}
                  <Link href="/comunidad/crear-cuenta">puedes crearla</Link> con
                  el mismo correo de tu solicitud.
                </p>
              )}
            </>
          ) : (
            <>
              <h3>Estamos preparando las solicitudes</h3>
              <p>
                Este espacio reunirá al primer grupo de propietarios. La entrada
                se abrirá cuando esté listo para atenderos.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  )
}
