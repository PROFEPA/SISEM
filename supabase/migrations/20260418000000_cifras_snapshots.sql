-- ============================================================
-- Tabla cifras_snapshots — concentrados mensuales por ORPA
-- ============================================================

CREATE TABLE IF NOT EXISTS cifras_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,                -- Ej: "2026-03" o "MARZO 2026"
  orpa_id UUID NOT NULL REFERENCES orpas(id) ON DELETE CASCADE,

  -- Totales agregados por ORPA (según CIFRAS)
  multas_impuestas INT NOT NULL DEFAULT 0,
  monto_impuesto NUMERIC(18,2) NOT NULL DEFAULT 0,
  pagadas INT NOT NULL DEFAULT 0,
  monto_pagadas NUMERIC(18,2) NOT NULL DEFAULT 0,
  req_cobro INT NOT NULL DEFAULT 0,
  monto_req_cobro NUMERIC(18,2) NOT NULL DEFAULT 0,
  falt_cobro INT NOT NULL DEFAULT 0,
  monto_falt_cobro NUMERIC(18,2) NOT NULL DEFAULT 0,
  impugnacion INT NOT NULL DEFAULT 0,
  monto_impugnacion NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_multas INT NOT NULL DEFAULT 0,
  monto_total NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Metadatos
  nombre_archivo TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (periodo, orpa_id)
);

CREATE INDEX IF NOT EXISTS idx_cifras_snapshots_periodo ON cifras_snapshots(periodo);
CREATE INDEX IF NOT EXISTS idx_cifras_snapshots_orpa ON cifras_snapshots(orpa_id);

-- ============================================================
-- RLS: todos los autenticados pueden leer, solo admin escribe
-- ============================================================
ALTER TABLE cifras_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cifras_block_anon" ON cifras_snapshots
  FOR ALL TO anon USING (false);

CREATE POLICY "cifras_select_authenticated" ON cifras_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cifras_admin_write" ON cifras_snapshots
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'capturador'))
  WITH CHECK (get_my_role() IN ('admin', 'capturador'));

-- Trigger para actualizar updated_at
CREATE TRIGGER cifras_snapshots_updated_at
  BEFORE UPDATE ON cifras_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
