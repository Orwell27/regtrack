'use client'
import { Pencil, Trash2, ExternalLink, CircleAlert, TriangleAlert, Info, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ETIQUETA_CLASE } from '@/lib/cartera/clasificar'
import { MUNICIPIOS_MURCIA } from '@/lib/cartera/municipios'
import type { Clase, Clasificacion, Inmueble, Nivel } from '@/lib/cartera/tipos'

export type InmuebleClasificado = Inmueble & { clasificacion: Clasificacion }

const ESTILO_CLASE: Record<Clase, string> = {
  solida: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  vigilancia: 'bg-amber-50 text-amber-800 border-amber-200',
  fragil: 'bg-red-50 text-red-700 border-red-200',
}

const NIVEL: Record<Nivel, { etiqueta: string; clase: string; Icono: React.ElementType }> = {
  alta: { etiqueta: 'Alta', clase: 'text-red-700 bg-red-50', Icono: CircleAlert },
  media: { etiqueta: 'Media', clase: 'text-amber-800 bg-amber-50', Icono: TriangleAlert },
  baja: { etiqueta: 'Baja', clase: 'text-slate-600 bg-slate-100', Icono: Info },
  favorable: { etiqueta: 'A favor', clase: 'text-emerald-700 bg-emerald-50', Icono: CircleCheck },
}

function euros(n: number) {
  return `${n > 0 ? '+' : ''}${n.toLocaleString('es-ES')} €/año`
}

export function FichaInmueble({ inmueble, activo, onEditar, onBorrar, onSeleccionar }: {
  inmueble: InmuebleClasificado
  activo: boolean
  onEditar: () => void
  onBorrar: () => void
  onSeleccionar: () => void
}) {
  const { clasificacion: c } = inmueble
  const municipio = inmueble.municipio_ine ? MUNICIPIOS_MURCIA[inmueble.municipio_ine] : null
  const variacion = municipio && municipio.vutHaceUnAno > 0
    ? Math.round(((municipio.vut - municipio.vutHaceUnAno) / municipio.vutHaceUnAno) * 100)
    : null

  return (
    <article
      id={`inmueble-${inmueble.id}`}
      className={cn(
        'bg-white border rounded-lg p-4 space-y-3 transition-shadow',
        activo ? 'border-sky-300 shadow-sm' : 'border-slate-200'
      )}
    >
      <header className="flex items-start gap-3">
        <button onClick={onSeleccionar} className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold text-slate-900 leading-snug">{inmueble.nombre}</h3>
          <p className="text-xs text-slate-500 truncate">{inmueble.direccion}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {c.tipologia}{municipio ? ` · ${municipio.nombre}` : ' · Fuera de la Región de Murcia o sin ubicar'}
          </p>
        </button>
        <span className={cn('text-xs font-semibold px-2 py-1 rounded border shrink-0', ESTILO_CLASE[c.clase])}>
          {ETIQUETA_CLASE[c.clase]}
        </span>
      </header>

      {municipio && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2">
          {municipio.nombre}: {municipio.vut.toLocaleString('es-ES')} viviendas turísticas en mayo de 2026,
          el {municipio.pctViviendas.toLocaleString('es-ES')} % del parque
          {variacion !== null && ` (${variacion > 0 ? '+' : ''}${variacion} % en un año)`}.
        </p>
      )}

      {c.exposiciones.length === 0 ? (
        <p className="text-sm text-slate-500">Sin exposiciones regulatorias conocidas.</p>
      ) : (
        <ul className="space-y-2">
          {c.exposiciones.map(e => {
            const n = NIVEL[e.nivel]
            return (
              <li key={e.id} className="border-t border-slate-100 pt-2">
                <div className="flex items-start gap-2">
                  <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0', n.clase)}>
                    <n.Icono className="w-3 h-3" aria-hidden />{n.etiqueta}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {e.titulo}
                      {typeof e.impacto_euros === 'number' && (
                        <span className={cn('ml-2 text-xs font-semibold tabular-nums', e.impacto_euros < 0 ? 'text-red-700' : 'text-emerald-700')}>
                          {euros(e.impacto_euros)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">{e.explicacion}</p>
                    <p className="text-xs text-slate-800 mt-1"><span className="font-semibold">Qué hacer:</span> {e.accion}</p>
                    <a href={e.norma.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-sky-700 mt-1">
                      {e.norma.titulo} · {e.norma.estado}<ExternalLink className="w-3 h-3" aria-hidden />
                    </a>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {c.pendientes.length > 0 && (
        <div className="text-xs bg-sky-50 text-sky-900 rounded px-3 py-2">
          <p className="font-semibold mb-1">Para afinar la clasificación, completa:</p>
          <ul className="list-disc pl-4 space-y-0.5">{c.pendientes.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <footer className="flex gap-2 pt-1">
        <button onClick={onEditar} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-sky-700">
          <Pencil className="w-3.5 h-3.5" aria-hidden />Editar
        </button>
        <button onClick={onBorrar} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-red-700">
          <Trash2 className="w-3.5 h-3.5" aria-hidden />Borrar
        </button>
      </footer>
    </article>
  )
}
