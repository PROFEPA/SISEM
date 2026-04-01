"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Eye,
  Filter,
  X,
} from "lucide-react";
import type { IExpediente, IOrpa } from "@/types";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

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
    month: "short",
    year: "numeric",
  });
}

export default function ExpedientesPage() {
  const supabase = createClient();
  const [expedientes, setExpedientes] = useState<IExpediente[]>([]);
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [orpaId, setOrpaId] = useState<string>("");
  const [pagado, setPagado] = useState<string>("");
  const [impugnado, setImpugnado] = useState<string>("");
  const [materia, setMateria] = useState<string>("");
  const [enviadaACobro, setEnviadaACobro] = useState<string>("");
  const [tipoImpugnacion, setTipoImpugnacion] = useState<string>("");
  const [tipoPersona, setTipoPersona] = useState<string>("");
  const [fechaNotifDesde, setFechaNotifDesde] = useState<string>("");
  const [fechaNotifHasta, setFechaNotifHasta] = useState<string>("");

  const fetchExpedientes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (busqueda) params.set("busqueda", busqueda);
    if (orpaId) params.set("orpa_id", orpaId);
    if (pagado) params.set("pagado", pagado);
    if (impugnado) params.set("impugnado", impugnado);
    if (materia) params.set("materia", materia);
    if (enviadaACobro) params.set("enviada_a_cobro", enviadaACobro);
    if (tipoImpugnacion) params.set("tipo_impugnacion", tipoImpugnacion);
    if (tipoPersona) params.set("tipo_persona", tipoPersona);
    if (fechaNotifDesde) params.set("fecha_notificacion_desde", fechaNotifDesde);
    if (fechaNotifHasta) params.set("fecha_notificacion_hasta", fechaNotifHasta);

    const res = await fetch(`/api/expedientes?${params.toString()}`);
    const json = await res.json();
    setExpedientes(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  }, [page, pageSize, busqueda, orpaId, pagado, impugnado, materia, enviadaACobro, tipoImpugnacion, tipoPersona, fechaNotifDesde, fechaNotifHasta]);

  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]);

  useEffect(() => {
    supabase
      .from("orpas")
      .select("*")
      .eq("activa", true)
      .order("nombre")
      .then(({ data }) => {
        if (data) setOrpas(data);
      });
  }, [supabase]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchExpedientes();
  }

  function clearFilters() {
    setBusqueda("");
    setOrpaId("");
    setPagado("");
    setImpugnado("");
    setMateria("");
    setEnviadaACobro("");
    setTipoImpugnacion("");
    setTipoPersona("");
    setFechaNotifDesde("");
    setFechaNotifHasta("");
    setPage(1);
  }

  async function exportToExcel() {
    // Fetch all data with current filters (no pagination)
    const params = new URLSearchParams({ page: "1", pageSize: "10000" });
    if (busqueda) params.set("busqueda", busqueda);
    if (orpaId) params.set("orpa_id", orpaId);
    if (pagado) params.set("pagado", pagado);
    if (impugnado) params.set("impugnado", impugnado);
    if (materia) params.set("materia", materia);
    if (enviadaACobro) params.set("enviada_a_cobro", enviadaACobro);
    if (tipoImpugnacion) params.set("tipo_impugnacion", tipoImpugnacion);
    if (tipoPersona) params.set("tipo_persona", tipoPersona);
    if (fechaNotifDesde) params.set("fecha_notificacion_desde", fechaNotifDesde);
    if (fechaNotifHasta) params.set("fecha_notificacion_hasta", fechaNotifHasta);

    const res = await fetch(`/api/expedientes?${params.toString()}`);
    const json = await res.json();
    const data = json.data || [];
    const rows = data.map((exp: IExpediente) => ({
      "No. Expediente": exp.numero_expediente,
      ORPA: exp.orpa?.nombre || "",
      Materia: exp.materia || "",
      "Tipo Persona": exp.tipo_persona || "",
      "Nombre Infractor": exp.nombre_infractor || "",
      "Apellido Paterno": exp.apellido_paterno || "",
      "Apellido Materno": exp.apellido_materno || "",
      "Razón Social": exp.razon_social || "",
      RFC: exp.rfc_infractor || "",
      Domicilio: exp.domicilio_infractor || "",
      "Giro/Actividad": exp.giro_actividad || "",
      "No. Acta": exp.numero_acta || "",
      "Fecha Acta": exp.fecha_acta || "",
      "No. Resolución": exp.numero_resolucion || "",
      "Fecha Resolución": exp.fecha_resolucion || "",
      "Fecha Notificación": exp.fecha_notificacion || "",
      "Artículo Infringido": exp.articulo_infringido || "",
      "Descripción Infracción": exp.descripcion_infraccion || "",
      "Monto Multa": exp.monto_multa,
      "Días UME": exp.dias_ume,
      Pagado: exp.pagado ? "SI" : "NO",
      "Fecha Pago": exp.fecha_pago || "",
      "Monto Pagado": exp.monto_pagado,
      "Folio Pago": exp.folio_pago || "",
      Impugnado: exp.impugnado ? "SI" : "NO",
      "Tipo Impugnación": exp.tipo_impugnacion || "",
      "Fecha Impugnación": exp.fecha_impugnacion || "",
      "Resultado Impugnación": exp.resultado_impugnacion || "",
      "Enviada a Cobro": exp.enviada_a_cobro ? "SI" : "NO",
      "Oficio Cobro": exp.oficio_cobro || "",
      "Doc. Anexa": exp.documentacion_anexa ? "SI" : "NO",
      Observaciones: exp.observaciones || "",
    }));

    // Summary sheet
    const totalMonto = data.reduce((s: number, e: IExpediente) => s + (e.monto_multa || 0), 0);
    const totalPagado = data.filter((e: IExpediente) => e.pagado).length;
    const totalImpugnado = data.filter((e: IExpediente) => e.impugnado).length;
    const summary = [
      { Concepto: "Total Expedientes", Valor: data.length },
      { Concepto: "Monto Total", Valor: totalMonto },
      { Concepto: "Pagados", Valor: totalPagado },
      { Concepto: "Impugnados", Valor: totalImpugnado },
      { Concepto: "Enviados a Cobro", Valor: data.filter((e: IExpediente) => e.enviada_a_cobro).length },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Expedientes");
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

    const filterTag = [materia, pagado === "true" ? "pagados" : pagado === "false" ? "nopagados" : ""].filter(Boolean).join("_");
    const fileName = `SISEM_Expedientes_${new Date().toISOString().split("T")[0]}${filterTag ? "_" + filterTag : ""}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters = busqueda || orpaId || pagado || impugnado || materia || enviadaACobro || tipoImpugnacion || tipoPersona || fechaNotifDesde || fechaNotifHasta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expedientes</h1>
          <p className="text-muted-foreground text-sm">
            {total.toLocaleString("es-MX")} expedientes encontrados
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por expediente o infractor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtros
              {hasActiveFilters && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  !
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </form>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t">
              <Select value={orpaId} onValueChange={(v) => { setOrpaId(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las ORPAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ORPAs</SelectItem>
                  {orpas.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={materia} onValueChange={(v) => { setMateria(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las materias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las materias</SelectItem>
                  <SelectItem value="INDUSTRIA">Industria</SelectItem>
                  <SelectItem value="FORESTAL">Forestal</SelectItem>
                  <SelectItem value="IMPACTO AMBIENTAL">Impacto Ambiental</SelectItem>
                  <SelectItem value="VIDA SILVESTRE">Vida Silvestre</SelectItem>
                  <SelectItem value="ZOFEMAT">ZOFEMAT</SelectItem>
                  <SelectItem value="RECURSOS MARINOS">Recursos Marinos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pagado} onValueChange={(v) => { setPagado(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pagado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Pagados</SelectItem>
                  <SelectItem value="false">No pagados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={impugnado} onValueChange={(v) => { setImpugnado(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Impugnado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Impugnados</SelectItem>
                  <SelectItem value="false">No impugnados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={enviadaACobro} onValueChange={(v) => { setEnviadaACobro(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Enviada a cobro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Enviados</SelectItem>
                  <SelectItem value="false">No enviados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoImpugnacion} onValueChange={(v) => { setTipoImpugnacion(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo impugnación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="RECURSO_REVISION">Recurso de Revisión</SelectItem>
                  <SelectItem value="JUICIO_NULIDAD">Juicio de Nulidad</SelectItem>
                  <SelectItem value="AMPARO">Amparo</SelectItem>
                  <SelectItem value="CONMUTACION">Conmutación</SelectItem>
                  <SelectItem value="RECURSO_RECONSIDERACION">Recurso de Reconsideración</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoPersona} onValueChange={(v) => { setTipoPersona(!v || v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="fisica">Persona Física</SelectItem>
                  <SelectItem value="moral">Persona Moral</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Notif. desde</label>
                  <Input
                    type="date"
                    value={fechaNotifDesde}
                    onChange={(e) => { setFechaNotifDesde(e.target.value); setPage(1); }}
                    className="h-9"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Notif. hasta</label>
                  <Input
                    type="date"
                    value={fechaNotifHasta}
                    onChange={(e) => { setFechaNotifHasta(e.target.value); setPage(1); }}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Expediente</TableHead>
                  <TableHead>ORPA</TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>F. Resolución</TableHead>
                  <TableHead>F. Notificación</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Impugnado</TableHead>
                  <TableHead>Cobro</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : expedientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No se encontraron expedientes
                    </TableCell>
                  </TableRow>
                ) : (
                  expedientes.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        {exp.numero_expediente}
                      </TableCell>
                      <TableCell className="text-xs">
                        {exp.orpa?.nombre || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {exp.materia || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatMoney(exp.monto_multa)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(exp.fecha_resolucion)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(exp.fecha_notificacion)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={exp.pagado ? "default" : "secondary"}
                          className={`text-[10px] ${exp.pagado ? "bg-green-600" : ""}`}
                        >
                          {exp.pagado ? "SI" : "NO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={exp.impugnado ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {exp.impugnado ? "SI" : "NO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={exp.enviada_a_cobro ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {exp.enviada_a_cobro ? "SI" : "NO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/expedientes/${exp.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {((page - 1) * pageSize + 1).toLocaleString("es-MX")}–{Math.min(page * pageSize, total).toLocaleString("es-MX")} de {total.toLocaleString("es-MX")}
                </p>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
