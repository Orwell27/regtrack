import { communityConfig } from '@/lib/community/server'
export default function Privacy() {
  const c = communityConfig()
  return (
    <article className="rc-reading">
      <p className="rc-eyebrow">PRIVACIDAD · COMUNIDAD</p>
      <h1>
        Lo que compartes,
        <br />
        con su contexto.
      </h1>
      <section>
        <h2>Solicitud de acceso</h2>
        <p>
          Responsable:{' '}
          {c.controller || 'pendiente de configurar; solicitudes cerradas'}.
          Usamos los datos que facilitas para atender tu solicitud y organizar
          el piloto con tu consentimiento. No se suscribe tu correo a otras
          campañas ni se vende una lista de contactos.
        </p>
        <p>
          El correo y la solicitud son privados para el equipo. Los miembros
          admitidos ven tu alias y tus aportaciones, incluido el territorio que
          decidas indicar.
        </p>
      </section>
      <section>
        <h2>Tus decisiones</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, portabilidad,
          limitación u oposición al tratamiento, y retirar tu consentimiento
          escribiendo a{' '}
          {c.contact ? (
            <a href={`mailto:${c.contact}`}>{c.contact}</a>
          ) : (
            'la dirección de contacto que se habilitará al abrir'
          )}
          . También puedes reclamar ante la{' '}
          <a
            href="https://www.aepd.es/derechos-y-deberes/conoce-tus-derechos/derecho-de-informacion"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agencia Española de Protección de Datos
          </a>
          .
        </p>
        <p>
          Las solicitudes pendientes se revisan semanalmente para eliminar las
          que superen 90 días sin admisión. Las aportaciones permanecen mientras
          participa su autor o hasta que solicite su eliminación, salvo
          conservación necesaria para gestionar una incidencia. El equipo revisa
          estos plazos durante el piloto.
        </p>
      </section>
      <section>
        <h2>Funcionamiento y medición</h2>
        <p>
          El servicio utiliza su infraestructura de alojamiento y base de datos
          para guardar la solicitud y las conversaciones. Se registra actividad
          básica de participación para evaluar el piloto y un registro de
          moderación para atender incidencias. La señal de red para limitar
          abusos se transforma en una huella, sin guardar la dirección IP en la
          comunidad.
        </p>
        <p>
          No publiques datos personales de otras personas. La reutilización de
          tu caso requiere una autorización que puedes retirar desde la
          conversación. Las fichas se comparten dentro de la comunidad; una
          publicación externa requiere un acuerdo separado.
        </p>
      </section>
    </article>
  )
}
