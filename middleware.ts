import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/editorial', '/usuarios', '/config']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  if (!isProtected) return NextResponse.next()

  // Supabase stores the session in a cookie named sb-<project-ref>-auth-token
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(c =>
    c.name.includes('-auth-token') && c.value.length > 0
  )

  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/editorial/:path*', '/usuarios/:path*', '/config/:path*'],
}
