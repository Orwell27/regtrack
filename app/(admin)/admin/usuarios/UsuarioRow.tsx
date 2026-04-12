'use client'
import { useState } from 'react'
import { PlanBadge } from '@/app/components/ui/PlanBadge'
import type { Usuario } from '@/lib/supabase'

export function UsuarioRow({ usuario }: { usuario: Usuario }) {
  const [plan, setPlan] = useState(usuario.plan)
  const [activo, setActivo] = useState(usuario.activo)
  const [loading, setLoading] = useState(false)

  async function update(body: Record<string, unknown>) {
    setLoading(true)
    await fetch(`/api/usuarios/${usuario.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
  }

  async function togglePlan() {
    const newPlan = plan === 'free' ? 'pro' : 'free'
    await update({ plan: newPlan })
    setPlan(newPlan)
  }

  async function toggleActivo() {
    await update({ activo: !activo })
    setActivo(!activo)
  }

  return (
    <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm ${!activo ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{usuario.nombre}</p>
        <p className="text-xs text-slate-400">{usuario.email}</p>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
          {usuario.telegram_id ?? '—'}
        </code>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {usuario.territorios?.map(t => (
            <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <button onClick={togglePlan} disabled={loading} className="hover:opacity-80 transition-opacity">
          <PlanBadge plan={plan} />
        </button>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium ${activo ? 'text-emerald-600' : 'text-slate-400'}`}>
          {activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={toggleActivo}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-800 underline"
        >
          {activo ? 'Desactivar' : 'Activar'}
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {new Date(usuario.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
      </td>
    </tr>
  )
}
