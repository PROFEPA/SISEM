-- ============================================================
-- Migración: Soporte de documentos vinculados desde OneDrive
-- ============================================================
-- Agrega constraint UNIQUE para evitar duplicados al re-ejecutar
-- el script de vinculación, e índices de rendimiento.
-- ============================================================

-- Índice para buscar documentos por expediente
CREATE INDEX IF NOT EXISTS idx_expediente_documentos_expediente
  ON expediente_documentos(expediente_id);

-- Índice para buscar por ruta de archivo (drive_file_id almacena ruta relativa)
CREATE INDEX IF NOT EXISTS idx_expediente_documentos_drive_file
  ON expediente_documentos(drive_file_id);

-- Constraint UNIQUE para upsert (evitar duplicados al re-vincular)
-- Un expediente no puede tener dos documentos con el mismo nombre de archivo
ALTER TABLE expediente_documentos
  ADD CONSTRAINT uq_expediente_documento
  UNIQUE (expediente_id, nombre_archivo);
