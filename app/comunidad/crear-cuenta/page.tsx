import Link from 'next/link'
import { CreateAccount } from '@/components/community/CreateAccount'
import { communityConfig } from '@/lib/community/server'
export default function CreateCommunityAccount() {
  return (
    <article className="rc-reading">
      <p className="rc-eyebrow">TU ACCESO A REGTRACK</p>
      <h1>
        Una cuenta,
        <br />
        tu lugar en la comunidad.
      </h1>
      <p>
        Usa el mismo correo con el que solicitaste participar. Confirmar tu
        correo y recibir la admisión son dos pasos distintos.
      </p>
      {communityConfig().enabled ? (
        <div className="rc-card">
          <CreateAccount />
        </div>
      ) : (
        <p>El registro de la comunidad se abrirá al comenzar el piloto.</p>
      )}
      <p>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login?next=/comunidad">Accede aquí</Link>.
      </p>
      <p>
        ¿Todavía no has solicitado participar?{' '}
        <Link href="/comunidad#participar">Solicita una invitación</Link>.
      </p>
      <Link href="/comunidad/privacidad">Cómo tratamos tus datos</Link>
    </article>
  )
}
