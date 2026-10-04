import Link from 'next/link'
import { requireCommunity } from '@/lib/community/pages'
import { CommandForm } from '@/components/community/CommandForm'
import { TopicFields } from '@/components/community/Fields'
export default async function NewTopic() {
  const c = await requireCommunity()
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
