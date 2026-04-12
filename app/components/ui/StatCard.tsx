import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: number | string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ label, value, sub, trend }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {sub && (
        <p className={cn(
          'text-xs mt-1',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'
        )}>
          {sub}
        </p>
      )}
    </div>
  )
}
