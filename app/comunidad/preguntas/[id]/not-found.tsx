import Link from 'next/link'
export default function Missing() {
  return (
    <div className="rc-empty">
      <h1>Esta conversación no está disponible</h1>
      <p>Puede haberse retirado o el enlace puede ser incorrecto.</p>
      <Link href="/comunidad/preguntas">Volver a conversaciones</Link>
    </div>
  )
}
