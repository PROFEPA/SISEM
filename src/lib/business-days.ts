/**
 * Utilidad para cálculo de días hábiles en México.
 * Excluye sábados, domingos y días festivos oficiales.
 */

// Días festivos fijos (MM-DD)
const FIESTAS_FIJAS: string[] = [
  "01-01", // Año Nuevo
  "02-05", // Día de la Constitución (primer lunes de febrero — se fija como referencia)
  "03-21", // Natalicio de Benito Juárez (tercer lunes de marzo — se fija como referencia)
  "05-01", // Día del Trabajo
  "09-16", // Día de la Independencia
  "11-20", // Revolución Mexicana (tercer lunes de noviembre — se fija como referencia)
  "12-25", // Navidad
];

/**
 * Días festivos variables por año.
 * El primer lunes de febrero, tercer lunes de marzo, y tercer lunes de noviembre
 * se calculan dinámicamente.
 */
function getNthMonday(year: number, month: number, n: number): Date {
  const d = new Date(year, month - 1, 1);
  // Avanzar al primer lunes
  const dayOfWeek = d.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  d.setDate(1 + daysUntilMonday + (n - 1) * 7);
  return d;
}

function getHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // Fijos no móviles
  holidays.add(`${year}-01-01`);
  holidays.add(`${year}-05-01`);
  holidays.add(`${year}-09-16`);
  holidays.add(`${year}-12-25`);

  // Primer lunes de febrero (Constitución)
  const feb1 = getNthMonday(year, 2, 1);
  holidays.add(formatDate(feb1));

  // Tercer lunes de marzo (Benito Juárez)
  const mar3 = getNthMonday(year, 3, 3);
  holidays.add(formatDate(mar3));

  // Tercer lunes de noviembre (Revolución)
  const nov3 = getNthMonday(year, 11, 3);
  holidays.add(formatDate(nov3));

  // Cambio de gobierno cada 6 años (1 de octubre)
  if (year % 6 === 0) {
    holidays.add(`${year}-10-01`);
  }

  return holidays;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Cache de festivos por año
const holidayCache = new Map<number, Set<string>>();

function getHolidaysForYear(year: number): Set<string> {
  if (!holidayCache.has(year)) {
    holidayCache.set(year, getHolidays(year));
  }
  return holidayCache.get(year)!;
}

function isHoliday(d: Date): boolean {
  const year = d.getFullYear();
  const key = formatDate(d);
  return getHolidaysForYear(year).has(key);
}

function isBusinessDay(d: Date): boolean {
  return !isWeekend(d) && !isHoliday(d);
}

/**
 * Suma N días hábiles a una fecha.
 * @param dateStr Fecha inicio en formato YYYY-MM-DD
 * @param days Número de días hábiles a sumar
 * @returns Fecha resultado en formato YYYY-MM-DD
 */
export function addBusinessDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) {
      remaining--;
    }
  }
  return formatDate(d);
}

/**
 * Cuenta los días hábiles entre dos fechas (exclusivo de ambos extremos).
 * @param startStr Fecha inicio YYYY-MM-DD
 * @param endStr Fecha fin YYYY-MM-DD
 * @returns Número de días hábiles (negativo si end < start)
 */
export function businessDaysBetween(startStr: string, endStr: string): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  if (end < start) {
    return -businessDaysBetween(endStr, startStr);
  }

  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calcula la fecha límite de notificación (15 días hábiles después de resolución).
 */
export function fechaLimiteNotificacion(fechaResolucion: string): string {
  return addBusinessDays(fechaResolucion, 15);
}

/**
 * Calcula la fecha límite de cobro (2 meses calendario después de notificación).
 */
export function fechaLimiteCobro(fechaNotificacion: string): string {
  const d = parseDate(fechaNotificacion);
  d.setMonth(d.getMonth() + 2);
  return formatDate(d);
}

/**
 * Calcula días hábiles restantes para notificación desde hoy.
 * Positivo = quedan días, negativo = vencido.
 */
export function diasHabilesRestantesNotificacion(
  fechaResolucion: string,
  hoy?: string
): number {
  const limite = fechaLimiteNotificacion(fechaResolucion);
  const today = hoy || formatDate(new Date());
  return businessDaysBetween(today, limite);
}

/**
 * Calcula días calendario restantes para cobro desde hoy.
 * Positivo = quedan días, negativo = vencido.
 */
export function diasRestantesCobro(
  fechaNotificacion: string,
  hoy?: string
): number {
  const limite = fechaLimiteCobro(fechaNotificacion);
  const today = hoy || formatDate(new Date());
  const limitDate = parseDate(limite);
  const todayDate = parseDate(today);
  const diff = limitDate.getTime() - todayDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export { formatDate, parseDate, isBusinessDay, FIESTAS_FIJAS };
