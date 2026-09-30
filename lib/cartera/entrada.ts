// lib/cartera/entrada.ts
// Valida lo que envía el formulario de la cartera antes de guardarlo.
import type { InmuebleEntrada } from './tipos'

const OPCIONES = {
  tipo: ['piso', 'bajo', 'edificio', 'unifamiliar'],
  modalidad: ['vut_completa', 'vut_habitaciones', 'apartamento_turistico', 'sin_uso_turistico'],
  registro_turistico: ['si', 'en_tramite', 'no'],
  propiedad_horizontal: ['si', 'no', 'desconocido'],
  estatutos: ['prohiben', 'no_prohiben', 'desconocido'],
  acuerdo_comunidad: ['si', 'no', 'desconocido'],
  acceso_independiente: ['si', 'no', 'desconocido'],
  reside_en_vivienda: ['si', 'no', 'desconocido'],
  zona_urbanistica: ['residencial_colectivo', 'residencial_generico', 'otra', 'desconocida'],
  casco_historico: ['si', 'no', 'desconocido'],
  estancias_largas: ['si', 'no', 'desconocido'],
  limpieza_externa: ['si', 'no', 'desconocido'],
  seguro_rc: ['si', 'no', 'desconocido'],
} as const

type Resultado = { ok: true; datos: InmuebleEntrada } | { ok: false; error: string }

function texto(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length === 0 ? null : t.slice(0, max)
}

// Admite formato español: «24.000», «24.000,50» o «24000,5»
function normalizarImporte(s: string): string {
  const t = s.trim().replace(/\s|€/g, '')
  if (t.includes(',')) return t.replace(/\./g, '').replace(',', '.')
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return t.replace(/\./g, '')
  return t
}

function importe(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(normalizarImporte(String(v)))
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(n * 100) / 100
}

function fecha(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  return Number.isNaN(Date.parse(v)) ? undefined : v
}

export function validarEntrada(body: unknown): Resultado {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Cuerpo inválido' }
  const b = body as Record<string, unknown>

  const nombre = texto(b.nombre, 120)
  const direccion = texto(b.direccion, 240)
  if (!nombre) return { ok: false, error: 'Ponle un nombre al inmueble' }
  if (!direccion) return { ok: false, error: 'Indica la dirección' }

  const opciones: Record<string, string> = {}
  for (const [campo, validos] of Object.entries(OPCIONES)) {
    const v = b[campo]
    if (typeof v !== 'string' || !(validos as readonly string[]).includes(v)) {
      return { ok: false, error: `Valor no válido en «${campo}»` }
    }
    opciones[campo] = v
  }

  const fechaAlta = fecha(b.fecha_alta_turistica)
  if (fechaAlta === undefined) return { ok: false, error: 'La fecha de alta debe tener el formato AAAA-MM-DD' }
  const facturacion = importe(b.facturacion_anual)
  const gastos = importe(b.gastos_comunidad_anual)
  if (facturacion === undefined || gastos === undefined) return { ok: false, error: 'Los importes deben ser números positivos' }

  return {
    ok: true,
    datos: {
      nombre,
      direccion,
      ...(opciones as Pick<InmuebleEntrada, keyof typeof OPCIONES>),
      fecha_alta_turistica: fechaAlta,
      facturacion_anual: facturacion,
      gastos_comunidad_anual: gastos,
      notas: texto(b.notas, 1000),
    },
  }
}
