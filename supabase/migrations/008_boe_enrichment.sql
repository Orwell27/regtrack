-- supabase/migrations/008_boe_enrichment.sql

ALTER TABLE alertas
  ADD COLUMN boe_id          TEXT UNIQUE,
  ADD COLUMN departamento    TEXT,
  ADD COLUMN epigrafe        TEXT,
  ADD COLUMN rango           TEXT,
  ADD COLUMN referencias_boe JSONB DEFAULT '[]';

CREATE INDEX idx_alertas_boe_id ON alertas(boe_id);
