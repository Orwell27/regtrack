// app/(subscriber)/cuenta/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlanBadge } from '@/app/components/ui/PlanBadge'
import type { Plan } from '@/lib/supabase'

type DatosUsuario = {
  nombre: string
  email: string
  telegram_id: string | null
  plan: Plan
  created_at: string
}

export default function CuentaPage() {
  const [datos, setDatos] = useState<DatosUsuario | null>(null)
  const [nombre, setNombre] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/cuenta')
      .then(r => r.json())
      .then((data: DatosUsuario) => {
        setDatos(data)
        setNombre(data.nombre)
        setTelegramId(data.telegram_id ?? '')
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/cuenta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telegram_id: telegramId }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!datos) return <div className="p-6 text-sm text-slate-400">Cargando...</div>

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Mi cuenta</h1>

      {/* Plan actual */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Plan actual</h2>
        <div className="flex items-center gap-2">
          <PlanBadge plan={datos.plan} />
          <span className="text-sm text-slate-600">
            {datos.plan === 'pro' ? 'Acceso completo a análisis de impacto' : 'Resumen básico de alertas'}
          </span>
        </div>
        {datos.plan === 'free' && (
          <div id="planes" className="mt-3 p-3 bg-sky-50 border border-sky-100 rounded-md">
            <p className="text-xs text-sky-700 font-semibold mb-1">Upgrade a Pro</p>
            <p className="text-xs text-slate-500">Contacta con nosotros para activar el plan Pro.</p>
          </div>
        )}
      </div>

      {/* Datos personales */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos personales</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre</label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
            <Input value={datos.email} disabled className="opacity-60" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block" id="notificaciones">
              Telegram ID
            </label>
            <Input
              placeholder="Ej: 123456789"
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Escribe a <strong>@userinfobot</strong> en Telegram para obtener tu ID.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving} className="bg-sky-500 hover:bg-sky-600">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {saved && <span className="text-xs text-emerald-600">✓ Guardado</span>}
          </div>
        </form>
      </div>

      {/* Miembro desde */}
      <p className="text-xs text-slate-400">
        Miembro desde {new Date(datos.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
}
