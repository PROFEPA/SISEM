import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { expedienteCreateSchema } from "@/lib/validations/expediente";
import { checkPermission } from "@/lib/auth/permissions";

function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, (c) => `\\${c}`);
}

const VALID_SORT_COLUMNS = new Set([
  "created_at", "updated_at", "numero_expediente", "nombre_infractor",
  "monto_multa", "fecha_resolucion", "fecha_notificacion", "materia",
]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: "No autorizado", message: null },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25") || 25));
  const orpaId = searchParams.get("orpa_id");
  const estatusId = searchParams.get("estatus_id");
  const pagado = searchParams.get("pagado");
  const impugnado = searchParams.get("impugnado");
  const busqueda = searchParams.get("busqueda");
  const fechaDesde = searchParams.get("fecha_desde");
  const fechaHasta = searchParams.get("fecha_hasta");
  const materia = searchParams.get("materia");
  const enviadaACobro = searchParams.get("enviada_a_cobro");
  const tipoImpugnacion = searchParams.get("tipo_impugnacion");
  const resultadoImpugnacion = searchParams.get("resultado_impugnacion");
  const tipoPersona = searchParams.get("tipo_persona");
  const fechaNotifDesde = searchParams.get("fecha_notificacion_desde");
  const fechaNotifHasta = searchParams.get("fecha_notificacion_hasta");
  const sortByRaw = searchParams.get("sort_by") || "created_at";
  const sortBy = VALID_SORT_COLUMNS.has(sortByRaw) ? sortByRaw : "created_at";
  const sortDir = searchParams.get("sort_dir") === "asc" ? true : false;

  let query = supabase
    .from("expedientes")
    .select("*, orpa:orpas(*), estatus:estatus_expediente(*)", { count: "exact" });

  if (orpaId) query = query.eq("orpa_id", orpaId);
  if (estatusId) query = query.eq("estatus_id", parseInt(estatusId));
  if (pagado !== null && pagado !== undefined && pagado !== "")
    query = query.eq("pagado", pagado === "true");
  if (impugnado !== null && impugnado !== undefined && impugnado !== "")
    query = query.eq("impugnado", impugnado === "true");
  if (enviadaACobro !== null && enviadaACobro !== undefined && enviadaACobro !== "")
    query = query.eq("enviada_a_cobro", enviadaACobro === "true");
  if (materia) query = query.eq("materia", materia);
  if (tipoImpugnacion) query = query.eq("tipo_impugnacion", tipoImpugnacion);
  if (resultadoImpugnacion) query = query.eq("resultado_impugnacion", resultadoImpugnacion);
  if (tipoPersona) query = query.eq("tipo_persona", tipoPersona);
  if (fechaDesde) query = query.gte("fecha_resolucion", fechaDesde);
  if (fechaHasta) query = query.lte("fecha_resolucion", fechaHasta);
  if (fechaNotifDesde) query = query.gte("fecha_notificacion", fechaNotifDesde);
  if (fechaNotifHasta) query = query.lte("fecha_notificacion", fechaNotifHasta);
  if (busqueda) {
    const trimmed = busqueda.trim();
    const escaped = escapeIlike(trimmed);
    // Always use ilike for reliable partial matching (expediente numbers have
    // slashes/dots/hyphens that break full-text search tokenization)
    query = query.or(
      [
        `numero_expediente.ilike.%${escaped}%`,
        `nombre_infractor.ilike.%${escaped}%`,
        `apellido_paterno.ilike.%${escaped}%`,
        `apellido_materno.ilike.%${escaped}%`,
        `razon_social.ilike.%${escaped}%`,
        `rfc_infractor.ilike.%${escaped}%`,
        `numero_acta.ilike.%${escaped}%`,
        `numero_resolucion.ilike.%${escaped}%`,
        `observaciones.ilike.%${escaped}%`,
      ].join(",")
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortDir })
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message, message: null },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    error: null,
    message: null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const perm = await checkPermission("puede_crear_expediente");
  if (!perm.allowed) {
    return NextResponse.json(
      { data: null, error: perm.error || "Sin permisos", message: null },
      { status: perm.user ? 403 : 401 }
    );
  }
  const user = perm.user!;

  const body = await request.json();

  const parsed = expedienteCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { data: null, error: `${firstError.path.join(".")}: ${firstError.message}`, message: null },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expedientes")
    .insert({ ...parsed.data, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message, message: null },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { data, error: null, message: "Expediente creado exitosamente" },
    { status: 201 }
  );
}

