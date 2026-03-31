"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save } from "lucide-react";
import type { IExpediente, IOrpa } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface TipoImpugnacion {
  id: number;
  clave: string;
  nombre: string;
  resultados: ResultadoImpugnacion[];
}

interface ResultadoImpugnacion {
  id: number;
  clave: string;
  nombre: string;
  favorable_profepa: boolean;
}

export default function EditarExpedientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [expediente, setExpediente] = useState<IExpediente | null>(null);
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiposImpugnacion, setTiposImpugnacion] = useState<TipoImpugnacion[]>([]);
  const [resultadosFavorable, setResultadosFavorable] = useState<boolean | null>(null);

  // Form state
  const [form, setForm] = useState({
    numero_expediente: "",
    materia: "",
    tipo_persona: "",
    nombre_infractor: "",
    apellido_paterno: "",
    apellido_materno: "",
    razon_social: "",
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

  // Resultados filtrados por tipo de impugnación seleccionado
  const resultadosDisponibles: ResultadoImpugnacion[] =
    tiposImpugnacion.find((t) => t.clave === form.tipo_impugnacion)?.resultados || [];

  // Cobro habilitado: no impugnado, o resultado favorable a PROFEPA
  const cobroHabilitado = !form.impugnado || resultadosFavorable === true;

  // Track if selected resultado is favorable
  const updateResultadoFavorable = useCallback(
    (resultadoClave: string) => {
      if (!resultadoClave) {
        setResultadosFavorable(null);
        return;
      }
      const resultado = resultadosDisponibles.find((r) => r.clave === resultadoClave);
      setResultadosFavorable(resultado?.favorable_profepa ?? null);
    },
    [resultadosDisponibles]
  );

  // Load impugnación catalogs
  useEffect(() => {
    async function loadCatalogos() {
      try {
        const res = await fetch("/api/catalogos/impugnacion");
        const json = await res.json();
        if (json.data) setTiposImpugnacion(json.data);
      } catch {
        // Fallback silently
      }
    }
    loadCatalogos();
  }, []);

  // Sync resultadosFavorable when catalogs load and expediente already has resultado
  useEffect(() => {
    if (form.resultado_impugnacion && resultadosDisponibles.length > 0) {
      updateResultadoFavorable(form.resultado_impugnacion);
    }
  }, [resultadosDisponibles, form.resultado_impugnacion, updateResultadoFavorable]);

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
          tipo_persona: exp.tipo_persona || "",
          nombre_infractor: exp.nombre_infractor || "",
          apellido_paterno: exp.apellido_paterno || "",
          apellido_materno: exp.apellido_materno || "",
          razon_social: exp.razon_social || "",
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
      tipo_persona: form.tipo_persona || null,
      rfc_infractor: form.rfc_infractor || null,
      tipo_impugnacion: form.tipo_impugnacion || null,
      resultado_impugnacion: form.resultado_impugnacion || null,
      oficio_cobro: form.oficio_cobro || null,
      folio_pago: form.folio_pago || null,
      observaciones: form.observaciones || null,
      // Clear infractor fields based on tipo_persona
      nombre_infractor: form.tipo_persona === "moral" ? "" : (form.nombre_infractor || null),
      apellido_paterno: form.tipo_persona === "moral" ? "" : (form.apellido_paterno || null),
      apellido_materno: form.tipo_persona === "moral" ? "" : (form.apellido_materno || null),
      razon_social: form.tipo_persona === "fisica" ? "" : (form.razon_social || null),
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
              <Label>No. Expediente *</Label>
              <Input
                value={form.numero_expediente}
                onChange={(e) => setForm({ ...form, numero_expediente: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Materia *</Label>
              <Select value={form.materia || ""} onValueChange={(v) => setForm({ ...form, materia: v || "" })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDUSTRIA">Industria</SelectItem>
                  <SelectItem value="FORESTAL">Forestal</SelectItem>
                  <SelectItem value="IMPACTO AMBIENTAL">Impacto Ambiental</SelectItem>
                  <SelectItem value="VIDA SILVESTRE">Vida Silvestre</SelectItem>
                  <SelectItem value="ZOFEMAT">ZOFEMAT</SelectItem>
                  <SelectItem value="RECURSOS MARINOS">Recursos Marinos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de persona */}
            <div className="space-y-2">
              <Label>Tipo de persona *</Label>
              <Select
                value={form.tipo_persona || ""}
                onValueChange={(v) => {
                  const val = v ?? "";
                  const next = { ...form, tipo_persona: val };
                  if (val === "fisica") {
                    next.razon_social = "";
                  } else if (val === "moral") {
                    next.nombre_infractor = "";
                    next.apellido_paterno = "";
                    next.apellido_materno = "";
                  }
                  setForm(next);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Persona Física</SelectItem>
                  <SelectItem value="moral">Persona Moral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Persona Física fields */}
            {form.tipo_persona === "fisica" && (
              <>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={form.nombre_infractor}
                    onChange={(e) => setForm({ ...form, nombre_infractor: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido Paterno *</Label>
                  <Input
                    value={form.apellido_paterno}
                    onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido Materno</Label>
                  <Input
                    value={form.apellido_materno}
                    onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Persona Moral fields */}
            {form.tipo_persona === "moral" && (
              <div className="sm:col-span-2 space-y-2">
                <Label>Razón Social *</Label>
                <Input
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>RFC</Label>
              <Input
                value={form.rfc_infractor}
                onChange={(e) => setForm({ ...form, rfc_infractor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Multa *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monto_multa}
                onChange={(e) => setForm({ ...form, monto_multa: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de la resolución administrativa *</Label>
              <Input
                type="date"
                value={form.fecha_resolucion}
                onChange={(e) => setForm({ ...form, fecha_resolucion: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de notificación al infractor</Label>
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
            <CardTitle className="text-base">Impugnación</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Impugnado</Label>
              <Select
                value={form.impugnado ? "true" : "false"}
                onValueChange={(v) => {
                  const imp = v === "true";
                  setForm({
                    ...form,
                    impugnado: imp,
                    ...(imp ? {} : { tipo_impugnacion: "", resultado_impugnacion: "" }),
                  });
                  if (!imp) setResultadosFavorable(null);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">SI</SelectItem>
                  <SelectItem value="false">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.impugnado && (
              <>
                <div className="space-y-2">
                  <Label>Tipo de Impugnación</Label>
                  <Select
                    value={form.tipo_impugnacion || ""}
                    onValueChange={(v) => {
                      setForm({ ...form, tipo_impugnacion: v || "", resultado_impugnacion: "" });
                      setResultadosFavorable(null);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {tiposImpugnacion.map((t) => (
                        <SelectItem key={t.clave} value={t.clave}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <Select
                    value={form.resultado_impugnacion || ""}
                    onValueChange={(v) => {
                      setForm({ ...form, resultado_impugnacion: v || "" });
                      updateResultadoFavorable(v ?? "");
                    }}
                    disabled={!form.tipo_impugnacion}
                  >
                    <SelectTrigger><SelectValue placeholder={form.tipo_impugnacion ? "Seleccionar" : "Primero seleccione tipo"} /></SelectTrigger>
                    <SelectContent>
                      {resultadosDisponibles.map((r) => (
                        <SelectItem key={r.clave} value={r.clave}>{r.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {resultadosFavorable !== null && (
                    <Badge variant={resultadosFavorable ? "default" : "destructive"} className="mt-1">
                      {resultadosFavorable ? "Favorable a PROFEPA" : "Desfavorable"}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobro</CardTitle>
            {!cobroHabilitado && (
              <CardDescription className="text-amber-600">
                Cobro no habilitado — la multa está siendo impugnada sin resultado favorable.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Enviada a cobro</Label>
              <Select
                value={form.enviada_a_cobro ? "true" : "false"}
                onValueChange={(v) => {
                  const ec = v === "true";
                  setForm({ ...form, enviada_a_cobro: ec, ...(ec ? {} : { oficio_cobro: "" }) });
                }}
                disabled={!cobroHabilitado}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">SI</SelectItem>
                  <SelectItem value="false">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.enviada_a_cobro && (
              <div className="space-y-2">
                <Label>Oficio de Cobro</Label>
                <Input
                  value={form.oficio_cobro}
                  onChange={(e) => setForm({ ...form, oficio_cobro: e.target.value })}
                />
              </div>
            )}
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
