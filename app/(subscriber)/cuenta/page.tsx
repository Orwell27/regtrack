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

type SubcategoriaInterest = { id: number; slug: string; nombre: string; seleccionado: boolean }
type SectorInterest = { id: number; nombre: string; slug: string; subcategorias: SubcategoriaInterest[] }
type MiGrupo = { id: number; nombre: string; invite_link: string | null; subcategorias: { nombre: string } | null }

export default function CuentaPage() {
  const [datos, setDatos] = useState<DatosUsuario | null>(null)
  const [nombre, setNombre] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sectores, setSectores] = useState<SectorInterest[]>([])
  const [savingIntereses, setSavingIntereses] = useState(false)
  const [savedIntereses, setSavedIntereses] = useState(false)
  const [misGrupos, setMisGrupos] = useState<MiGrupo[]>([])

  useEffect(() => {
    fetch('/api/cuenta')
      .then(r => r.json())
      .then((data: DatosUsuario) => {
        setDatos(data)
        setNombre(data.nombre)
        setTelegramId(data.telegram_id ?? '')
      })
    fetch('/api/intereses')
      .then(r => r.json())
      .then((d: { sectores: SectorInterest[] }) => setSectores(d.sectores))
    fetch('/api/mis-grupos')
      .then(r => r.json())
      .then(setMisGrupos)
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

  function toggleInteres(subcatId: number) {
    setSectores(prev =>
      prev.map(sector => ({
        ...sector,
        subcategorias: sector.subcategorias.map(s =>
          s.id === subcatId ? { ...s, seleccionado: !s.seleccionado } : s
        ),
      }))
    )
  }

  async function handleSaveIntereses() {
    setSavingIntereses(true)
    const ids = sectores.flatMap(s => s.subcategorias.filter(c => c.seleccionado).map(c => c.id))
    await fetch('/api/intereses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcategoria_ids: ids }),
    })
    setSavingIntereses(false)
    setSavedIntereses(true)
    setTimeout(() => setSavedIntereses(false), 2000)
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

      {/* Mis intereses */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mis intereses</h2>
        {datos.plan === 'free' ? (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-md">
            <p className="text-xs text-slate-500">Configura alertas por sector con el <strong>Plan Pro</strong>.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sectores.map(sector => (
              <div key={sector.id}>
                <p className="text-xs font-semibold text-slate-600 mb-2">{sector.nombre}</p>
                <div className="flex flex-wrap gap-2">
                  {sector.subcategorias.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => toggleInteres(sub.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        sub.seleccionado
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sub.nombre}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSaveIntereses}
                disabled={savingIntereses}
                className="text-xs px-3 py-1.5 rounded bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {savingIntereses ? 'Guardando...' : 'Guardar intereses'}
              </button>
              {savedIntereses && <span className="text-xs text-emerald-600">✓ Guardado</span>}
            </div>
          </div>
        )}
      </div>

      {/* Mis grupos Telegram */}
      {datos.plan === 'pro' && misGrupos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mis grupos Telegram</h2>
          <div className="space-y-2">
            {misGrupos.map(g => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-700 font-medium">{g.nombre}</p>
                  <p className="text-xs text-slate-400">{g.subcategorias?.nombre}</p>
                </div>
                {g.invite_link ? (
                  <a
                    href={g.invite_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-600 hover:underline"
                  >
                    Unirse →
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">Sin link</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Miembro desde */}
      <p className="text-xs text-slate-400">
        Miembro desde {new Date(datos.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
}
