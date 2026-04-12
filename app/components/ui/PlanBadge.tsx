import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/supabase'

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span className={cn(
      'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
      plan === 'pro' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
    )}>
      {plan}
    </span>
  )
}
