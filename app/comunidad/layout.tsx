import Link from 'next/link'
import type { Metadata } from 'next'
import { communityContext } from '@/lib/community/pages'
import './community.css'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: {
    default: 'Comunidad de propietarios · RegTrack',
    template: '%s · RegTrack',
  },
  description:
    'Propietarios de toda España comparten experiencias para cuidar sus inmuebles y decidir mejor.',
  robots: { index: false, follow: false },
}
export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, snapshot } = await communityContext()
  return (
    <div className="rc">
      <a className="rc-skip" href="#community-main">
        Ir al contenido
      </a>
      <header className="rc-header">
        <Link href="/comunidad" className="rc-brand">
          <b aria-hidden="true">r.</b>
          <span>
            RegTrack<small>Comunidad</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/alertas" prefetch={false}>Mis alertas</Link>
          {user ? (
            <form action="/api/comunidad/auth" method="POST">
              <button type="submit">Cerrar sesión</button>
            </form>
          ) : (
            <Link href="/login?next=/comunidad">Acceder</Link>
          )}
          {snapshot.moderator ? (
            <Link href="/comunidad/gestion">Gestionar</Link>
          ) : null}
        </nav>
      </header>
      <div className="rc-subnav">
        <nav aria-label="Comunidad">
          <Link href="/comunidad">Inicio</Link>
          {snapshot.status === 'approved' ? (
            <>
              <Link href="/comunidad/preguntas">Conversaciones</Link>
              <Link href="/comunidad/casos">Lo aprendido</Link>
            </>
          ) : null}
          <Link href="/comunidad/normas">Cómo participamos</Link>
        </nav>
        <span>Una red, toda España</span>
      </div>
      <main id="community-main" className="rc-main">
        {children}
      </main>
      <footer className="rc-footer">
        <span>Conocimiento que compartimos. Decisiones que cuidamos.</span>
        <Link href="/comunidad/privacidad">Privacidad</Link>
      </footer>
    </div>
  )
}
