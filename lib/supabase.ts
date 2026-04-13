import { createClient } from '@supabase/supabase-js'

// ─── Tipos de dominio ───────────────────────────────────────────────────────

export type Fuente = 'BOE' | 'BOCM' | 'DOGC' | 'BORM' | 'BOJA' | 'BOIB' | 'BOC_CANARIAS' | 'BOC_CANTABRIA' | 'BOCYL' | 'DOE' | 'DOG' | 'BOPV'
export type Ambito = 'estatal' | 'ccaa' | 'municipal'
export type Subtema =
  | 'urbanismo' | 'fiscalidad' | 'arrendamiento' | 'hipotecas'
  | 'obra_nueva' | 'construccion' | 'suelo' | 'rehabilitacion'
  | 'vivienda_protegida' | 'registro_notaria' | 'comunidades_propietarios' | 'otro'
export type Urgencia = 'alta' | 'media' | 'baja'
export type TipoNorma =
  | 'Ley Orgánica' | 'Ley' | 'Real Decreto-ley' | 'Real Decreto'
  | 'Orden Ministerial' | 'Resolución' | 'Circular' | 'Anuncio'
export type EstadoAlerta = 'pendiente_revision' | 'aprobada' | 'descartada' | 'enviada'
export type Plan = 'free' | 'pro'
export type Peso = 'emergente' | 'recurrente' | 'establecida'

export interface Alerta {
  id: string
  url: string
  titulo: string
  fuente: Fuente
  ambito: Ambito | null
  subtema: Subtema | null
  fecha_publicacion: string | null
  fecha_entrada_vigor: string | null
  plazo_adaptacion: number | null
  tipo_norma: TipoNorma | null
  urgencia: Urgencia | null
  /** Puntuación de relevancia 1-10. Calculado: alcance (1-3) + perfiles (1-3) + urgencia del plazo (1-4) */
  score_relevancia: number | null
  resumen: string | null
  impacto: string | null
  afectados: string[]
  territorios: string[]
  deroga_modifica: string | null
  accion_recomendada: string | null
  texto_alerta: string | null
  texto_alerta_pro: string | null
  estado: EstadoAlerta
  no_procesable: boolean
  created_at: string
}

export type Rol = 'admin' | 'subscriber'

export interface Usuario {
  id: string
  email: string
  nombre: string
  telegram_id: string | null
  territorios: string[]
  subtemas: string[]
  afectado_como: string[]
  urgencia_minima: Urgencia
  score_minimo: number
  plan: Plan
  activo: boolean
  rol: Rol
  auth_id: string | null
  preferencias: Record<string, unknown>
  created_at: string
}

export interface Entrega {
  id: string
  alerta_id: string
  usuario_id: string
  enviada_at: string | null
}

export interface Keyword {
  id: string
  keyword: string
  peso: Peso
  apariciones: number
  entidades: string[]
  updated_at: string
}

export interface Entidad {
  id: string
  nombre: string
  tipo: string | null
  descripcion: string | null
  relevancia: number
  updated_at: string
}

// ─── Clientes ───────────────────────────────────────────────────────────────

// Para scripts de servidor y GitHub Actions (usa service_role — acceso total)
export function createServerClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos')
  return createClient(url, key)
}

// Para Next.js server components y API routes (usa service_role — acceso total, sin cookies)
// Nota: @supabase/ssr se usa en middleware.ts para auth basada en cookies
export function createNextServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos')
  return createClient(url, key)
}

// Para componentes del browser (usa anon key con RLS)
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridos')
  return createClient(url, key)
}
