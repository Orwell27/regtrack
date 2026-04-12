# RegTrack — Rediseño UI/UX Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la app web de RegTrack con un sistema de diseño Clean & Light (shadcn/ui + Tailwind), sidebar con etiquetas, portal admin completo y portal suscriptor (free/pro).

**Architecture:** Un solo codebase Next.js con route groups `(auth)`, `(admin)`, `(subscriber)`. El portal admin vive en `/admin/*`, el suscriptor en `/alertas`, `/alerta/[id]`, `/cuenta`. Los layouts de cada grupo actúan como guards de rol. La home page redirige según rol tras el login.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, Supabase (@supabase/ssr + supabase-js), TypeScript, vitest.

---

## Estructura de ficheros resultante

```
app/
├── (auth)/login/page.tsx              ← MOVE + rewrite
├── (admin)/
│   ├── layout.tsx                     ← NEW (guard admin)
│   └── admin/
│       ├── dashboard/page.tsx         ← REWRITE
│       ├── editorial/
│       │   ├── page.tsx               ← REWRITE
│       │   └── AlertaRow.tsx          ← NEW
│       ├── alertas/page.tsx           ← NEW (histórico)
│       ├── usuarios/
│       │   ├── page.tsx               ← REWRITE
│       │   └── UsuarioRow.tsx         ← REWRITE
│       └── config/page.tsx            ← REWRITE
├── (subscriber)/
│   ├── layout.tsx                     ← NEW (guard subscriber)
│   ├── alertas/page.tsx               ← NEW (feed)
│   ├── alerta/[id]/page.tsx           ← NEW (detalle)
│   └── cuenta/page.tsx                ← NEW
├── components/
│   ├── layouts/
│   │   ├── AdminSidebar.tsx           ← NEW
│   │   └── SubscriberSidebar.tsx      ← NEW
│   └── ui/
│       ├── StatCard.tsx               ← NEW
│       ├── AlertaCard.tsx             ← NEW (subscriber)
│       ├── PlanBadge.tsx              ← NEW
│       ├── UpgradeBanner.tsx          ← NEW
│       └── FilterBar.tsx              ← NEW
├── api/
│   ├── alertas/[id]/
│   │   ├── route.ts                   ← EXISTING (no cambios)
│   │   └── enviar/route.ts            ← NEW
│   ├── config/route.ts                ← NEW
│   ├── cuenta/route.ts                ← NEW
│   ├── pipeline/run/route.ts          ← NEW
│   └── usuarios/[id]/route.ts         ← EXISTING (añadir telegram_id)
├── globals.css                        ← MODIFY (shadcn tokens)
├── layout.tsx                         ← KEEP (root HTML shell)
└── page.tsx                           ← REWRITE (role redirect)

lib/
├── supabase.ts                        ← MODIFY (tipos: rol, auth_id, preferencias)
└── auth.ts                            ← NEW (getAuthUser)

middleware.ts                          ← REWRITE (rutas protegidas por grupo)
supabase/migrations/
└── 002_add_rol_config.sql             ← NEW
```

---

## Task 1: Instalar shadcn/ui y configurar tokens de diseño

**Files:**
- Modify: `app/globals.css`
- Create: `components.json` (generado por shadcn init)

- [ ] **Step 1: Instalar shadcn/ui**

```bash
cd "C:/Users/alf_c/Documents/Obsidian Vault/IDEAS/RegTrack"
npx shadcn@latest init
```

Cuando pregunte, responde:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

- [ ] **Step 2: Instalar componentes base necesarios**

```bash
npx shadcn@latest add button badge card table sheet select input separator
```

- [ ] **Step 3: Ajustar tokens de color en `app/globals.css`**

Busca el bloque `:root` generado por shadcn y reemplaza el color primario para que use el azul sky (#0ea5e9):

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 199 89% 48%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 199 89% 48%;
  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 4: Verificar que la app compila**

```bash
npm run build
```

Expected: build success sin errores de CSS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui with sky blue design tokens"
```

---

## Task 2: Migración Supabase — añadir rol, auth_id, config table

**Files:**
- Create: `supabase/migrations/002_add_rol_config.sql`

- [ ] **Step 1: Crear fichero de migración**

```sql
-- supabase/migrations/002_add_rol_config.sql

-- Añadir rol y auth_id a usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'subscriber'
    CHECK (rol IN ('admin', 'subscriber')),
  ADD COLUMN IF NOT EXISTS auth_id uuid,
  ADD COLUMN IF NOT EXISTS preferencias jsonb DEFAULT '{}';

-- Poblar auth_id para usuarios existentes (match por email)
UPDATE usuarios u
SET auth_id = a.id
FROM auth.users a
WHERE a.email = u.email
  AND u.auth_id IS NULL;

-- Tabla de configuración del pipeline
CREATE TABLE IF NOT EXISTS config (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO config (clave, valor) VALUES
  ('score_minimo', '5'::jsonb),
  ('territorios_activos', '["nacional","madrid","cataluña","valencia","andalucia"]'::jsonb),
  ('fuentes_activas', '["BOE","BOCM","DOGC"]'::jsonb)
ON CONFLICT (clave) DO NOTHING;
```

- [ ] **Step 2: Ejecutar la migración en Supabase**

En el dashboard de Supabase → SQL Editor, pega y ejecuta el contenido del fichero.

O si usas Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Marcar el usuario admin actual con rol='admin'**

En Supabase SQL Editor:
```sql
UPDATE usuarios SET rol = 'admin' WHERE email = 'TU_EMAIL_ADMIN@ejemplo.com';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_add_rol_config.sql
git commit -m "chore: add rol, auth_id, preferencias to usuarios; add config table"
```

---

## Task 3: Actualizar tipos en lib/supabase.ts

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Escribir test de tipos**

```typescript
// tests/lib/supabase.types.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { Usuario } from '@/lib/supabase'

describe('Usuario type', () => {
  it('debe incluir campo rol', () => {
    expectTypeOf<Usuario['rol']>().toEqualTypeOf<'admin' | 'subscriber'>()
  })
  it('debe incluir auth_id', () => {
    expectTypeOf<Usuario['auth_id']>().toEqualTypeOf<string | null>()
  })
  it('debe incluir preferencias', () => {
    expectTypeOf<Usuario['preferencias']>().toEqualTypeOf<Record<string, unknown>>()
  })
})
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
npm test tests/lib/supabase.types.test.ts
```

Expected: FAIL — `Property 'rol' does not exist on type 'Usuario'`

- [ ] **Step 3: Actualizar la interfaz `Usuario` en `lib/supabase.ts`**

Localiza la interfaz `Usuario` (líneas 46-59) y reemplázala:

```typescript
export type Rol = 'admin' | 'subscriber'

export interface Usuario {
  id: string
  email: string
  nombre: string
  telegram_id: string | null
  territorios: string[]
  subtemas: string[]
  afectado_como: string[]
  urgencia_minima: Urgencia
  score_minimo: number
  plan: Plan
  activo: boolean
  rol: Rol
  auth_id: string | null
  preferencias: Record<string, unknown>
  created_at: string
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
npm test tests/lib/supabase.types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts tests/lib/supabase.types.test.ts
git commit -m "feat: add rol, auth_id, preferencias to Usuario type"
```

---

## Task 4: Crear lib/auth.ts — helper de sesión con rol

**Files:**
- Create: `lib/auth.ts`
- Create: `tests/lib/auth.test.ts`

- [ ] **Step 1: Escribir tests**

```typescript
// tests/lib/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

// Mock de next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}))

// Mock de lib/supabase
vi.mock('@/lib/supabase', () => ({
  createNextServerClient: vi.fn(),
}))

import { createServerClient } from '@supabase/ssr'
import { createNextServerClient } from '@/lib/supabase'

describe('getAuthUser', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('devuelve null si no hay sesión', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toBeNull()
  })

  it('devuelve null si el usuario no está en la tabla usuarios', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'uuid-1', email: 'a@b.com' } } },
      })},
    } as never)
    vi.mocked(createNextServerClient).mockReturnValue({
      from: () => ({ select: () => ({ or: () => ({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toBeNull()
  })

  it('devuelve AuthUser con rol admin', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'uuid-1', email: 'admin@test.com' } } },
      })},
    } as never)
    vi.mocked(createNextServerClient).mockReturnValue({
      from: () => ({ select: () => ({ or: () => ({ single: vi.fn().mockResolvedValue({
        data: { id: 'u-1', rol: 'admin', plan: 'pro', nombre: 'Admin' },
      }) }) }) }),
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toMatchObject({ rol: 'admin', email: 'admin@test.com' })
  })
})
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
npm test tests/lib/auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Crear `lib/auth.ts`**

