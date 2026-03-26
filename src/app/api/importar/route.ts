import { createClient } from "@/lib/supabase/server";
import { parseExcelBuffer } from "@/lib/excel/parser";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { data: null, error: "No autorizado", message: null },
      { status: 401 }
    );
  }

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "capturador"].includes(profile.role)) {
    return NextResponse.json(
      { data: null, error: "Sin permisos para importar", message: null },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const orpaIdOverride = formData.get("orpa_id") as string | null;

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

  // Parse Excel
  const buffer = await file.arrayBuffer();
  const parseResult = parseExcelBuffer(buffer, file.name);

  if (parseResult.valid.length === 0) {
    return NextResponse.json(
      {
        data: { parsed: 0, errors: parseResult.errors.slice(0, 20) },
        error: "No se encontraron registros válidos",
        message: null,
      },
      { status: 400 }
    );
  }

  // Get ORPA lookup table — index by nombre (uppercase) and clave (uppercase)
  const { data: orpas } = await supabase.from("orpas").select("id, nombre, clave");
  const orpaByNombre = new Map<string, string>();
  const orpaByClave = new Map<string, string>();
  if (orpas) {
    for (const o of orpas) {
      orpaByNombre.set(o.nombre.toUpperCase().trim(), o.id);
      orpaByClave.set(o.clave.toUpperCase().trim(), o.id);
    }
  }

  function resolveOrpaId(nombre: string): string | null {
    const key = nombre.toUpperCase().trim();
    // Exact match by nombre
    if (orpaByNombre.has(key)) return orpaByNombre.get(key)!;
    // Exact match by clave
    if (orpaByClave.has(key)) return orpaByClave.get(key)!;
    // Partial: check if any nombre contains this key or vice versa
    for (const [n, id] of orpaByNombre) {
      if (n.includes(key) || key.includes(n)) return id;
    }
    return null;
  }

  // Transform parsed rows → DB records
  const records = [];
  const importErrors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < parseResult.valid.length; i++) {
    const row = parseResult.valid[i];

    // Resolve ORPA ID
    let orpaId = orpaIdOverride;
    if (!orpaId) {
      orpaId = resolveOrpaId(row.orpa_nombre);
    }
    if (!orpaId) {
      importErrors.push({
        row: i + 1,
        error: `ORPA no encontrada: ${row.orpa_nombre}`,
      });
      continue;
    }

    // Determine impugnado based on tipo_impugnacion
    const impugnado =
      row.tipo_impugnacion !== null &&
      row.tipo_impugnacion !== "NO PROMUEVE" &&
      row.tipo_impugnacion !== "PAGADO";

    records.push({
      orpa_id: orpaId,
      numero_expediente: row.numero_expediente,
      materia: row.materia,
      nombre_infractor: "SIN DATO",
      fecha_resolucion: row.fecha_resolucion,
      fecha_notificacion: row.fecha_notificacion,
      monto_multa: row.monto_multa,
      pagado: row.pagado,
      fecha_pago: row.fecha_pago,
      monto_pagado: row.monto_pagado ?? null,
      folio_pago: row.folio_pago ?? null,
      impugnado,
      tipo_impugnacion: row.tipo_impugnacion,
      resultado_impugnacion: row.resultado_impugnacion,
      enviada_a_cobro: row.enviada_a_cobro,
      oficio_cobro: row.oficio_cobro,
      documentacion_anexa: row.documentacion_anexa,
      observaciones: row.observaciones,
      fuente: "excel" as const,
      created_by: user.id,
      updated_by: user.id,
    });
  }

  // Deduplicar por numero_expediente — conservar última ocurrencia
  const dedupMap = new Map<string, (typeof records)[0]>();
  for (const r of records) {
    if (r.numero_expediente) dedupMap.set(r.numero_expediente, r);
  }
  const dedupedRecords = Array.from(dedupMap.values());

  if (dedupedRecords.length === 0) {
    return NextResponse.json(
      {
        data: { parsed: 0, inserted: 0, errors: importErrors },
        error: "No se pudieron mapear registros a ORPAs",
        message: null,
      },
      { status: 400 }
    );
  }

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  let totalInserted = 0;

  for (let i = 0; i < dedupedRecords.length; i += BATCH_SIZE) {
    const batch = dedupedRecords.slice(i, i + BATCH_SIZE);
    const { data: inserted, error } = await supabase
      .from("expedientes")
      .upsert(batch, {
        onConflict: "numero_expediente",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) {
      importErrors.push({
        row: i,
        error: `Error en lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`,
      });
    } else {
      totalInserted += inserted?.length || 0;
    }
  }

  return NextResponse.json({
    data: {
      totalRows: parseResult.totalRows,
      parsed: parseResult.valid.length,
      deduplicated: dedupedRecords.length,
      inserted: totalInserted,
      parseErrors: parseResult.errors.slice(0, 20),
      importErrors: importErrors.slice(0, 20),
      sheetName: parseResult.sheetName,
    },
    error: null,
    message: `Se importaron ${totalInserted} expedientes de ${dedupedRecords.length} registros únicos (${parseResult.valid.length} válidos, ${parseResult.valid.length - dedupedRecords.length} duplicados eliminados)`,
  });
}
