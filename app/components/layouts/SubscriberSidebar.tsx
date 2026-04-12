'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, User, BellRing, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/supabase'

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV_ITEMS: NavItem[] = [
  { href: '/alertas', label: 'Mis alertas', icon: Bell },
  { href: '/cuenta', label: 'Mi cuenta', icon: User },
  { href: '/cuenta#notificaciones', label: 'Notificaciones', icon: BellRing },
]

type Props = {
  nombre: string
  plan: Plan
}

export function SubscriberSidebar({ nombre, plan }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-500 rounded-lg" />
          <span className="font-bold text-sm text-slate-900 tracking-tight">RegTrack</span>
        </div>
        <div className="mt-1.5">
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
            plan === 'pro'
              ? 'bg-sky-100 text-sky-700'
              : 'bg-slate-100 text-slate-500'
          )}>
            {plan}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const hrefBase = item.href.split('#')[0]
          const isActive = pathname === hrefBase || (hrefBase !== '/alertas' && pathname.startsWith(hrefBase))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-sky-500' : 'text-slate-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {plan === 'free' && (
        <div className="mx-2 mb-3 bg-sky-50 border border-sky-100 rounded-lg p-3">
          <p className="text-xs font-bold text-sky-700 mb-1">Upgrade a Pro</p>
          <p className="text-[11px] text-slate-500 mb-2">Análisis completo de impacto y acción recomendada</p>
          <Link
            href="/cuenta#planes"
            className="block text-center text-xs font-semibold bg-sky-500 text-white py-1.5 rounded-md hover:bg-sky-600 transition-colors"
          >
            Ver planes →
          </Link>
        </div>
      )}

      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-700 truncate mb-1">{nombre}</p>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800">
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
