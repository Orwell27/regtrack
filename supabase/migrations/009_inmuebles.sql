-- supabase/migrations/009_inmuebles.sql
-- Cartera de inmuebles de cada suscriptor, para clasificar su exposición regulatoria.

CREATE TABLE inmuebles (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                 TEXT NOT NULL,
  direccion              TEXT NOT NULL,
  municipio_ine          TEXT,
  lat                    DOUBLE PRECISION,
  lon                    DOUBLE PRECISION,
  tipo                   TEXT NOT NULL DEFAULT 'piso'
                           CHECK (tipo IN ('piso', 'bajo', 'edificio', 'unifamiliar')),
  modalidad              TEXT NOT NULL DEFAULT 'vut_completa'
                           CHECK (modalidad IN ('vut_completa', 'vut_habitaciones', 'apartamento_turistico', 'sin_uso_turistico')),
  registro_turistico     TEXT NOT NULL DEFAULT 'si'
                           CHECK (registro_turistico IN ('si', 'en_tramite', 'no')),
  fecha_alta_turistica   DATE,
  propiedad_horizontal   TEXT NOT NULL DEFAULT 'desconocido' CHECK (propiedad_horizontal IN ('si', 'no', 'desconocido')),
  estatutos              TEXT NOT NULL DEFAULT 'desconocido' CHECK (estatutos IN ('prohiben', 'no_prohiben', 'desconocido')),
  acuerdo_comunidad      TEXT NOT NULL DEFAULT 'desconocido' CHECK (acuerdo_comunidad IN ('si', 'no', 'desconocido')),
  acceso_independiente   TEXT NOT NULL DEFAULT 'desconocido' CHECK (acceso_independiente IN ('si', 'no', 'desconocido')),
  reside_en_vivienda     TEXT NOT NULL DEFAULT 'desconocido' CHECK (reside_en_vivienda IN ('si', 'no', 'desconocido')),
  zona_urbanistica       TEXT NOT NULL DEFAULT 'desconocida'
                           CHECK (zona_urbanistica IN ('residencial_colectivo', 'residencial_generico', 'otra', 'desconocida')),
  casco_historico        TEXT NOT NULL DEFAULT 'desconocido' CHECK (casco_historico IN ('si', 'no', 'desconocido')),
  estancias_largas       TEXT NOT NULL DEFAULT 'desconocido' CHECK (estancias_largas IN ('si', 'no', 'desconocido')),
  limpieza_externa       TEXT NOT NULL DEFAULT 'desconocido' CHECK (limpieza_externa IN ('si', 'no', 'desconocido')),
  seguro_rc              TEXT NOT NULL DEFAULT 'desconocido' CHECK (seguro_rc IN ('si', 'no', 'desconocido')),
  facturacion_anual      NUMERIC(12, 2) CHECK (facturacion_anual >= 0),
  gastos_comunidad_anual NUMERIC(12, 2) CHECK (gastos_comunidad_anual >= 0),
  notas                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inmuebles_usuario ON inmuebles(usuario_id);

-- Solo se accede con la service key desde el servidor, filtrando por usuario_id.
ALTER TABLE inmuebles ENABLE ROW LEVEL SECURITY;
