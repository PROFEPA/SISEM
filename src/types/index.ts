// Tipos globales del sistema SISEM

export type Role = 'admin' | 'capturador' | 'visualizador';
export type TipoPersona = 'fisica' | 'moral';
export type FuenteDatos = 'excel' | 'manual' | 'api';

export interface IOrpa {
  id: string;
  clave: string;
  nombre: string;
  estado: string;
  activa: boolean;
  created_at: string;
}

export interface IProfile {
  id: string;
  orpa_id: string | null;
  nombre_completo: string | null;
  role: Role;
  activo: boolean;
  created_at: string;
  orpa?: IOrpa;
}

export interface IEstatusExpediente {
  id: number;
  clave: string;
  descripcion: string | null;
  color_hex: string | null;
}

export interface IExpediente {
  id: string;
  orpa_id: string;
  numero_expediente: string;
  materia: string | null;
  numero_acta: string | null;
  fecha_acta: string | null;
  nombre_infractor: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  razon_social: string | null;
  rfc_infractor: string | null;
  domicilio_infractor: string | null;
  tipo_persona: TipoPersona | null;
  articulo_infringido: string | null;
  descripcion_infraccion: string | null;
  giro_actividad: string | null;
  fecha_resolucion: string | null;
  fecha_notificacion: string | null;
  numero_resolucion: string | null;
  monto_multa: number | null;
  dias_ume: number | null;
  estatus_id: number | null;
  fecha_ultimo_movimiento: string | null;
  pagado: boolean;
  fecha_pago: string | null;
  monto_pagado: number | null;
  folio_pago: string | null;
  impugnado: boolean;
  tipo_impugnacion: string | null;
  fecha_impugnacion: string | null;
  resultado_impugnacion: string | null;
  enviada_a_cobro: boolean;
  oficio_cobro: string | null;
  documentacion_anexa: boolean;
  observaciones: string | null;
  fuente: FuenteDatos;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  orpa?: IOrpa;
  estatus?: IEstatusExpediente;
  historial?: IExpedienteHistorial[];
  documentos?: IExpedienteDocumento[];
}

export interface IExpedienteHistorial {
  id: string;
  expediente_id: string;
  usuario_id: string | null;
  campo_modificado: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  observacion: string | null;
  created_at: string;
  usuario?: IProfile;
}

export interface IExpedienteDocumento {
  id: string;
  expediente_id: string;
  tipo_documento: string;
  nombre_archivo: string;
  drive_file_id: string | null;
  drive_folder_id: string | null;
  url_preview: string | null;
  subido_por: string | null;
  created_at: string;
}

// API response types
export interface IApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  message: string | null;
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types for expedientes table
export interface IExpedienteFilters {
  orpa_id?: string;
  estatus_id?: number;
  pagado?: boolean;
  impugnado?: boolean;
  enviada_a_cobro?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
  fecha_notificacion_desde?: string;
  fecha_notificacion_hasta?: string;
  busqueda?: string;
  materia?: string;
  tipo_impugnacion?: string;
  resultado_impugnacion?: string;
  tipo_persona?: TipoPersona;
}

// Catálogos de impugnación
export interface ITipoImpugnacion {
  id: number;
  clave: string;
  nombre: string;
  orden: number;
  resultados: IResultadoImpugnacion[];
}

export interface IResultadoImpugnacion {
  id: number;
  tipo_impugnacion_clave: string;
  clave: string;
  nombre: string;
  favorable_profepa: boolean;
  orden: number;
}

// Alertas
export type TipoAlerta = 'notificacion' | 'cobro';

export interface IAlerta {
  expediente_id: string;
  numero_expediente: string;
  orpa_nombre: string;
  orpa_clave: string;
  tipo_alerta: TipoAlerta;
  fecha_referencia: string; // fecha_resolucion o fecha_notificacion
  fecha_limite: string;
  dias_restantes: number; // negativo = vencido
  vencido: boolean;
  monto_multa: number | null;
}

export interface IAlertasResumen {
  pendientes_notificacion: number;
  vencidos_notificacion: number;
  pendientes_cobro: number;
  vencidos_cobro: number;
  total: number;
}
