// app/(subscriber)/alerta/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { TimelineNormativa } from '@/components/subscriber/TimelineNormativa'
import { ListaRelaciones } from '@/components/subscriber/ListaRelaciones'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

export const dynamic = 'force-dynamic'

const URGENCIA: Record<string, { bar: string; badge: string; label: string; stat: string }> = {
  alta:  { bar: 'bg-red-500',     badge: 'bg-red-100 text-red-800',         label: 'Alta',  stat: 'text-red-600' },
  media: { bar: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-800',     label: 'Media', stat: 'text-amber-600' },
  baja:  { bar: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-800', label: 'Baja',  stat: 'text-emerald-600' },
}

function fmtShort(d: string | null) {
  if (!d) return null
  const dt = new Date(d)
  return {
    day: dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    year: dt.getFullYear(),
  }
}

function fmtLong(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function AlertaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([getAuthUser(), params])
  if (!user) redirect('/login')

  const db = createNextServerClient()
  const { data: alerta } = await db
    .from('alertas')
    .select('*')
    .eq('id', id)
    .eq('estado', 'enviada')
    .single()

  if (!alerta) notFound()

  // Fetch relations — two-step to avoid Supabase FK ambiguity (two FKs to alertas)
  const [{ data: asNew }, { data: asOld }] = await Promise.all([
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_id', id),
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_relacionada_id', id),
  ])

  const allRelRows = [...(asNew ?? []), ...(asOld ?? [])]
  let relaciones: RelacionConAlerta[] = []

  if (allRelRows.length > 0) {
    const otherIds = allRelRows.map((r: any) =>
      r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
    )
    const { data: alertasData } = await db
      .from('alertas')
      .select('id, titulo, fuente, fecha_publicacion, url')
      .in('id', otherIds)

    const alertaMap = new Map((alertasData ?? []).map((a: any) => [a.id, a]))
    const seen = new Set<string>()

    relaciones = allRelRows
      .filter((r: any) => {
        const key = r.alerta_id < r.alerta_relacionada_id
          ? `${r.alerta_id}-${r.alerta_relacionada_id}`
          : `${r.alerta_relacionada_id}-${r.alerta_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: any) => {
        const otherId = r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
        const a = alertaMap.get(otherId)
        return {
          id: r.id,
          alerta_id: r.alerta_id,
          alerta_relacionada_id: r.alerta_relacionada_id,
          tipo_relacion: r.tipo_relacion,
          score_similitud: r.score_similitud,
          razon: r.razon,
          detectada_en: r.detectada_en,
          titulo: a?.titulo ?? '',
          fuente: a?.fuente ?? '',
          fecha_publicacion: a?.fecha_publicacion ?? null,
          url: a?.url ?? '',
        } as RelacionConAlerta
      })
  }

  const isPro = user.plan === 'pro'
  const urgencia = alerta.urgencia ?? 'baja'
  const u = URGENCIA[urgencia] ?? URGENCIA.baja

  const vigor = fmtShort(alerta.fecha_entrada_vigor)
  const pub   = fmtShort(alerta.fecha_publicacion)

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Link href="/alertas" className="text-xs text-sky-600 hover:text-sky-700 mb-5 inline-block">
        ← Volver a alertas
      </Link>

      {/* ── Tarjeta cabecera ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm">
        <div className={`h-1.5 w-full ${u.bar}`} />
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.badge}`}>
              Urgencia {u.label}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {alerta.fuente}
            </span>
            {alerta.tipo_norma && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {alerta.tipo_norma}
              </span>
            )}
          </div>
          <h1 className="text-base font-bold text-slate-900 leading-snug mb-4">{alerta.titulo}</h1>
          <a
            href={alerta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Abrir documento oficial ↗
          </a>
        </div>
      </div>

      {/* ── Fila de stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Entra en vigor"
          value={vigor ? vigor.day : '—'}
          sub={vigor ? String(vigor.year) : undefined}
          highlight={!!vigor}
        />
        <StatCard
          label="Plazo adaptación"
          value={alerta.plazo_adaptacion ? `${alerta.plazo_adaptacion}d` : '—'}
          sub={alerta.plazo_adaptacion ? 'días' : undefined}
        />
        <StatCard
          label="Relevancia"
          value={`${alerta.score_relevancia ?? '—'}/10`}
        />
      </div>

      {/* Ámbito + subtema — fila secundaria */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {alerta.territorios?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ámbito</p>
            <div className="flex flex-wrap gap-1">
              {alerta.territorios.map((t: string) => (
                <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        )}
        {alerta.subtema && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tema</p>
            <p className="text-sm font-semibold text-slate-700 capitalize">{alerta.subtema.replace(/_/g, ' ')}</p>
            {pub && (
              <p className="text-xs text-slate-400 mt-1">Publicado: {fmtLong(alerta.fecha_publicacion)}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Acción recomendada ── */}
      {isPro ? (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 mb-4 shadow-sm">
          <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-2">Acción recomendada</p>
          <p className="text-sm font-semibold text-sky-900 leading-relaxed">{alerta.accion_recomendada ?? '—'}</p>
        </div>
      ) : (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 text-center mb-4">
          <p className="text-sm font-bold text-sky-700 mb-1">Acción recomendada — plan Pro</p>
          <p className="text-xs text-slate-500 mb-3">Impacto detallado, acción recomendada, colectivos afectados y plazos.</p>
          <Link
            href="/cuenta#planes"
            className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
          >
            Ver planes Pro →
          </Link>
        </div>
      )}

      {/* ── Resumen + Impacto en grid ── */}
      <div className={`grid gap-3 mb-4 ${isPro ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <ContentCard title="Resumen">
          <p className="text-sm text-slate-600 leading-relaxed">{alerta.resumen}</p>
        </ContentCard>
        {isPro && (
          <ContentCard title="Impacto">
            <p className="text-sm text-slate-600 leading-relaxed">{alerta.impacto}</p>
          </ContentCard>
        )}
      </div>

      {/* ── Colectivos afectados ── */}
      {isPro && alerta.afectados?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Colectivos afectados</p>
          <div className="flex flex-wrap gap-2">
            {alerta.afectados.map((a: string) => (
              <span key={a} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Deroga/modifica colapsable ── */}
      {isPro && alerta.deroga_modifica && (
        <details className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-xs font-bold text-slate-400 uppercase tracking-wider select-none hover:bg-slate-50">
            Deroga / modifica
            <span className="text-slate-300 group-open:rotate-90 transition-transform inline-block">›</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-slate-600">{alerta.deroga_modifica}</p>
          </div>
        </details>
      )}

      {/* ── Evolución normativa (Pro) ── */}
      {relaciones.length > 0 && (
        isPro ? (
          <div className="mt-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                Evolución normativa
              </p>
              {relaciones.length >= 2 && (
                <div className="mb-5">
                  <TimelineNormativa
                    relaciones={relaciones}
                    alertaActualId={id}
                    alertaActualTitulo={alerta.titulo}
                    alertaActualFecha={alerta.fecha_publicacion}
                  />
                </div>
              )}
              <ListaRelaciones relaciones={relaciones} alertaActualId={id} />
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-1">🔗 Evolución normativa — plan Pro</p>
            <p className="text-xs text-slate-500 mb-3">
              Ve cómo esta norma se relaciona con regulaciones anteriores y la evolución del tema.
            </p>
            <a
              href="/cuenta#planes"
              className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
            >
              Ver planes Pro →
            </a>
          </div>
        )
      )}
    </div>
  )
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  )
}
