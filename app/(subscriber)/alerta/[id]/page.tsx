// app/(subscriber)/alerta/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <div className="p-6 max-w-2xl">
      {/* Back */}
      <Link href="/alertas" className="text-xs text-sky-600 hover:text-sky-700 mb-4 inline-block">
        ← Volver a alertas
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex gap-2 mb-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.fuente}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.tipo_norma}
          </span>
          {alerta.urgencia === 'alta' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
              Urgencia alta
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-900 leading-snug mb-3">{alerta.titulo}</h1>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>📅 Publicación: {formatDate(alerta.fecha_publicacion)}</span>
          <span>⚡ Entrada en vigor: {formatDate(alerta.fecha_entrada_vigor)}</span>
          <span>🏷️ {alerta.subtema}</span>
          <span>📍 {alerta.territorios?.join(', ')}</span>
        </div>
        <a
          href={alerta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-sky-600 hover:text-sky-700 underline"
        >
          Ver documento oficial →
        </a>
      </div>

      {/* Secciones */}
      <div className="space-y-3">
        <Section title="Resumen">
          <p className="text-sm text-slate-600">{alerta.resumen}</p>
        </Section>

        {isPro ? (
          <>
            <Section title="Impacto">
              <p className="text-sm text-slate-600">{alerta.impacto}</p>
            </Section>
            <Section title="Colectivos afectados">
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                {alerta.afectados?.map((a: string) => <li key={a}>{a}</li>)}
              </ul>
            </Section>
            <Section title="Acción recomendada">
              <p className="text-sm text-sky-700 font-medium">{alerta.accion_recomendada}</p>
            </Section>
            {alerta.plazo_adaptacion && (
              <Section title="Plazo de adaptación">
                <p className="text-sm text-slate-600">{alerta.plazo_adaptacion} días</p>
              </Section>
            )}
            {alerta.deroga_modifica && (
              <Section title="Deroga / modifica">
                <p className="text-sm text-slate-600">{alerta.deroga_modifica}</p>
              </Section>
            )}
          </>
        ) : (
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-5 text-center">
            <p className="text-sm font-bold text-sky-700 mb-1">🔒 Análisis completo disponible en Pro</p>
            <p className="text-xs text-slate-500 mb-3">
              Impacto detallado, acción recomendada, colectivos afectados y plazos de adaptación.
            </p>
            <Link
              href="/cuenta#planes"
              className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
            >
              Ver planes Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h2>
      {children}
    </div>
  )
}
