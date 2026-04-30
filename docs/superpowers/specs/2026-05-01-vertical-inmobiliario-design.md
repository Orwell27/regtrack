# Vertical Inmobiliario — RegTrack

**Fecha:** 2026-05-01
**Alcance:** Pipeline de ingesta + portal suscriptor + portal admin + Telegram

## Objetivo

Añadir una capa de clasificación sectorial al sistema existente, comenzando con el sector inmobiliario. Las alertas normativas se etiquetan automáticamente con subcategorías del sector durante el pipeline. Los suscriptores configuran sus intereses y reciben alertas relevantes en grupos de Telegram por subcategoría.

Diseñado para ser extensible a otros sectores (laboral, energético, etc.) añadiendo filas a las tablas de Supabase sin cambios de código.

## Arquitectura general

El pipeline existente (fuentes → Haiku clasificación → Sonnet impacto → Haiku correlación → Supabase → Telegram) añade un paso nuevo tras el de impacto:

```
... → Sonnet impacto → Haiku clasificación sectorial → Supabase → Telegram (grupos)
```

El paso de clasificación sectorial es opcional: si una alerta no supera el umbral de confianza en ninguna subcategoría, se procesa normalmente sin etiqueta sectorial.

## Base de datos

### Tabla `sectores`

```sql
CREATE TABLE sectores (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  activo     BOOLEAN NOT NULL DEFAULT true
);
```

Dato inicial: `{ nombre: 'Inmobiliario', slug: 'inmobiliario', activo: true }`

### Tabla `subcategorias`

```sql
CREATE TABLE subcategorias (
  id         SERIAL PRIMARY KEY,
  sector_id  INTEGER REFERENCES sectores(id),
  slug       TEXT NOT NULL UNIQUE,
  nombre     TEXT NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true
);
```

Taxonomía inicial (sector inmobiliario):

| slug                     | nombre                              |
|--------------------------|-------------------------------------|
| arrendamiento_residencial | Arrendamiento residencial           |
| arrendamiento_comercial  | Arrendamiento comercial             |
| urbanismo                | Urbanismo y ordenación territorial  |
| suelo                    | Suelo y planeamiento                |
| fiscalidad_itp           | ITP / AJD                           |
| fiscalidad_plusvalia     | Plusvalía municipal                 |
| rehabilitacion           | Rehabilitación y eficiencia energética |
| vivienda_protegida       | Vivienda protegida / VPO            |
| zonas_tensionadas        | Zonas tensionadas                   |
| desahucios               | Desahucios y procedimientos         |
| hipotecas                | Hipotecas y financiación            |
| registro_catastro        | Registro y catastro                 |

### Tabla `alerta_sectores`

```sql
CREATE TABLE alerta_sectores (
  alerta_id        UUID REFERENCES alertas(id) ON DELETE CASCADE,
  subcategoria_id  INTEGER REFERENCES subcategorias(id),
  confianza        INTEGER NOT NULL CHECK (confianza BETWEEN 0 AND 100),
  PRIMARY KEY (alerta_id, subcategoria_id)
);
```

Umbral de guardado: confianza ≥ 60.

### Tabla `suscriptor_intereses`

```sql
CREATE TABLE suscriptor_intereses (
  usuario_id       UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  subcategoria_id  INTEGER REFERENCES subcategorias(id),
  PRIMARY KEY (usuario_id, subcategoria_id)
);
```

Solo suscriptores con plan Pro pueden escribir en esta tabla.

### Tabla `telegram_grupos`

```sql
CREATE TABLE telegram_grupos (
  id               SERIAL PRIMARY KEY,
  subcategoria_id  INTEGER REFERENCES subcategorias(id),
  chat_id          TEXT NOT NULL UNIQUE,
  nombre           TEXT NOT NULL,
  invite_link      TEXT,
  activo           BOOLEAN NOT NULL DEFAULT true
);
```

## Pipeline — paso de clasificación sectorial

### Ubicación
`lib/sectorial/clasificar.ts`

### Lógica
1. Recibe el título y resumen de la alerta ya procesada por el paso de impacto.
2. Llama a Claude Haiku con el prompt de clasificación sectorial.
3. El prompt devuelve un array JSON `[{ subcategoria_slug, confianza }]`.
4. Se filtran las entradas con `confianza < 60`.
5. Se insertan en `alerta_sectores`.
6. Si hay resultados, el paso de Telegram posterior busca grupos activos para esas subcategorías y publica.

