import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNextServerClient } from '@/lib/supabase'
import { CommunityError } from './model'

export function communityConfig() {
  return {
    enabled: process.env.COMMUNITY_ENABLED === 'true',
    controller: process.env.COMMUNITY_PRIVACY_CONTROLLER ?? '',
    contact: process.env.COMMUNITY_CONTACT_EMAIL ?? '',
  }
}
export async function communityIdentity() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return null
  const jar = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            )
          } catch {
            /* Server Components cannot write cookies; the route/proxy refreshes. */
          }
        },
      },
    },
  )
  const { data, error } = await client.auth.getUser()
  if (error && (error.status === 0 || (error.status ?? 0) >= 500))
    throw new CommunityError(
      503,
      'No podemos comprobar tu sesión. Inténtalo de nuevo.',
    )
  return !error && data.user?.email_confirmed_at ? data.user : null
}
const ERROR_MESSAGES: Record<string, [number, string]> = {
  INVALID: [400, 'Revisa los campos del formulario.'],
  UNAUTHENTICATED: [401, 'Accede con tu cuenta y confirma tu correo.'],
  FORBIDDEN: [403, 'Tu cuenta no tiene acceso a esta acción.'],
  NOT_FOUND: [404, 'Esta conversación no está disponible.'],
  RATE_LIMIT: [
    429,
    'Has realizado varios envíos. Espera un poco antes de intentarlo de nuevo.',
  ],
  CONFLICT: [409, 'El contenido ha cambiado. Recarga antes de guardar.'],
  CONSENT_REQUIRED: [
    409,
    'El autor debe permitir la reutilización de este caso.',
  ],
}
export async function communityExecute<T>(
  actor: string | null,
  command: string,
  payload: Record<string, unknown> = {},
  rateKey = '',
): Promise<T> {
  if (!communityConfig().enabled)
    throw new CommunityError(
      503,
      'La comunidad está en preparación. Vuelve a intentarlo más adelante.',
    )
  const { data, error } = await createNextServerClient().rpc(
    'community_execute',
    { actor, command, payload, rate_key: rateKey },
  )
  if (error) {
    const mapped = ERROR_MESSAGES[error.message]
    if (mapped) throw new CommunityError(...mapped)
    if (['23502', '23514', '22P02', '22007', '22008'].includes(error.code))
      throw new CommunityError(400, 'Revisa los campos del formulario.')
    console.error('community operation failed', { command, code: error.code })
    throw new CommunityError(
      503,
      'No hemos podido guardar o recuperar los datos. Inténtalo de nuevo.',
    )
  }
  return data as T
}
