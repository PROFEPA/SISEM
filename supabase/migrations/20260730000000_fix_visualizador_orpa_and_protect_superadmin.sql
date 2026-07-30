-- ============================================================
-- Fix: usuarios (capturador/visualizador) sin ORPA asignada
-- deben poder VER expedientes de TODAS las ORPAs, no de ninguna.
-- La política anterior comparaba orpa_id = NULL, que en SQL nunca
-- es verdadero, dejando a estos usuarios sin ver nada.
-- ============================================================
DROP POLICY IF EXISTS "orpa_select_expedientes" ON expedientes;
CREATE POLICY "orpa_select_expedientes" ON expedientes
  FOR SELECT USING (
    get_my_orpa_id() IS NULL OR orpa_id = get_my_orpa_id()
  );

-- ============================================================
-- Protección de super usuario (Alan Guerrero) — cuenta admin
-- "supremo": no se puede eliminar ni degradar de rol/estado,
-- ni siquiera vía service_role o eliminación en cascada desde
-- auth.users.
-- ============================================================
CREATE OR REPLACE FUNCTION protect_super_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.id = '13e879f8-fa06-4593-abf1-ad9d2fa90f53' THEN
      RAISE EXCEPTION 'No se puede eliminar al super usuario';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.id = '13e879f8-fa06-4593-abf1-ad9d2fa90f53' THEN
    NEW.role := 'admin';
    NEW.activo := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_super_admin_trigger ON profiles;
CREATE TRIGGER protect_super_admin_trigger
  BEFORE UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_super_admin();
