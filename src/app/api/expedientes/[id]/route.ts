import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { expedienteUpdateSchema } from "@/lib/validations/expediente";
import { checkPermission } from "@/lib/auth/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: "No autorizado", message: null },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("expedientes")
    .select("*, orpa:orpas(*), estatus:estatus_expediente(*)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message, message: null },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  // Get historial
  const { data: historial } = await supabase
    .from("expediente_historial")
    .select("*, usuario:profiles(nombre_completo)")
    .eq("expediente_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    data: { ...data, historial: historial || [] },
    error: null,
    message: null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const perm = await checkPermission("puede_editar_expediente");
  if (!perm.allowed) {
    return NextResponse.json(
      { data: null, error: perm.error || "Sin permisos", message: null },
      { status: perm.user ? 403 : 401 }
    );
  }
  const user = perm.user!;

  // Get current values for audit
  const { data: current } = await supabase
    .from("expedientes")
    .select("*")
    .eq("id", id)
    .single();

  if (!current) {
    return NextResponse.json(
      { data: null, error: "Expediente no encontrado", message: null },
      { status: 404 }
    );
  }

  const body = await request.json();

  const parsed = expedienteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { data: null, error: `${firstError.path.join(".")}: ${firstError.message}`, message: null },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expedientes")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message, message: null },
      { status: 400 }
    );
  }

  // Record changes in historial
  const historialEntries = [];
  for (const key of Object.keys(parsed.data)) {
    if (key === "updated_by") continue;
    const oldVal = String(current[key as keyof typeof current] ?? "");
    const newVal = String((parsed.data as Record<string, unknown>)[key] ?? "");
    if (oldVal !== newVal) {
      historialEntries.push({
        expediente_id: id,
        usuario_id: user.id,
        campo_modificado: key,
        valor_anterior: oldVal,
        valor_nuevo: newVal,
      });
    }
  }

  if (historialEntries.length > 0) {
    await supabase.from("expediente_historial").insert(historialEntries);
  }

  return NextResponse.json({
    data,
    error: null,
    message: "Expediente actualizado exitosamente",
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const perm = await checkPermission("puede_eliminar_expediente");
  if (!perm.allowed) {
    return NextResponse.json(
      { data: null, error: perm.error || "Sin permisos para eliminar", message: null },
      { status: perm.user ? 403 : 401 }
    );
  }

  const { error } = await supabase.from("expedientes").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message, message: null },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: null,
    error: null,
    message: "Expediente eliminado",
  });
}

