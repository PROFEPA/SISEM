-- Full-text search on expedientes
-- Adds a tsvector column with automatic trigger update + GIN index

-- 1. Add the search vector column
ALTER TABLE expedientes
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Function to update the vector on insert/update
CREATE OR REPLACE FUNCTION expedientes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.numero_expediente, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.nombre_infractor, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.apellido_paterno, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.apellido_materno, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.razon_social, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.rfc_infractor, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.numero_acta, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.numero_resolucion, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.descripcion_infraccion, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.observaciones, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trg_expedientes_search_vector ON expedientes;
CREATE TRIGGER trg_expedientes_search_vector
  BEFORE INSERT OR UPDATE ON expedientes
  FOR EACH ROW
  EXECUTE FUNCTION expedientes_search_vector_update();

-- 4. Backfill existing rows
UPDATE expedientes SET search_vector =
  setweight(to_tsvector('spanish', coalesce(numero_expediente, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(nombre_infractor, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(apellido_paterno, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(apellido_materno, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(razon_social, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(rfc_infractor, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(numero_acta, '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(numero_resolucion, '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(descripcion_infraccion, '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(observaciones, '')), 'D');

-- 5. GIN index for fast lookups
CREATE INDEX IF NOT EXISTS idx_expedientes_search_vector
  ON expedientes USING GIN (search_vector);
