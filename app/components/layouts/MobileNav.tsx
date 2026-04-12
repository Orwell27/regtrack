'use client'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

type Props = {
  sidebar: React.ReactNode
}

export function MobileNav({ sidebar }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <SheetTrigger
        render={<button className="md:hidden p-2 text-slate-600 hover:text-slate-900" />}
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-52">
        {sidebar}
      </SheetContent>
    </Sheet>
  )
}
