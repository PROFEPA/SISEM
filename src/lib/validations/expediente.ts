import { z } from "zod";

// ============================================================
// Constantes
// ============================================================

export const VALID_MATERIAS = [
  "INDUSTRIA",
  "FORESTAL",
  "IMPACTO AMBIENTAL",
  "VIDA SILVESTRE",
  "ZOFEMAT",
  "RECURSOS MARINOS",
] as const;

export const VALID_TIPOS_IMPUGNACION = [
  "REVOCACION",
  "MODIFICACION",
  "CONMUTACION",
  "RECURSO_REVISION",
  "JUICIO_NULIDAD",
  "AMPARO",
  "RECURSO_RECONSIDERACION",
] as const;

// ============================================================
// Helpers
// ============================================================

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido")
  .nullable()
  .optional()
  .transform((v) => v || null);

const dateRequired = z
  .string()
  .min(1, "Fecha requerida")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (AAAA-MM-DD)");

// ============================================================
// Schema de creación — campos obligatorios según lo solicitado
// Solo opcionales: fecha_notificacion y rfc_infractor
// ============================================================

export const expedienteCreateSchema = z
  .object({
    orpa_id: z.string().uuid("ORPA inválida"),
    numero_expediente: z
      .string()
      .min(1, "Número de expediente requerido")
      .max(100),
    materia: z.enum(VALID_MATERIAS, {
      message: "Materia requerida",
    }),
    numero_acta: z.string().min(1, "Número de acta requerido").max(100),
    fecha_acta: dateRequired,
    numero_resolucion: z
      .string()
      .min(1, "Número de resolución requerido")
      .max(100),
    fecha_resolucion: dateRequired,
    fecha_notificacion: dateOrNull, // opcional

    // Infractor
    tipo_persona: z.enum(["fisica", "moral"], {
      message: "Tipo de persona requerido",
    }),
    nombre_infractor: z.string().max(500).default(""),
    apellido_paterno: z.string().max(200).nullable().optional(),
    apellido_materno: z.string().max(200).nullable().optional(),
    razon_social: z.string().max(500).nullable().optional(),
    rfc_infractor: z
      .string()
      .max(13)
      .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/, "RFC inválido")
      .nullable()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || null),
    domicilio_infractor: z
      .string()
      .min(1, "Domicilio del infractor requerido")
      .max(1000),
    giro_actividad: z
      .string()
      .min(1, "Giro o actividad requerido")
      .max(500),

    // Infracción
    articulo_infringido: z
      .string()
      .min(1, "Artículo infringido requerido")
      .max(500),
    descripcion_infraccion: z
      .string()
      .min(1, "Descripción de la infracción requerida")
      .max(5000),
    monto_multa: z
      .number({ message: "Monto de multa requerido" })
      .min(0, "El monto no puede ser negativo")
      .max(999_999_999),
    dias_ume: z
      .number({ message: "Días UME requerido" })
      .int("Debe ser un número entero")
      .min(0)
      .max(99999),

    // Pago
    pagado: z.boolean().default(false),
    fecha_pago: dateOrNull,
    monto_pagado: z.number().min(0).max(999_999_999).nullable().optional(),
    folio_pago: z.string().max(100).nullable().optional(),

    // Impugnación
    impugnado: z.boolean().default(false),
    tipo_impugnacion: z
      .string()
      .max(100)
      .nullable()
      .optional()
      .transform((v) => v || null),
    fecha_impugnacion: dateOrNull,
    resultado_impugnacion: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .transform((v) => v || null),

    // Cobro
    enviada_a_cobro: z.boolean().default(false),
    oficio_cobro: z.string().max(200).nullable().optional(),
    documentacion_anexa: z.boolean().default(false),
    observaciones: z.string().max(5000).nullable().optional(),
    fuente: z.enum(["excel", "manual", "api"]).default("manual"),
  })
  .superRefine((data, ctx) => {
    // Validación condicional: persona física vs moral
    if (data.tipo_persona === "fisica") {
      if (!data.nombre_infractor || data.nombre_infractor.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nombre del infractor requerido para persona física",
          path: ["nombre_infractor"],
        });
      }
      if (
        !data.apellido_paterno ||
        data.apellido_paterno.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Apellido paterno requerido para persona física",
          path: ["apellido_paterno"],
        });
      }
    } else if (data.tipo_persona === "moral") {
      if (!data.razon_social || data.razon_social.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Razón social requerida para persona moral",
          path: ["razon_social"],
        });
      }
    }
  });

// ============================================================
// Schema de actualización — parcial, sin orpa_id ni fuente
// ============================================================
export const expedienteUpdateSchema = z
  .object({
    numero_expediente: z.string().min(1).max(100).optional(),
    materia: z.enum(VALID_MATERIAS).nullable().optional(),
    numero_acta: z.string().max(100).nullable().optional(),
    fecha_acta: dateOrNull,
    numero_resolucion: z.string().max(100).nullable().optional(),
    fecha_resolucion: dateOrNull,
    fecha_notificacion: dateOrNull,
    tipo_persona: z.enum(["fisica", "moral"]).nullable().optional(),
    nombre_infractor: z.string().max(500).optional(),
    apellido_paterno: z.string().max(200).nullable().optional(),
    apellido_materno: z.string().max(200).nullable().optional(),
    razon_social: z.string().max(500).nullable().optional(),
    rfc_infractor: z
      .string()
      .max(13)
      .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/, "RFC inválido")
      .nullable()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || null),
    domicilio_infractor: z.string().max(1000).nullable().optional(),
    giro_actividad: z.string().max(500).nullable().optional(),
    articulo_infringido: z.string().max(500).nullable().optional(),
    descripcion_infraccion: z.string().max(5000).nullable().optional(),
    monto_multa: z.number().min(0).max(999_999_999).nullable().optional(),
    dias_ume: z.number().int().min(0).max(99999).nullable().optional(),
    pagado: z.boolean().optional(),
    fecha_pago: dateOrNull,
    monto_pagado: z.number().min(0).max(999_999_999).nullable().optional(),
    folio_pago: z.string().max(100).nullable().optional(),
    impugnado: z.boolean().optional(),
    tipo_impugnacion: z
      .string()
      .max(100)
      .nullable()
      .optional()
      .transform((v) => v || null),
    fecha_impugnacion: dateOrNull,
    resultado_impugnacion: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .transform((v) => v || null),
    enviada_a_cobro: z.boolean().optional(),
    oficio_cobro: z.string().max(200).nullable().optional(),
    documentacion_anexa: z.boolean().optional(),
    observaciones: z.string().max(5000).nullable().optional(),
  })
  .partial();

export type ExpedienteCreateInput = z.infer<typeof expedienteCreateSchema>;
export type ExpedienteUpdateInput = z.infer<typeof expedienteUpdateSchema>;