```typescript
// lib/auth.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNextServerClient } from '@/lib/supabase'
import type { Rol, Plan } from '@/lib/supabase'

export type AuthUser = {
  authId: string
  email: string
  rol: Rol
  plan: Plan
  usuarioId: string
  nombre: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { session } } = await supabaseAuth.auth.getSession()
  if (!session) return null

  const db = createNextServerClient()
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, rol, plan, nombre')
    .or(`auth_id.eq.${session.user.id},email.eq.${session.user.email}`)
    .single()

  if (!usuario) return null

  return {
    authId: session.user.id,
    email: session.user.email!,
    rol: usuario.rol as Rol,
    plan: usuario.plan as Plan,
    usuarioId: usuario.id,
    nombre: usuario.nombre,
  }
}
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
npm test tests/lib/auth.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add getAuthUser helper with role lookup"
```

---

## Task 5: Reescribir middleware y home page para routing por rol

**Files:**
- Modify: `middleware.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Reescribir `middleware.ts`**

El middleware solo protege rutas — la redirección por rol la hace la home page:

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ROUTES = ['/admin']
const SUBSCRIBER_ROUTES = ['/alertas', '/alerta', '/cuenta']
const PUBLIC_ROUTES = ['/login', '/registro']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const isProtected =
    ADMIN_ROUTES.some(r => pathname.startsWith(r)) ||
    SUBSCRIBER_ROUTES.some(r => pathname.startsWith(r))

  if (!isProtected) return NextResponse.next()

  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(
    c => c.name.includes('-auth-token') && c.value.length > 0
  )

  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/alertas/:path*', '/alerta/:path*', '/cuenta/:path*'],
}
```

- [ ] **Step 2: Reescribir `app/page.tsx` para redirigir por rol**

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  if (user.rol === 'admin') redirect('/admin/dashboard')
  redirect('/alertas')
}
```

- [ ] **Step 3: Actualizar login page para redirigir a `/` en vez de `/editorial`**

En `app/login/page.tsx` (aún en la ruta antigua, moveremos en task 7), busca la línea:
```typescript
router.push('/editorial')
```
Y cámbiala a:
```typescript
router.push('/')
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: build success.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts app/page.tsx app/login/page.tsx
git commit -m "feat: role-based routing — middleware guards + home redirect"
```

---

## Task 6: Crear AdminSidebar y layout del portal admin

**Files:**
- Create: `app/components/layouts/AdminSidebar.tsx`
- Create: `app/(admin)/layout.tsx`

- [ ] **Step 1: Crear `app/components/layouts/AdminSidebar.tsx`**

```tsx
// app/components/layouts/AdminSidebar.tsx
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
  badge?: number
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
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-500 rounded-lg" />
          <span className="font-bold text-sm text-slate-900 tracking-tight">RegTrack</span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium tracking-widest mt-1 uppercase">Admin</p>
      </div>

      {/* Nav */}
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

      {/* Footer */}
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
```

- [ ] **Step 2: Instalar lucide-react**

```bash
npm install lucide-react
```

- [ ] **Step 3: Crear `app/(admin)/layout.tsx`**

```tsx
// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { AdminSidebar } from '@/app/components/layouts/AdminSidebar'
import { createNextServerClient } from '@/lib/supabase'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  if (user.rol !== 'admin') redirect('/alertas')

  // Contar pendientes para el badge del sidebar
  const db = createNextServerClient()
  const { count } = await db
    .from('alertas')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente_revision')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar pendientes={count ?? 0} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: build success.

- [ ] **Step 5: Commit**

```bash
git add app/components/layouts/AdminSidebar.tsx app/'(admin)'/layout.tsx
git commit -m "feat: admin sidebar + layout with role guard"
```

---

## Task 7: Crear SubscriberSidebar y layout del portal suscriptor

**Files:**
- Create: `app/components/layouts/SubscriberSidebar.tsx`
- Create: `app/(subscriber)/layout.tsx`

- [ ] **Step 1: Crear `app/components/layouts/SubscriberSidebar.tsx`**

