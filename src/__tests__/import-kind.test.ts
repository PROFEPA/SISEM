import { describe, expect, it } from "vitest";

import {
  assignPendingRegistroNumbers,
  detectExpedienteImportKind,
  findStalePendingIds,
} from "@/lib/excel/import-kind";

describe("detectExpedienteImportKind", () => {
  it("detecta el archivo mensual de pendientes sin distinguir mayúsculas", () => {
    expect(detectExpedienteImportKind("Pendientes junio.xlsx")).toBe(
      "pendientes"
    );
    expect(detectExpedienteImportKind("actualización PENDIENTE julio.xls")).toBe(
      "pendientes"
    );
  });

  it("mantiene como general un archivo ordinario", () => {
    expect(detectExpedienteImportKind("Multas Junio.xlsx")).toBe("general");
  });
});

describe("assignPendingRegistroNumbers", () => {
  it("reutiliza el registro existente por expediente y monto", () => {
    const assigned = assignPendingRegistroNumbers(
      [
        { numero_expediente: "PFPA/001", monto_multa: 1000.25 },
        { numero_expediente: "PFPA/001", monto_multa: 2500 },
      ],
      [
        {
          id: "existing-2",
          numero_expediente: "PFPA/001",
          numero_registro: 2,
          monto_multa: 1000,
        },
      ]
    );

    expect(assigned).toEqual([2, 3]);
  });

  it("no reutiliza dos veces la misma coincidencia", () => {
    const assigned = assignPendingRegistroNumbers(
      [
        { numero_expediente: "PFPA/002", monto_multa: 500 },
        { numero_expediente: "PFPA/002", monto_multa: 500 },
      ],
      [
        {
          id: "existing-1",
          numero_expediente: "PFPA/002",
          numero_registro: 1,
          monto_multa: 500,
        },
      ]
    );

    expect(assigned).toEqual([1, 2]);
  });
});

describe("findStalePendingIds", () => {
  it("devuelve únicamente pendientes anteriores ausentes de la lista nueva", () => {
    expect(
      findStalePendingIds(["continua", "sale-1", "sale-2"], ["continua", "nuevo"])
    ).toEqual(["sale-1", "sale-2"]);
  });
});
