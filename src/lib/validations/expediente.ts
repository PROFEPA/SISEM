import { z } from "zod";

const VALID_MATERIAS = [
  "INDUSTRIA",
  "FORESTAL",
  "IMPACTO AMBIENTAL",
  "VIDA SILVESTRE",
  "ZOFEMAT",
  "RECURSOS MARINOS",
] as const;

const VALID_TIPOS_IMPUGNACION = [
  "RECURSO_REVISION",
  "JUICIO_NULIDAD",
  "AMPARO",
  "CONMUTACION",
  "NO PROMUEVE",
] as const;

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido")
  .nullable()
  .optional()
  .transform((v) => v || null);

export const expedienteCreateSchema = z.object({
  orpa_id: z.string().uuid("ORPA inválida"),
  numero_expediente: z.string().min(1, "Número de expediente requerido").max(100),
  materia: z.enum(VALID_MATERIAS).nullable().optional(),
  numero_acta: z.string().max(100).nullable().optional(),
  fecha_acta: dateOrNull,
  nombre_infractor: z.string().min(1, "Nombre del infractor requerido").max(500),
  rfc_infractor: z
    .string()
    .max(13)
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/, "RFC inválido")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  domicilio_infractor: z.string().max(1000).nullable().optional(),
  tipo_persona: z.enum(["fisica", "moral"]).nullable().optional(),
  articulo_infringido: z.string().max(500).nullable().optional(),
  descripcion_infraccion: z.string().max(5000).nullable().optional(),
  giro_actividad: z.string().max(500).nullable().optional(),
  fecha_resolucion: dateOrNull,
  fecha_notificacion: dateOrNull,
  numero_resolucion: z.string().max(100).nullable().optional(),
  monto_multa: z.number().min(0).max(999_999_999).nullable().optional(),
  dias_ume: z.number().int().min(0).max(99999).nullable().optional(),
  pagado: z.boolean().default(false),
  fecha_pago: dateOrNull,
  monto_pagado: z.number().min(0).max(999_999_999).nullable().optional(),
  folio_pago: z.string().max(100).nullable().optional(),
  impugnado: z.boolean().default(false),
  tipo_impugnacion: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v || null),
  fecha_impugnacion: dateOrNull,
  resultado_impugnacion: z.string().max(500).nullable().optional(),
  enviada_a_cobro: z.boolean().default(false),
  oficio_cobro: z.string().max(200).nullable().optional(),
  documentacion_anexa: z.boolean().default(false),
  observaciones: z.string().max(5000).nullable().optional(),
  fuente: z.enum(["excel", "manual", "api"]).default("manual"),
});

export const expedienteUpdateSchema = expedienteCreateSchema
  .partial()
  .omit({ orpa_id: true, fuente: true });

export type ExpedienteCreateInput = z.infer<typeof expedienteCreateSchema>;
export type ExpedienteUpdateInput = z.infer<typeof expedienteUpdateSchema>;
