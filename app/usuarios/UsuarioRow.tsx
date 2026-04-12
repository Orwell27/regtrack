'use client'
import { useState } from 'react'
import type { Usuario } from '@/lib/supabase'

export default function UsuarioRow({ usuario }: { usuario: Usuario }) {
  const [plan, setPlan] = useState(usuario.plan)
  const [activo, setActivo] = useState(usuario.activo)

  async function toggleActivo() {
    await fetch('/api/usuarios/' + usuario.id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })
    setActivo(!activo)
  }

  async function togglePlan() {
    const newPlan = plan === 'free' ? 'pro' : 'free'
    await fetch('/api/usuarios/' + usuario.id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    setPlan(newPlan)
  }

  return (
    <tr className={`border-t ${!activo ? 'opacity-50' : ''}`}>
      <td className="p-3">{usuario.nombre}</td>
      <td className="p-3 font-mono text-xs">{usuario.telegram_id ?? '—'}</td>
      <td className="p-3">{usuario.territorios?.join(', ')}</td>
      <td className="p-3">{usuario.subtemas?.join(', ')}</td>
      <td className="p-3">
        <button onClick={togglePlan} className={`text-xs px-2 py-1 rounded-full font-medium ${plan === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
          {plan}
        </button>
      </td>
      <td className="p-3">{activo ? '✅' : '❌'}</td>
      <td className="p-3">
        <button onClick={toggleActivo} className="text-xs text-gray-500 hover:text-gray-800 underline">
          {activo ? 'Desactivar' : 'Activar'}
        </button>
      </td>
    </tr>
  )
}
