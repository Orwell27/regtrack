import Link from 'next/link'
import { requireCommunity } from '@/lib/community/pages'
import { communityExecute } from '@/lib/community/server'
import type { Regulation } from '@/lib/community/model'
import { RegulationCard } from '@/components/community/RegulationCard'

export default async function News({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ambito?: string; page?: string }>
}) {
  const query = await searchParams
  const { actor } = await requireCommunity(false, '/comunidad/novedades')
  const page = Math.min(1000, Math.max(0, Math.floor(Number(query.page) || 0)))
  const q = (query.q ?? '').slice(0, 100),
    ambito = query.ambito ?? ''
  const items = await communityExecute<Regulation[]>(actor, 'regulations', {
    page,
    q,
    ambito,
  })
  const href = (p: number) =>
    `?${new URLSearchParams({ q, ambito, page: String(p) })}`
  return (
    <>
      <p className="rc-eyebrow">DE LA NORMA A TU PREGUNTA</p>
      <h1>Qué cambia</h1>
      <p className="rc-lead">
        Alertas publicadas por RegTrack. Abre una, consulta su fuente y plantea
        tu situación a la comunidad.
      </p>
      <p>
        La cobertura depende de las fuentes incorporadas. Este listado no
        acredita que estén recogidas todas las normas de España ni de cada
        municipio.
      </p>
      <form className="rc-card rc-filters">
        <label>
          Buscar una norma
          <input name="q" defaultValue={q} maxLength={100} />
        </label>
        <label>
          Ámbito normativo
          <select name="ambito" defaultValue={ambito}>
            <option value="">Todos</option>
            <option value="estatal">Estatal</option>
            <option value="ccaa">Autonómico</option>
            <option value="municipal">Municipal</option>
          </select>
        </label>
        <button className="rc-button">Buscar</button>
      </form>
      <div className="rc-list">
        {items.slice(0, 20).map((r) => (
          <RegulationCard key={r.id} regulation={r} compact />
        ))}
      </div>
      {!items.length && (
        <p className="rc-empty">
          No hay alertas publicadas con estos filtros. Puedes plantear una
          pregunta e indicar la fuente que necesitas contrastar.
        </p>
      )}
      <nav className="rc-pagination" aria-label="Páginas de novedades">
        {page > 0 && <Link href={href(page - 1)}>← Anteriores</Link>}
        {items.length > 20 && <Link href={href(page + 1)}>Siguientes →</Link>}
      </nav>
    </>
  )
}
