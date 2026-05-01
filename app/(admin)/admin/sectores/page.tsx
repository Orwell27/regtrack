// app/(admin)/admin/sectores/page.tsx
import { createNextServerClient } from '@/lib/supabase'
import { SectoresClient } from './SectoresClient'

export const dynamic = 'force-dynamic'

export default async function SectoresPage() {
  const db = createNextServerClient()
  const [sectoresRes, subcatsRes] = await Promise.all([
    db.from('sectores').select('id, nombre, slug').order('nombre'),
    db.from('subcategorias').select('id, slug, nombre, activo, sector_id').order('nombre'),
  ])

  const sectores = (sectoresRes.data ?? []).map(sector => ({
    ...sector,
    subcategorias: (subcatsRes.data ?? []).filter((s: { sector_id: number }) => s.sector_id === sector.id),
  }))

  return <SectoresClient sectores={sectores} />
}
