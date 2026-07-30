-- ============================================================
-- Sistema de auditoría global + funciones exclusivas del
-- super usuario (Alan Guerrero, id 13e879f8-fa06-4593-abf1-ad9d2fa90f53).
-- ============================================================

-- 1) Auditoría genérica de cambios (usuarios, expedientes, permisos)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID,
  actor_nombre TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_super_admin" ON audit_log;
CREATE POLICY "audit_log_select_super_admin" ON audit_log
  FOR SELECT USING (auth.uid() = '13e879f8-fa06-4593-abf1-ad9d2fa90f53');

-- Nadie puede insertar/editar/borrar directamente; solo las funciones
-- SECURITY DEFINER de más abajo (bypasan RLS al correr como owner).
DROP POLICY IF EXISTS "audit_log_no_direct_write" ON audit_log;

-- 2) Bitácora de inicios de sesión (para detectar usuarios recurrentes)
CREATE TABLE IF NOT EXISTS login_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL,
  nombre_completo TEXT,
  role TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_log_user ON login_log(user_id, created_at DESC);

ALTER TABLE login_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_log_select_super_admin" ON login_log;
CREATE POLICY "login_log_select_super_admin" ON login_log
  FOR SELECT USING (auth.uid() = '13e879f8-fa06-4593-abf1-ad9d2fa90f53');

-- Cada usuario puede registrar únicamente su propio inicio de sesión
CREATE OR REPLACE FUNCTION log_login(p_user_agent TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nombre TEXT;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  SELECT nombre_completo, role INTO v_nombre, v_role FROM profiles WHERE id = auth.uid();
  INSERT INTO login_log (user_id, nombre_completo, role, user_agent)
  VALUES (auth.uid(), v_nombre, v_role, p_user_agent);
END;
$$;

GRANT EXECUTE ON FUNCTION log_login(TEXT) TO authenticated;

-- 3) Helper genérico para escribir auditoría desde triggers
CREATE OR REPLACE FUNCTION write_audit(
  p_action TEXT, p_entity_type TEXT, p_entity_id TEXT,
  p_old JSONB, p_new JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nombre TEXT;
  v_role TEXT;
BEGIN
  SELECT nombre_completo, role INTO v_nombre, v_role FROM profiles WHERE id = auth.uid();
  INSERT INTO audit_log (actor_id, actor_nombre, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), v_nombre, v_role, p_action, p_entity_type, p_entity_id, p_old, p_new);
END;
$$;

-- 4) Trigger: altas/cambios/bajas de usuarios (profiles)
CREATE OR REPLACE FUNCTION audit_profiles_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM write_audit('DELETE', 'profile', OLD.id::text, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit('UPDATE', 'profile', NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    PERFORM write_audit('INSERT', 'profile', NEW.id::text, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_profiles_trigger_t ON profiles;
CREATE TRIGGER audit_profiles_trigger_t
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_profiles_trigger();

-- 5) Trigger: altas/cambios/bajas de expedientes
CREATE OR REPLACE FUNCTION audit_expedientes_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM write_audit('DELETE', 'expediente', OLD.id::text, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit('UPDATE', 'expediente', NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    PERFORM write_audit('INSERT', 'expediente', NEW.id::text, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_expedientes_trigger_t ON expedientes;
CREATE TRIGGER audit_expedientes_trigger_t
  AFTER INSERT OR UPDATE OR DELETE ON expedientes
  FOR EACH ROW EXECUTE FUNCTION audit_expedientes_trigger();

-- 6) Trigger: cambios en permisos por rol
CREATE OR REPLACE FUNCTION audit_permisos_rol_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM write_audit('UPDATE', 'permiso_rol', NEW.role, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_permisos_rol_trigger_t ON permisos_rol;
CREATE TRIGGER audit_permisos_rol_trigger_t
  AFTER UPDATE ON permisos_rol
  FOR EACH ROW EXECUTE FUNCTION audit_permisos_rol_trigger();

-- 7) Exclusivo del super usuario: solo él puede editar permisos por rol
DROP POLICY IF EXISTS "permisos_update" ON permisos_rol;
CREATE POLICY "permisos_update" ON permisos_rol
  FOR UPDATE USING (auth.uid() = '13e879f8-fa06-4593-abf1-ad9d2fa90f53');
