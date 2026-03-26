"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { IProfile } from "@/types";

const MATERIAS = [
  { value: "INDUSTRIA", label: "Industria" },
  { value: "FORESTAL", label: "Forestal" },
  { value: "IMPACTO AMBIENTAL", label: "Impacto Ambiental" },
  { value: "VIDA SILVESTRE", label: "Vida Silvestre" },
  { value: "ZOFEMAT", label: "ZOFEMAT" },
  { value: "RECURSOS MARINOS", label: "Recursos Marinos" },
];

const TIPOS_PERSONA = [
  { value: "fisica", label: "Persona Física" },
  { value: "moral", label: "Persona Moral" },
];

const TIPOS_IMPUGNACION = [
  { value: "RECURSO_REVISION", label: "Recurso de Revisión" },
  { value: "JUICIO_NULIDAD", label: "Juicio de Nulidad" },
  { value: "AMPARO", label: "Amparo" },
  { value: "CONMUTACION", label: "Conmutación" },
];

const RESULTADOS_IMPUGNACION = [
  { value: "FAVORABLE_PROFEPA", label: "Favorable a PROFEPA" },
  { value: "NO_FAVORABLE", label: "No Favorable a PROFEPA" },
  { value: "PENDIENTE", label: "Pendiente de Resolución" },
];

const SI_NO = [
  { value: "true", label: "SI" },
  { value: "false", label: "NO" },
];

const INITIAL_FORM = {
  numero_expediente: "",
  materia: "",
  nombre_infractor: "",
  rfc_infractor: "",
  tipo_persona: "",
  domicilio_infractor: "",
  giro_actividad: "",
  articulo_infringido: "",
  descripcion_infraccion: "",
  numero_acta: "",
  fecha_acta: "",
  fecha_resolucion: "",
  fecha_notificacion: "",
  numero_resolucion: "",
  monto_multa: "",
  dias_ume: "",
  pagado: "false",
  fecha_pago: "",
  monto_pagado: "",
  folio_pago: "",
  impugnado: "false",
  tipo_impugnacion: "",
  fecha_impugnacion: "",
  resultado_impugnacion: "",
  enviada_a_cobro: "false",
  oficio_cobro: "",
  documentacion_anexa: "false",
  observaciones: "",
};

