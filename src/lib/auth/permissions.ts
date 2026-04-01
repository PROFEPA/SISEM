import { createClient } from "@/lib/supabase/server";

export type Permiso =
  | "puede_importar"
  | "puede_exportar"
  | "puede_crear_expediente"
  | "puede_editar_expediente"
  | "puede_eliminar_expediente"
  | "puede_editar_cobro"
  | "puede_ver_dashboard"
  | "puede_gestionar_orpas"
  | "puede_gestionar_usuarios";

export interface PermisosRol {
  role: string;
  puede_importar: boolean;
  puede_exportar: boolean;
  puede_crear_expediente: boolean;
  puede_editar_expediente: boolean;
  puede_eliminar_expediente: boolean;
  puede_editar_cobro: boolean;
  puede_ver_dashboard: boolean;
  puede_gestionar_orpas: boolean;
  puede_gestionar_usuarios: boolean;
}

// Cache permissions in memory for 5 minutes to avoid repeated DB queries
let permCache: Map<string, PermisosRol> | null = null;
let permCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadPermissions(): Promise<Map<string, PermisosRol>> {
  if (permCache && Date.now() - permCacheTime < CACHE_TTL) {
    return permCache;
  }

  const supabase = await createClient();
  const { data } = await supabase.from("permisos_rol").select("*");

  const map = new Map<string, PermisosRol>();
  if (data) {
    for (const row of data) {
      map.set(row.role, row as PermisosRol);
    }
  }

  permCache = map;
  permCacheTime = Date.now();
  return map;
}

/**
 * Check if the current user has a specific permission.
 * Returns { allowed, user, role } or throws/returns error info.
 */
export async function checkPermission(permiso: Permiso) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { allowed: false, user: null, role: null, error: "No autorizado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "visualizador";

  // Admin always has all permissions (fallback if permisos_rol table isn't set up)
  if (role === "admin") {
    return { allowed: true, user, role, error: null };
  }

  try {
    const perms = await loadPermissions();
    const rolePerms = perms.get(role);

    if (!rolePerms) {
      // Role not found in permissions table — deny by default
      return { allowed: false, user, role, error: "Permisos no configurados para este rol" };
    }

    return {
      allowed: rolePerms[permiso] === true,
      user,
      role,
      error: rolePerms[permiso] ? null : "No tienes permiso para esta acción",
    };
  } catch {
    // If permisos_rol table doesn't exist yet, fall back to role-based defaults
    const defaults: Record<string, Record<Permiso, boolean>> = {
      capturador: {
        puede_importar: true,
        puede_exportar: true,
        puede_crear_expediente: true,
        puede_editar_expediente: true,
        puede_eliminar_expediente: false,
        puede_editar_cobro: true,
        puede_ver_dashboard: true,
        puede_gestionar_orpas: false,
        puede_gestionar_usuarios: false,
      },
      visualizador: {
        puede_importar: false,
        puede_exportar: true,
        puede_crear_expediente: false,
        puede_editar_expediente: false,
        puede_eliminar_expediente: false,
        puede_editar_cobro: false,
        puede_ver_dashboard: true,
        puede_gestionar_orpas: false,
        puede_gestionar_usuarios: false,
      },
    };

    const roleDefaults = defaults[role];
    if (!roleDefaults) {
      return { allowed: false, user, role, error: "Rol desconocido" };
    }

    return {
      allowed: roleDefaults[permiso] === true,
      user,
      role,
      error: roleDefaults[permiso] ? null : "No tienes permiso para esta acción",
    };
  }
}

/**
 * Invalidate the permissions cache (call after admin updates permissions).
 */
export function invalidatePermissionsCache() {
  permCache = null;
  permCacheTime = 0;
}