```tsx
// app/components/layouts/SubscriberSidebar.tsx
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
      {/* Logo + plan badge */}
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

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/alertas' && pathname.startsWith(item.href.split('#')[0]))
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

      {/* Upgrade banner (solo free) */}
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

      {/* Footer */}
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
```

- [ ] **Step 2: Crear `app/(subscriber)/layout.tsx`**

```tsx
// app/(subscriber)/layout.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { SubscriberSidebar } from '@/app/components/layouts/SubscriberSidebar'

export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  if (user.rol !== 'subscriber') redirect('/admin/dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SubscriberSidebar nombre={user.nombre} plan={user.plan} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add app/components/layouts/SubscriberSidebar.tsx app/'(subscriber)'/layout.tsx
git commit -m "feat: subscriber sidebar + layout with role guard"
```

---

## Task 8: Componentes UI compartidos

**Files:**
- Create: `app/components/ui/StatCard.tsx`
- Create: `app/components/ui/PlanBadge.tsx`
- Create: `app/components/ui/UpgradeBanner.tsx`
- Create: `app/components/ui/FilterBar.tsx`

- [ ] **Step 1: Crear `app/components/ui/StatCard.tsx`**

```tsx
// app/components/ui/StatCard.tsx
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
```

- [ ] **Step 2: Crear `app/components/ui/PlanBadge.tsx`**

```tsx
// app/components/ui/PlanBadge.tsx
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
```

- [ ] **Step 3: Crear `app/components/ui/FilterBar.tsx`**

```tsx
// app/components/ui/FilterBar.tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useCallback } from 'react'

type FilterOption = { value: string; label: string }

type FilterConfig = {
  key: string
  placeholder: string
  options: FilterOption[]
}

type Props = {
  filters: FilterConfig[]
  searchKey?: string
  searchPlaceholder?: string
}

export function FilterBar({ filters, searchKey, searchPlaceholder }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {searchKey && (
        <Input
          placeholder={searchPlaceholder ?? 'Buscar...'}
          defaultValue={searchParams.get(searchKey) ?? ''}
          onChange={e => updateParam(searchKey, e.target.value)}
          className="w-48 h-8 text-sm"
        />
      )}
      {filters.map(filter => (
        <Select
          key={filter.key}
          defaultValue={searchParams.get(filter.key) ?? 'all'}
          onValueChange={val => updateParam(filter.key, val)}
        >
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.placeholder}</SelectItem>
            {filter.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/
git commit -m "feat: shared UI components (StatCard, PlanBadge, FilterBar)"
```

---

## Task 9: Rediseñar página de Login

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Delete: `app/login/page.tsx` (mover al route group)

- [ ] **Step 1: Crear directorio y fichero**

```tsx
// app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) {
        setErrorMsg(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setErrorMsg(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-sky-500 rounded-lg" />
          <span className="text-lg font-bold text-slate-900 tracking-tight">RegTrack</span>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-1">Acceder</h1>
        <p className="text-sm text-slate-500 mb-6">Inteligencia regulatoria inmobiliaria</p>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Eliminar el fichero antiguo**

```bash
rm "app/login/page.tsx"
rmdir "app/login"
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: success. La ruta `/login` sigue funcionando desde el route group `(auth)`.

- [ ] **Step 4: Commit**

```bash
git add app/'(auth)'/login/page.tsx
git rm app/login/page.tsx
git commit -m "feat: redesign login page with Clean & Light style"
```

---

## Task 10: Portal Admin — Dashboard page

**Files:**
- Create: `app/(admin)/admin/dashboard/page.tsx`
- Delete: `app/dashboard/page.tsx`

- [ ] **Step 1: Crear `app/(admin)/admin/dashboard/page.tsx`**

```tsx
// app/(admin)/admin/dashboard/page.tsx
import { createNextServerClient } from '@/lib/supabase'
import { StatCard } from '@/app/components/ui/StatCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const db = createNextServerClient()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const [hoy, ayer, pendientes, aprobadas, enviadas, usuarios] = await Promise.all([
    db.from('alertas').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
    db.from('alertas').select('id', { count: 'exact', head: true })
      .gte('created_at', `${yesterday}T00:00:00Z`)
      .lt('created_at', `${today}T00:00:00Z`),
    db.from('alertas').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente_revision'),
    db.from('alertas').select('id', { count: 'exact', head: true }).eq('estado', 'aprobada'),
    db.from('alertas').select('id', { count: 'exact', head: true }).eq('estado', 'enviada'),
    db.from('usuarios').select('id, plan', { count: 'exact' }).eq('activo', true),
  ])

  const countHoy = hoy.count ?? 0
  const countAyer = ayer.count ?? 1
  const trend = countHoy > countAyer ? 'up' : countHoy < countAyer ? 'down' : 'neutral'
  const trendPct = Math.round(((countHoy - countAyer) / (countAyer || 1)) * 100)
  const usuarioData = usuarios.data ?? []

  return {
    alertasHoy: countHoy,
    trendSub: `${trendPct >= 0 ? '+' : ''}${trendPct}% vs ayer`,
    trend,
    pendientes: pendientes.count ?? 0,
    aprobadas: aprobadas.count ?? 0,
    enviadas: enviadas.count ?? 0,
    usuariosFree: usuarioData.filter(u => u.plan === 'free').length,
    usuariosPro: usuarioData.filter(u => u.plan === 'pro').length,
    totalUsuarios: usuarioData.length,
  }
}

async function getPendientesPreview() {
  const db = createNextServerClient()
  const { data } = await db
    .from('alertas')
    .select('id, titulo, fuente, urgencia, score_relevancia')
    .eq('estado', 'pendiente_revision')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

export default async function DashboardPage() {
  const [stats, pendientes] = await Promise.all([getStats(), getPendientesPreview()])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <form action="/api/pipeline/run" method="POST">
          <button
            type="submit"
            className="text-sm border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 transition-colors"
          >
            ↻ Ejecutar pipeline
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Procesadas hoy" value={stats.alertasHoy} sub={stats.trendSub} trend={stats.trend as 'up' | 'down' | 'neutral'} />
        <StatCard label="Pendientes" value={stats.pendientes} sub="Requieren revisión" />
        <StatCard label="Enviadas" value={stats.enviadas} sub="A suscriptores" />
        <StatCard label="Usuarios activos" value={stats.totalUsuarios} sub={`${stats.usuariosPro} Pro · ${stats.usuariosFree} Free`} />
      </div>

      {/* Cola editorial preview */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Cola editorial reciente</h2>
          <Link href="/admin/editorial" className="text-xs text-sky-600 hover:text-sky-700">
            Ver todo →
          </Link>
        </div>
        {pendientes.length === 0 ? (
          <p className="text-sm text-slate-400 p-4">No hay alertas pendientes.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {pendientes.map(alerta => (
              <div key={alerta.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${URGENCIA_STYLE[alerta.urgencia ?? 'baja']}`}>
                  {alerta.urgencia}
                </span>
                <p className="text-sm text-slate-700 flex-1 truncate">{alerta.titulo}</p>
                <span className="text-xs text-slate-400 shrink-0">{alerta.fuente} · {alerta.score_relevancia}/10</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Eliminar fichero antiguo**

