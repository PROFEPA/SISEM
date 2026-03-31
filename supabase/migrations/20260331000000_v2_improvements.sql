-- ============================================================
-- SISEM v2 — Mejoras: infractor desglosado, catálogos de
-- impugnación, seguridad RLS y campos requeridos
-- ============================================================

-- ============================================================
-- 1. Nuevos campos en expedientes (desglose infractor)
-- ============================================================
ALTER TABLE expedientes
  ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
  ADD COLUMN IF NOT EXISTS apellido_materno TEXT,
  ADD COLUMN IF NOT EXISTS razon_social TEXT;

-- ============================================================
-- 2. Catálogo: tipos_impugnacion
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_impugnacion (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  orden INT DEFAULT 0
);

INSERT INTO tipos_impugnacion (clave, nombre, orden) VALUES
  ('RECURSO_REVISION',        'Recurso de Revisión',        1),
  ('JUICIO_NULIDAD',          'Juicio de Nulidad',          2),
  ('AMPARO',                  'Amparo',                     3),
  ('CONMUTACION',             'Conmutación',                4),
  ('RECURSO_RECONSIDERACION', 'Recurso de Reconsideración', 5)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- 3. Catálogo: resultados_impugnacion (por tipo)
-- ============================================================
CREATE TABLE IF NOT EXISTS resultados_impugnacion (
  id SERIAL PRIMARY KEY,
  tipo_impugnacion_clave TEXT NOT NULL REFERENCES tipos_impugnacion(clave),
  clave TEXT NOT NULL,
  nombre TEXT NOT NULL,
  favorable_profepa BOOLEAN DEFAULT FALSE,
  orden INT DEFAULT 0,
  UNIQUE (tipo_impugnacion_clave, clave)
);

-- Recurso de Revisión
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('RECURSO_REVISION', 'CONFIRMA',   'Confirma',   TRUE,  1),
  ('RECURSO_REVISION', 'MODIFICA',   'Modifica',   FALSE, 2),
  ('RECURSO_REVISION', 'REVOCA',     'Revoca',     FALSE, 3),
  ('RECURSO_REVISION', 'SOBRESEE',   'Sobresee',   FALSE, 4),
  ('RECURSO_REVISION', 'DESECHA',    'Desecha',    FALSE, 5),
  ('RECURSO_REVISION', 'PENDIENTE',  'Pendiente',  FALSE, 6)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;

-- Juicio de Nulidad
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('JUICIO_NULIDAD', 'VALIDEZ',              'Validez',              TRUE,  1),
  ('JUICIO_NULIDAD', 'NULIDAD',              'Nulidad',              FALSE, 2),
  ('JUICIO_NULIDAD', 'NULIDAD_PARA_EFECTOS', 'Nulidad para efectos', FALSE, 3),
  ('JUICIO_NULIDAD', 'SOBRESEIMIENTO',       'Sobreseimiento',       FALSE, 4),
  ('JUICIO_NULIDAD', 'PENDIENTE',            'Pendiente',            FALSE, 5)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;

-- Amparo
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('AMPARO', 'NIEGA',     'Niega amparo', TRUE,  1),
  ('AMPARO', 'CONCEDE',   'Concede',      FALSE, 2),
  ('AMPARO', 'SOBRESEE',  'Sobresee',     FALSE, 3),
  ('AMPARO', 'PENDIENTE', 'Pendiente',    FALSE, 4)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;

-- Conmutación
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('CONMUTACION', 'CONMUTADA',  'Conmutada',  FALSE, 1),
  ('CONMUTACION', 'NEGADA',     'Negada',     TRUE,  2),
  ('CONMUTACION', 'PENDIENTE',  'Pendiente',  FALSE, 3)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;

-- Recurso de Reconsideración
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('RECURSO_RECONSIDERACION', 'CONFIRMA',   'Confirma',   TRUE,  1),
  ('RECURSO_RECONSIDERACION', 'MODIFICA',   'Modifica',   FALSE, 2),
  ('RECURSO_RECONSIDERACION', 'REVOCA',     'Revoca',     FALSE, 3),
  ('RECURSO_RECONSIDERACION', 'DESECHA',    'Desecha',    FALSE, 4),
  ('RECURSO_RECONSIDERACION', 'PENDIENTE',  'Pendiente',  FALSE, 5)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;

-- ============================================================
-- 4. Índices nuevos
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expedientes_fecha_notificacion ON expedientes(fecha_notificacion);
CREATE INDEX IF NOT EXISTS idx_expedientes_enviada_cobro ON expedientes(enviada_a_cobro);

-- ============================================================
-- 5. Seguridad RLS — estatus_expediente (formalizar)
-- ============================================================
ALTER TABLE estatus_expediente ENABLE ROW LEVEL SECURITY;

-- Drop if exists to be idempotent (manual dashboard policies)
DROP POLICY IF EXISTS "estatus_block_anon" ON estatus_expediente;
DROP POLICY IF EXISTS "estatus_select_authenticated" ON estatus_expediente;

CREATE POLICY "estatus_block_anon" ON estatus_expediente
  FOR ALL TO anon USING (false);
CREATE POLICY "estatus_select_authenticated" ON estatus_expediente
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6. Seguridad RLS — tipos_impugnacion
-- ============================================================
ALTER TABLE tipos_impugnacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tipos_imp_block_anon" ON tipos_impugnacion
  FOR ALL TO anon USING (false);
CREATE POLICY "tipos_imp_select_authenticated" ON tipos_impugnacion
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 7. Seguridad RLS — resultados_impugnacion
-- ============================================================
ALTER TABLE resultados_impugnacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resultados_imp_block_anon" ON resultados_impugnacion
  FOR ALL TO anon USING (false);
CREATE POLICY "resultados_imp_select_authenticated" ON resultados_impugnacion
  FOR SELECT TO authenticated USING (true);
