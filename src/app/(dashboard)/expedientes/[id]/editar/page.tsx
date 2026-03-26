"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save } from "lucide-react";
import type { IExpediente, IOrpa } from "@/types";
import { createClient } from "@/lib/supabase/client";

export default function EditarExpedientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [expediente, setExpediente] = useState<IExpediente | null>(null);
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    numero_expediente: "",
    materia: "",
    nombre_infractor: "",
    rfc_infractor: "",
    monto_multa: "",
    fecha_resolucion: "",
    fecha_notificacion: "",
    pagado: false,
    fecha_pago: "",
    monto_pagado: "",
    folio_pago: "",
    impugnado: false,
    tipo_impugnacion: "",
    resultado_impugnacion: "",
    enviada_a_cobro: false,
    oficio_cobro: "",
    observaciones: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/expedientes/${id}`).then((r) => r.json()),
      supabase.from("orpas").select("*").eq("activa", true).order("nombre"),
    ]).then(([expRes, orpaRes]) => {
      if (expRes.data) {
        const exp = expRes.data as IExpediente;
        setExpediente(exp);
        setForm({
          numero_expediente: exp.numero_expediente || "",
          materia: exp.materia || "",
          nombre_infractor: exp.nombre_infractor || "",
          rfc_infractor: exp.rfc_infractor || "",
          monto_multa: exp.monto_multa?.toString() || "",
          fecha_resolucion: exp.fecha_resolucion || "",
          fecha_notificacion: exp.fecha_notificacion || "",
          pagado: exp.pagado || false,
          fecha_pago: exp.fecha_pago || "",
          monto_pagado: exp.monto_pagado?.toString() || "",
          folio_pago: exp.folio_pago || "",
          impugnado: exp.impugnado || false,
          tipo_impugnacion: exp.tipo_impugnacion || "",
          resultado_impugnacion: exp.resultado_impugnacion || "",
          enviada_a_cobro: exp.enviada_a_cobro || false,
          oficio_cobro: exp.oficio_cobro || "",
          observaciones: exp.observaciones || "",
        });
      }
      if (orpaRes.data) setOrpas(orpaRes.data);
      setLoading(false);
    });
  }, [id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      ...form,
      monto_multa: form.monto_multa ? parseFloat(form.monto_multa) : null,
      monto_pagado: form.monto_pagado ? parseFloat(form.monto_pagado) : null,
      fecha_resolucion: form.fecha_resolucion || null,
      fecha_notificacion: form.fecha_notificacion || null,
      fecha_pago: form.fecha_pago || null,
      materia: form.materia || null,
      rfc_infractor: form.rfc_infractor || null,
      tipo_impugnacion: form.tipo_impugnacion || null,
      resultado_impugnacion: form.resultado_impugnacion || null,
      oficio_cobro: form.oficio_cobro || null,
      folio_pago: form.folio_pago || null,
      observaciones: form.observaciones || null,
    };

    const res = await fetch(`/api/expedientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (json.error) {
      setError(json.error);
      return;
    }

    router.push(`/expedientes/${id}`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!expediente) {
    return <p className="text-center py-12 text-muted-foreground">Expediente no encontrado</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={`/expedientes/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Editar Expediente</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {expediente.numero_expediente}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No. Expediente</Label>
              <Input
                value={form.numero_expediente}
                onChange={(e) => setForm({ ...form, numero_expediente: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Materia</Label>
              <Select value={form.materia || ""} onValueChange={(v) => setForm({ ...form, materia: v || "" })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDUSTRIA">Industria</SelectItem>
                  <SelectItem value="FORESTAL">Forestal</SelectItem>
                  <SelectItem value="IMPACTO AMBIENTAL">Impacto Ambiental</SelectItem>
                  <SelectItem value="VIDA SILVESTRE">Vida Silvestre</SelectItem>
                  <SelectItem value="ZOFEMAT">ZOFEMAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre del Infractor</Label>
              <Input
                value={form.nombre_infractor}
                onChange={(e) => setForm({ ...form, nombre_infractor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>RFC</Label>
              <Input
                value={form.rfc_infractor}
                onChange={(e) => setForm({ ...form, rfc_infractor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Multa</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monto_multa}
                onChange={(e) => setForm({ ...form, monto_multa: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Resolución</Label>
              <Input
                type="date"
                value={form.fecha_resolucion}
                onChange={(e) => setForm({ ...form, fecha_resolucion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Notificación</Label>
              <Input
                type="date"
                value={form.fecha_notificacion}
                onChange={(e) => setForm({ ...form, fecha_notificacion: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pago</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pagado</Label>
              <Select
                value={form.pagado ? "true" : "false"}
                onValueChange={(v) => setForm({ ...form, pagado: v === "true" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">SI</SelectItem>
                  <SelectItem value="false">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha Pago</Label>
              <Input
                type="date"
                value={form.fecha_pago}
                onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Pagado</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monto_pagado}
                onChange={(e) => setForm({ ...form, monto_pagado: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Folio de Pago</Label>
              <Input
                value={form.folio_pago}
                onChange={(e) => setForm({ ...form, folio_pago: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impugnación y Cobro</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Impugnado</Label>
              <Select
                value={form.impugnado ? "true" : "false"}
                onValueChange={(v) => setForm({ ...form, impugnado: v === "true" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">SI</SelectItem>
                  <SelectItem value="false">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Impugnación</Label>
              <Select value={form.tipo_impugnacion || ""} onValueChange={(v) => setForm({ ...form, tipo_impugnacion: v || "" })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECURSO_REVISION">Recurso de Revisión</SelectItem>
                  <SelectItem value="JUICIO_NULIDAD">Juicio de Nulidad</SelectItem>
                  <SelectItem value="AMPARO">Amparo</SelectItem>
                  <SelectItem value="CONMUTACION">Conmutación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Input
                value={form.resultado_impugnacion}
                onChange={(e) => setForm({ ...form, resultado_impugnacion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Enviada a cobro</Label>
              <Select
                value={form.enviada_a_cobro ? "true" : "false"}
                onValueChange={(v) => setForm({ ...form, enviada_a_cobro: v === "true" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">SI</SelectItem>
                  <SelectItem value="false">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Oficio de Cobro</Label>
              <Input
                value={form.oficio_cobro}
                onChange={(e) => setForm({ ...form, oficio_cobro: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Link href={`/expedientes/${id}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
