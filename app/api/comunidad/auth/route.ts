import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { communityOrigin, isCommunityOrigin } from '@/lib/community/origin'
function authClient(jar: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          ),
      },
    },
  )
}
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get('code'),
    origin = communityOrigin(request)
  if (code) {
    const { error } = await authClient(
      await cookies(),
    ).auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL('/comunidad', origin))
  }
  return NextResponse.redirect(
    new URL('/login?next=/comunidad&confirmation=check', origin),
  )
}
export async function POST(request: Request) {
  if (!isCommunityOrigin(request))
    return new Response('Origen no válido', { status: 403 })
  await authClient(await cookies()).auth.signOut()
  return NextResponse.redirect(
    new URL('/comunidad', communityOrigin(request)),
    303,
  )
}
