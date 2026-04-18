import { createClient } from "@/lib/supabase/server";
import { parseExcelBuffer } from "@/lib/excel/parser";
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

  // Detect CIFRAS concentrado files early to give a helpful error
  const fileNameUpper = file.name.toUpperCase();
  if (fileNameUpper.includes("CIFRAS") || fileNameUpper.startsWith("1.")) {
    return NextResponse.json(
      {
        data: null,
        error:
          "Este archivo parece ser un concentrado CIFRAS (totales por ORPA), no un listado de expedientes. " +
          "Use la pestaña 'Concentrado' para cargarlo.",
        message: null,
      },
      { status: 400 }
    );
  }

  const parseResult = parseExcelBuffer(buffer, file.name);

  if (parseResult.valid.length === 0) {
    return NextResponse.json(
      {
        data: { parsed: 0, errors: parseResult.errors.slice(0, 100) },
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
    // Exclude non-challenge types: NO PROMUEVE, PAGADO, SIN MULTA
    // Note: CONMUTACION IS counted as impugnación per CIFRAS criteria
    const impugnado =
      row.tipo_impugnacion !== null &&
      row.tipo_impugnacion !== "NO PROMUEVE" &&
      row.tipo_impugnacion !== "PAGADO" &&
      row.tipo_impugnacion !== "SIN MULTA";

    records.push({
      orpa_id: orpaId,
      numero_expediente: row.numero_expediente,
      materia: row.materia,
      nombre_infractor: row.nombre_infractor ?? null,
      apellido_paterno: row.apellido_paterno ?? null,
      apellido_materno: row.apellido_materno ?? null,
      razon_social: row.razon_social ?? null,
      rfc_infractor: row.rfc_infractor ?? null,
      tipo_persona: row.tipo_persona ?? null,
      numero_acta: row.numero_acta ?? null,
      numero_resolucion: row.numero_resolucion ?? null,
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

  // Asignar numero_registro para expedientes con múltiples registros
  // (mismo expediente, diferente persona/multa)
  const registroCounters = new Map<string, number>();
  for (const r of records) {
    const current = (registroCounters.get(r.numero_expediente) ?? 0) + 1;
    registroCounters.set(r.numero_expediente, current);
    (r as Record<string, unknown>).numero_registro = current;
  }

  if (records.length === 0) {
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

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { data: inserted, error } = await supabase
      .from("expedientes")
      .upsert(batch, {
        onConflict: "numero_expediente,numero_registro",
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
      inserted: totalInserted,
      parseErrors: parseResult.errors.slice(0, 100),
      importErrors: importErrors.slice(0, 100),
      sheetName: parseResult.sheetName,
    },
    error: null,
    message: `Se importaron ${totalInserted} expedientes de ${records.length} registros válidos`,
  });
}
