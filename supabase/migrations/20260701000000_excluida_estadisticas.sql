-- ============================================================
-- expedientes.excluida_estadisticas — bandera explícita para
-- multas que el cliente marca como "pendientes" y que no deben
-- contarse en el reporte general (dashboard, totales por ORPA,
-- lista principal). Se puebla desde una lista curada por el
-- cliente, no se deriva automáticamente de otras columnas.
-- ============================================================

ALTER TABLE expedientes
  ADD COLUMN IF NOT EXISTS excluida_estadisticas BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_expedientes_excluida_estadisticas
  ON expedientes(excluida_estadisticas)
  WHERE excluida_estadisticas = TRUE;
