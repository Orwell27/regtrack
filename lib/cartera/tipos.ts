// lib/cartera/tipos.ts
// Modelo de un inmueble de la cartera de un suscriptor y de su clasificación regulatoria.

export type SiNoNs = 'si' | 'no' | 'desconocido'

export type TipoInmueble = 'piso' | 'bajo' | 'edificio' | 'unifamiliar'

export type Modalidad =
  | 'vut_completa'        // vivienda de uso turístico, vivienda completa
  | 'vut_habitaciones'    // vivienda de uso turístico por habitaciones
  | 'apartamento_turistico'
  | 'sin_uso_turistico'

export type EstadoRegistro = 'si' | 'en_tramite' | 'no'

export type Estatutos = 'prohiben' | 'no_prohiben' | 'desconocido'

export type ZonaUrbanistica =
  | 'residencial_colectivo'
  | 'residencial_generico'
  | 'otra'
  | 'desconocida'

export interface Inmueble {
  id: string
  usuario_id: string
  nombre: string
  direccion: string
  municipio_ine: string | null
  lat: number | null
  lon: number | null
  tipo: TipoInmueble
  modalidad: Modalidad
  registro_turistico: EstadoRegistro
  /** Fecha de la declaración responsable ante el ITREM (YYYY-MM-DD) */
  fecha_alta_turistica: string | null
  propiedad_horizontal: SiNoNs
  estatutos: Estatutos
  /** Solo cuenta si la actividad empezó después del 3 de abril de 2025 */
  acuerdo_comunidad: SiNoNs
  acceso_independiente: SiNoNs
  reside_en_vivienda: SiNoNs
  zona_urbanistica: ZonaUrbanistica
  casco_historico: SiNoNs
  estancias_largas: SiNoNs
  limpieza_externa: SiNoNs
  seguro_rc: SiNoNs
  facturacion_anual: number | null
  gastos_comunidad_anual: number | null
  notas: string | null
  created_at: string
  updated_at: string
}

/** Campos que el suscriptor rellena; el resto los calcula el servidor */
export type InmuebleEntrada = Omit<
  Inmueble,
  'id' | 'usuario_id' | 'municipio_ine' | 'lat' | 'lon' | 'created_at' | 'updated_at'
>

export type Nivel = 'alta' | 'media' | 'baja' | 'favorable'

export type Clase = 'solida' | 'vigilancia' | 'fragil'

export interface Exposicion {
  id: string
  titulo: string
  nivel: Nivel
  ambito: 'estatal' | 'autonomico' | 'municipal' | 'comunidad'
  explicacion: string
  accion: string
  /** Estimación anual en euros: negativo es coste, positivo es ahorro */
  impacto_euros?: number
  norma: { titulo: string; estado: string; url: string }
}

export interface Clasificacion {
  clase: Clase
  tipologia: string
  exposiciones: Exposicion[]
  /** Campos clave sin responder, para afinar el resultado */
  pendientes: string[]
}
