-- supabase/migrations/007_sectorial.sql

CREATE TABLE sectores (
  id     SERIAL  PRIMARY KEY,
  nombre TEXT    NOT NULL,
  slug   TEXT    NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE subcategorias (
  id        SERIAL  PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectores(id),
  slug      TEXT    NOT NULL UNIQUE,
  nombre    TEXT    NOT NULL,
  activo    BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE alerta_sectores (
  alerta_id       UUID    NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  subcategoria_id INTEGER NOT NULL REFERENCES subcategorias(id),
  confianza       INTEGER NOT NULL CHECK (confianza BETWEEN 0 AND 100),
  PRIMARY KEY (alerta_id, subcategoria_id)
);

CREATE TABLE suscriptor_intereses (
  usuario_id      UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  subcategoria_id INTEGER NOT NULL REFERENCES subcategorias(id),
  PRIMARY KEY (usuario_id, subcategoria_id)
);

CREATE TABLE telegram_grupos (
  id              SERIAL  PRIMARY KEY,
  subcategoria_id INTEGER NOT NULL REFERENCES subcategorias(id),
  chat_id         TEXT    NOT NULL UNIQUE,
  nombre          TEXT    NOT NULL,
  invite_link     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_alerta_sectores_alerta ON alerta_sectores(alerta_id);
CREATE INDEX idx_alerta_sectores_sub    ON alerta_sectores(subcategoria_id);
CREATE INDEX idx_suscriptor_intereses   ON suscriptor_intereses(usuario_id);
CREATE INDEX idx_telegram_grupos_sub    ON telegram_grupos(subcategoria_id);

INSERT INTO sectores (nombre, slug) VALUES ('Inmobiliario', 'inmobiliario');

INSERT INTO subcategorias (sector_id, slug, nombre) VALUES
  (1, 'arrendamiento_residencial', 'Arrendamiento residencial'),
  (1, 'arrendamiento_comercial',   'Arrendamiento comercial'),
  (1, 'urbanismo',                 'Urbanismo y ordenación territorial'),
  (1, 'suelo',                     'Suelo y planeamiento'),
  (1, 'fiscalidad_itp',            'ITP / AJD'),
  (1, 'fiscalidad_plusvalia',      'Plusvalía municipal'),
  (1, 'rehabilitacion',            'Rehabilitación y eficiencia energética'),
  (1, 'vivienda_protegida',        'Vivienda protegida / VPO'),
  (1, 'zonas_tensionadas',         'Zonas tensionadas'),
  (1, 'desahucios',                'Desahucios y procedimientos'),
  (1, 'hipotecas',                 'Hipotecas y financiación'),
  (1, 'registro_catastro',         'Registro y catastro');
