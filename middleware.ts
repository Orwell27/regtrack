import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_ROUTES = ['/admin']
const SUBSCRIBER_ROUTES = ['/alertas', '/alerta', '/cuenta']
const PUBLIC_ROUTES = ['/login', '/registro']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Refresh community sessions before Server Components read them. Authorization
  // remains in the server API and database, never in the presence of a cookie.
  if (pathname === '/registro' || pathname === '/comunidad' || pathname.startsWith('/comunidad/')) {
    let response = NextResponse.next({ request })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if ((pathname === '/registro' || process.env.COMMUNITY_ENABLED === 'true') && url && key) {
      const client = createServerClient(url, key, { cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => {
          values.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      } })
      await client.auth.getUser()
    }
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const isProtected =
    ADMIN_ROUTES.some(r => pathname.startsWith(r)) ||
    SUBSCRIBER_ROUTES.some(r => pathname.startsWith(r))

  if (!isProtected) return NextResponse.next()

  let response = NextResponse.next({ request })
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: values => {
      values.forEach(({name,value}) => request.cookies.set(name,value))
      response = NextResponse.next({request})
      values.forEach(({name,value,options}) => response.cookies.set(name,value,options))
    },
  }})
  const {data,error} = await client.auth.getUser()
  if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) {
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    return redirect
  }
  response.headers.set('Cache-Control','private, no-store')
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/alertas/:path*', '/alerta/:path*', '/cuenta/:path*', '/comunidad/:path*', '/registro'],
}
