import * as XLSX from "xlsx";
import { z } from "zod";

// ============================================================
// Mapeo de nombres de columna del Excel → campo de BD
// Tolerante a variaciones entre ORPAs
// ============================================================

const COLUMN_MAP: Record<string, string> = {
  "ORPAYGT": "orpa_nombre",
  "ORPA": "orpa_nombre",
  "OFICINA": "orpa_nombre",
  "MATERIA": "materia",
  "NO. EXPEDIENTE": "numero_expediente",
  "NO.EXPEDIENTE": "numero_expediente",
  "EXPEDIENTE": "numero_expediente",
  "NUM. EXPEDIENTE": "numero_expediente",
  "FECHA DE RESOLUCIÓN": "fecha_resolucion",
  "FECHA DE RESOLUCION": "fecha_resolucion",
  "FECHA RESOLUCIÓN": "fecha_resolucion",
  "FECHA RESOLUCION": "fecha_resolucion",
  "FECHA NOTIFICACIÓN": "fecha_notificacion",
  "FECHA NOTIFICACION": "fecha_notificacion",
  "FECHA DE NOTIFICACIÓN": "fecha_notificacion",
  "FECHA DE NOTIFICACION": "fecha_notificacion",
  "MULTA": "_multa_flag",
  "MONTO MULTA": "monto_multa",
  "MONTO": "monto_multa",
  "IMPORTE": "monto_multa",
  "MULTA ($)": "monto_multa",
  "PAGADA": "pagado",
  "PAGADO": "pagado",
  "PAGO": "pagado",
  "FECHA PAGO": "fecha_pago",
  "FECHA DE PAGO": "fecha_pago",
  "MONTO PAGADO": "monto_pagado",
  "MONTO DE PAGO": "monto_pagado",
  "CANTIDAD PAGADA": "monto_pagado",
  "FOLIO DE PAGO": "folio_pago",
  "FOLIO PAGO": "folio_pago",
  "NO. FOLIO DE PAGO": "folio_pago",
  "MEDIOS DE IMPUGNACIÓN": "tipo_impugnacion",
  "MEDIOS DE IMPUGNACION": "tipo_impugnacion",
  "MEDIO DE IMPUGNACIÓN": "tipo_impugnacion",
  "MEDIO DE IMPUGNACION": "tipo_impugnacion",
  "SENTIDO DEL MEDIO DE IMPUGNACIÓN": "resultado_impugnacion",
  "SENTIDO DEL MEDIO DE IMPUGNACION": "resultado_impugnacion",
  "SENTIDO": "resultado_impugnacion",
  "ENVIADA A COBRO": "enviada_a_cobro",
  "ENVIADO A COBRO": "enviada_a_cobro",
  "NO. OFICIO SOLICITUD A COBRO": "oficio_cobro",
  "OFICIO SOLICITUD A COBRO": "oficio_cobro",
  "NO. OFICIO": "oficio_cobro",
  "¿SE ANEXA DOCUMENTACIÓN": "documentacion_anexa",
  "¿SE ANEXA DOCUMENTACIÓN?": "documentacion_anexa",
  "SE ANEXA DOCUMENTACIÓN": "documentacion_anexa",
  "SE ANEXA DOCUMENTACION": "documentacion_anexa",
  "OBSERVACIONES": "observaciones",
  // v3: Infractor fields
  "NOMBRE": "nombre_infractor",
  "NOMBRE DEL INFRACTOR": "nombre_infractor",
  "INFRACTOR": "nombre_infractor",
  "NOMBRE INFRACTOR": "nombre_infractor",
  "APELLIDO PATERNO": "apellido_paterno",
  "AP. PATERNO": "apellido_paterno",
  "APELLIDO MATERNO": "apellido_materno",
  "AP. MATERNO": "apellido_materno",
  "RAZON SOCIAL": "razon_social",
  "RAZÓN SOCIAL": "razon_social",
  "RFC": "rfc_infractor",
  "RFC INFRACTOR": "rfc_infractor",
  "R.F.C.": "rfc_infractor",
  "TIPO PERSONA": "tipo_persona",
  "TIPO DE PERSONA": "tipo_persona",
  // v3: Acta/Resolución fields
  "NO. ACTA": "numero_acta",
  "NUMERO ACTA": "numero_acta",
  "NÚMERO ACTA": "numero_acta",
  "NUM. ACTA": "numero_acta",
  "NO. RESOLUCIÓN": "numero_resolucion",
  "NO. RESOLUCION": "numero_resolucion",
  "NUMERO RESOLUCION": "numero_resolucion",
  "NÚMERO RESOLUCIÓN": "numero_resolucion",
  "NUM. RESOLUCIÓN": "numero_resolucion",
  "NUM. RESOLUCION": "numero_resolucion",
};

