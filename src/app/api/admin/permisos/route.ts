import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { invalidatePermissionsCache, type PermisosRol } from "@/lib/auth/permissions";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "No autorizado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { supabase, user: null, error: "Solo administradores" };
  return { supabase, user, error: null };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("permisos_rol")
      .select("*")
      .order("role");

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cargar permisos" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    const body = await req.json();
    const { role, ...permisos } = body as Partial<PermisosRol> & { role: string };

    if (!role) {
      return NextResponse.json({ error: "Rol requerido" }, { status: 400 });
    }

    // Only allow updating known boolean permission fields
    const allowedFields = [
      "puede_importar",
      "puede_exportar",
      "puede_crear_expediente",
      "puede_editar_expediente",
      "puede_eliminar_expediente",
      "puede_editar_cobro",
      "puede_ver_dashboard",
      "puede_gestionar_orpas",
      "puede_gestionar_usuarios",
    ] as const;

    const updateData: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof permisos[field] === "boolean") {
        updateData[field] = permisos[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay cambios" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("permisos_rol")
      .update(updateData)
      .eq("role", role)
      .select()
      .single();

    if (error) throw error;

    invalidatePermissionsCache();

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar permisos" },
      { status: 500 }
    );
  }
}
