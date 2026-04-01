import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const orpaSchema = z.object({
  clave: z.string().min(1, "Clave requerida").max(20),
  nombre: z.string().min(1, "Nombre requerido").max(200),
  estado: z.string().min(1, "Estado requerido").max(100),
  activa: z.boolean().default(true),
});

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
      return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
    }

    // Get ORPAs with expediente stats
    const { data: orpas, error } = await supabase
      .from("orpas")
      .select("*")
      .order("nombre");

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    // Get expediente counts per ORPA
    const { data: expedientes } = await supabase
      .from("expedientes")
      .select("orpa_id, monto_multa, pagado, impugnado");

    const stats = new Map<string, { total: number; monto: number; pagados: number; impugnados: number }>();
    if (expedientes) {
      for (const exp of expedientes) {
        if (!stats.has(exp.orpa_id)) {
          stats.set(exp.orpa_id, { total: 0, monto: 0, pagados: 0, impugnados: 0 });
        }
        const s = stats.get(exp.orpa_id)!;
        s.total += 1;
        s.monto += Number(exp.monto_multa) || 0;
        if (exp.pagado) s.pagados += 1;
        if (exp.impugnado) s.impugnados += 1;
      }
    }

    const orpasWithStats = (orpas || []).map((o) => ({
      ...o,
      stats: stats.get(o.id) || { total: 0, monto: 0, pagados: 0, impugnados: 0 },
    }));

    return NextResponse.json({ data: orpasWithStats, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ data: null, error: authErr }, { status: 403 });
    }

    const body = await req.json();
    const parsed = orpaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("orpas")
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      const msg = error.message.includes("duplicate")
        ? "Ya existe una ORPA con esa clave"
        : error.message;
      return NextResponse.json({ data: null, error: msg }, { status: 400 });
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ data: null, error: authErr }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ data: null, error: "ID requerido" }, { status: 400 });
    }

    const parsed = orpaSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("orpas")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ data: null, error: authErr }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ data: null, error: "ID requerido" }, { status: 400 });
    }

    // Check if ORPA has expedientes
    const { count } = await supabase
      .from("expedientes")
      .select("id", { count: "exact", head: true })
      .eq("orpa_id", id);

    if (count && count > 0) {
      return NextResponse.json(
        { data: null, error: `No se puede eliminar: tiene ${count} expedientes asociados` },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("orpas").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
