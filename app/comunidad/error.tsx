'use client'
export default function CommunityError({ reset }: { reset: () => void }) {
  return (
    <section className="rc-card" role="alert">
      <h1>No hemos podido cargar este espacio</h1>
      <p>
        Tus datos no se han sustituido por una lista vacía. Inténtalo de nuevo
        en unos instantes.
      </p>
      <button className="rc-button" onClick={reset}>
        Volver a intentar
      </button>
    </section>
  )
}
