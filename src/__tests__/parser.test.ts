import { describe, it, expect } from "vitest";

// We test the exported schema and the parseExcelBuffer via type checks
// For the pure functions we need to extract them or test through the public API
import { expedienteRowSchema } from "@/lib/excel/parser";

describe("expedienteRowSchema", () => {
  it("accepts a minimal valid row", () => {
    const result = expedienteRowSchema.safeParse({
      orpa_nombre: "AGUASCALIENTES",
      numero_expediente: "PFPA/001-25",
    });
    expect(result.success).toBe(true);
    expect(result.data?.pagado).toBe(false);
    expect(result.data?.enviada_a_cobro).toBe(false);
  });

  it("accepts a complete row", () => {
    const result = expedienteRowSchema.safeParse({
      orpa_nombre: "JALISCO",
      numero_expediente: "PFPA/002-25",
      materia: "INDUSTRIA",
      fecha_resolucion: "2025-03-15",
      fecha_notificacion: "2025-03-20",
      monto_multa: 150000,
      pagado: true,
      fecha_pago: "2025-04-01",
      monto_pagado: 150000,
      folio_pago: "FP-001",
      tipo_impugnacion: "RECURSO_REVISION",
      resultado_impugnacion: "CONFIRMADA",
      enviada_a_cobro: true,
      oficio_cobro: "OF-001",
      documentacion_anexa: true,
      observaciones: "Nota de prueba",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing orpa_nombre", () => {
    const result = expedienteRowSchema.safeParse({
      numero_expediente: "PFPA/003-25",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing numero_expediente", () => {
    const result = expedienteRowSchema.safeParse({
      orpa_nombre: "SONORA",
    });
    expect(result.success).toBe(false);
  });

  it("defaults boolean fields to false", () => {
    const result = expedienteRowSchema.safeParse({
      orpa_nombre: "OAXACA",
      numero_expediente: "PFPA/004-25",
    });
    expect(result.success).toBe(true);
    expect(result.data?.pagado).toBe(false);
    expect(result.data?.enviada_a_cobro).toBe(false);
    expect(result.data?.documentacion_anexa).toBe(false);
  });

  it("accepts null for optional fields", () => {
    const result = expedienteRowSchema.safeParse({
      orpa_nombre: "CHIAPAS",
      numero_expediente: "PFPA/005-25",
      materia: null,
      monto_multa: null,
      fecha_resolucion: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts new v3 fields when present", () => {
    const result = expedienteRowSchema.safeParse({
      orpa_nombre: "PUEBLA",
      numero_expediente: "PFPA/006-25",
      nombre_infractor: "Juan Pérez",
      apellido_paterno: "Pérez",
      apellido_materno: "García",
      razon_social: null,
      rfc_infractor: "PEGJ850101ABC",
      tipo_persona: "fisica",
      numero_acta: "AI-001",
      numero_resolucion: "RES-001",
    });
    expect(result.success).toBe(true);
  });
});
