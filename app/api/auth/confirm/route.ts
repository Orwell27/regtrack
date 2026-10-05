import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.COMMUNITY_SITE_URL || new URL(request.url).origin
  if (code) {
    const jar = await cookies()
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:values=>values.forEach(({name,value,options})=>jar.set(name,value,options))}})
    const {error} = await client.auth.exchangeCodeForSession(code)
    if(!error) return NextResponse.redirect(new URL('/registro',origin))
  }
  return NextResponse.redirect(new URL('/login?next=/registro&confirmation=check',origin))
}