### Prompt (estructura)
```
Eres un clasificador normativo especializado en derecho inmobiliario español.
Dado el siguiente título y resumen de una norma, indica a qué subcategorías
del sector inmobiliario pertenece y con qué nivel de confianza (0-100).

Subcategorías disponibles: [lista de slugs activos desde BD]

Título: {titulo}
Resumen: {resumen}

Responde SOLO con JSON: [{"subcategoria_slug": "...", "confianza": N}, ...]
Si no es relevante para el sector inmobiliario, responde: []
```

### Rate limiting
Mismo delay de 1.5s que el resto del pipeline.

## Telegram — grupos por subcategoría

### Flujo de publicación
1. Tras clasificación sectorial, se obtienen las subcategorías de la alerta.
2. Para cada subcategoría → query `telegram_grupos` por `subcategoria_id` WHERE `activo = true`.
3. Bot publica en cada grupo encontrado con el mismo formato actual, añadiendo línea de subcategoría.
4. El chat privado admin sigue recibiendo todas las alertas (sin cambio).

### Formato del mensaje en grupo
```
🏠 [Subcategoría]
📋 Título
📍 CCAA · Fuente
⚡ Impacto: N/10

Resumen...

🔗 Ver alerta completa
```

### Gestión de suscriptores
- El admin crea un grupo de Telegram, añade el bot como administrador, copia el `chat_id`.
- Registra el grupo en `/admin/config` → sección "Grupos Telegram".
- Al guardar, el bot envía un mensaje de verificación al grupo.
- El suscriptor Pro ve en `/cuenta` → "Mis grupos" los links de invitación a los grupos de sus subcategorías de interés.

## Portal suscriptor

### `/cuenta` — sección "Mis intereses"
- Lista de subcategorías agrupadas por sector, con checkboxes.
- Solo visible y editable para plan Pro (Free ve sección bloqueada con upsell).
- Guardar actualiza `suscriptor_intereses`.

### `/alertas` — enriquecimiento
- Las alertas que coinciden con los intereses del usuario muestran un badge "Relevante para ti".
- Nuevo toggle en FilterBar: "Solo mis intereses" — filtra la lista mostrando únicamente alertas con subcategorías en el perfil del usuario.
- El filtro de región (mapa) y el de intereses son combinables.

## Portal admin

### `/admin/sectores` (nueva ruta)
- Tabla de sectores con toggle activo/inactivo.
- Por cada sector, lista expandible de subcategorías con toggle activo/inactivo y nombre editable.
- No requiere code deploy para activar/desactivar subcategorías.

### `/admin/config` — sección "Grupos Telegram"
- Formulario: nombre del grupo + `chat_id` + `invite_link` (opcional) + subcategoría asignada.
- Al guardar: bot envía mensaje de verificación al grupo.
- Lista de grupos existentes con subcategoría, estado activo y botón de eliminar.
- El `invite_link` es el link público de Telegram que el admin copia manualmente desde la configuración del grupo. RegTrack lo muestra al suscriptor Pro en su cuenta.

### `/admin/editorial` — alertas enriquecidas
- Las alertas clasificadas muestran badges de subcategoría junto al score de impacto.
- Sin cambios en flujo de revisión.

## Migraciones Supabase

- `007_sectorial.sql` — crea `sectores`, `subcategorias`, `alerta_sectores`, `suscriptor_intereses`, `telegram_grupos` + datos iniciales

## Archivos nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `lib/sectorial/clasificar.ts` | Paso de clasificación en pipeline |
| `lib/sectorial/telegram-grupos.ts` | Publicación en grupos por subcategoría |
| `components/subscriber/MisIntereses.tsx` | UI de configuración de intereses en /cuenta |
| `components/subscriber/BadgeRelevante.tsx` | Badge "Relevante para ti" en lista alertas |
| `components/admin/GruposTelegram.tsx` | Gestión de grupos en admin/config |
| `app/(admin)/admin/sectores/page.tsx` | Página gestión taxonomía |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/pipeline.ts` | Añadir paso `clasificarSectorial` tras impacto |
| `lib/telegram.ts` | Añadir lógica de publicación en grupos |
| `app/(subscriber)/cuenta/page.tsx` | Añadir sección Mis intereses |
| `app/(subscriber)/alertas/page.tsx` | Badge relevante + toggle filtro intereses |
| `app/(admin)/admin/config/page.tsx` | Añadir sección grupos Telegram |
| `app/(admin)/admin/editorial/page.tsx` | Badges subcategoría en tarjetas de alerta |

## Fuera de scope

- Otros sectores (laboral, energético…) — la arquitectura los soporta, pero la taxonomía y el prompt se definen en una iteración futura.
- Billing / Stripe para acceso Pro al vertical — asume el sistema de planes existente.
- Notificaciones push web por subcategoría.
