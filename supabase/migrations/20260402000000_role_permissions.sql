-- Role-based permissions table
-- Each role has granular boolean permissions

CREATE TABLE IF NOT EXISTS permisos_rol (
  role TEXT PRIMARY KEY,
  puede_importar BOOLEAN NOT NULL DEFAULT false,
  puede_exportar BOOLEAN NOT NULL DEFAULT true,
  puede_crear_expediente BOOLEAN NOT NULL DEFAULT false,
  puede_editar_expediente BOOLEAN NOT NULL DEFAULT false,
  puede_eliminar_expediente BOOLEAN NOT NULL DEFAULT false,
  puede_editar_cobro BOOLEAN NOT NULL DEFAULT false,
  puede_ver_dashboard BOOLEAN NOT NULL DEFAULT true,
  puede_gestionar_orpas BOOLEAN NOT NULL DEFAULT false,
  puede_gestionar_usuarios BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default permissions for existing roles
INSERT INTO permisos_rol (role, puede_importar, puede_exportar, puede_crear_expediente, puede_editar_expediente, puede_eliminar_expediente, puede_editar_cobro, puede_ver_dashboard, puede_gestionar_orpas, puede_gestionar_usuarios)
VALUES
  ('admin', true, true, true, true, true, true, true, true, true),
  ('capturador', true, true, true, true, false, true, true, false, false),
  ('visualizador', false, true, false, false, false, false, true, false, false)
ON CONFLICT (role) DO NOTHING;

-- Enable RLS
ALTER TABLE permisos_rol ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read permissions
CREATE POLICY "permisos_select" ON permisos_rol
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify permissions
CREATE POLICY "permisos_update" ON permisos_rol
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
