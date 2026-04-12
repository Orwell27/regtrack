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