```bash
rm "app/dashboard/page.tsx"
rmdir "app/dashboard"
```

- [ ] **Step 3: Verificar que `/admin/dashboard` funciona**

```bash
npm run dev
```

Navega a `http://localhost:3000/admin/dashboard`. Deberías ver el nuevo dashboard o ser redirigido a login si no estás autenticado.

- [ ] **Step 4: Commit**

```bash
git add app/'(admin)'/admin/dashboard/page.tsx
git rm app/dashboard/page.tsx
git commit -m "feat: admin dashboard with stats and editorial preview"
```

---

## Task 11: Admin — Cola Editorial + AlertaRow component

**Files:**
- Create: `app/(admin)/admin/editorial/AlertaRow.tsx`
- Create: `app/(admin)/admin/editorial/page.tsx`
- Delete: `app/editorial/AlertaCard.tsx`, `app/editorial/page.tsx`

- [ ] **Step 1: Crear `app/(admin)/admin/editorial/AlertaRow.tsx`**

```tsx
// app/(admin)/admin/editorial/AlertaRow.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Alerta } from '@/lib/supabase'

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

const BORDER_STYLE: Record<string, string> = {
  alta: 'border-l-red-400',
  media: 'border-l-amber-400',
  baja: 'border-l-emerald-400',
}

type Estado = 'pendiente_revision' | 'aprobada' | 'descartada' | 'enviada'

export function AlertaRow({ alerta }: { alerta: Alerta }) {
  const [estado, setEstado] = useState<Estado>(alerta.estado)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAccion(accion: 'aprobar' | 'descartar' | 'enviar') {
    setLoading(accion)
    try {
      if (accion === 'enviar') {
        const res = await fetch(`/api/alertas/${alerta.id}/enviar`, { method: 'POST' })
        if (res.ok) setEstado('enviada')
      } else {
        const res = await fetch(`/api/alertas/${alerta.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion }),
        })
        if (res.ok) setEstado(accion === 'aprobar' ? 'aprobada' : 'descartada')
      }
    } finally {
      setLoading(null)
    }
  }

  if (estado === 'enviada') {
    return (
      <div className="px-4 py-3 flex items-center gap-3 opacity-60">
        <span className="text-xs text-emerald-600 font-medium">✓ Enviada</span>
        <p className="text-sm text-slate-500 truncate flex-1">{alerta.titulo}</p>
      </div>
    )
  }

  if (estado === 'descartada') {
    return (
      <div className="px-4 py-3 flex items-center gap-3 opacity-50">
        <span className="text-xs text-slate-400 font-medium">✕ Descartada</span>
        <p className="text-sm text-slate-400 truncate flex-1">{alerta.titulo}</p>
      </div>
    )
  }

  return (
    <div className={`border-l-2 ${BORDER_STYLE[alerta.urgencia ?? 'baja']} bg-white rounded-lg p-4 space-y-2`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-slate-900 text-sm leading-snug flex-1">{alerta.titulo}</h3>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCIA_STYLE[alerta.urgencia ?? 'baja']}`}>
            {alerta.urgencia}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.score_relevancia}/10
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-3 text-xs text-slate-500">
        <span>📰 {alerta.fuente}</span>
        <span>🏷️ {alerta.subtema}</span>
        <span>📍 {alerta.territorios?.join(', ')}</span>
      </div>

      {/* Resumen */}
      <p className="text-xs text-slate-600 line-clamp-2">{alerta.resumen}</p>
      <p className="text-xs text-sky-700"><strong>Acción:</strong> {alerta.accion_recomendada}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {estado === 'pendiente_revision' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => handleAccion('aprobar')}
              disabled={!!loading}
            >
              {loading === 'aprobar' ? '...' : '✓ Aprobar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleAccion('descartar')}
              disabled={!!loading}
            >
              {loading === 'descartar' ? '...' : '✕ Descartar'}
            </Button>
          </>
        )}
        {estado === 'aprobada' && (
          <>
            <span className="text-xs text-emerald-600 font-medium self-center">✓ Aprobada</span>
            <Button
              size="sm"
              className="ml-auto bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => handleAccion('enviar')}
              disabled={!!loading}
            >
              {loading === 'enviar' ? 'Enviando...' : '→ Enviar ahora'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `app/(admin)/admin/editorial/page.tsx`**

```tsx
// app/(admin)/admin/editorial/page.tsx
import { createNextServerClient } from '@/lib/supabase'
import { AlertaRow } from './AlertaRow'

export const dynamic = 'force-dynamic'

export default async function EditorialPage() {
  const db = createNextServerClient()
  const { data: alertas } = await db
    .from('alertas')
    .select('*')
    .in('estado', ['pendiente_revision', 'aprobada'])
    .order('created_at', { ascending: false })

  const pendientes = alertas?.filter(a => a.estado === 'pendiente_revision') ?? []
  const aprobadas = alertas?.filter(a => a.estado === 'aprobada') ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cola editorial</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pendientes.length} pendientes · {aprobadas.length} aprobadas sin enviar</p>
        </div>
      </div>

      {pendientes.length === 0 && aprobadas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">No hay alertas en cola. Ejecuta el pipeline para procesar nuevas normas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...pendientes, ...aprobadas].map(alerta => (
            <AlertaRow key={alerta.id} alerta={alerta} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Eliminar ficheros antiguos**

```bash
rm "app/editorial/AlertaCard.tsx" "app/editorial/page.tsx"
rmdir "app/editorial"
```

- [ ] **Step 4: Commit**

```bash
git add app/'(admin)'/admin/editorial/
git rm app/editorial/AlertaCard.tsx app/editorial/page.tsx
git commit -m "feat: admin editorial queue with approve/discard/send actions"
```

---

## Task 12: Nueva API route POST /api/alertas/[id]/enviar

**Files:**
- Create: `app/api/alertas/[id]/enviar/route.ts`
- Create: `tests/api/alertas-enviar.test.ts`

- [ ] **Step 1: Escribir tests**

```typescript
// tests/api/alertas-enviar.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase', () => ({
  createNextServerClient: vi.fn(),
}))
vi.mock('@/lib/telegram', () => ({
  notifyUsers: vi.fn().mockResolvedValue(undefined),
}))

