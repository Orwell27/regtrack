import Link from 'next/link'
import { requireCommunity } from '@/lib/community/pages'
import { CommandForm } from '@/components/community/CommandForm'
import { Hidden, TopicFields } from '@/components/community/Fields'
import { communityExecute } from '@/lib/community/server'
import { CommunityError, type Regulation } from '@/lib/community/model'
import { RegulationCard } from '@/components/community/RegulationCard'
import { notFound } from 'next/navigation'
export default async function NewTopic({
  searchParams,
}: {
  searchParams: Promise<{ alerta?: string }>
}) {
  const { alerta } = await searchParams
  if (alerta && !/^[0-9a-f-]{36}$/i.test(alerta)) notFound()
  const c = await requireCommunity(
    false,
    `/comunidad/preguntas/nueva${alerta ? `?alerta=${alerta}` : ''}`,
  )
  let source: Regulation | null = null
  if (alerta) {
    try {
      source = await communityExecute<Regulation>(c.actor, 'regulation', {
        id: alerta,
      })
    } catch (e) {
      if (e instanceof CommunityError && e.status === 404) notFound()
      throw e
    }
  }
  return (
    <div className="rc-reading">
      <Link href="/comunidad/preguntas" className="rc-back">
        ← Conversaciones
      </Link>
      <p className="rc-eyebrow">EMPIEZA POR TU SITUACIÓN</p>
      <h1>¿Qué necesitas resolver?</h1>
      <p className="rc-lead">
        Explicar qué has intentado ayuda a que otros aporten algo nuevo.
      </p>
      {c.member ? (
        <CommandForm action="ask" label="Publicar pregunta" navigate>
          {source ? (
            <>
              <RegulationCard regulation={source} compact />
              <Hidden name="alert_id" value={source.id} />
              <Hidden name="regulation_version" value={source.version} />
            </>
          ) : (
            <p>
              ¿Tu duda nace de una alerta?{' '}
              <Link href="/comunidad/novedades">Elígela en Qué cambia</Link>{' '}
              para conservar su fuente y fechas.
            </p>
          )}
          <TopicFields />
        </CommandForm>
      ) : (
        <p>
          Para participar, solicita también tu acceso como miembro desde Inicio.
          La función de moderación no publica con la identidad de otros
          propietarios.
        </p>
      )}
    </div>
  )
}
