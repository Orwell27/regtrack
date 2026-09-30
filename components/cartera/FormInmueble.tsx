'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InmuebleEntrada } from '@/lib/cartera/tipos'

type Valores = Record<keyof InmuebleEntrada, string>

export const VALORES_INICIALES: Valores = {
  nombre: '',
  direccion: '',
  tipo: 'piso',
  modalidad: 'vut_completa',
  registro_turistico: 'si',
  fecha_alta_turistica: '',
  propiedad_horizontal: 'desconocido',
  estatutos: 'desconocido',
  acuerdo_comunidad: 'desconocido',
  acceso_independiente: 'desconocido',
  reside_en_vivienda: 'desconocido',
  zona_urbanistica: 'desconocida',
  casco_historico: 'desconocido',
  estancias_largas: 'desconocido',
  limpieza_externa: 'desconocido',
  seguro_rc: 'desconocido',
  facturacion_anual: '',
  gastos_comunidad_anual: '',
  notas: '',
}

const SI_NO = [['si', 'Sí'], ['no', 'No'], ['desconocido', 'No lo sé']] as const

type Campo = {
  id: keyof Valores
  etiqueta: string
  opciones: readonly (readonly [string, string])[]
  ayuda?: string
}

const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: 'El inmueble',
    campos: [
      { id: 'tipo', etiqueta: 'Tipo', opciones: [['piso', 'Piso en edificio de viviendas'], ['bajo', 'Bajo o planta baja'], ['edificio', 'Edificio completo'], ['unifamiliar', 'Vivienda unifamiliar']] },
      { id: 'modalidad', etiqueta: 'Uso', opciones: [['vut_completa', 'Vivienda turística completa'], ['vut_habitaciones', 'Vivienda turística por habitaciones'], ['apartamento_turistico', 'Apartamento turístico'], ['sin_uso_turistico', 'Sin uso turístico']] },
      { id: 'reside_en_vivienda', etiqueta: '¿Vives en ella?', opciones: SI_NO, ayuda: 'Solo cuenta si alquilas por habitaciones' },
    ],
  },
  {
    titulo: 'Registro y seguro',
    campos: [
      { id: 'registro_turistico', etiqueta: 'Registro turístico (REAT)', opciones: [['si', 'Inscrita'], ['en_tramite', 'En trámite'], ['no', 'Sin inscribir']] },
      { id: 'seguro_rc', etiqueta: 'Seguro de responsabilidad civil (≥ 300.000 €)', opciones: SI_NO },
    ],
  },
  {
    titulo: 'Comunidad de propietarios',
    campos: [
      { id: 'propiedad_horizontal', etiqueta: '¿El edificio tiene comunidad?', opciones: SI_NO },
      { id: 'estatutos', etiqueta: 'Los estatutos…', opciones: [['no_prohiben', 'No prohíben la actividad'], ['prohiben', 'Prohíben hospedería o actividad'], ['desconocido', 'No los he revisado']] },
      { id: 'acuerdo_comunidad', etiqueta: 'Acuerdo de 3/5 de la comunidad', opciones: SI_NO, ayuda: 'Solo si la actividad empezó después del 3 de abril de 2025' },
    ],
  },
  {
    titulo: 'Urbanismo',
    campos: [
      { id: 'zona_urbanistica', etiqueta: 'Zona del planeamiento', opciones: [['residencial_colectivo', 'Residencial colectivo'], ['residencial_generico', 'Residencial genérico'], ['otra', 'Otra'], ['desconocida', 'No lo sé']], ayuda: 'Está en el informe urbanístico o en la cédula de la parcela' },
      { id: 'casco_historico', etiqueta: '¿Está en el casco histórico?', opciones: SI_NO },
      { id: 'acceso_independiente', etiqueta: '¿Tiene acceso independiente de la calle?', opciones: SI_NO },
    ],
  },
  {
    titulo: 'Explotación',
    campos: [
      { id: 'estancias_largas', etiqueta: '¿Alquilas estancias de más de 31 días?', opciones: SI_NO },
      { id: 'limpieza_externa', etiqueta: '¿Externalizas la limpieza?', opciones: SI_NO },
    ],
  },
]

const CLASE_SELECT =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300'

export function FormInmueble({ inicial, onGuardar, onCancelar }: {
  inicial: Valores
  onGuardar: (valores: Valores) => Promise<string | null>
  onCancelar: () => void
}) {
  const [v, setV] = useState<Valores>(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (id: keyof Valores) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV(prev => ({ ...prev, [id]: e.target.value }))

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(await onGuardar(v))
    setGuardando(false)
  }

  return (
    <form onSubmit={enviar} className="bg-white border border-slate-200 rounded-lg p-4 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <Input id="inm-nombre" value={v.nombre} onChange={set('nombre')} placeholder="Piso del puerto" required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Dirección</span>
          <Input id="inm-direccion" value={v.direccion} onChange={set('direccion')} placeholder="Calle, número, municipio" required />
        </label>
      </div>

      {GRUPOS.map(g => (
        <fieldset key={g.titulo} className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">{g.titulo}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.campos.map(c => (
              <label key={c.id} className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">{c.etiqueta}</span>
                <select id={`inm-${c.id}`} className={CLASE_SELECT} value={v[c.id]} onChange={set(c.id)}>
                  {c.opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
                {c.ayuda && <span className="block text-[11px] text-slate-500">{c.ayuda}</span>}
              </label>
            ))}
            {g.titulo === 'Registro y seguro' && (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Fecha de alta turística</span>
                <Input id="inm-fecha" type="date" value={v.fecha_alta_turistica} onChange={set('fecha_alta_turistica')} />
              </label>
            )}
            {g.titulo === 'Comunidad de propietarios' && (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Gastos de comunidad al año (€)</span>
                <Input id="inm-gastos" inputMode="decimal" value={v.gastos_comunidad_anual} onChange={set('gastos_comunidad_anual')} />
              </label>
            )}
            {g.titulo === 'Explotación' && (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Facturación anual (€)</span>
                <Input id="inm-facturacion" inputMode="decimal" value={v.facturacion_anual} onChange={set('facturacion_anual')} />
              </label>
            )}
          </div>
        </fieldset>
      ))}

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Notas</span>
        <textarea id="inm-notas" rows={2} value={v.notas} onChange={set('notas')} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar y clasificar'}</Button>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  )
}
