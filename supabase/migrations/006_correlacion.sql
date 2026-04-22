-- supabase/migrations/006_correlacion.sql

CREATE TYPE tipo_relacion_enum AS ENUM (
  'progresion',
  'deroga',
  'modifica',
  'complementa'
);

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
