-- ============================================================
-- SISEM — Migración inicial
-- Sistema Integral de Seguimiento de Expedientes de Multas
-- PROFEPA — Subprocuraduría de Recursos Naturales
-- ============================================================

-- Catálogo de ORPAs
CREATE TABLE IF NOT EXISTS orpas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(30) UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  orpa_id UUID REFERENCES orpas(id),
  nombre_completo TEXT,
  role TEXT CHECK (role IN ('admin','capturador','visualizador')) NOT NULL DEFAULT 'visualizador',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de estatus del expediente
CREATE TABLE IF NOT EXISTS estatus_expediente (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(30) UNIQUE NOT NULL,
  descripcion TEXT,
  color_hex VARCHAR(7)
);

-- Tabla principal de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orpa_id UUID NOT NULL REFERENCES orpas(id),

  -- Identificación
  numero_expediente TEXT UNIQUE NOT NULL,
  materia TEXT,
  numero_acta TEXT,
  fecha_acta DATE,

  -- Infractor
  nombre_infractor TEXT NOT NULL DEFAULT 'SIN DATO',
  rfc_infractor TEXT,
  domicilio_infractor TEXT,
  tipo_persona TEXT CHECK (tipo_persona IN ('fisica','moral')),

  -- Infracción
  articulo_infringido TEXT,
  descripcion_infraccion TEXT,
  giro_actividad TEXT,

  -- Resolución / Multa
  fecha_resolucion DATE,
  fecha_notificacion DATE,
  numero_resolucion TEXT,
  monto_multa NUMERIC(18,2),
  dias_ume NUMERIC(10,2),

  -- Estado procesal
  estatus_id INT REFERENCES estatus_expediente(id),
  fecha_ultimo_movimiento DATE,

  -- Control de pago
  pagado BOOLEAN DEFAULT FALSE,
  fecha_pago DATE,
  monto_pagado NUMERIC(18,2),
  folio_pago TEXT,

  -- Impugnación / Recurso
  impugnado BOOLEAN DEFAULT FALSE,
  tipo_impugnacion TEXT,
  fecha_impugnacion DATE,
  resultado_impugnacion TEXT,

  -- Campos adicionales del Excel
  enviada_a_cobro BOOLEAN DEFAULT FALSE,
  oficio_cobro TEXT,
  documentacion_anexa BOOLEAN DEFAULT FALSE,
  observaciones TEXT,

  -- Metadatos
  fuente TEXT DEFAULT 'excel',
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de cambios (auditoría)
CREATE TABLE IF NOT EXISTS expediente_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  campo_modificado TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos vinculados al expediente
CREATE TABLE IF NOT EXISTS expediente_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  drive_file_id TEXT,
  drive_folder_id TEXT,
  url_preview TEXT,
  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expedientes_orpa ON expedientes(orpa_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_estatus ON expedientes(estatus_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_pagado ON expedientes(pagado);
CREATE INDEX IF NOT EXISTS idx_expedientes_impugnado ON expedientes(impugnado);
CREATE INDEX IF NOT EXISTS idx_expedientes_fecha_resolucion ON expedientes(fecha_resolucion);
CREATE INDEX IF NOT EXISTS idx_expedientes_numero ON expedientes(numero_expediente);
CREATE INDEX IF NOT EXISTS idx_expediente_historial_exp ON expediente_historial(expediente_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER
SET search_path = public STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_orpa_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER
SET search_path = public STABLE AS $$
  SELECT orpa_id FROM profiles WHERE id = auth.uid()
$$;

-- Profiles: users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Profiles: admin manages all profiles
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_my_role() = 'admin');

-- Expedientes: admin ve todo
CREATE POLICY "admin_all_expedientes" ON expedientes
  FOR ALL USING (get_my_role() = 'admin');

-- Expedientes: capturador/visualizador solo su ORPA (lectura)
CREATE POLICY "orpa_select_expedientes" ON expedientes
  FOR SELECT USING (orpa_id = get_my_orpa_id());

-- Expedientes: capturador puede insertar en su ORPA
CREATE POLICY "capturador_write_expedientes" ON expedientes
  FOR INSERT WITH CHECK (
    get_my_role() = 'capturador'
    AND orpa_id = get_my_orpa_id()
  );

-- Expedientes: capturador puede actualizar en su ORPA
CREATE POLICY "capturador_update_expedientes" ON expedientes
  FOR UPDATE USING (
    get_my_role() = 'capturador'
    AND orpa_id = get_my_orpa_id()
  );

-- Historial: lectura por ORPA, escritura por capturador/admin
CREATE POLICY "read_historial" ON expediente_historial
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expedientes e
      WHERE e.id = expediente_historial.expediente_id
    )
  );

