"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import type { IExpediente, IExpedienteHistorial } from "@/types";

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
        <Link href={`/expedientes/${id}/editar`}>
          <Button size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </Link>
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
              <DetailRow label="Fecha de Resolución" value={formatDate(expediente.fecha_resolucion)} />
              <DetailRow label="Fecha de Notificación" value={formatDate(expediente.fecha_notificacion)} />
              <DetailRow label="Monto de la Multa" value={formatMoney(expediente.monto_multa)} />
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
              <DetailRow label="Resultado" value={expediente.resultado_impugnacion} />
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
                  {expediente.historial.map((h) => (
                    <div key={h.id} className="text-xs border-l-2 border-primary/30 pl-3">
                      <p className="font-medium">
                        {h.campo_modificado}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="line-through">{h.valor_anterior || "(vacío)"}</span>
                        {" → "}
                        <span className="font-medium text-foreground">{h.valor_nuevo}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {new Date(h.created_at).toLocaleString("es-MX")}
                        {h.usuario && ` — ${(h.usuario as { nombre_completo?: string }).nombre_completo || "Usuario"}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                📁 Proximamente — Integración con Google Drive
              </p>
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
