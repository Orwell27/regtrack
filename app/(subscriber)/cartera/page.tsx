// app/(subscriber)/cartera/page.tsx
'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FichaInmueble, type InmuebleClasificado } from '@/components/cartera/FichaInmueble'
import { FormInmueble, VALORES_INICIALES } from '@/components/cartera/FormInmueble'
import { TRAMOS_PCT, COLOR_CLASE } from '@/components/cartera/colores'
import type { PuntoMapa } from '@/components/cartera/MapaCartera'
import { ETIQUETA_CLASE } from '@/lib/cartera/clasificar'
import { FUENTE_INE, MUNICIPIOS_MURCIA } from '@/lib/cartera/municipios'
import type { Clase } from '@/lib/cartera/tipos'

// Leaflet necesita el navegador
const MapaCartera = dynamic(() => import('@/components/cartera/MapaCartera'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse" />,
})

type Valores = typeof VALORES_INICIALES

function aValores(i: InmuebleClasificado): Valores {
  return {
    ...VALORES_INICIALES,
    nombre: i.nombre,
    direccion: i.direccion,
    tipo: i.tipo,
    modalidad: i.modalidad,
    registro_turistico: i.registro_turistico,
    fecha_alta_turistica: i.fecha_alta_turistica ?? '',
    propiedad_horizontal: i.propiedad_horizontal,
    estatutos: i.estatutos,
    acuerdo_comunidad: i.acuerdo_comunidad,
    acceso_independiente: i.acceso_independiente,
    reside_en_vivienda: i.reside_en_vivienda,
    zona_urbanistica: i.zona_urbanistica,
    casco_historico: i.casco_historico,
    estancias_largas: i.estancias_largas,
    limpieza_externa: i.limpieza_externa,
    seguro_rc: i.seguro_rc,
    facturacion_anual: i.facturacion_anual === null ? '' : String(i.facturacion_anual),
    gastos_comunidad_anual: i.gastos_comunidad_anual === null ? '' : String(i.gastos_comunidad_anual),
    notas: i.notas ?? '',
  }
}

type Respuesta = { inmuebles: InmuebleClasificado[] } | { error: string }

async function pedirCartera(): Promise<Respuesta> {
  try {
    const res = await fetch('/api/inmuebles')
    const data = await res.json()
    return res.ok ? { inmuebles: data.inmuebles } : { error: data.error ?? 'No se pudo cargar la cartera' }
  } catch {
    return { error: 'No se pudo cargar la cartera' }
  }
}

const TOP_MUNICIPIOS = Object.entries(MUNICIPIOS_MURCIA)
  .sort(([, a], [, b]) => b.vut - a.vut)
  .slice(0, 8)