import { createNextServerClient } from '@/lib/supabase'

describe('POST /api/alertas/[id]/enviar', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('devuelve 404 si la alerta no existe', async () => {
    vi.mocked(createNextServerClient).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
        update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }),
    } as never)

    const { POST } = await import('@/app/api/alertas/[id]/enviar/route')
    const req = new NextRequest('http://localhost/api/alertas/fake-id/enviar', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'fake-id' }) })
    expect(res.status).toBe(404)
  })

  it('devuelve 400 si la alerta no está aprobada', async () => {
    vi.mocked(createNextServerClient).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({
          data: { id: '1', estado: 'pendiente_revision', texto_alerta: 'txt', texto_alerta_pro: 'txt pro' },
          error: null,
        }) }) }),
      }),
    } as never)

    const { POST } = await import('@/app/api/alertas/[id]/enviar/route')
    const req = new NextRequest('http://localhost/api/alertas/1/enviar', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
npm test tests/api/alertas-enviar.test.ts
```

Expected: FAIL — cannot find module

- [ ] **Step 3: Crear `app/api/alertas/[id]/enviar/route.ts`**

Primero revisar si `lib/telegram.ts` tiene una función para notificar usuarios. Si no existe `notifyUsers`, añadirla en el siguiente paso.

```typescript
// app/api/alertas/[id]/enviar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { notifyUsers } from '@/lib/telegram'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createNextServerClient()

  // 1. Obtener la alerta
  const { data: alerta } = await db
    .from('alertas')
    .select('id, estado, texto_alerta, texto_alerta_pro, titulo')
    .eq('id', id)
    .single()

  if (!alerta) return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })
  if (alerta.estado !== 'aprobada') {
    return NextResponse.json({ error: 'Solo se pueden enviar alertas aprobadas' }, { status: 400 })
  }

  // 2. Obtener usuarios activos
  const { data: usuarios } = await db
    .from('usuarios')
    .select('id, telegram_id, plan')
    .eq('activo', true)
    .not('telegram_id', 'is', null)

  if (!usuarios || usuarios.length === 0) {
    return NextResponse.json({ error: 'No hay usuarios con Telegram configurado' }, { status: 422 })
  }

  // 3. Enviar a cada usuario el texto según su plan
  await notifyUsers(
    usuarios.map(u => ({
      telegramId: u.telegram_id!,
      texto: u.plan === 'pro' ? (alerta.texto_alerta_pro ?? alerta.texto_alerta ?? '') : (alerta.texto_alerta ?? ''),
    }))
  )

  // 4. Registrar entregas y actualizar estado
  const entregas = usuarios.map(u => ({
    alerta_id: id,
    usuario_id: u.id,
    enviada_at: new Date().toISOString(),
  }))

  await db.from('entregas').insert(entregas)

  await db.from('alertas').update({ estado: 'enviada' }).eq('id', id)

  return NextResponse.json({ ok: true, enviados: usuarios.length })
}
```

- [ ] **Step 4: Añadir `notifyUsers` a `lib/telegram.ts`**

Leer `lib/telegram.ts` y añadir al final:

```typescript
export async function notifyUsers(recipients: { telegramId: string; texto: string }[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado')

  const results = await Promise.allSettled(
    recipients.map(({ telegramId, texto }) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: texto,
          parse_mode: 'HTML',
        }),
      })
    )
  )

  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) console.warn(`[telegram] ${failed}/${recipients.length} envíos fallaron`)
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
npm test tests/api/alertas-enviar.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/alertas/'[id]'/enviar/route.ts lib/telegram.ts tests/api/alertas-enviar.test.ts
git commit -m "feat: POST /api/alertas/[id]/enviar — distribute alert to subscribers"
```

---

## Task 13: Admin — Alertas históricas page

**Files:**
- Create: `app/(admin)/admin/alertas/page.tsx`

- [ ] **Step 1: Crear `app/(admin)/admin/alertas/page.tsx`**

```tsx
// app/(admin)/admin/alertas/page.tsx
import { createNextServerClient } from '@/lib/supabase'
import { FilterBar } from '@/app/components/ui/FilterBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

const ESTADO_STYLE: Record<string, string> = {
  pendiente_revision: 'bg-amber-50 text-amber-700',
  aprobada: 'bg-sky-50 text-sky-700',
  descartada: 'bg-slate-100 text-slate-500',
  enviada: 'bg-emerald-50 text-emerald-700',
}

type SearchParams = {
  fuente?: string
  estado?: string
  urgencia?: string
  q?: string
  page?: string
}

const PAGE_SIZE = 25

export default async function AlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1') - 1
  const db = createNextServerClient()

  let query = db
    .from('alertas')
    .select('id, titulo, fuente, urgencia, estado, score_relevancia, created_at, subtema', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (params.fuente && params.fuente !== 'all') query = query.eq('fuente', params.fuente)
  if (params.estado && params.estado !== 'all') query = query.eq('estado', params.estado)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)
  if (params.q) query = query.ilike('titulo', `%${params.q}%`)

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} en total</p>
      </div>

      <div className="mb-4">
        <FilterBar
          searchKey="q"
          searchPlaceholder="Buscar por título..."
          filters={[
            { key: 'fuente', placeholder: 'Fuente', options: [
              { value: 'BOE', label: 'BOE' },
              { value: 'BOCM', label: 'BOCM' },
              { value: 'DOGC', label: 'DOGC' },
            ]},
            { key: 'urgencia', placeholder: 'Urgencia', options: [
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Media' },
              { value: 'baja', label: 'Baja' },
            ]},
            { key: 'estado', placeholder: 'Estado', options: [
              { value: 'pendiente_revision', label: 'Pendiente' },
              { value: 'aprobada', label: 'Aprobada' },
              { value: 'enviada', label: 'Enviada' },
              { value: 'descartada', label: 'Descartada' },
            ]},
          ]}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Título</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-20">Fuente</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-24">Urgencia</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-28">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-16">Score</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-24">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {alertas?.map(a => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 line-clamp-1">{a.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.subtema}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{a.fuente}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCIA_STYLE[a.urgencia ?? 'baja']}`}>
                    {a.urgencia}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_STYLE[a.estado]}`}>
                    {a.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{a.score_relevancia}/10</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`?${new URLSearchParams({ ...params, page: String(p) })}`}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                p === page + 1
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Eliminar fichero antiguo si existe**

