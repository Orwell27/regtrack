// app/(subscriber)/alerta/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const URGENCIA_STYLE: Record<string, { bar: string; badge: string; label: string }> = {
  alta:  { bar: 'bg-red-500',     badge: 'bg-red-100 text-red-800',       label: 'Urgencia alta' },
  media: { bar: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-800',   label: 'Urgencia media' },
  baja:  { bar: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-800', label: 'Urgencia baja' },
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

  const isPro = user.plan === 'pro'
  const urgencia = alerta.urgencia ?? 'baja'
  const urgenciaStyle = URGENCIA_STYLE[urgencia] ?? URGENCIA_STYLE.baja

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/alertas" className="text-xs text-sky-600 hover:text-sky-700 mb-5 inline-block">
        ← Volver a alertas
      </Link>

      {/* Cabecera */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
        {/* Barra de urgencia */}
        <div className={`h-1 w-full ${urgenciaStyle.bar}`} />

        <div className="p-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgenciaStyle.badge}`}>
              {urgenciaStyle.label}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {alerta.fuente}
            </span>
            {alerta.tipo_norma && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {alerta.tipo_norma}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              {alerta.score_relevancia}/10
            </span>
          </div>

          <h1 className="text-lg font-bold text-slate-900 leading-snug mb-4">{alerta.titulo}</h1>

          {/* Datos clave en grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-4">
            {formatDate(alerta.fecha_publicacion) && (
              <span>Publicación: <span className="text-slate-700">{formatDate(alerta.fecha_publicacion)}</span></span>
            )}
            {formatDate(alerta.fecha_entrada_vigor) && (
              <span className="font-medium text-slate-700">
                Entra en vigor: <span className="text-amber-700">{formatDate(alerta.fecha_entrada_vigor)}</span>
              </span>
            )}
            {alerta.plazo_adaptacion && (
              <span>Plazo adaptación: <span className="text-slate-700">{alerta.plazo_adaptacion} días</span></span>
            )}
            {alerta.subtema && (
              <span>Tema: <span className="text-slate-700">{alerta.subtema}</span></span>
            )}
            {alerta.territorios?.length > 0 && (
              <span className="col-span-2">Ámbito: <span className="text-slate-700">{alerta.territorios.join(', ')}</span></span>
            )}
          </div>

          {/* Botón doc oficial */}
          <a
            href={alerta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Abrir documento oficial
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>

      {/* Acción recomendada — primero y más prominente */}
      {isPro ? (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
          <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Acción recomendada</p>
          <p className="text-sm font-semibold text-sky-900">{alerta.accion_recomendada ?? '—'}</p>
        </div>
      ) : (
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-5 text-center mb-4">
          <p className="text-sm font-bold text-sky-700 mb-1">Acción recomendada — plan Pro</p>
          <p className="text-xs text-slate-500 mb-3">
            Impacto detallado, acción recomendada, colectivos afectados y plazos.
          </p>
          <Link
            href="/cuenta#planes"
            className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
          >
            Ver planes Pro →
          </Link>
        </div>
      )}

      {/* Resumen */}
      <Section title="Resumen">
        <p className="text-sm text-slate-600">{alerta.resumen}</p>
      </Section>

      {/* Secciones Pro adicionales */}
      {isPro && (
        <>
          <Section title="Impacto">
            <p className="text-sm text-slate-600">{alerta.impacto}</p>
          </Section>

          {alerta.afectados?.length > 0 && (
            <Section title="Colectivos afectados">
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                {alerta.afectados.map((a: string) => <li key={a}>{a}</li>)}
              </ul>
            </Section>
          )}

          {/* Detalles secundarios colapsables */}
          {alerta.deroga_modifica && (
            <details className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-3 group">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-xs font-bold text-slate-400 uppercase tracking-wider select-none hover:bg-slate-50">
                Deroga / modifica
                <span className="text-slate-300 group-open:rotate-90 transition-transform">›</span>
              </summary>
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-600">{alerta.deroga_modifica}</p>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-3">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h2>
      {children}
    </div>
  )
}
