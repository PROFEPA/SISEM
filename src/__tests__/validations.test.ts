import { describe, it, expect } from "vitest";
import {
  expedienteCreateSchema,
  expedienteUpdateSchema,
} from "@/lib/validations/expediente";

describe("expedienteCreateSchema", () => {
  const validBase = {
    orpa_id: "a0000000-0000-4000-a000-000000000001",
    numero_expediente: "PFPA/1.7/2C.27.1/001234-25",
    materia: "INDUSTRIA",
    numero_acta: "AI-001234",
    fecha_acta: "2025-01-15",
    numero_resolucion: "RES-001234",
    fecha_resolucion: "2025-03-15",
    tipo_persona: "fisica",
    nombre_infractor: "Juan",
    apellido_paterno: "Pérez",
    domicilio_infractor: "Calle Reforma 123, CDMX",
    giro_actividad: "Manufactura",
    articulo_infringido: "Art. 171 LGEEPA",
    descripcion_infraccion: "Operación sin licencia ambiental",
    monto_multa: 50000,
    dias_ume: 100,
  };

  it("accepts a valid expediente (persona física)", () => {
    const result = expedienteCreateSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts persona moral with razon_social", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      tipo_persona: "moral",
      nombre_infractor: undefined,
      apellido_paterno: undefined,
      razon_social: "Empresa SA de CV",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing numero_expediente", () => {
    const { numero_expediente, ...rest } = validBase;
    const result = expedienteCreateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing materia", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      materia: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid orpa_id (not UUID)", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      orpa_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid RFC format", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      rfc_infractor: "PEGJ850101ABC",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid RFC format", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      rfc_infractor: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as null", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      fecha_notificacion: null,
      fecha_pago: null,
      monto_pagado: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid tipo_impugnacion values", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      impugnado: true,
      tipo_impugnacion: "RECURSO_REVISION",
    });
    expect(result.success).toBe(true);
  });

  it("rejects monto_multa as negative", () => {
    const result = expedienteCreateSchema.safeParse({
      ...validBase,
      monto_multa: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("expedienteUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = expedienteUpdateSchema.safeParse({
      pagado: true,
      fecha_pago: "2025-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = expedienteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid values in partial update", () => {
    const result = expedienteUpdateSchema.safeParse({
      monto_multa: -500,
    });
    expect(result.success).toBe(false);
  });
});
