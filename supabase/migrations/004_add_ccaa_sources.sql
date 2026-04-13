-- Añadir boletines autonómicos al enum de fuentes
ALTER TYPE fuente_enum ADD VALUE 'BOJA';         -- Andalucía
ALTER TYPE fuente_enum ADD VALUE 'BOIB';         -- Baleares
ALTER TYPE fuente_enum ADD VALUE 'BOC_CANARIAS'; -- Canarias
ALTER TYPE fuente_enum ADD VALUE 'BOC_CANTABRIA';-- Cantabria
ALTER TYPE fuente_enum ADD VALUE 'BOCYL';        -- Castilla y León
ALTER TYPE fuente_enum ADD VALUE 'DOE';          -- Extremadura
ALTER TYPE fuente_enum ADD VALUE 'DOG';          -- Galicia
ALTER TYPE fuente_enum ADD VALUE 'BOPV';         -- País Vasco