// Normalización de ORPA → nombre estándar para lookup
const ORPA_NORMALIZE: Record<string, string> = {
  "AGUASCALIENTES": "AGUASCALIENTES",
  "AGS": "AGUASCALIENTES",
  "BC": "BAJA CALIFORNIA",
  "BAJA CALIFORNIA": "BAJA CALIFORNIA",
  "BCS": "BAJA CALIFORNIA SUR",
  "BAJA CALIFORNIA SUR": "BAJA CALIFORNIA SUR",
  "CAMPECHE": "CAMPECHE",
  "CHIAPAS": "CHIAPAS",
  "CHIHUAHUA": "CHIHUAHUA",
  "COAHUILA": "COAHUILA",
  "COLIMA": "COLIMA",
  "DURANGO": "DURANGO",
  "EDOMEX": "ESTADO DE MÉXICO",
  "ESTADO DE MEXICO": "ESTADO DE MÉXICO",
  "ESTADO DE MÉXICO": "ESTADO DE MÉXICO",
  "GUANAJUATO": "GUANAJUATO",
  "GUERRERO": "GUERRERO",
  "HIDALGO": "HIDALGO",
  "JALISCO": "JALISCO",
  "MICHOACAN": "MICHOACÁN",
  "MICHOACÁN": "MICHOACÁN",
  "MORELOS": "MORELOS",
  "NAYARIT": "NAYARIT",
  "NUEVO LEON": "NUEVO LEÓN",
  "NUEVO LEÓN": "NUEVO LEÓN",
  "NL": "NUEVO LEÓN",
  "OAXACA": "OAXACA",
  "PUEBLA": "PUEBLA",
  "QUERETARO": "QUERÉTARO",
  "QUERÉTARO": "QUERÉTARO",
  "QRO": "QUERÉTARO",
  "QUINTANA ROO": "QUINTANA ROO",
  "QROO": "QUINTANA ROO",
  "SINALOA": "SINALOA",
  "SAN LUIS POTOSI": "SAN LUIS POTOSÍ",
  "SAN LUIS POTOSÍ": "SAN LUIS POTOSÍ",
  "SLP": "SAN LUIS POTOSÍ",
  "SONORA": "SONORA",
  "TABASCO": "TABASCO",
  "TAMAULIPAS": "TAMAULIPAS",
  "TLAXCALA": "TLAXCALA",
  "VERACRUZ": "VERACRUZ",
  "YUCATAN": "YUCATÁN",
  "YUCATÁN": "YUCATÁN",
  "ZACATECAS": "ZACATECAS",
  "ZMVM": "ZMVM",
  "ZONA METROPOLITANA": "ZMVM",
};

// Valores placeholder que deben tratarse como NULL
const NULL_PLACEHOLDERS = new Set([
  "NO APLICA", "N/A", "S/D", "PENDIENTE", "NULL", "NO", "NA",
  "SIN DATO", "SIN DATOS", "DD/MM/AA", "DD/MM/AAAA", "-", "--",
]);

