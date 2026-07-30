const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  from: string | null;
  to: string | null;
}

export type DateRangeResult =
  | { success: true; data: DateRange }
  | { success: false; error: string };

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateRangeValues(
  fromValue: string | null | undefined,
  toValue: string | null | undefined
): DateRangeResult {
  const from = fromValue?.trim() || null;
  const to = toValue?.trim() || null;

  if (from && !isValidIsoDate(from)) {
    return { success: false, error: "fecha_desde debe usar el formato AAAA-MM-DD" };
  }
  if (to && !isValidIsoDate(to)) {
    return { success: false, error: "fecha_hasta debe usar el formato AAAA-MM-DD" };
  }
  if (from && to && from > to) {
    return { success: false, error: "La fecha inicial no puede ser posterior a la fecha final" };
  }

  return { success: true, data: { from, to } };
}

export function parseDateRange(searchParams: URLSearchParams): DateRangeResult {
  return parseDateRangeValues(
    searchParams.get("fecha_desde"),
    searchParams.get("fecha_hasta")
  );
}

export function isDateWithinRange(
  value: string | null | undefined,
  range: DateRange
): boolean {
  if (!value) return false;
  if (range.from && value < range.from) return false;
  if (range.to && value > range.to) return false;
  return true;
}

export function formatDateRangeLabel(range: DateRange): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (range.from && range.to) return `${format(range.from)} – ${format(range.to)}`;
  if (range.from) return `Desde ${format(range.from)}`;
  if (range.to) return `Hasta ${format(range.to)}`;
  return "Todos los registros";
}
