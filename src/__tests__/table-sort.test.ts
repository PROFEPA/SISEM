import { describe, expect, it } from "vitest";
import { compareSortValues, stableSort } from "@/lib/table-sort";

describe("table-sort", () => {
  it("ordena texto con reglas naturales en español", () => {
    const rows = ["Expediente 10", "expediente 2", "Árbol"];
    expect(stableSort(rows, (value) => value, "asc")).toEqual([
      "Árbol",
      "expediente 2",
      "Expediente 10",
    ]);
  });

  it("ordena números y fechas en ambos sentidos", () => {
    expect(stableSort([5, 1, 10], (value) => value, "desc")).toEqual([10, 5, 1]);
    expect(stableSort(["2026-02-01", "2025-12-01"], (value) => value, "asc"))
      .toEqual(["2025-12-01", "2026-02-01"]);
  });

  it("ordena booleanos", () => {
    expect(stableSort([false, true, false], (value) => value, "desc"))
      .toEqual([true, false, false]);
  });

  it("mantiene vacíos al final sin importar la dirección", () => {
    expect(stableSort([null, 2, 1], (value) => value, "asc")).toEqual([1, 2, null]);
    expect(stableSort([null, 2, 1], (value) => value, "desc")).toEqual([2, 1, null]);
  });

  it("preserva el orden original cuando los valores empatan", () => {
    const rows = [{ id: "a", value: 1 }, { id: "b", value: 1 }];
    expect(stableSort(rows, (row) => row.value, "asc").map((row) => row.id))
      .toEqual(["a", "b"]);
    expect(compareSortValues("A", "a", "asc")).toBe(0);
  });
});
