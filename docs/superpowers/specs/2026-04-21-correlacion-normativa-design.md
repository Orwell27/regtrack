# Correlación y Progresión Normativa — Diseño

**Fecha:** 2026-04-21
**Estado:** Aprobado
**Proyecto:** RegTrack

---

## Resumen

Añadir una dimensión de correlación inteligente entre alertas normativas. Cuando se ingiere una nueva norma, el sistema detecta automáticamente si existe normativa anterior relacionada (mismo ámbito temático, territorios solapados) y clasifica el tipo de relación. Los suscriptores ven la evolución histórica del tema; los administradores ven las correlaciones al revisar cada alerta.

---

## Arquitectura general

El pipeline actual tiene dos pasos de Claude:

```
Fuente → [1] Haiku (clasificar) → [2] Sonnet (impacto) → Supabase → Telegram
```

Se añade un tercer paso antes de persistir en Supabase:

```
Fuente → [1] Haiku (clasificar) → [2] Sonnet (impacto) → [3] Correlación → Supabase → Telegram
```

**Paso 3 — Correlación:**
1. SQL busca candidatos con subtema del mismo grupo temático y territorios solapados (máx. 10, últimos 2 años)
2. Si hay candidatos, Claude Haiku los analiza y devuelve relaciones con tipo y score
3. Se guardan en `alerta_relaciones` los pares con score ≥ 40

Si no hay candidatos SQL, el paso se salta (coste cero). Si Haiku falla, se loguea el error y la ingesta continúa sin bloqueo.

---

## Modelo de datos

### Nuevo enum

```sql
CREATE TYPE tipo_relacion_enum AS ENUM (
  'progresion',   -- misma materia, evolución temporal
  'deroga',       -- la nueva deroga explícitamente a la anterior
  'modifica',     -- la nueva modifica/enmienda a la anterior
  'complementa'   -- regulan aspectos distintos del mismo tema
);
```

### Nueva tabla

```sql
CREATE TABLE alerta_relaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id             UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  alerta_relacionada_id UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  tipo_relacion         tipo_relacion_enum NOT NULL,
  score_similitud       INTEGER NOT NULL CHECK (score_similitud BETWEEN 0 AND 100),
  razon                 TEXT,
  detectada_en          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (alerta_id, alerta_relacionada_id)
);

CREATE INDEX idx_relaciones_alerta      ON alerta_relaciones(alerta_id);
CREATE INDEX idx_relaciones_relacionada ON alerta_relaciones(alerta_relacionada_id);
```

- Relación guardada una sola vez (A→B); índices en ambas columnas permiten consultar desde cualquier lado.
- `ON DELETE CASCADE` limpia relaciones al borrar una alerta.

### Mapa de grupos temáticos (en código)

`lib/correlacion/subtema-grupos.ts` — no en BD, para iterar sin migraciones:

```ts
export const GRUPOS_TEMATICOS = [
  ['urbanismo', 'construccion', 'obra_nueva', 'suelo', 'rehabilitacion'],
  ['arrendamiento', 'hipotecas', 'vivienda_protegida'],
  ['registro_notaria', 'comunidades_propietarios'],
  ['fiscalidad'],
] as const
```

---

## Paso de correlación — implementación

### Módulo principal

`lib/correlacion/detectar-relaciones.ts`

```ts
detectarRelaciones(alerta: AlertaClasificada): Promise<RelacionDetectada[]>
```

### 1. Query SQL de candidatos

```sql
SELECT id, titulo, subtema, territorios, tipo_norma, fecha_publicacion, resumen
FROM alertas
WHERE subtema = ANY($1)
  AND territorios && $2::jsonb
  AND fecha_publicacion >= NOW() - INTERVAL '2 years'
  AND id != $3
ORDER BY fecha_publicacion DESC
LIMIT 10
```

Parámetros: `$1` = subtemas del grupo, `$2` = territorios de la nueva alerta, `$3` = id de la nueva alerta.

### 2. Prompt a Claude Haiku

