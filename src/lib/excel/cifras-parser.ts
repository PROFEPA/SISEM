import * as XLSX from "xlsx";

/**
 * Parser para archivos CIFRAS (concentrado mensual PROFEPA).
 * Formato: una fila por ORPA con columnas:
 *   OFICINA | Multas impuestas | Monto | Pagadas | Monto pag | Req cobro | Monto req
 *          | Falt cobro | Monto falt | Impugnacion | Monto imp | Total | Monto total
 */

export interface CifrasRow {
  oficina: string;          // Nombre oficina (raw)
  multas_impuestas: number;
  monto_impuesto: number;
  pagadas: number;
  monto_pagadas: number;
  req_cobro: number;
  monto_req_cobro: number;
  falt_cobro: number;
  monto_falt_cobro: number;
  impugnacion: number;
  monto_impugnacion: number;
  total_multas: number;
  monto_total: number;
}

export interface CifrasParseResult {
  rows: CifrasRow[];
  totales: CifrasRow | null;  // Fila TOTAL si existe
  errors: Array<{ row: number; error: string }>;
  periodo: string | null;      // Detectado del nombre del archivo, ej "2026-03"
  sheetName: string;
}

// Mapeo de nombre ORPA → clave/nombre canónico (igual al parser principal)
const OFICINA_NORMALIZE: Record<string, string> = {
  "AGUASCALIENTES": "AGUASCALIENTES",
  "BAJA CALIFORNIA": "BAJA CALIFORNIA",
  "BAJA CALIFORNIA SUR": "BAJA CALIFORNIA SUR",
  "CAMPECHE": "CAMPECHE",
  "CHIAPAS": "CHIAPAS",
  "CHIHUAHUA": "CHIHUAHUA",
  "COAHUILA": "COAHUILA",
  "COLIMA": "COLIMA",
  "DURANGO": "DURANGO",
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
  "OAXACA": "OAXACA",
  "PUEBLA": "PUEBLA",
  "QUERETARO": "QUERÉTARO",
  "QUERÉTARO": "QUERÉTARO",
  "QUINTANA ROO": "QUINTANA ROO",
  "SAN LUIS POTOSI": "SAN LUIS POTOSÍ",
  "SAN LUIS POTOSÍ": "SAN LUIS POTOSÍ",
  "SINALOA": "SINALOA",
  "SONORA": "SONORA",
  "TABASCO": "TABASCO",
  "TAMAULIPAS": "TAMAULIPAS",
  "TLAXCALA": "TLAXCALA",
  "VERACRUZ": "VERACRUZ",
  "YUCATAN": "YUCATÁN",
  "YUCATÁN": "YUCATÁN",
  "ZACATECAS": "ZACATECAS",
  "ZONA METROPOLITANA DEL VALLE DE MEXICO": "ZMVM",
  "ZONA METROPOLITANA DEL VALLE DE MÉXICO": "ZMVM",
  "ZMVM": "ZMVM",
  "VALLE DE MEXICO": "ZMVM",
  "VALLE DE MÉXICO": "ZMVM",
};

const MESES: Record<string, string> = {
  ENERO: "01", FEBRERO: "02", MARZO: "03", ABRIL: "04",
  MAYO: "05", JUNIO: "06", JULIO: "07", AGOSTO: "08",
  SEPTIEMBRE: "09", OCTUBRE: "10", NOVIEMBRE: "11", DICIEMBRE: "12",
};

function normalizeOficina(val: unknown): string {
  if (!val) return "";
  const str = String(val).trim().replace(/\s+/g, " ").toUpperCase();
  return OFICINA_NORMALIZE[str] || str;
}

function toInt(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Math.round(val);
  const n = parseInt(String(val).replace(/[,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Detect periodo from file name, e.g. "1. CIFRAS MARZO 2026.xlsx" → "2026-03"
export function detectPeriodo(fileName: string): string | null {
  const name = fileName.replace(/\.xlsx?$/i, "").toUpperCase();
  const yearMatch = name.match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : null;
  for (const [mesName, mesNum] of Object.entries(MESES)) {
    if (name.includes(mesName)) {
      return year ? `${year}-${mesNum}` : null;
    }
  }
  return null;
}

/**
 * Detecta si un archivo parece ser un concentrado CIFRAS (no expedientes).
 */
export function isCifrasFile(fileName: string, firstRow: unknown[]): boolean {
  const name = fileName.toUpperCase();
  if (name.includes("CIFRAS") || name.startsWith("1.")) return true;
  // Check headers: CIFRAS has "OFICINA DE REPRESENTACIÓN" or "Multas impuestas"
  for (const cell of firstRow) {
    if (!cell) continue;
    const s = String(cell).toUpperCase();
    if (s.includes("OFICINA DE") || s.includes("MULTAS IMPUESTAS")) return true;
  }
  return false;
}

export function parseCifrasBuffer(
  buffer: ArrayBuffer,
  fileName: string
): CifrasParseResult {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    cellNF: false,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const errors: CifrasParseResult["errors"] = [];

  if (rawData.length < 2) {
    return {
      rows: [],
      totales: null,
      errors: [{ row: 0, error: "Archivo vacío o sin datos" }],
      periodo: detectPeriodo(fileName),
      sheetName,
    };
  }

  // Header row is row 0 (per CIFRAS structure)
  // Row 1+ = data rows (one per ORPA)
  const rows: CifrasRow[] = [];
  let totales: CifrasRow | null = null;

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;

    const oficinaRaw = row[0];
    if (oficinaRaw === null || oficinaRaw === undefined) continue;
    const oficinaStr = String(oficinaRaw).trim();
    if (oficinaStr === "") continue;

    // Skip completely empty rows or rows with no numeric data
    const nonNull = row.filter(
      (c) => c !== null && c !== undefined && String(c).trim() !== ""
    ).length;
    if (nonNull < 3) continue;

    // Columns expected (0-based):
    // 0: oficina, 1: multas, 2: monto_multas, 3: pagadas, 4: monto_pag,
    // 5: req_cobro, 6: monto_req, 7: falt_cobro, 8: monto_falt,
    // 9: impugnacion, 10: monto_imp, 11: total, 12: monto_total

    const parsed: CifrasRow = {
      oficina: oficinaStr,
      multas_impuestas: toInt(row[1]),
      monto_impuesto: toNum(row[2]),
      pagadas: toInt(row[3]),
      monto_pagadas: toNum(row[4]),
      req_cobro: toInt(row[5]),
      monto_req_cobro: toNum(row[6]),
      falt_cobro: toInt(row[7]),
      monto_falt_cobro: toNum(row[8]),
      impugnacion: toInt(row[9]),
      monto_impugnacion: toNum(row[10]),
      total_multas: toInt(row[11]),
      monto_total: toNum(row[12]),
    };

    if (oficinaStr.toUpperCase() === "TOTAL") {
      totales = parsed;
      continue;
    }

    // Skip rows with no meaningful data
    if (parsed.multas_impuestas === 0 && parsed.total_multas === 0) continue;

    rows.push(parsed);
  }

  return {
    rows,
    totales,
    errors,
    periodo: detectPeriodo(fileName),
    sheetName,
  };
}

// Export normalization helper for use in API
export { normalizeOficina };
