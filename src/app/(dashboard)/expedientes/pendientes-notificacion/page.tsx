"use client";

import { API_BASE } from "@/lib/api-base";
import { use, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  BellRing,
  PenLine,
  X,
} from "lucide-react";
import type { IExpediente, IOrpa } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { SortableTableHead } from "@/components/sortable-table-head";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatDateRangeLabel } from "@/lib/date-range";
import { stableSort, type SortDirection } from "@/lib/table-sort";

type PendientesSearchParams = Promise<{
  fecha_desde?: string | string[];
  fecha_hasta?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

type PendingSortKey =
  | "numero_expediente"
  | "orpa"
  | "materia"
  | "infractor"
  | "monto_multa"
  | "fecha_resolucion"
  | "fecha_notificacion";

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

function getInfractor(exp: IExpediente): string {
  return exp.razon_social ||
    [exp.nombre_infractor, exp.apellido_paterno, exp.apellido_materno]
      .filter((value) => value && value !== "SIN DATO")
      .join(" ") ||
    "";
}

const PAGE_SIZE = 25;

export default function PendientesNotificacionPage({
  searchParams,
}: {
  searchParams: PendientesSearchParams;
}) {
  const resolvedSearchParams = use(searchParams);
  const fechaDesde = firstParam(resolvedSearchParams.fecha_desde);
  const fechaHasta = firstParam(resolvedSearchParams.fecha_hasta);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [todos, setTodos] = useState<IExpediente[]>([]);
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<PendingSortKey>("fecha_resolucion");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [orpaId, setOrpaId] = useState<string>("");

  // Trae TODOS los pendientes (paginando contra la API, que limita a 100 por página)
  const fetchPendientes = useCallback(async () => {
    setLoading(true);
    const baseParams = () => {
      const p = new URLSearchParams({
        excluida_estadisticas: "true",
        pageSize: "100",
        sort_by: "fecha_resolucion",
        sort_dir: "asc",
      });
      if (busquedaAplicada) p.set("busqueda", busquedaAplicada);
      if (orpaId) p.set("orpa_id", orpaId);
      if (fechaDesde) p.set("fecha_desde", fechaDesde);
      if (fechaHasta) p.set("fecha_hasta", fechaHasta);
      return p;
    };

    const acc: IExpediente[] = [];
    let pageNum = 1;
    let totalPages = 1;
    do {
      const p = baseParams();
      p.set("page", String(pageNum));
      const res = await fetch(`${API_BASE}/api/expedientes?${p.toString()}`);
      const json = await res.json();
      acc.push(...(json.data || []));
      totalPages = json.totalPages || 1;
      pageNum++;
    } while (pageNum <= totalPages);

    setTodos(acc);
    setPage(1);
    setLoading(false);
  }, [busquedaAplicada, fechaDesde, fechaHasta, orpaId]);

  useEffect(() => {
    fetchPendientes();
  }, [fetchPendientes]);

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
    setBusquedaAplicada(busqueda.trim());
  }

  function clearFilters() {
    setBusqueda("");
    setBusquedaAplicada("");
    setOrpaId("");
  }

  function updateDateRangeUrl(from: string, to: string) {
    const params = new URLSearchParams(window.location.search);
    if (from) params.set("fecha_desde", from);
    else params.delete("fecha_desde");
    if (to) params.set("fecha_hasta", to);
    else params.delete("fecha_hasta");
    const query = params.toString();
    setPage(1);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggleSort(field: string, defaultDirection: SortDirection = "asc") {
    const nextField = field as PendingSortKey;
    if (sortBy === nextField) {
      setSortDir((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortBy(nextField);
      setSortDir(defaultDirection);
    }
    setPage(1);
  }

  const sorted = useMemo(() => stableSort(todos, (exp) => {
    switch (sortBy) {
      case "orpa": return exp.orpa?.nombre;
      case "infractor": return getInfractor(exp);
      default: return exp[sortBy];
    }
  }, sortDir), [sortBy, sortDir, todos]);

  const total = todos.length;
  const montoTotal = todos.reduce((s, e) => s + (e.monto_multa || 0), 0);
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const visibles = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(busquedaAplicada || orpaId);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-500" />
            Pendientes (excluidas de estadísticas)
          </h1>
          <p className="text-muted-foreground text-sm">
            Expedientes marcados manualmente por el cliente: tienen seguimiento propio pero
            no cuentan en el dashboard ni en los reportes generales.
          </p>
        </div>
        <div className="flex gap-2">
          <Card className="px-4 py-2">
            <p className="text-[11px] text-muted-foreground">Expedientes</p>
            <p className="text-lg font-bold leading-tight">
              {loading ? "…" : total.toLocaleString("es-MX")}
            </p>
          </Card>
          <Card className="px-4 py-2">
            <p className="text-[11px] text-muted-foreground">Monto total</p>
            <p className="text-lg font-bold leading-tight">
              {loading ? "…" : formatMoney(montoTotal)}
            </p>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DateRangeFilter
            from={fechaDesde}
            to={fechaHasta}
            onApply={updateDateRangeUrl}
            onClear={() => updateDateRangeUrl("", "")}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Periodo activo: {formatDateRangeLabel({
              from: fechaDesde || null,
              to: fechaHasta || null,
            })}
          </p>
        </CardContent>
      </Card>

      {/* Búsqueda y filtro por ORPA */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por expediente o infractor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={orpaId} onValueChange={(v) => setOrpaId(!v || v === "all" ? "" : v)}>
              <SelectTrigger className="w-[220px]">
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
            <Button type="submit" size="sm">
              Buscar
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="numero_expediente" label="No. Expediente" current={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHead field="orpa" label="ORPA" current={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHead field="materia" label="Materia" current={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHead field="infractor" label="Infractor" current={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHead field="monto_multa" label="Monto" current={sortBy} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" />
                  <SortableTableHead field="fecha_resolucion" label="F. Resolución" current={sortBy} direction={sortDir} onSort={toggleSort} defaultDirection="desc" />
                  <SortableTableHead field="fecha_notificacion" label="F. Notificación" current={sortBy} direction={sortDir} onSort={toggleSort} defaultDirection="desc" />
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : visibles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No hay expedientes excluidos de estadísticas.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibles.map((exp) => (
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
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {getInfractor(exp) || "—"}
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
                        <Link href={`/expedientes/${exp.id}/editar`} title="Editar expediente">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <PenLine className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación (cliente) */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {((page - 1) * PAGE_SIZE + 1).toLocaleString("es-MX")}–
                {Math.min(page * PAGE_SIZE, total).toLocaleString("es-MX")} de{" "}
                {total.toLocaleString("es-MX")}
              </p>
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