export default function CapturaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*, orpa:orpas(nombre, clave)")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    }
    load();
  }, [supabase]);

  function updateField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-clear conditional fields
      if (field === "pagado" && value === "false") {
        next.fecha_pago = "";
        next.monto_pagado = "";
        next.folio_pago = "";
      }
      if (field === "impugnado" && value === "false") {
        next.tipo_impugnacion = "";
        next.fecha_impugnacion = "";
        next.resultado_impugnacion = "";
      }
      if (field === "enviada_a_cobro" && value === "false") {
        next.oficio_cobro = "";
      }
      return next;
    });
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM });
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validations
    if (!form.numero_expediente.trim()) {
      setError("El número de expediente es obligatorio.");
      return;
    }
    if (!form.materia) {
      setError("Seleccione una materia.");
      return;
    }
    if (!form.nombre_infractor.trim()) {
      setError("El nombre del infractor es obligatorio.");
      return;
    }
    if (!profile?.orpa_id) {
      setError("No tiene una ORPA asignada. Contacte al administrador.");
      return;
    }

    setSaving(true);

    const body = {
      orpa_id: profile.orpa_id,
      numero_expediente: form.numero_expediente.trim().toUpperCase(),
      materia: form.materia || null,
      nombre_infractor: form.nombre_infractor.trim().toUpperCase(),
      rfc_infractor: form.rfc_infractor.trim().toUpperCase() || null,
      tipo_persona: form.tipo_persona || null,
      domicilio_infractor: form.domicilio_infractor.trim() || null,
      giro_actividad: form.giro_actividad.trim() || null,
      articulo_infringido: form.articulo_infringido.trim() || null,
      descripcion_infraccion: form.descripcion_infraccion.trim() || null,
      numero_acta: form.numero_acta.trim() || null,
      fecha_acta: form.fecha_acta || null,
      fecha_resolucion: form.fecha_resolucion || null,
      fecha_notificacion: form.fecha_notificacion || null,
      numero_resolucion: form.numero_resolucion.trim() || null,
      monto_multa: form.monto_multa ? parseFloat(form.monto_multa) : null,
      dias_ume: form.dias_ume ? parseInt(form.dias_ume) : null,
      pagado: form.pagado === "true",
      fecha_pago: form.pagado === "true" && form.fecha_pago ? form.fecha_pago : null,
      monto_pagado:
        form.pagado === "true" && form.monto_pagado
          ? parseFloat(form.monto_pagado)
          : null,
      folio_pago: form.pagado === "true" && form.folio_pago.trim() ? form.folio_pago.trim() : null,
      impugnado: form.impugnado === "true",
      tipo_impugnacion:
        form.impugnado === "true" && form.tipo_impugnacion
          ? form.tipo_impugnacion
          : null,
      fecha_impugnacion:
        form.impugnado === "true" && form.fecha_impugnacion
          ? form.fecha_impugnacion
          : null,
      resultado_impugnacion:
        form.impugnado === "true" && form.resultado_impugnacion
          ? form.resultado_impugnacion
          : null,
      enviada_a_cobro: form.enviada_a_cobro === "true",
      oficio_cobro:
        form.enviada_a_cobro === "true" && form.oficio_cobro.trim()
          ? form.oficio_cobro.trim()
          : null,
      documentacion_anexa: form.documentacion_anexa === "true",
      observaciones: form.observaciones.trim() || null,
      fuente: "manual" as const,
    };

    try {
      const res = await fetch("/api/expedientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setSuccess(
          `Expediente ${body.numero_expediente} registrado exitosamente.`
        );
        setForm({ ...INITIAL_FORM });
      }
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Capturar Expediente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro manual de expediente de multa.{" "}
          {profile?.orpa && (
            <Badge variant="outline" className="ml-1">
              {profile.orpa.clave} — {profile.orpa.nombre}
            </Badge>
          )}
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-emerald-400"
            onClick={() => router.push("/expedientes")}
          >
            Ver expedientes
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── DATOS GENERALES ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Expediente</CardTitle>
            <CardDescription>
              Campos obligatorios marcados con{" "}
              <span className="text-destructive">*</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                No. Expediente <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ej: PFPA/10.2/3S.5/0001-25"
                value={form.numero_expediente}
                onChange={(e) =>
                  updateField("numero_expediente", e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Materia <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.materia}
                onValueChange={(v) => updateField("materia", v || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>No. de Acta</Label>
              <Input
                placeholder="Ej: PFPA/10.2/3S.5/0001-A"
                value={form.numero_acta}
                onChange={(e) => updateField("numero_acta", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha del Acta</Label>
              <Input
                type="date"
                value={form.fecha_acta}
                onChange={(e) => updateField("fecha_acta", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>No. de Resolución</Label>
              <Input
                value={form.numero_resolucion}
                onChange={(e) =>
                  updateField("numero_resolucion", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Resolución</Label>
              <Input
                type="date"
                value={form.fecha_resolucion}
                onChange={(e) =>
                  updateField("fecha_resolucion", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Notificación</Label>
              <Input
                type="date"
                value={form.fecha_notificacion}
                onChange={(e) =>
                  updateField("fecha_notificacion", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ── DATOS DEL INFRACTOR ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Infractor</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Nombre del Infractor{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Nombre completo o razón social"
                value={form.nombre_infractor}
                onChange={(e) =>
                  updateField("nombre_infractor", e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Persona</Label>
              <Select
                value={form.tipo_persona}
                onValueChange={(v) => updateField("tipo_persona", v || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PERSONA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>RFC</Label>
              <Input
                placeholder="Ej: XAXX010101000"
                maxLength={13}
                value={form.rfc_infractor}
                onChange={(e) =>
                  updateField("rfc_infractor", e.target.value.toUpperCase())
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Giro / Actividad</Label>
              <Input
                placeholder="Actividad económica"
                value={form.giro_actividad}
                onChange={(e) =>
                  updateField("giro_actividad", e.target.value)
                }
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Domicilio</Label>
              <Input
                placeholder="Domicilio del infractor"
                value={form.domicilio_infractor}
                onChange={(e) =>
                  updateField("domicilio_infractor", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ── INFRACCIÓN ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Datos de la Infracción
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Artículo Infringido</Label>
              <Input
                placeholder="Ej: Art. 171 LGEEPA"
                value={form.articulo_infringido}
                onChange={(e) =>
                  updateField("articulo_infringido", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Monto de la Multa (MXN)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.monto_multa}
                onChange={(e) => updateField("monto_multa", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Días UME</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.dias_ume}
                onChange={(e) => updateField("dias_ume", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Descripción de la Infracción</Label>
              <Textarea
                placeholder="Breve descripción de la infracción cometida..."
                rows={3}
                value={form.descripcion_infraccion}
                onChange={(e) =>
                  updateField("descripcion_infraccion", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ── PAGO ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Situación de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>¿La multa fue pagada?</Label>
                <Select
                  value={form.pagado}
                  onValueChange={(v) => updateField("pagado", v || "false")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SI_NO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.pagado === "true" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="space-y-2">
                  <Label>Fecha de Pago</Label>
                  <Input
                    type="date"
                    value={form.fecha_pago}
                    onChange={(e) =>
                      updateField("fecha_pago", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto Pagado (MXN)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.monto_pagado}
                    onChange={(e) =>
                      updateField("monto_pagado", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Folio de Pago</Label>
                  <Input
                    placeholder="No. Folio"
                    value={form.folio_pago}
                    onChange={(e) =>
                      updateField("folio_pago", e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── IMPUGNACIÓN ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impugnación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>¿Fue impugnada?</Label>
                <Select
                  value={form.impugnado}
                  onValueChange={(v) =>
                    updateField("impugnado", v || "false")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SI_NO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.impugnado === "true" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="space-y-2">
                  <Label>Tipo de Impugnación</Label>
                  <Select
                    value={form.tipo_impugnacion}
                    onValueChange={(v) =>
                      updateField("tipo_impugnacion", v || "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_IMPUGNACION.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Impugnación</Label>
                  <Input
                    type="date"
                    value={form.fecha_impugnacion}
                    onChange={(e) =>
                      updateField("fecha_impugnacion", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <Select
                    value={form.resultado_impugnacion}
                    onValueChange={(v) =>
                      updateField("resultado_impugnacion", v || "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTADOS_IMPUGNACION.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── COBRO Y DOCUMENTACIÓN ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobro y Documentación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>¿Enviada a cobro?</Label>
                <Select
                  value={form.enviada_a_cobro}
                  onValueChange={(v) =>
                    updateField("enviada_a_cobro", v || "false")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SI_NO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>¿Documentación anexa?</Label>
                <Select
                  value={form.documentacion_anexa}
                  onValueChange={(v) =>
                    updateField("documentacion_anexa", v || "false")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SI_NO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.enviada_a_cobro === "true" && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="space-y-2">
                  <Label>Oficio de Cobro</Label>
                  <Input
                    placeholder="No. de Oficio"
                    value={form.oficio_cobro}
                    onChange={(e) =>
                      updateField("oficio_cobro", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Observaciones adicionales..."
                rows={3}
                value={form.observaciones}
                onChange={(e) =>
                  updateField("observaciones", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ── ACTIONS ── */}
        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={resetForm}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpiar formulario
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Expediente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
