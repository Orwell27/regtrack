import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCommunity } from '@/lib/community/pages'
import { communityExecute } from '@/lib/community/server'
import { CommunityError, type Regulation } from '@/lib/community/model'
import { RegulationCard } from '@/components/community/RegulationCard'

export default async function RegulationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { actor } = await requireCommunity(false, `/comunidad/novedades/${id}`)
  let source: Regulation
  try {
    source = await communityExecute<Regulation>(actor, 'regulation', { id })
  } catch (e) {
    if (e instanceof CommunityError && e.status === 404) notFound()
    throw e
  }
  return (
    <div className="rc-reading">
      <Link href="/comunidad/novedades">← Qué cambia</Link>
      <h1>Qué significa para mí</h1>
      <RegulationCard regulation={source} />
      <section className="rc-section">
        <h2>De la información a tu situación</h2>
        <p>
          Indica tu comunidad autónoma y, si importa, tu municipio. La
          conversación conservará esta referencia; cada aportación distingue
          experiencia, fuente consultada o criterio profesional.
        </p>
        <div className="rc-actions">
          <Link
            className="rc-button"
            href={`/comunidad/preguntas/nueva?alerta=${id}`}
          >
            Preguntar sobre esta norma
          </Link>
          <Link href={`/comunidad/preguntas?alert_id=${id}`}>
            Ver conversaciones sobre esta norma
          </Link>
        </div>
      </section>
    </div>
  )
}
