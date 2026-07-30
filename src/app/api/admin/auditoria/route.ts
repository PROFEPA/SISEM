import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SUPER_ADMIN_ID } from "@/lib/auth/super-admin";

// Exclusivo del super usuario: consultar la auditoría global del sistema.
// La tabla audit_log también está protegida por RLS (solo SUPER_ADMIN_ID
// puede leerla), esta verificación es una segunda capa con mensaje claro.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== SUPER_ADMIN_ID) {
    return NextResponse.json(
      { data: null, error: "Solo el super usuario puede ver la auditoría" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "cambios"; // cambios | logins
  const entityType = searchParams.get("entity_type");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50") || 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (source === "logins") {
    const { data, error, count } = await supabase
      .from("login_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count, error: null });
  }

  if (source === "recurrentes") {
    // Usuarios más recurrentes: conteo de inicios de sesión por usuario
    const { data, error } = await supabase
      .from("login_log")
      .select("user_id, nombre_completo, role, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    const counts = new Map<string, { user_id: string; nombre_completo: string | null; role: string | null; total: number; ultimo_login: string }>();
    for (const row of data || []) {
      const existing = counts.get(row.user_id);
      if (existing) {
        existing.total += 1;
      } else {
        counts.set(row.user_id, {
          user_id: row.user_id,
          nombre_completo: row.nombre_completo,
          role: row.role,
          total: 1,
          ultimo_login: row.created_at,
        });
      }
    }

    const ranking = Array.from(counts.values()).sort((a, b) => b.total - a.total);
    return NextResponse.json({ data: ranking, count: ranking.length, error: null });
  }

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (entityType) query = query.eq("entity_type", entityType);

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, error: null });
}
