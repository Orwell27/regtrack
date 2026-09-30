'use client'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

type Props = {
  sidebar: React.ReactNode
}

export function MobileNav({ sidebar }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <SheetTrigger
        render={<button aria-label="Abrir navegación" className="md:hidden p-3 text-slate-600 hover:text-slate-900" />}
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-52">
        <SheetTitle className="sr-only">Navegación de RegTrack</SheetTitle>
        <div className="h-full" onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false) }}>{sidebar}</div>
      </SheetContent>
    </Sheet>
  )
}
