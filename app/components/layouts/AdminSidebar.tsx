'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileCheck, Bell, Users, Settings, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
}

type Props = {
  pendientes?: number
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/editorial', label: 'Cola editorial', icon: FileCheck },
  { href: '/admin/alertas', label: 'Alertas', icon: Bell },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/config', label: 'Config', icon: Settings },
]

export function AdminSidebar({ pendientes = 0 }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-500 rounded-lg" />
          <span className="font-bold text-sm text-slate-900 tracking-tight">RegTrack</span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium tracking-widest mt-1 uppercase">Admin</p>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
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
              <span className="flex-1">{item.label}</span>
              {item.href === '/admin/editorial' && pendientes > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">
                  {pendientes}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-100">
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
