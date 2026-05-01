'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Config = {
  score_minimo: number
  territorios_activos: string[]
  fuentes_activas: string[]
}

type Grupo = {
  id: number
  nombre: string
  chat_id: string
  invite_link: string | null
  activo: boolean
  subcategorias: { id: number; nombre: string; slug: string } | null
}

type SubcatSimple = { id: number; nombre: string; slug: string }

const TERRITORIOS_OPCIONES = [
  'nacional', 'andalucia', 'aragon', 'asturias', 'baleares', 'canarias',
  'cantabria', 'castilla-la-mancha', 'castilla-leon', 'cataluña',
  'extremadura', 'galicia', 'la-rioja', 'madrid', 'murcia', 'navarra', 'asturias',
  'pais-vasco', 'valencia',
]
const FUENTES_OPCIONES = [
  'BOE', 'BOCM', 'DOGC', 'BORM',
  'BOJA', 'BOIB', 'BOC_CANARIAS', 'BOC_CANTABRIA',
  'BOCYL', 'DOE', 'DOG', 'BOPV',
  'BOPA', 'BON', 'BOR',
]

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    score_minimo: 4,
    territorios_activos: [],
    fuentes_activas: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [subcats, setSubcats] = useState<SubcatSimple[]>([])
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', chat_id: '', subcategoria_id: '', invite_link: '' })
  const [savingGrupo, setSavingGrupo] = useState(false)
  const [grupoError, setGrupoError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: Config) => {
        setConfig({
          score_minimo: data.score_minimo ?? 4,
          territorios_activos: data.territorios_activos ?? [],
          fuentes_activas: data.fuentes_activas ?? [],
        })
        setLoading(false)
      })
    fetch('/api/admin/grupos-telegram').then(r => r.json()).then(setGrupos)
    fetch('/api/intereses')
      .then(r => r.json())
      .then((d: { sectores: Array<{ subcategorias: SubcatSimple[] }> }) => {
        setSubcats(d.sectores.flatMap(s => s.subcategorias))
      })
  }, [])

  function toggleArray(key: 'territorios_activos' | 'fuentes_activas', value: string) {
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleAddGrupo(e: React.FormEvent) {
    e.preventDefault()
    setGrupoError(null)
    if (!nuevoGrupo.nombre.trim() || !nuevoGrupo.chat_id.trim() || !nuevoGrupo.subcategoria_id) {
      setGrupoError('Nombre, chat_id y subcategoría son obligatorios')
      return
    }
    setSavingGrupo(true)
    const res = await fetch('/api/admin/grupos-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nuevoGrupo.nombre,
        chat_id: nuevoGrupo.chat_id,
        subcategoria_id: parseInt(nuevoGrupo.subcategoria_id),
        invite_link: nuevoGrupo.invite_link.trim() || undefined,
      }),
    })
    if (res.ok) {
      const updated = await fetch('/api/admin/grupos-telegram').then(r => r.json())
      setGrupos(updated)
      setNuevoGrupo({ nombre: '', chat_id: '', subcategoria_id: '', invite_link: '' })
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string }
      setGrupoError(body.error ?? 'Error al guardar')
    }
    setSavingGrupo(false)
  }

  async function handleDeleteGrupo(id: number) {
    const res = await fetch(`/api/admin/grupos-telegram?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGrupos(prev => prev.filter(g => g.id !== id))
    } else {
      setGrupoError('Error al eliminar el grupo')
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-400">Cargando configuración...</div>

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Configuración del pipeline</h1>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        <div className="p-4">
          <label className="text-sm font-semibold text-slate-700 block mb-2">
            Score mínimo de relevancia
          </label>
          <p className="text-xs text-slate-400 mb-3">Alertas con score por debajo de este valor son descartadas automáticamente (1-10).</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              value={config.score_minimo}
              onChange={e => setConfig(prev => ({ ...prev, score_minimo: parseInt(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm font-bold text-sky-600 w-6 text-center">{config.score_minimo}</span>
          </div>
        </div>

        <div className="p-4">
          <label className="text-sm font-semibold text-slate-700 block mb-2">Fuentes activas</label>
          <div className="flex gap-2">
            {FUENTES_OPCIONES.map(f => (
              <button
                key={f}
                onClick={() => toggleArray('fuentes_activas', f)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  config.fuentes_activas.includes(f)
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <label className="text-sm font-semibold text-slate-700 block mb-2">Territorios monitorizados</label>
          <div className="flex flex-wrap gap-2">
            {TERRITORIOS_OPCIONES.map(t => (
              <button
                key={t}
                onClick={() => toggleArray('territorios_activos', t)}
                className={`text-xs px-2.5 py-1 rounded-md border capitalize transition-colors ${
                  config.territorios_activos.includes(t)
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grupos Telegram */}
      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700">Grupos Telegram por subcategoría</h2>
        </div>
        <div className="p-4 space-y-3">
          {grupos.length === 0 ? (
            <p className="text-xs text-slate-400">No hay grupos configurados.</p>
          ) : (
            grupos.map(g => (
              <div key={g.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-md px-3 py-2">
                <div>
                  <p className="font-medium text-slate-800">{g.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {(g.subcategorias as { nombre: string } | null)?.nombre ?? '—'} · <span className="font-mono">{g.chat_id}</span>
                  </p>
                  {g.invite_link && (
                    <a href={g.invite_link} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                      {g.invite_link}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteGrupo(g.id)}
                  className="text-xs text-red-500 hover:text-red-700 ml-4"
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
          <form onSubmit={handleAddGrupo} className="border border-dashed border-slate-200 rounded-md p-3 space-y-2 mt-2">
            <p className="text-xs font-semibold text-slate-500">Añadir grupo</p>
            <input
              placeholder="Nombre del grupo"
              value={nuevoGrupo.nombre}
              onChange={e => setNuevoGrupo(p => ({ ...p, nombre: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            />
            <input
              placeholder="chat_id (ej: -100123456789)"
              value={nuevoGrupo.chat_id}
              onChange={e => setNuevoGrupo(p => ({ ...p, chat_id: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 font-mono"
            />
            <select
              value={nuevoGrupo.subcategoria_id}
              onChange={e => setNuevoGrupo(p => ({ ...p, subcategoria_id: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            >
              <option value="">Selecciona subcategoría</option>
              {subcats.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <input
              placeholder="Link de invitación (opcional)"
              value={nuevoGrupo.invite_link}
              onChange={e => setNuevoGrupo(p => ({ ...p, invite_link: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            />
            {grupoError && <p className="text-xs text-red-500">{grupoError}</p>}
            <Button type="submit" disabled={savingGrupo} className="bg-sky-500 hover:bg-sky-600 text-xs h-7 px-3">
              {savingGrupo ? 'Añadiendo...' : 'Añadir grupo'}
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-sky-500 hover:bg-sky-600">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">✓ Guardado</span>}
      </div>
    </div>
  )
}
