-- ============================================================
-- Add REVOCACION and MODIFICACION tipos de impugnación,
-- reorder all tipos to match official PROFEPA order,
-- add resultados for new tipos.
-- ============================================================

-- 1. Insert new tipos
INSERT INTO tipos_impugnacion (clave, nombre, orden) VALUES
  ('REVOCACION',    'Revocación',    1),
  ('MODIFICACION',  'Modificación',  2)
ON CONFLICT (clave) DO UPDATE SET orden = EXCLUDED.orden;

-- 2. Reorder existing tipos to match requested order
UPDATE tipos_impugnacion SET orden = 3 WHERE clave = 'CONMUTACION';
UPDATE tipos_impugnacion SET orden = 4 WHERE clave = 'RECURSO_REVISION';
UPDATE tipos_impugnacion SET orden = 5 WHERE clave = 'JUICIO_NULIDAD';
UPDATE tipos_impugnacion SET orden = 6 WHERE clave = 'AMPARO';
UPDATE tipos_impugnacion SET orden = 7 WHERE clave = 'RECURSO_RECONSIDERACION';

-- 3. Add resultados for Revocación
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('REVOCACION', 'PROCEDENTE',   'Procedente',   FALSE, 1),
  ('REVOCACION', 'IMPROCEDENTE', 'Improcedente', TRUE,  2),
  ('REVOCACION', 'PENDIENTE',    'Pendiente',    FALSE, 3)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;

-- 4. Add resultados for Modificación
INSERT INTO resultados_impugnacion (tipo_impugnacion_clave, clave, nombre, favorable_profepa, orden) VALUES
  ('MODIFICACION', 'PROCEDENTE',   'Procedente',   FALSE, 1),
  ('MODIFICACION', 'IMPROCEDENTE', 'Improcedente', TRUE,  2),
  ('MODIFICACION', 'PENDIENTE',    'Pendiente',    FALSE, 3)
ON CONFLICT (tipo_impugnacion_clave, clave) DO NOTHING;
