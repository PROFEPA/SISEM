"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Truck,
  User,
  Building2,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  Image,
  File,
  FolderOpen,
} from "lucide-react";
import type { IExpediente, IExpedienteHistorial, IExpedienteDocumento } from "@/types";

function formatMoney(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2">
      <span className="text-sm text-muted-foreground sm:w-48 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function ExpedienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [expediente, setExpediente] = useState<
    IExpediente & { historial?: IExpedienteHistorial[] }
  | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllHistorial, setShowAllHistorial] = useState(false);

  useEffect(() => {
    fetch(`/api/expedientes/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setExpediente(res.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Expediente no encontrado</p>
        <Button variant="link" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/expedientes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-mono">
            {expediente.numero_expediente}
          </h1>
          <p className="text-sm text-muted-foreground">
            {expediente.orpa?.nombre} — {expediente.materia || "Sin materia"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/expedientes/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </a>
          <Link href={`/expedientes/${id}/editar`}>
            <Button size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={expediente.pagado ? "default" : "secondary"} className={expediente.pagado ? "bg-green-600" : ""}>
          <DollarSign className="w-3 h-3 mr-1" />
          {expediente.pagado ? "Pagado" : "No pagado"}
        </Badge>
        {expediente.impugnado && (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Impugnado — {expediente.tipo_impugnacion}
          </Badge>
        )}
        {expediente.enviada_a_cobro && (
          <Badge>
            <Truck className="w-3 h-3 mr-1" />
            Enviada a cobro
          </Badge>
        )}
        {expediente.materia && (
          <Badge variant="secondary">{expediente.materia}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Datos del Expediente
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <DetailRow label="No. Expediente" value={expediente.numero_expediente} />
              <DetailRow label="ORPA" value={expediente.orpa?.nombre} />
              <DetailRow label="Materia" value={expediente.materia} />
              <DetailRow label="No. Acta" value={expediente.numero_acta} />
              <DetailRow label="Fecha del Acta" value={formatDate(expediente.fecha_acta)} />
              <DetailRow label="No. Resolución" value={expediente.numero_resolucion} />
              <DetailRow label="Fecha de Resolución" value={formatDate(expediente.fecha_resolucion)} />
              <DetailRow label="Fecha de Notificación" value={formatDate(expediente.fecha_notificacion)} />
              <DetailRow label="Monto de la Multa" value={formatMoney(expediente.monto_multa)} />
              {expediente.giro_actividad && (
                <DetailRow label="Giro / Actividad" value={expediente.giro_actividad} />
              )}
              {expediente.articulo_infringido && (
                <DetailRow label="Artículo Infringido" value={expediente.articulo_infringido} />
              )}
              {expediente.descripcion_infraccion && (
                <DetailRow label="Descripción de la Infracción" value={expediente.descripcion_infraccion} />
              )}
            </CardContent>
          </Card>

          {/* Infractor section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {expediente.tipo_persona === "moral" ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                Datos del Infractor
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <DetailRow
                label="Tipo de Persona"
                value={
                  expediente.tipo_persona ? (
                    <Badge variant="secondary">
                      {expediente.tipo_persona === "moral" ? "Persona Moral" : "Persona Física"}
                    </Badge>
                  ) : null
                }
              />
              {expediente.tipo_persona === "moral" ? (
                <DetailRow label="Razón Social" value={expediente.razon_social} />
              ) : (
                <>
                  <DetailRow label="Nombre" value={expediente.nombre_infractor} />
                  <DetailRow label="Apellido Paterno" value={expediente.apellido_paterno} />
                  <DetailRow label="Apellido Materno" value={expediente.apellido_materno} />
                </>
              )}
              <DetailRow label="RFC" value={expediente.rfc_infractor} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pago e Impugnación
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <DetailRow
                label="Pagado"
                value={
                  <Badge variant={expediente.pagado ? "default" : "secondary"} className={expediente.pagado ? "bg-green-600" : ""}>
                    {expediente.pagado ? "SI" : "NO"}
                  </Badge>
                }
              />
              <DetailRow label="Fecha de Pago" value={formatDate(expediente.fecha_pago)} />
              <DetailRow
                label="Monto Pagado"
                value={
                  expediente.monto_pagado != null
                    ? formatMoney(expediente.monto_pagado)
                    : expediente.pagado && expediente.monto_multa != null
                      ? formatMoney(expediente.monto_multa)
                      : "—"
                }
              />
              <DetailRow label="Folio de Pago" value={expediente.folio_pago} />
              <Separator className="my-2" />
              <DetailRow
                label="Impugnado"
                value={
                  <Badge variant={expediente.impugnado ? "destructive" : "secondary"}>
                    {expediente.impugnado ? "SI" : "NO"}
                  </Badge>
                }
              />
              <DetailRow label="Tipo de Impugnación" value={expediente.tipo_impugnacion} />
              <DetailRow
                label="Resultado"
                value={
                  expediente.resultado_impugnacion ? (
                    <span className="flex items-center gap-2">
                      {expediente.resultado_impugnacion}
                      {expediente.resultado_impugnacion.toLowerCase().includes("favorable") && (
                        expediente.resultado_impugnacion.toLowerCase().includes("desfavorable") ? (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
                            <XCircle className="w-3 h-3" />
                            Desfavorable
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Favorable
                          </Badge>
                        )
                      )}
                    </span>
                  ) : null
                }
              />
              <Separator className="my-2" />
              <DetailRow
                label="Enviada a Cobro"
                value={
                  <Badge variant={expediente.enviada_a_cobro ? "default" : "secondary"}>
                    {expediente.enviada_a_cobro ? "SI" : "NO"}
                  </Badge>
                }
              />
              <DetailRow label="Oficio de Cobro" value={expediente.oficio_cobro} />
              <DetailRow
                label="Documentación Anexa"
                value={expediente.documentacion_anexa ? "SI" : "NO"}
              />
              {expediente.observaciones && (
                <DetailRow label="Observaciones" value={expediente.observaciones} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: historial + docs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Historial de Cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!expediente.historial || expediente.historial.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin cambios registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {(showAllHistorial
                    ? expediente.historial
                    : expediente.historial.slice(0, 20)
                  ).map((h) => {
                    const campo = h.campo_modificado ?? "";
                    const fieldIcon = campo.includes("monto") || campo.includes("pago")
                      ? DollarSign
                      : campo.includes("fecha")
                        ? Calendar
                        : campo.includes("impugn")
                          ? Shield
                          : FileText;
                    const FieldIcon = fieldIcon;
                    return (
                      <div key={h.id} className="text-xs border-l-2 border-primary/30 pl-3">
                        <p className="font-medium flex items-center gap-1">
                          <FieldIcon className="w-3 h-3 text-muted-foreground" />
                          {h.campo_modificado}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="line-through">{h.valor_anterior || "(vacío)"}</span>
                          {" → "}
                          <span className="font-medium text-foreground">{h.valor_nuevo}</span>
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: es })}
                          {h.usuario && ` — ${(h.usuario as { nombre_completo?: string }).nombre_completo || "Usuario"}`}
                        </p>
                      </div>
                    );
                  })}
                  {!showAllHistorial && expediente.historial.length > 20 && (
                    <button
                      onClick={() => setShowAllHistorial(true)}
                      className="text-xs text-primary hover:underline cursor-pointer w-full text-center pt-2"
                    >
                      Ver todos ({expediente.historial.length} cambios)
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              {expediente.documentos && expediente.documentos.length > 0 ? (
                <div className="space-y-3">
                  {/* Group by tipo_documento */}
                  {Object.entries(
                    expediente.documentos.reduce<Record<string, IExpedienteDocumento[]>>((acc, doc) => {
                      const key = doc.tipo_documento || "OTRO";
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(doc);
                      return acc;
                    }, {})
                  ).map(([tipo, docs]) => (
                    <div key={tipo}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                        {tipo === "PAGO" ? "Pagos" : tipo === "COBRO" ? "Enviadas a cobro" : tipo === "IMPUGNACION" ? "Impugnación" : tipo}
                      </p>
                      <div className="space-y-1">
                        {docs.map((doc) => {
                          const ext = doc.nombre_archivo.split(".").pop()?.toLowerCase();
                          const isImage = ["jpg", "jpeg", "png", "jfif", "gif", "webp", "bmp"].includes(ext || "");
                          const isPdf = ext === "pdf";
                          return (
                            <a
                              key={doc.id}
                              href={doc.url_preview || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors group text-sm"
                            >
                              {isPdf ? (
                                <FileText className="h-4 w-4 text-red-500 shrink-0" />
                              ) : isImage ? (
                                <Image className="h-4 w-4 text-blue-500 shrink-0" />
                              ) : (
                                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate flex-1">{doc.nombre_archivo}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    {expediente.documentos.length} documento{expediente.documentos.length !== 1 ? "s" : ""} vinculado{expediente.documentos.length !== 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No hay documentos vinculados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Fuente:</strong> {expediente.fuente}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Creado:</strong> {new Date(expediente.created_at).toLocaleString("es-MX")}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Actualizado:</strong> {new Date(expediente.updated_at).toLocaleString("es-MX")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
