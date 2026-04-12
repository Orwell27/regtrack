# RegTrack — Rediseño UI/UX completo

**Fecha:** 2026-04-12
**Estado:** Aprobado

---

## Contexto

La app web actual de RegTrack es funcional pero carece de estructura visual clara, sistema de diseño consistente y portal para suscriptores. El pipeline de ingestión (BOE/BOCM/DOGC → Claude → Supabase → Telegram) ya está completo. Este spec cubre el rediseño completo del frontend y la creación del portal suscriptor.

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Estilo visual | Clean & Light (blanco/gris, azul #0ea5e9) | SaaS moderno, legible, escalable |
| Navegación | Sidebar ancho con etiquetas (siempre visible) | Múltiples secciones, navegación clara |
| Portales | Un solo codebase, rutas separadas por rol | Menos mantenimiento, auth compartida |
| Dispositivos | Responsive desktop + móvil | Sidebar → hamburger/bottom nav en móvil |
| Componentes | shadcn/ui como base | Primitivos accesibles, fácil de extender |

---

## Arquitectura de rutas

```
app/
├── (auth)/
│   └── login/                  # Login compartido, redirige por rol post-auth
├── (admin)/
│   ├── layout.tsx               # Guard: rol === 'admin'; sidebar admin
│   ├── dashboard/               # Stats: alertas hoy, pendientes, enviadas, usuarios
│   ├── editorial/               # Cola de alertas pendientes con acciones aprobar/descartar/enviar
│   ├── alertas/                 # Histórico completo con búsqueda y filtros
│   ├── usuarios/                # Gestión de suscriptores (plan, activo, telegram)
│   └── config/                  # Umbrales pipeline (score mínimo, territorios, fuentes)
└── (subscriber)/
    ├── layout.tsx               # Guard: rol === 'subscriber'; sidebar suscriptor
    ├── alertas/                 # Feed de alertas enviadas al usuario
    ├── alerta/[id]/             # Detalle completo: resumen, impacto, acción, plazos
    └── cuenta/                  # Perfil, plan actual, Telegram chat ID, futuro billing
```

### Guards de rol

El middleware existente (`middleware.ts`) se extiende para:
1. Leer el campo `rol` de la tabla `usuarios` tras login
2. Redirigir a `/admin/dashboard` si `rol === 'admin'`
3. Redirigir a `/alertas` si `rol === 'subscriber'`
4. Bloquear acceso cruzado (admin intentando `/alertas` de subscriber y viceversa)

---

## Portal Admin

### Sidebar
- Logo RegTrack + badge "ADMIN"
- Links: Dashboard, Cola editorial (con badge de pendientes), Alertas, Usuarios, Config
- Footer: avatar + nombre + rol
- Color activo: `#eff6ff` fondo, `#0369a1` texto, icono `#0ea5e9`

### Dashboard (`/admin/dashboard`)
- 4 stat cards: Procesadas hoy, Pendientes, Enviadas, Usuarios activos (Free/Pro)
- Las stat cards muestran tendencia vs día anterior donde aplique
- Preview de cola editorial: últimas 5 alertas pendientes con acciones rápidas
- Botón "Ejecutar pipeline" en top bar (llama a `/api/pipeline/run`)

### Cola editorial (`/admin/editorial`)
- Lista de alertas con `estado = 'pendiente_revision'`
- Cada fila: badge urgencia (color), título, fuente, score, botones aprobar/descartar
- Al aprobar: cambia estado a `aprobada` y activa botón "Enviar ahora"
- "Enviar ahora": distribuye `texto_alerta` (free) y `texto_alerta_pro` (pro) a suscriptores vía Telegram, cambia estado a `enviada`
- Filtros: por fuente, urgencia, subtema

### Alertas históricas (`/admin/alertas`)
- Tabla paginada de todas las alertas (cualquier estado)
- Filtros: fuente, estado, urgencia, territorio, rango de fechas
- Búsqueda por texto en título
- Click en fila abre panel lateral con detalle completo

### Usuarios (`/admin/usuarios`)
- Tabla de usuarios activos con columnas: nombre, email, plan, telegram, fecha registro
- Acciones por fila: cambiar plan (free↔pro), activar/desactivar, editar telegram_chat_id

### Config (`/admin/config`)
- Score mínimo de relevancia (slider, default 5)
- Territorios monitorizados (checkboxes: nacional, Madrid, Catalunya, etc.)
- Fuentes activas (BOE, BOCM, DOGC — toggle)
- Estos valores se guardan en una tabla `config` de Supabase (clave-valor)

---

## Portal Suscriptor

### Sidebar
- Logo RegTrack + badge de plan (FREE / PRO)
- Links: Mis alertas, Mi cuenta, Notificaciones
- Banner "Upgrade a Pro" visible solo para usuarios free (CTA a `/cuenta`)
- Footer: avatar + nombre + plan

### Feed de alertas (`/alertas`)
- Lista de alertas con `estado = 'enviada'`, filtradas por `user_id` via RLS
- Cada card: borde izquierdo de color según urgencia (rojo/amarillo/verde), título, fuente, subtema, territorio, score
- Usuario **free**: resumen visible, resto bloqueado con CTA upgrade
- Usuario **pro**: todo visible incluyendo impacto, acción recomendada, plazos
- Filtros: fuente, urgencia, fecha
- "Ver detalle →" lleva a `/alerta/[id]`

### Detalle de alerta (`/alerta/[id]`)
- Título completo, fuente, fecha publicación, fecha entrada en vigor
- Secciones: Resumen, Impacto, Colectivos afectados, Acción recomendada, Plazo de adaptación, Deroga/modifica
- Usuario free: secciones de impacto y acción reemplazadas por CTA upgrade
- Link al documento oficial (url original)

### Mi cuenta (`/cuenta`)
- Datos personales: nombre, email (readonly)
- Plan actual con fecha de renovación (preparado para billing futuro)
- Telegram: campo para introducir/actualizar `telegram_chat_id` con instrucciones
- Preferencias de notificación: urgencias a recibir, territorios (para uso futuro)

---

## Modelo de datos — cambios en Supabase

```sql
-- Añadir campos a tabla usuarios existente
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'subscriber'
    CHECK (rol IN ('admin', 'subscriber')),
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS preferencias jsonb DEFAULT '{}';

-- Tabla de configuración del pipeline
CREATE TABLE IF NOT EXISTS config (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- RLS: suscriptores solo ven alertas enviadas
CREATE POLICY "subscribers_read_sent" ON alertas
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_id FROM usuarios WHERE rol = 'admin')
    OR estado = 'enviada'
  );
```

---

## Sistema de componentes

Todos bajo `app/components/` usando shadcn/ui como base de primitivos.

| Componente | Ubicación | Descripción |
|---|---|---|
| `AdminLayout` | `components/layouts/AdminLayout.tsx` | Shell con sidebar admin |
| `SubscriberLayout` | `components/layouts/SubscriberLayout.tsx` | Shell con sidebar suscriptor |
| `Sidebar` | `components/layouts/Sidebar.tsx` | Sidebar parametrizable (items, role badge) |
| `StatCard` | `components/ui/StatCard.tsx` | Métrica con label, valor y tendencia |
| `AlertaCard` | `components/ui/AlertaCard.tsx` | Card para feed suscriptor (free/pro mode) |
| `AlertaRow` | `components/ui/AlertaRow.tsx` | Fila de cola editorial con acciones |
| `PlanBadge` | `components/ui/PlanBadge.tsx` | Badge FREE / PRO |
| `UpgradeBanner` | `components/ui/UpgradeBanner.tsx` | CTA upgrade en sidebar |
| `FilterBar` | `components/ui/FilterBar.tsx` | Barra de filtros reutilizable |

---

## API routes nuevas

| Ruta | Método | Descripción |
|---|---|---|
| `/api/alertas/[id]/enviar` | POST | Envía alerta aprobada a suscriptores vía Telegram |
| `/api/pipeline/run` | POST | Ejecuta pipeline manualmente (solo admin) |
| `/api/config` | GET/PUT | Lee y actualiza configuración del pipeline |
| `/api/cuenta` | PUT | Actualiza datos de cuenta del suscriptor |

Las rutas existentes (`/api/alertas/[id]` para aprobar/descartar, `/api/usuarios/[id]`) se mantienen.

---

## Comportamiento responsive (móvil)

- Sidebar se oculta y se accede via botón hamburger (overlay)
- En pantallas < 768px el sidebar aparece como drawer desde la izquierda
- Las stat cards del dashboard colapsan a 2 columnas en tablet, 1 en móvil
- Las tablas de admin se convierten en cards apiladas en móvil

---

## Fuera de alcance (para iteraciones futuras)

- Billing / pagos (Stripe) — la UI de cuenta está preparada pero sin integración
- Registro de nuevos suscriptores (por ahora solo admin crea usuarios)
- Notificaciones push web
- Exportación de alertas a PDF/Excel
- Soporte multi-idioma