export default function CarteraPage() {
  const [inmuebles, setInmuebles] = useState<InmuebleClasificado[]>([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState<InmuebleClasificado | 'nuevo' | null>(null)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  const aplicar = useCallback((r: Respuesta) => {
    if ('error' in r) setAviso(r.error)
    else setInmuebles(r.inmuebles)
    setCargando(false)
  }, [])

  useEffect(() => {
    pedirCartera().then(aplicar)
  }, [aplicar])

  const puntos = useMemo<PuntoMapa[]>(() => inmuebles
    .filter(i => i.lat !== null && i.lon !== null)
    .map(i => ({ id: i.id, nombre: i.nombre, lat: i.lat!, lon: i.lon!, clase: i.clasificacion.clase })),
  [inmuebles])

  const recuento = useMemo(() => {
    const r: Record<Clase, number> = { fragil: 0, vigilancia: 0, solida: 0 }
    for (const i of inmuebles) r[i.clasificacion.clase]++
    return r
  }, [inmuebles])

  const impactoIva = useMemo(() => inmuebles.reduce((s, i) =>
    s + (i.clasificacion.exposiciones.find(e => e.id === 'iva')?.impacto_euros ?? 0), 0), [inmuebles])

  async function guardar(valores: Valores): Promise<string | null> {
    const esNuevo = editando === 'nuevo'
    const url = esNuevo ? '/api/inmuebles' : `/api/inmuebles/${(editando as InmuebleClasificado).id}`
    const res = await fetch(url, {
      method: esNuevo ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valores),
    })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'No se pudo guardar'
    aplicar(await pedirCartera())
    setEditando(null)
    setSeleccionado(data.inmueble.id)
    if (esNuevo && data.ubicado === false) setAviso('No hemos encontrado la dirección en el mapa. Revísala para situar el inmueble.')
    else setAviso(null)
    return null
  }

  async function borrar(i: InmuebleClasificado) {
    if (!window.confirm(`¿Borrar «${i.nombre}» de tu cartera?`)) return
    const res = await fetch(`/api/inmuebles/${i.id}`, { method: 'DELETE' })
    if (res.ok) {
      setInmuebles(prev => prev.filter(x => x.id !== i.id))
      if (seleccionado === i.id) setSeleccionado(null)
    }
  }

  function seleccionar(id: string) {
    setSeleccionado(id)
    document.getElementById(`inmueble-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mi cartera</h1>
          <p className="text-sm text-slate-500">Cada inmueble clasificado según la normativa que le afecta, sobre el mapa de la vivienda turística en la Región de Murcia.</p>
        </div>
        {editando === null && (
          <Button onClick={() => setEditando('nuevo')}><Plus className="w-4 h-4 mr-1" aria-hidden />Añadir inmueble</Button>
        )}
      </header>

      {aviso && <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2">{aviso}</p>}

      {editando !== null && (
        <FormInmueble
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          inicial={editando === 'nuevo' ? VALORES_INICIALES : aValores(editando)}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        />
      )}

      {inmuebles.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Resumen de la cartera">
          {(['fragil', 'vigilancia', 'solida'] as Clase[]).map(c => (
            <div key={c} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
              <p className="text-2xl font-bold tabular-nums" style={{ color: COLOR_CLASE[c] }}>{recuento[c]}</p>
              <p className="text-xs text-slate-500">{ETIQUETA_CLASE[c]}</p>
            </div>
          ))}
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <p className={`text-2xl font-bold tabular-nums ${impactoIva < 0 ? 'text-red-700' : 'text-slate-900'}`}>
              {impactoIva.toLocaleString('es-ES')} €
            </p>
            <p className="text-xs text-slate-500">IVA 10 % al año, precios sin cambiar</p>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-2 min-w-0">
          <div className="h-[420px] md:h-[520px] rounded-lg overflow-hidden border border-slate-200 bg-white">
            <MapaCartera puntos={puntos} seleccionado={seleccionado} onSeleccionar={seleccionar} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600" aria-label="Leyenda">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Viviendas turísticas sobre el parque:</span>
              {TRAMOS_PCT.map(t => (
                <span key={t.etiqueta} className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm border border-slate-300" style={{ background: t.color }} />{t.etiqueta}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Tus inmuebles:</span>
              {(['fragil', 'vigilancia', 'solida'] as Clase[]).map(c => (
                <span key={c} className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full ring-2 ring-white" style={{ background: COLOR_CLASE[c] }} />{ETIQUETA_CLASE[c]}
                </span>
              ))}
            </div>
          </div>
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer">Municipios con más viviendas turísticas</summary>
            <table className="mt-2 w-full max-w-md tabular-nums">
              <thead><tr className="text-left text-slate-500"><th className="font-medium">Municipio</th><th className="font-medium text-right">Viviendas</th><th className="font-medium text-right">% del parque</th></tr></thead>
              <tbody>
                {TOP_MUNICIPIOS.map(([ine, m]) => (
                  <tr key={ine} className="border-t border-slate-100">
                    <td className="py-1">{m.nombre}</td>
                    <td className="text-right">{m.vut.toLocaleString('es-ES')}</td>
                    <td className="text-right">{m.pctViviendas.toLocaleString('es-ES')} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1">Fuente: <a className="underline" href={FUENTE_INE.url} target="_blank" rel="noreferrer">{FUENTE_INE.titulo}</a></p>
          </details>
        </section>

        <section className="space-y-3 min-w-0" aria-label="Inmuebles">
          {cargando ? (
            <p className="text-sm text-slate-500">Cargando cartera…</p>
          ) : inmuebles.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Aún no tienes inmuebles</p>
              <p className="mt-1">Añade el primero con su dirección y lo que sepas de él. Lo situaremos en el mapa y te diremos qué normas le afectan y qué datos faltan para afinar.</p>
            </div>
          ) : (
            inmuebles.map(i => (
              <FichaInmueble
                key={i.id}
                inmueble={i}
                activo={seleccionado === i.id}
                onSeleccionar={() => setSeleccionado(i.id)}
                onEditar={() => { setEditando(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                onBorrar={() => borrar(i)}
              />
            ))
          )}
        </section>
      </div>

      <p className="text-[11px] text-slate-400">Clasificación orientativa a partir de la normativa revisada a 30/09/2026. No es asesoramiento jurídico ni fiscal.</p>
    </div>
  )
}
