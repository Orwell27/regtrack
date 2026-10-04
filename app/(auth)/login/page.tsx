'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { safeReturnPath } from '@/lib/community/model'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) {
        setErrorMsg(error.message)
      } else {
        router.push(safeReturnPath(new URLSearchParams(window.location.search).get('next')))
        router.refresh()
      }
    } catch (err) {
      setErrorMsg(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-sky-500 rounded-lg" />
          <span className="text-lg font-bold text-slate-900 tracking-tight">RegTrack</span>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-1">Acceder</h1>
        <p className="text-sm text-slate-500 mb-6">Inteligencia regulatoria inmobiliaria</p>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <Input
              id="login-email"
              autoComplete="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-sm font-medium text-slate-700 mb-1 block">Contraseña</label>
            <Input
              id="login-password"
              autoComplete="current-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-5 text-sm text-slate-600"><Link href="/comunidad">Conoce la comunidad de propietarios →</Link></p>
      </div>
    </div>
  )
}