```bash
ls app/alertas 2>/dev/null && rm -rf app/alertas || echo "no hay app/alertas"
```

- [ ] **Step 3: Commit**

```bash
git add app/'(admin)'/admin/alertas/page.tsx
git commit -m "feat: admin alertas historicas with filters and pagination"
```

---

## Task 14: Admin — Usuarios page (rediseño)

**Files:**
- Create: `app/(admin)/admin/usuarios/page.tsx`
- Create: `app/(admin)/admin/usuarios/UsuarioRow.tsx`
- Delete: `app/usuarios/page.tsx`, `app/usuarios/UsuarioRow.tsx`

- [ ] **Step 1: Crear `app/(admin)/admin/usuarios/UsuarioRow.tsx`**

```tsx
// app/(admin)/admin/usuarios/UsuarioRow.tsx
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
```

- [ ] **Step 2: Crear `app/(admin)/admin/usuarios/page.tsx`**

```tsx
// app/(admin)/admin/usuarios/page.tsx
import { createNextServerClient } from '@/lib/supabase'
import { UsuarioRow } from './UsuarioRow'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const db = createNextServerClient()
  const { data: usuarios, count } = await db
    .from('usuarios')
    .select('*', { count: 'exact' })
    .eq('rol', 'subscriber')
    .order('created_at', { ascending: false })

  const activos = (usuarios ?? []).filter(u => u.activo).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{activos} activos · {count ?? 0} en total</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Telegram ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Territorios</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Acciones</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Alta</th>
            </tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map(u => <UsuarioRow key={u.id} usuario={u} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Eliminar ficheros antiguos**

```bash
rm app/usuarios/page.tsx app/usuarios/UsuarioRow.tsx
rmdir app/usuarios
```

- [ ] **Step 4: Commit**

```bash
git add app/'(admin)'/admin/usuarios/
git rm app/usuarios/page.tsx app/usuarios/UsuarioRow.tsx
git commit -m "feat: admin usuarios page redesign with PlanBadge"
```

---

## Task 15: Admin — Config page + API /api/config

**Files:**
- Create: `app/(admin)/admin/config/page.tsx`
- Create: `app/api/config/route.ts`

- [ ] **Step 1: Crear `app/api/config/route.ts`**

```typescript
// app/api/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'

