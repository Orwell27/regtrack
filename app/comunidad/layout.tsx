import Link from 'next/link'
import type { Metadata } from 'next'
import { communityContext } from '@/lib/community/pages'
import './community.css'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.COMMUNITY_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3100'),
  ),
  title: {
    default: 'Comunidad de propietarios · RegTrack',
    template: '%s · RegTrack',
  },
  description:
    'Entiende qué cambia, consulta las fuentes y comparte tus dudas con propietarios de toda España.',
  openGraph: {
    title: 'RegTrack · De la norma a tu decisión',
    description:
      'Fuentes, contexto territorial y experiencias entre propietarios.',
  },
  twitter: { card: 'summary_large_image' },
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
              <Link href="/comunidad/novedades">Qué cambia</Link>
              <Link href="/comunidad/preguntas">Conversaciones</Link>
              <Link href="/comunidad/casos">Casos y guías</Link>
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