// Normalización de medios de impugnación
const IMPUGNACION_MAP: Record<string, string> = {
  "NO PROMUEVE": "NO PROMUEVE",
  "RECURSO DE REVISIÓN": "RECURSO_REVISION",
  "RECURSO DE REVISION": "RECURSO_REVISION",
  "JUICIO DE NULIDAD": "JUICIO_NULIDAD",
  "AMPARO": "AMPARO",
  "CONMUTACIÓN": "CONMUTACION",
  "CONMUTACION": "CONMUTACION",
  "PAGÓ": "PAGADO",
  "PAGO": "PAGADO",
};

// ============================================================
// Zod schema para validar cada fila antes de insertar
// ============================================================
export const expedienteRowSchema = z.object({
  orpa_nombre: z.string().min(1),
  numero_expediente: z.string().min(1),
  materia: z.string().nullable().optional(),
  fecha_resolucion: z.string().nullable().optional(),
  fecha_notificacion: z.string().nullable().optional(),
  monto_multa: z.number().nullable().optional(),
  pagado: z.boolean().default(false),
  fecha_pago: z.string().nullable().optional(),
  monto_pagado: z.number().nullable().optional(),
  folio_pago: z.string().nullable().optional(),
  tipo_impugnacion: z.string().nullable().optional(),
  resultado_impugnacion: z.string().nullable().optional(),
  enviada_a_cobro: z.boolean().default(false),
  oficio_cobro: z.string().nullable().optional(),
  documentacion_anexa: z.boolean().default(false),
  observaciones: z.string().nullable().optional(),
  // v3 fields
  nombre_infractor: z.string().nullable().optional(),
  apellido_paterno: z.string().nullable().optional(),
  apellido_materno: z.string().nullable().optional(),
  razon_social: z.string().nullable().optional(),
  rfc_infractor: z.string().nullable().optional(),
  tipo_persona: z.string().nullable().optional(),
  numero_acta: z.string().nullable().optional(),
  numero_resolucion: z.string().nullable().optional(),
});

export type ExpedienteRow = z.infer<typeof expedienteRowSchema>;

export interface ParseResult {
  valid: ExpedienteRow[];
  errors: Array<{ row: number; error: string; data: Record<string, unknown> }>;
  totalRows: number;
  sheetName: string;
}

// ============================================================
// Funciones de transformación
// ============================================================

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[?¿]/g, "");
}

function isNullPlaceholder(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  const str = String(val).trim().toUpperCase();
  return NULL_PLACEHOLDERS.has(str);
}

function parseBoolean(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim().toUpperCase();
  return str === "SI" || str === "SÍ" || str === "S" || str === "1" || str === "TRUE";
}

// Rango válido para fechas de expedientes: 2019 en adelante, hasta un año futuro
// (evita importar años tipo "0025", "1900", "2029" que son errores de captura)
const MIN_VALID_DATE = "2019-01-01";
const MAX_VALID_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
})();

function isReasonableDate(iso: string | null): boolean {
  if (!iso) return false;
  return iso >= MIN_VALID_DATE && iso <= MAX_VALID_DATE;
}

function parseDate(val: unknown): string | null {
  if (isNullPlaceholder(val)) return null;

  // If it's a JS Date object (from Excel)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const iso = val.toISOString().split("T")[0];
    return isReasonableDate(iso) ? iso : null;
  }

  // If it's a number (Excel serial date)
  if (typeof val === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        const y = date.y;
        const m = String(date.m).padStart(2, "0");
        const d = String(date.d).padStart(2, "0");
        const iso = `${y}-${m}-${d}`;
        return isReasonableDate(iso) ? iso : null;
      }
    } catch {
      return null;
    }
  }

  // String date in various formats
  const str = String(val).trim();

  // DD/MM/YYYY or DD/MM/YY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    let y = dmyMatch[3];
    if (y.length === 2) {
      y = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    }
    const iso = `${y}-${m}-${d}`;
    return isReasonableDate(iso) ? iso : null;
  }

  // ISO format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    return isReasonableDate(iso) ? iso : null;
  }

  return null;
}

