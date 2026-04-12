'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const TERRITORIOS = ['Madrid', 'Cataluña', 'Valencia', 'Andalucía', 'Nacional']
const SUBTEMAS = ['urbanismo', 'fiscalidad', 'arrendamiento', 'hipotecas', 'obra_nueva', 'construccion', 'rehabilitacion']
const PERFILES = ['promotor', 'agencia', 'despacho', 'inversor', 'propietario']

export default function RegistroPage() {
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telegram_id: '',
    territorio: 'Madrid', subtema: 'urbanismo', perfil: 'agencia',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    const supabase = getSupabase()

    // 1. Crear cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setErrorMsg(authError?.message ?? 'Error al crear cuenta')
      setStatus('error')
      return
    }

    // 2. Insertar perfil en tabla usuarios
    const { error: dbError } = await supabase.from('usuarios').insert({
      email: form.email,
      nombre: form.nombre,
      telegram_id: form.telegram_id || null,
      territorios: [form.territorio],
      subtemas: [form.subtema],
      afectado_como: [form.perfil],
      plan: 'free',
      activo: true,
    })

    if (dbError) {
      setErrorMsg('Error al guardar perfil: ' + dbError.message)
      setStatus('error')
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md max-w-sm text-center space-y-3">
          <p className="text-4xl">✅</p>
          <h2 className="text-xl font-bold">Registro completado</h2>
          <p className="text-gray-600">Recibirás alertas de <strong>{form.subtema}</strong> en <strong>{form.territorio}</strong> por Telegram.</p>
          <p className="text-sm text-gray-500">Revisa tu email para confirmar la cuenta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">Registro RegTrack</h1>
        <p className="text-sm text-gray-500">Alertas de normativa inmobiliaria en tu Telegram — plan Free.</p>

        {status === 'error' && <p className="text-red-500 text-sm">{errorMsg}</p>}

        <input required placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full border rounded p-2" />
        <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded p-2" />
        <input required type="password" placeholder="Contraseña" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded p-2" />

        <div>
          <label className="text-sm font-medium">Telegram ID</label>
          <input placeholder="Ej: 123456789" value={form.telegram_id} onChange={e => setForm({...form, telegram_id: e.target.value})} className="w-full border rounded p-2 mt-1" />
          <p className="text-xs text-gray-400 mt-1">Escribe a @userinfobot en Telegram para obtener tu ID.</p>
        </div>

        <div>
          <label className="text-sm font-medium">Territorio principal</label>
          <select value={form.territorio} onChange={e => setForm({...form, territorio: e.target.value})} className="w-full border rounded p-2 mt-1">
            {TERRITORIOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Área de interés</label>
          <select value={form.subtema} onChange={e => setForm({...form, subtema: e.target.value})} className="w-full border rounded p-2 mt-1">
            {SUBTEMAS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Soy</label>
          <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} className="w-full border rounded p-2 mt-1">
            {PERFILES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <button type="submit" disabled={status === 'loading'} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {status === 'loading' ? 'Registrando...' : 'Crear cuenta gratuita'}
        </button>
      </form>
    </div>
  )
}