```
Eres un analizador de normativa española. Dada una nueva norma y una lista de normas existentes,
determina cuáles están relacionadas y cómo.

NUEVA NORMA:
- Título: {titulo}
- Subtema: {subtema}
- Territorios: {territorios}
- Resumen: {resumen}

NORMAS EXISTENTES:
[lista numerada: título, subtema, fecha, resumen breve]

Devuelve JSON con este formato exacto:
{
  "relaciones": [
    { "id": "<uuid>", "tipo": "progresion|deroga|modifica|complementa", "score": 0-100, "razon": "..." }
  ]
}
Solo incluye normas con score >= 40. Si ninguna está relacionada, devuelve { "relaciones": [] }.
```

### 3. Guardar relaciones

Validar que cada `id` devuelto por Haiku existe en los candidatos SQL antes de insertar. Solo pares con score ≥ 40.

### Integración en pipeline

En `scripts/pipeline.ts`, después del paso de impacto y antes de `upsertAlerta()`:

```ts
const relaciones = await detectarRelaciones(alertaConImpacto)
await guardarRelaciones(alertaConImpacto.id, relaciones)
```

Errores en este paso se capturan y loguan sin interrumpir la ingesta.

---

## Portal admin

En `app/(admin)/admin/editorial/AlertaRow.tsx` se añade una tarjeta **"Normativa relacionada"** en la sección expandida de cada alerta. No existe página de detalle `[id]` en admin — toda la gestión es inline.

**Contenido:**
- Lista de alertas relacionadas ordenadas por score descendente
- Cada item: badge de tipo de relación con color semántico, título, fecha, fuente, score, razón y botón "Ver" (nueva pestaña)
- Colores de badge: `progresion` azul, `deroga` rojo, `modifica` naranja, `complementa` verde
- Si no hay relaciones: "No se han detectado normativas relacionadas para esta alerta"

---

## Portal suscriptor

En `(subscriber)/alerta/[id]` se añade una sección **"Evolución normativa"** debajo del contenido principal.

### Condición de visibilidad
- Solo plan **Pro**. Usuarios free ven el bloque bloqueado con candado y "Disponible en Pro".
- Si hay menos de 2 relaciones, se muestra solo la lista (sin timeline).

### Timeline (componente `<TimelineNormativa />`)
- Línea cronológica vertical de más antiguo (arriba) a más reciente (abajo)
- La alerta actual siempre al final, marcada con `◉` y etiqueta "Esta norma"
- Cada nodo: fecha, título clicable, fuente, badge de tipo de relación, línea de contexto

### Lista de detalle
- Debajo del timeline
- Cada item: título, fuente, fecha, tipo de relación, razon de la correlación, enlace "Ver alerta"

---

## Ficheros afectados / nuevos

| Fichero | Acción |
|---------|--------|
| `supabase/migrations/006_correlacion.sql` | Nuevo — enum + tabla + índices |
| `lib/correlacion/subtema-grupos.ts` | Nuevo — mapa de grupos temáticos |
| `lib/correlacion/detectar-relaciones.ts` | Nuevo — lógica SQL + Haiku |
| `lib/correlacion/guardar-relaciones.ts` | Nuevo — insert en alerta_relaciones |
| `actions/pipeline.ts` | Modificado — añadir paso 3 |
| `app/(admin)/admin/editorial/AlertaRow.tsx` | Modificado — tarjeta de relaciones en sección expandida |
| `components/admin/CardNormativaRelacionada.tsx` | Nuevo |
| `app/(subscriber)/alerta/[id]/page.tsx` | Modificado — sección evolución |
| `components/subscriber/TimelineNormativa.tsx` | Nuevo |
| `components/subscriber/ListaRelaciones.tsx` | Nuevo |

---

## Consideraciones futuras (fuera de scope)

- Backfill de relaciones para alertas ya existentes en BD (script one-shot)
- Visualización en grafo (nodos y aristas entre normas)
- Escalar a embeddings vectoriales (pgvector) si el volumen mensual supera las 200 alertas
