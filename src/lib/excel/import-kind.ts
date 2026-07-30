export type ExpedienteImportKind = "general" | "pendientes";

/**
 * Los archivos de pendientes son listas curadas por el cliente. Se reconocen
 * por nombre para no intentar inferir la exclusión a partir de fechas u otros
 * campos que también pueden aparecer en expedientes generales.
 */
export function detectExpedienteImportKind(
  fileName: string
): ExpedienteImportKind {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  return /(^|[^A-Z0-9])PENDIENTES?([^A-Z0-9]|$)/.test(normalized)
    ? "pendientes"
    : "general";
}

export interface ExistingExpedienteMatch {
  id: string;
  numero_expediente: string;
  numero_registro: number;
  monto_multa: number | null;
}

export interface IncomingExpedienteMatch {
  numero_expediente: string;
  monto_multa: number | null | undefined;
}

function sameAmount(
  incoming: number | null | undefined,
  existing: number | null,
  tolerance: number
): boolean {
  if (incoming == null || existing == null) {
    return incoming == null && existing == null;
  }
  return Math.abs(incoming - existing) <= tolerance;
}

/**
 * Conserva el numero_registro del expediente ya existente cuando coinciden
 * número y monto. Los registros realmente nuevos reciben el siguiente número
 * disponible. Cada coincidencia se consume una sola vez para soportar multas
 * repetidas legítimas dentro del mismo expediente.
 */
export function assignPendingRegistroNumbers(
  incoming: IncomingExpedienteMatch[],
  existing: ExistingExpedienteMatch[],
  amountTolerance = 0.5
): number[] {
  const byExpediente = new Map<string, ExistingExpedienteMatch[]>();
  const nextRegistro = new Map<string, number>();

  for (const record of existing) {
    const candidates = byExpediente.get(record.numero_expediente) ?? [];
    candidates.push(record);
    byExpediente.set(record.numero_expediente, candidates);
    nextRegistro.set(
      record.numero_expediente,
      Math.max(nextRegistro.get(record.numero_expediente) ?? 0, record.numero_registro)
    );
  }

  const claimedIds = new Set<string>();

  return incoming.map((record) => {
    const match = (byExpediente.get(record.numero_expediente) ?? []).find(
      (candidate) =>
        !claimedIds.has(candidate.id) &&
        sameAmount(record.monto_multa, candidate.monto_multa, amountTolerance)
    );

    if (match) {
      claimedIds.add(match.id);
      return match.numero_registro;
    }

    const next = (nextRegistro.get(record.numero_expediente) ?? 0) + 1;
    nextRegistro.set(record.numero_expediente, next);
    return next;
  });
}

export function findStalePendingIds(
  previouslyPendingIds: string[],
  importedIds: Iterable<string>
): string[] {
  const currentIds = new Set(importedIds);
  return previouslyPendingIds.filter((id) => !currentIds.has(id));
}