export async function GET() {
  const db = createNextServerClient()
  const { data, error } = await db.from('config').select('clave, valor')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const config = Object.fromEntries((data ?? []).map(r => [r.clave, r.valor]))
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>
  const db = createNextServerClient()

  const allowed = ['score_minimo', 'territorios_activos', 'fuentes_activas']
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  await Promise.all(
    updates.map(([clave, valor]) =>
      db.from('config')
        .upsert({ clave, valor, updated_at: new Date().toISOString() })
        .eq('clave', clave)
    )
  )

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Crear `app/(admin)/admin/config/page.tsx`**

```tsx
// app/(admin)/admin/config/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Config = {
  score_minimo: number
  territorios_activos: string[]
  fuentes_activas: string[]
}

const TERRITORIOS_OPCIONES = ['nacional', 'madrid', 'cataluña', 'valencia', 'andalucia', 'pais-vasco', 'galicia']
const FUENTES_OPCIONES = ['BOE', 'BOCM', 'DOGC']

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
      .then(data => {
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
        {/* Score mínimo */}
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

        {/* Fuentes */}
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

        {/* Territorios */}
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
```

- [ ] **Step 3: Eliminar page antigua de config si existe**

```bash
ls app/config 2>/dev/null && rm -rf app/config || echo "no hay app/config"
```

- [ ] **Step 4: Commit**

```bash
git add app/'(admin)'/admin/config/page.tsx app/api/config/route.ts
git commit -m "feat: admin config page + GET/PUT /api/config"
```

---

## Task 16: Subscriber — AlertaCard component

**Files:**
- Create: `app/components/ui/AlertaCard.tsx`

- [ ] **Step 1: Crear `app/components/ui/AlertaCard.tsx`**

```tsx
// app/components/ui/AlertaCard.tsx
import Link from 'next/link'
import type { Alerta, Plan } from '@/lib/supabase'

const BORDER_COLOR: Record<string, string> = {
  alta: 'border-l-red-400',
  media: 'border-l-amber-400',
  baja: 'border-l-emerald-400',
}

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

type Props = {
  alerta: Alerta
  plan: Plan
}

export function AlertaCard({ alerta, plan }: Props) {
  const isPro = plan === 'pro'
  const urgencia = alerta.urgencia ?? 'baja'

  return (
    <div className={`bg-white border border-slate-200 border-l-2 ${BORDER_COLOR[urgencia]} rounded-lg p-4 space-y-2`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-slate-900 text-sm leading-snug flex-1">{alerta.titulo}</h3>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCIA_STYLE[urgencia]}`}>
            {alerta.urgencia}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.score_relevancia}/10
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span>{alerta.fuente}</span>
        <span>{alerta.subtema}</span>
        <span>{alerta.territorios?.join(', ')}</span>
      </div>

      {/* Resumen (visible para todos) */}
      <p className="text-xs text-slate-600 line-clamp-3">{alerta.resumen}</p>

      {/* Contenido pro */}
      {isPro ? (
        <div className="text-xs space-y-1 pt-1">
          <p className="text-sky-700"><strong>Impacto:</strong> {alerta.impacto}</p>
          <p className="text-slate-600"><strong>Acción:</strong> {alerta.accion_recomendada}</p>
        </div>
      ) : (
        <div className="bg-sky-50 border border-sky-100 rounded-md p-2.5 text-center">
          <p className="text-xs font-semibold text-sky-700 mb-0.5">🔒 Análisis completo en Pro</p>
          <p className="text-[11px] text-slate-500">Impacto, acción recomendada y plazos</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-400">
          {alerta.fecha_publicacion
            ? new Date(alerta.fecha_publicacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            : ''}
        </span>
        <Link
          href={`/alerta/${alerta.id}`}
          className="text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ui/AlertaCard.tsx
git commit -m "feat: AlertaCard subscriber component (free/pro modes)"
```

---

## Task 17: Subscriber — Feed de alertas page

**Files:**
- Create: `app/(subscriber)/alertas/page.tsx`

- [ ] **Step 1: Crear `app/(subscriber)/alertas/page.tsx`**

```tsx
// app/(subscriber)/alertas/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'

export const dynamic = 'force-dynamic'

type SearchParams = { fuente?: string; urgencia?: string; page?: string }

const PAGE_SIZE = 20

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams])

  if (!user) redirect('/login')

  const page = parseInt(params.page ?? '1') - 1
  const db = createNextServerClient()

  let query = db
    .from('alertas')
    .select('*', { count: 'exact' })
    .eq('estado', 'enviada')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (params.fuente && params.fuente !== 'all') query = query.eq('fuente', params.fuente)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mis alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} alertas</p>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: 'fuente', placeholder: 'Fuente', options: [
              { value: 'BOE', label: 'BOE' },
              { value: 'BOCM', label: 'BOCM' },
              { value: 'DOGC', label: 'DOGC' },
            ]},
            { key: 'urgencia', placeholder: 'Urgencia', options: [
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Media' },
              { value: 'baja', label: 'Baja' },
            ]},
          ]}
        />
      </div>

      {!alertas?.length ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">No hay alertas disponibles todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(alerta => (
            <AlertaCard key={alerta.id} alerta={alerta} plan={user.plan} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`?${new URLSearchParams({ ...params, page: String(p) })}`}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                p === page + 1
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/'(subscriber)'/alertas/page.tsx
git commit -m "feat: subscriber alertas feed with free/pro rendering"
```

---

## Task 18: Subscriber — Detalle de alerta page

**Files:**
- Create: `app/(subscriber)/alerta/[id]/page.tsx`

- [ ] **Step 1: Crear `app/(subscriber)/alerta/[id]/page.tsx`**

```tsx
// app/(subscriber)/alerta/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AlertaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([getAuthUser(), params])

  if (!user) redirect('/login')

  const db = createNextServerClient()
  const { data: alerta } = await db
    .from('alertas')
    .select('*')
    .eq('id', id)
    .eq('estado', 'enviada')
    .single()

  if (!alerta) notFound()

  const isPro = user.plan === 'pro'

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <div className="p-6 max-w-2xl">
      {/* Back */}
      <Link href="/alertas" className="text-xs text-sky-600 hover:text-sky-700 mb-4 inline-block">
        ← Volver a alertas
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex gap-2 mb-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.fuente}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.tipo_norma}
          </span>
          {alerta.urgencia === 'alta' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
              Urgencia alta
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-900 leading-snug mb-3">{alerta.titulo}</h1>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>📅 Publicación: {formatDate(alerta.fecha_publicacion)}</span>
          <span>⚡ Entrada en vigor: {formatDate(alerta.fecha_entrada_vigor)}</span>
          <span>🏷️ {alerta.subtema}</span>
          <span>📍 {alerta.territorios?.join(', ')}</span>
        </div>
        <a
          href={alerta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-sky-600 hover:text-sky-700 underline"
        >
          Ver documento oficial →
        </a>
      </div>

      {/* Secciones */}
      <div className="space-y-3">
        <Section title="Resumen">
          <p className="text-sm text-slate-600">{alerta.resumen}</p>
        </Section>

        {isPro ? (
          <>
            <Section title="Impacto">
              <p className="text-sm text-slate-600">{alerta.impacto}</p>
            </Section>
            <Section title="Colectivos afectados">
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                {alerta.afectados?.map(a => <li key={a}>{a}</li>)}
              </ul>
            </Section>
            <Section title="Acción recomendada">
              <p className="text-sm text-sky-700 font-medium">{alerta.accion_recomendada}</p>
            </Section>
            {alerta.plazo_adaptacion && (
              <Section title="Plazo de adaptación">
                <p className="text-sm text-slate-600">{alerta.plazo_adaptacion} días</p>
              </Section>
            )}
            {alerta.deroga_modifica && (
              <Section title="Deroga / modifica">
                <p className="text-sm text-slate-600">{alerta.deroga_modifica}</p>
              </Section>
            )}
          </>
        ) : (
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-5 text-center">
            <p className="text-sm font-bold text-sky-700 mb-1">🔒 Análisis completo disponible en Pro</p>
            <p className="text-xs text-slate-500 mb-3">
              Impacto detallado, acción recomendada, colectivos afectados y plazos de adaptación.
            </p>
            <Link
              href="/cuenta#planes"
              className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
            >
              Ver planes Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h2>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/'(subscriber)'/alerta/'[id]'/page.tsx
git commit -m "feat: subscriber alerta detail page with pro/free gating"
```

---

## Task 19: Subscriber — Cuenta page + API /api/cuenta

**Files:**
- Create: `app/(subscriber)/cuenta/page.tsx`
- Create: `app/api/cuenta/route.ts`

- [ ] **Step 1: Crear `app/api/cuenta/route.ts`**

```typescript
// app/api/cuenta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const allowed: Record<string, unknown> = {}

  if (typeof body.nombre === 'string' && body.nombre.trim()) {
    allowed.nombre = body.nombre.trim()
  }
  if (typeof body.telegram_id === 'string') {
    allowed.telegram_id = body.telegram_id.trim() || null
  }
  if (body.preferencias && typeof body.preferencias === 'object') {
    allowed.preferencias = body.preferencias
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const db = createNextServerClient()
  const { error } = await db
    .from('usuarios')
    .update(allowed)
    .eq('id', user.usuarioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Crear `app/(subscriber)/cuenta/page.tsx`**

```tsx
// app/(subscriber)/cuenta/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlanBadge } from '@/app/components/ui/PlanBadge'
import type { Plan } from '@/lib/supabase'

type DatosUsuario = {
  nombre: string
  email: string
  telegram_id: string | null
  plan: Plan
  created_at: string
}

export default function CuentaPage() {
  const [datos, setDatos] = useState<DatosUsuario | null>(null)
  const [nombre, setNombre] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/cuenta')
      .then(r => r.json())
      .then((data: DatosUsuario) => {
        setDatos(data)
        setNombre(data.nombre)
        setTelegramId(data.telegram_id ?? '')
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/cuenta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telegram_id: telegramId }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!datos) return <div className="p-6 text-sm text-slate-400">Cargando...</div>

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Mi cuenta</h1>

      {/* Plan actual */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Plan actual</h2>
        <div className="flex items-center gap-2">
          <PlanBadge plan={datos.plan} />
          <span className="text-sm text-slate-600">
            {datos.plan === 'pro' ? 'Acceso completo a análisis de impacto' : 'Resumen básico de alertas'}
          </span>
        </div>
        {datos.plan === 'free' && (
          <div id="planes" className="mt-3 p-3 bg-sky-50 border border-sky-100 rounded-md">
            <p className="text-xs text-sky-700 font-semibold mb-1">Upgrade a Pro</p>
            <p className="text-xs text-slate-500">Contacta con nosotros para activar el plan Pro.</p>
          </div>
        )}
      </div>

      {/* Datos personales */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos personales</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre</label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
            <Input value={datos.email} disabled className="opacity-60" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block" id="notificaciones">
              Telegram ID
            </label>
            <Input
              placeholder="Ej: 123456789"
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Escribe a <strong>@userinfobot</strong> en Telegram para obtener tu ID.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving} className="bg-sky-500 hover:bg-sky-600">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {saved && <span className="text-xs text-emerald-600">✓ Guardado</span>}
          </div>
        </form>
      </div>

      {/* Miembro desde */}
      <p className="text-xs text-slate-400">
        Miembro desde {new Date(datos.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Añadir `GET /api/cuenta` a `route.ts`**

Edita `app/api/cuenta/route.ts` y añade el método GET antes del PUT:

```typescript
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()
  const { data } = await db
    .from('usuarios')
    .select('nombre, email, telegram_id, plan, created_at')
    .eq('id', user.usuarioId)
    .single()

  if (!data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Commit**

```bash
git add app/'(subscriber)'/cuenta/page.tsx app/api/cuenta/route.ts
git commit -m "feat: subscriber cuenta page + GET/PUT /api/cuenta"
```

---

## Task 20: API route POST /api/pipeline/run y logout

**Files:**
- Create: `app/api/pipeline/run/route.ts`
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Crear `app/api/pipeline/run/route.ts`**

```typescript
// app/api/pipeline/run/route.ts
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Lanzar pipeline en background — no esperamos a que termine
  execAsync('npm run pipeline').catch(err => {
    console.error('[pipeline/run] Error:', err.message)
  })

  return NextResponse.json({ ok: true, message: 'Pipeline iniciado' })
}
```

- [ ] **Step 2: Crear `app/api/auth/logout/route.ts`**

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
```

- [ ] **Step 3: Añadir `NEXT_PUBLIC_SITE_URL` al `.env.local`**

```bash
echo 'NEXT_PUBLIC_SITE_URL=http://localhost:3000' >> .env.local
```

- [ ] **Step 4: Commit**

```bash
git add app/api/pipeline/run/route.ts app/api/auth/logout/route.ts
git commit -m "feat: POST /api/pipeline/run + POST /api/auth/logout"
```

---

## Task 21: Sidebar responsive — Sheet drawer para móvil

**Files:**
- Create: `app/components/layouts/MobileNav.tsx`
- Modify: `app/(admin)/layout.tsx`
- Modify: `app/(subscriber)/layout.tsx`

- [ ] **Step 1: Crear `app/components/layouts/MobileNav.tsx`**

```tsx
// app/components/layouts/MobileNav.tsx
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden p-2 text-slate-600 hover:text-slate-900">
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-52">
        {sidebar}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Actualizar `app/(admin)/layout.tsx` para móvil**

Reemplaza el return del layout con:

```tsx
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <AdminSidebar pendientes={count ?? 0} />
      </div>
      <main className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
          <MobileNav sidebar={<AdminSidebar pendientes={count ?? 0} />} />
          <span className="font-bold text-sm text-slate-900">RegTrack</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">Admin</span>
        </div>
        {children}
      </main>
    </div>
  )
```

Añadir al import:
```tsx
import { MobileNav } from '@/app/components/layouts/MobileNav'
```

- [ ] **Step 3: Actualizar `app/(subscriber)/layout.tsx` para móvil**

Reemplaza el return:

```tsx
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:flex">
        <SubscriberSidebar nombre={user.nombre} plan={user.plan} />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
          <MobileNav sidebar={<SubscriberSidebar nombre={user.nombre} plan={user.plan} />} />
          <span className="font-bold text-sm text-slate-900">RegTrack</span>
        </div>
        {children}
      </main>
    </div>
  )
```

Añadir al import:
```tsx
import { MobileNav } from '@/app/components/layouts/MobileNav'
```

- [ ] **Step 4: Build y prueba final**

```bash
npm run build
```

Expected: build success sin errores.

- [ ] **Step 5: Commit final**

```bash
git add app/components/layouts/MobileNav.tsx app/'(admin)'/layout.tsx app/'(subscriber)'/layout.tsx
git commit -m "feat: responsive mobile sidebar with Sheet drawer"
```

---

## Self-Review

### Spec coverage checklist

| Requisito del spec | Task |
|---|---|
| Route groups (admin)(subscriber)(auth) | Tasks 5, 6, 7, 9 |
| Middleware por rol | Task 5 |
| Admin dashboard con stats y pipeline | Task 10 |
| Cola editorial aprobar/descartar/enviar | Task 11, 12 |
| Alertas históricas con filtros | Task 13 |
| Admin usuarios gestión | Task 14 |
| Admin config pipeline | Task 15 |
| Subscriber feed alertas free/pro | Task 17 |
| Subscriber detalle alerta | Task 18 |
| Subscriber cuenta + telegram | Task 19 |
| Migración DB: rol, auth_id, config | Task 2, 3 |
| lib/auth.ts getAuthUser | Task 4 |
| POST /api/alertas/[id]/enviar | Task 12 |
| GET/PUT /api/config | Task 15 |
| GET/PUT /api/cuenta | Task 19 |
| POST /api/pipeline/run | Task 20 |
| Logout | Task 20 |
| shadcn/ui + tokens sky blue | Task 1 |
| Responsive mobile | Task 21 |
| notifyUsers en lib/telegram.ts | Task 12 |

### Sin gaps detectados. Plan completo.
