'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Config = {
  score_minimo: number
  territorios_activos: string[]
  fuentes_activas: string[]
}

const TERRITORIOS_OPCIONES = [
  'nacional', 'andalucia', 'aragon', 'asturias', 'baleares', 'canarias',
  'cantabria', 'castilla-la-mancha', 'castilla-leon', 'cataluña',
  'extremadura', 'galicia', 'la-rioja', 'madrid', 'murcia', 'navarra',
  'pais-vasco', 'valencia',
]
const FUENTES_OPCIONES = [
  'BOE', 'BOCM', 'DOGC', 'BORM',
  'BOJA', 'BOIB', 'BOC_CANARIAS', 'BOC_CANTABRIA',
  'BOCYL', 'DOE', 'DOG', 'BOPV',
]

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    score_minimo: 5,
    territorios_activos: [],
    fuentes_activas: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: Config) => {
        setConfig({
          score_minimo: data.score_minimo ?? 5,
          territorios_activos: data.territorios_activos ?? [],
          fuentes_activas: data.fuentes_activas ?? [],
        })
        setLoading(false)
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

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-sky-500 hover:bg-sky-600">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">✓ Guardado</span>}
      </div>
    </div>
  )
}
