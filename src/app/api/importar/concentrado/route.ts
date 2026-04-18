import { createClient } from "@/lib/supabase/server";
import {
  parseCifrasBuffer,
  normalizeOficina,
} from "@/lib/excel/cifras-parser";
import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const perm = await checkPermission("puede_importar");
  if (!perm.allowed) {
    return NextResponse.json(
      { data: null, error: perm.error || "Sin permisos para importar", message: null },
      { status: perm.user ? 403 : 401 }
    );
  }
  const user = perm.user!;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const periodoOverride = (formData.get("periodo") as string | null)?.trim() || null;

  if (!file) {
    return NextResponse.json(
      { data: null, error: "No se recibió archivo", message: null },
      { status: 400 }
    );
  }

  if (!file.name.match(/\.xlsx?$/i)) {
    return NextResponse.json(
      { data: null, error: "Solo se aceptan archivos Excel (.xlsx)", message: null },
      { status: 400 }
    );
  }

  // Max 10 MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { data: null, error: "El archivo excede el límite de 10 MB", message: null },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const parseResult = parseCifrasBuffer(buffer, file.name);

  const periodo =
    periodoOverride || parseResult.periodo || new Date().toISOString().slice(0, 7);

  if (parseResult.rows.length === 0) {
    return NextResponse.json(
      {
        data: { parsed: 0, errors: parseResult.errors },
        error:
          "No se encontraron filas válidas en el concentrado. " +
          "Verifique que sea un archivo CIFRAS con una fila por ORPA.",
        message: null,
      },
      { status: 400 }
    );
  }

  // ORPA lookup table
  const { data: orpas } = await supabase.from("orpas").select("id, nombre, clave");
  const orpaByNombre = new Map<string, string>();
  if (orpas) {
    for (const o of orpas) {
      orpaByNombre.set(o.nombre.toUpperCase().trim(), o.id);
    }
  }

  function resolveOrpaId(oficinaRaw: string): string | null {
    const normalized = normalizeOficina(oficinaRaw);
    if (orpaByNombre.has(normalized)) return orpaByNombre.get(normalized)!;
    return null;
  }

  // Build records to upsert
  const records: Array<Record<string, unknown>> = [];
  const notFound: string[] = [];

  for (const row of parseResult.rows) {
    const orpaId = resolveOrpaId(row.oficina);
    if (!orpaId) {
      notFound.push(row.oficina);
      continue;
    }

    records.push({
      periodo,
      orpa_id: orpaId,
      multas_impuestas: row.multas_impuestas,
      monto_impuesto: row.monto_impuesto,
      pagadas: row.pagadas,
      monto_pagadas: row.monto_pagadas,
      req_cobro: row.req_cobro,
      monto_req_cobro: row.monto_req_cobro,
      falt_cobro: row.falt_cobro,
      monto_falt_cobro: row.monto_falt_cobro,
      impugnacion: row.impugnacion,
      monto_impugnacion: row.monto_impugnacion,
      total_multas: row.total_multas,
      monto_total: row.monto_total,
      nombre_archivo: file.name,
      created_by: user.id,
    });
  }

  if (records.length === 0) {
    return NextResponse.json(
      {
        data: {
          parsed: parseResult.rows.length,
          inserted: 0,
          notFound,
          errors: parseResult.errors,
        },
        error: "Ninguna ORPA del concentrado coincide con las registradas en el sistema",
        message: null,
      },
      { status: 400 }
    );
  }

  // Upsert por (periodo, orpa_id)
  const { data: inserted, error } = await supabase
    .from("cifras_snapshots")
    .upsert(records, {
      onConflict: "periodo,orpa_id",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) {
    return NextResponse.json(
      { data: null, error: `Error al guardar: ${error.message}`, message: null },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      periodo,
      parsed: parseResult.rows.length,
      inserted: inserted?.length || 0,
      notFound,
      totales: parseResult.totales,
      sheetName: parseResult.sheetName,
    },
    error: null,
    message: `Se guardó el concentrado de ${periodo} con ${inserted?.length || 0} ORPAs`,
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: "No autorizado" },
      { status: 401 }
    );
  }

  const periodo = request.nextUrl.searchParams.get("periodo");

  let query = supabase
    .from("cifras_snapshots")
    .select("*, orpa:orpas(id, nombre, clave)")
    .order("periodo", { ascending: false });

  if (periodo) query = query.eq("periodo", periodo);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}
