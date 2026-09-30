'use client'
export default function Error({ reset }: { reset: () => void }) {
  return <div className="rt-workspace"><div className="rt-empty" role="alert"><h2>No hemos podido cargar esta página</h2><p>Inténtalo de nuevo en unos instantes.</p><button className="rt-button" onClick={reset}>Volver a intentar</button></div></div>
}