function parseMonto(val: unknown): number | null {
  if (isNullPlaceholder(val)) return null;
  if (typeof val === "number") return val;

  const str = String(val)
    .trim()
    .replace(/[$,\s]/g, "")
    .replace(/,/g, "");

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function normalizeImpugnacion(val: unknown): string | null {
  if (isNullPlaceholder(val)) return null;
  const str = String(val).trim().toUpperCase();
  return IMPUGNACION_MAP[str] || str;
}

function normalizeOrpa(val: unknown): string {
  if (!val) return "";
  const str = String(val).trim().toUpperCase();
  return ORPA_NORMALIZE[str] || str;
}

function normalizeTipoPersona(val: unknown): string | null {
  if (isNullPlaceholder(val)) return null;
  const str = String(val).trim().toUpperCase();
  if (str === "FISICA" || str === "FÍSICA" || str === "F" || str === "PF") return "fisica";
  if (str === "MORAL" || str === "M" || str === "PM") return "moral";
  return null;
}

// Known valid materias
const VALID_MATERIAS = new Set([
  "INDUSTRIA",
  "FORESTAL",
  "IMPACTO AMBIENTAL",
  "ZOFEMAT",
  "VIDA SILVESTRE",
  "RECURSOS MARINOS",
]);

function normalizeMateria(val: unknown): string | null {
  if (isNullPlaceholder(val)) return null;
  const str = String(val).trim().toUpperCase();
  if (str === "IMPACTO") return "IMPACTO AMBIENTAL";
  if (str === "VIDA") return "VIDA SILVESTRE";
  if (str === "RECURSOS") return "RECURSOS MARINOS";
  // Only return if it's a known valid materia
  if (VALID_MATERIAS.has(str)) return str;
  // Could be data entry error (e.g. ORPA name in materia column) — return null
  return null;
}

// ============================================================
// Función principal de parsing
// ============================================================

export function parseExcelBuffer(buffer: ArrayBuffer, fileName?: string): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    cellNF: false,
  });

  // Find the main data sheet (skip Hoja2 which has validation lists)
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (lower !== "hoja2" && !lower.includes("enero") && !lower.includes("febrero")) {
      sheetName = name;
      break;
    }
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (rawData.length < 2) {
    return { valid: [], errors: [], totalRows: 0, sheetName };
  }

  // Find header row — look for a row with several non-null cells that contains "EXPEDIENTE"
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (!row) continue;
    const nonNull = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
    const hasExpediente = row.some(
      (c) => c && normalizeHeader(String(c)).includes("EXPEDIENTE")
    );
    if (nonNull >= 5 && hasExpediente) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Fallback: try row 1 (most common)
    headerRowIdx = rawData.length > 1 ? 1 : 0;
  }

  // Map headers to field names
  const headers = rawData[headerRowIdx] as string[];
  const columnMapping: Array<{ index: number; field: string }> = [];

  for (let i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    const normalized = normalizeHeader(String(headers[i]));
    // Try exact match first
    let field = COLUMN_MAP[normalized];
    // Try partial match
    if (!field) {
      for (const [key, val] of Object.entries(COLUMN_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          field = val;
          break;
        }
      }
    }
    if (field) {
      columnMapping.push({ index: i, field });
    }
  }

  const valid: ExpedienteRow[] = [];
  const errors: ParseResult["errors"] = [];

  // Extract ORPA from filename if present (e.g. "AGUASCALIENTES.XLSX")
  let fileOrpa = "";
  if (fileName) {
    const name = fileName.replace(/\.xlsx?$/i, "").trim().toUpperCase();
    // Skip summary files
    if (!name.startsWith("1.") && !name.includes("CIFRAS")) {
      fileOrpa = normalizeOrpa(name);
    }
  }

  // Process data rows
  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;

    // Skip completely empty rows
    const nonNull = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
    if (nonNull < 3) continue;

    // Build row object
    const rowData: Record<string, unknown> = {};
    for (const { index, field } of columnMapping) {
      rowData[field] = row[index];
    }

    // Skip the "_multa_flag" field (always "SI", not useful)
    delete rowData._multa_flag;

    try {
      // Determine ORPA
      const orpaNombre = normalizeOrpa(rowData.orpa_nombre) || fileOrpa;
      if (!orpaNombre) {
        errors.push({ row: i + 1, error: "No se pudo determinar la ORPA", data: rowData });
        continue;
      }

      // Get numero_expediente
      const numExp = rowData.numero_expediente
        ? String(rowData.numero_expediente).trim()
        : null;
      if (!numExp) {
        errors.push({ row: i + 1, error: "Sin número de expediente", data: rowData });
        continue;
      }

      const parsed: ExpedienteRow = {
        orpa_nombre: orpaNombre,
        numero_expediente: numExp,
        materia: normalizeMateria(rowData.materia),
        fecha_resolucion: parseDate(rowData.fecha_resolucion),
        fecha_notificacion: parseDate(rowData.fecha_notificacion),
        monto_multa: parseMonto(rowData.monto_multa),
        pagado: parseBoolean(rowData.pagado),
        fecha_pago: parseDate(rowData.fecha_pago),
        monto_pagado: parseMonto(rowData.monto_pagado),
        folio_pago: isNullPlaceholder(rowData.folio_pago)
          ? null
          : String(rowData.folio_pago).trim(),
        tipo_impugnacion: normalizeImpugnacion(rowData.tipo_impugnacion),
        resultado_impugnacion: isNullPlaceholder(rowData.resultado_impugnacion)
          ? null
          : String(rowData.resultado_impugnacion).trim(),
        enviada_a_cobro: parseBoolean(rowData.enviada_a_cobro),
        oficio_cobro: isNullPlaceholder(rowData.oficio_cobro)
          ? null
          : String(rowData.oficio_cobro).trim(),
        documentacion_anexa: parseBoolean(rowData.documentacion_anexa),
        observaciones: isNullPlaceholder(rowData.observaciones)
          ? null
          : String(rowData.observaciones).trim(),
        // v3 fields
        nombre_infractor: isNullPlaceholder(rowData.nombre_infractor)
          ? null
          : String(rowData.nombre_infractor).trim(),
        apellido_paterno: isNullPlaceholder(rowData.apellido_paterno)
          ? null
          : String(rowData.apellido_paterno).trim(),
        apellido_materno: isNullPlaceholder(rowData.apellido_materno)
          ? null
          : String(rowData.apellido_materno).trim(),
        razon_social: isNullPlaceholder(rowData.razon_social)
          ? null
          : String(rowData.razon_social).trim(),
        rfc_infractor: isNullPlaceholder(rowData.rfc_infractor)
          ? null
          : String(rowData.rfc_infractor).trim().toUpperCase(),
        tipo_persona: normalizeTipoPersona(rowData.tipo_persona),
        numero_acta: isNullPlaceholder(rowData.numero_acta)
          ? null
          : String(rowData.numero_acta).trim(),
        numero_resolucion: isNullPlaceholder(rowData.numero_resolucion)
          ? null
          : String(rowData.numero_resolucion).trim(),
      };

      // Si está pagado y no tiene monto_pagado, asumir monto_multa
      if (parsed.pagado && parsed.monto_pagado == null && parsed.monto_multa != null) {
        parsed.monto_pagado = parsed.monto_multa;
      }

      const result = expedienteRowSchema.safeParse(parsed);
      if (result.success) {
        valid.push(result.data);
      } else {
        errors.push({
          row: i + 1,
          error: result.error.issues.map((e) => `${e.path}: ${e.message}`).join("; "),
          data: rowData,
        });
      }
    } catch (e) {
      errors.push({
        row: i + 1,
        error: e instanceof Error ? e.message : "Error desconocido",
        data: rowData,
      });
    }
  }

  return {
    valid,
    errors,
    totalRows: rawData.length - headerRowIdx - 1,
    sheetName,
  };
}