CREATE POLICY "write_historial" ON expediente_historial
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','capturador')
  );

-- Documentos: lectura por ORPA, escritura por capturador/admin
CREATE POLICY "read_documentos" ON expediente_documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expedientes e
      WHERE e.id = expediente_documentos.expediente_id
    )
  );

CREATE POLICY "write_documentos" ON expediente_documentos
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','capturador')
  );

-- ============================================================
-- DATOS INICIALES: Catálogo de ORPAs
-- ============================================================
INSERT INTO orpas (clave, nombre, estado) VALUES
  ('AGS', 'AGUASCALIENTES', 'Aguascalientes'),
  ('BC', 'BAJA CALIFORNIA', 'Baja California'),
  ('BCS', 'BAJA CALIFORNIA SUR', 'Baja California Sur'),
  ('CAM', 'CAMPECHE', 'Campeche'),
  ('CHIS', 'CHIAPAS', 'Chiapas'),
  ('CHIH', 'CHIHUAHUA', 'Chihuahua'),
  ('COAH', 'COAHUILA', 'Coahuila'),
  ('COL', 'COLIMA', 'Colima'),
  ('DUR', 'DURANGO', 'Durango'),
  ('EDOMEX', 'ESTADO DE MÉXICO', 'Estado de México'),
  ('GTO', 'GUANAJUATO', 'Guanajuato'),
  ('GRO', 'GUERRERO', 'Guerrero'),
  ('HGO', 'HIDALGO', 'Hidalgo'),
  ('JAL', 'JALISCO', 'Jalisco'),
  ('MICH', 'MICHOACÁN', 'Michoacán'),
  ('MOR', 'MORELOS', 'Morelos'),
  ('NAY', 'NAYARIT', 'Nayarit'),
  ('NL', 'NUEVO LEÓN', 'Nuevo León'),
  ('OAX', 'OAXACA', 'Oaxaca'),
  ('PUE', 'PUEBLA', 'Puebla'),
  ('QRO', 'QUERÉTARO', 'Querétaro'),
  ('QROO', 'QUINTANA ROO', 'Quintana Roo'),
  ('SIN', 'SINALOA', 'Sinaloa'),
  ('SLP', 'SAN LUIS POTOSÍ', 'San Luis Potosí'),
  ('SON', 'SONORA', 'Sonora'),
  ('TAB', 'TABASCO', 'Tabasco'),
  ('TAM', 'TAMAULIPAS', 'Tamaulipas'),
  ('TLAX', 'TLAXCALA', 'Tlaxcala'),
  ('VER', 'VERACRUZ', 'Veracruz'),
  ('YUC', 'YUCATÁN', 'Yucatán'),
  ('ZAC', 'ZACATECAS', 'Zacatecas'),
  ('ZMVM', 'ZMVM', 'Ciudad de México')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- DATOS INICIALES: Catálogo de estatus
-- ============================================================
INSERT INTO estatus_expediente (clave, descripcion, color_hex) VALUES
  ('NOTIFICADO', 'Multa notificada al infractor', '#2196F3'),
  ('EN_PROCESO', 'Expediente en trámite', '#FF9800'),
  ('PAGADO', 'Multa pagada', '#4CAF50'),
  ('IMPUGNADO', 'Multa impugnada por el infractor', '#F44336'),
  ('EN_RECURSO', 'Recurso de revisión en curso', '#9C27B0'),
  ('ARCHIVADO', 'Expediente archivado', '#607D8B'),
  ('ENVIADO_COBRO', 'Enviado a cobro', '#FF5722')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- FUNCIÓN: auto-actualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expedientes_updated_at
  BEFORE UPDATE ON expedientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil al registrarse un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nombre_completo', 'visualizador');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
