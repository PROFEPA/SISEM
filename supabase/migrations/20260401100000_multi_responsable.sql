-- ============================================================
-- SISEM — Permitir múltiples registros por expediente
-- Un mismo expediente puede tener múltiples responsables
-- con multas distintas (ej. 2-3 personas en un mismo predio)
-- ============================================================

-- 1. Quitar restricción UNIQUE en numero_expediente
ALTER TABLE expedientes DROP CONSTRAINT IF EXISTS expedientes_numero_expediente_key;

-- 2. Quitar el índice único que pudiera existir
DROP INDEX IF EXISTS expedientes_numero_expediente_key;
DROP INDEX IF EXISTS idx_expedientes_numero;

-- 3. Crear índice NO-único para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_expedientes_numero ON expedientes(numero_expediente);

-- 4. Agregar columna secuencial para distinguir registros del mismo expediente
ALTER TABLE expedientes
  ADD COLUMN IF NOT EXISTS numero_registro SMALLINT DEFAULT 1;

-- 5. Crear restricción UNIQUE compuesta (expediente + registro)
-- Esto permite PFPA/xxx registro 1, PFPA/xxx registro 2, etc.
ALTER TABLE expedientes
  ADD CONSTRAINT expedientes_numero_expediente_registro_key 
  UNIQUE (numero_expediente, numero_registro);
