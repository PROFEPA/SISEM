import { describe, expect, it } from "vitest";
import {
  isDateWithinRange,
  parseDateRange,
  parseDateRangeValues,
} from "@/lib/date-range";

describe("date-range", () => {
  it("acepta un rango ausente", () => {
    expect(parseDateRange(new URLSearchParams())).toEqual({
      success: true,
      data: { from: null, to: null },
    });
  });

  it("acepta límites individuales por compatibilidad", () => {
    expect(parseDateRangeValues("2026-01-01", null)).toEqual({
      success: true,
      data: { from: "2026-01-01", to: null },
    });
  });

  it("incluye ambos extremos", () => {
    const range = { from: "2026-01-01", to: "2026-01-31" };
    expect(isDateWithinRange("2026-01-01", range)).toBe(true);
    expect(isDateWithinRange("2026-01-31", range)).toBe(true);
    expect(isDateWithinRange("2025-12-31", range)).toBe(false);
    expect(isDateWithinRange("2026-02-01", range)).toBe(false);
  });

  it("rechaza formatos y fechas inexistentes", () => {
    expect(parseDateRangeValues("01/01/2026", "2026-01-31").success).toBe(false);
    expect(parseDateRangeValues("2026-02-30", "2026-03-01").success).toBe(false);
  });

  it("rechaza un rango invertido", () => {
    const result = parseDateRangeValues("2026-02-01", "2026-01-01");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("posterior");
  });
});
