import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ROUTES = ['/admin']
const SUBSCRIBER_ROUTES = ['/alertas', '/alerta', '/cuenta']
const PUBLIC_ROUTES = ['/login', '/registro']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const isProtected =
    ADMIN_ROUTES.some(r => pathname.startsWith(r)) ||
    SUBSCRIBER_ROUTES.some(r => pathname.startsWith(r))

  if (!isProtected) return NextResponse.next()

  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(
    c => c.name.includes('-auth-token') && c.value.length > 0
  )

  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/alertas/:path*', '/alerta/:path*', '/cuenta/:path*'],
}
