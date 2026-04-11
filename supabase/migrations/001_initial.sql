-- Tipos enum
CREATE TYPE fuente_enum AS ENUM ('BOE', 'BOCM', 'DOGC');
CREATE TYPE ambito_enum AS ENUM ('estatal', 'ccaa', 'municipal');
CREATE TYPE subtema_enum AS ENUM (
  'urbanismo', 'fiscalidad', 'arrendamiento', 'hipotecas',
  'obra_nueva', 'construccion', 'suelo', 'rehabilitacion',
  'vivienda_protegida', 'registro_notaria', 'comunidades_propietarios', 'otro'
);
CREATE TYPE urgencia_enum AS ENUM ('alta', 'media', 'baja');
CREATE TYPE tipo_norma_enum AS ENUM (
  'Ley Orgánica', 'Ley', 'Real Decreto-ley', 'Real Decreto',
  'Orden Ministerial', 'Resolución', 'Circular', 'Anuncio'
);
CREATE TYPE estado_enum AS ENUM ('pendiente_revision', 'aprobada', 'descartada', 'enviada');
CREATE TYPE plan_enum AS ENUM ('free', 'pro');
CREATE TYPE peso_enum AS ENUM ('emergente', 'recurrente', 'establecida');

-- Tabla alertas
CREATE TABLE alertas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url                 TEXT UNIQUE NOT NULL,
  titulo              TEXT NOT NULL,
  fuente              fuente_enum NOT NULL,
  ambito              ambito_enum,
  subtema             subtema_enum,
  fecha_publicacion   DATE,
  fecha_entrada_vigor DATE,
  plazo_adaptacion    INTEGER,
  tipo_norma          tipo_norma_enum,
  urgencia            urgencia_enum,
  score_relevancia    INTEGER CHECK (score_relevancia BETWEEN 1 AND 10),
  resumen             TEXT,
  impacto             TEXT,
  afectados           JSONB DEFAULT '[]',
  territorios         JSONB DEFAULT '[]',
  deroga_modifica     TEXT,
  accion_recomendada  TEXT,
  texto_alerta        TEXT,
  texto_alerta_pro    TEXT,
  estado              estado_enum DEFAULT 'pendiente_revision',
  no_procesable       BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Tabla usuarios
CREATE TABLE usuarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  nombre           TEXT NOT NULL,
  telegram_id      TEXT,
  territorios      JSONB DEFAULT '["Madrid"]',
  subtemas         JSONB DEFAULT '["urbanismo"]',
  afectado_como    JSONB DEFAULT '[]',
  urgencia_minima  urgencia_enum DEFAULT 'baja',
  score_minimo     INTEGER DEFAULT 7,
  plan             plan_enum DEFAULT 'free',
  activo           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Tabla entregas (log inmutable)
CREATE TABLE entregas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id   UUID NOT NULL REFERENCES alertas(id),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  enviada_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices para queries frecuentes
CREATE INDEX idx_alertas_estado ON alertas(estado);
CREATE INDEX idx_alertas_url ON alertas(url);
CREATE INDEX idx_entregas_usuario_fecha ON entregas(usuario_id, enviada_at);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- Tabla keywords (reemplaza BUDI/keywords en GitHub)
CREATE TABLE keywords (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword      TEXT UNIQUE NOT NULL,
  peso         peso_enum DEFAULT 'emergente',
  apariciones  INTEGER DEFAULT 1,
  entidades    JSONB DEFAULT '[]',
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Tabla entidades (reemplaza BUDI/entidades en GitHub)
CREATE TABLE entidades (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT UNIQUE NOT NULL,
  tipo         TEXT,
  descripcion  TEXT,
  relevancia   INTEGER DEFAULT 5,
  updated_at   TIMESTAMPTZ DEFAULT now()
);
