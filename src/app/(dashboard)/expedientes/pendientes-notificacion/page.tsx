"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

// Días naturales transcurridos desde la fecha de resolución hasta hoy
function diasDesde(date: string | null): number | null {
  if (!date) return null;
  const inicio = new Date(date + "T00:00:00").getTime();
  const hoy = new Date(new Date().toDateString()).getTime();
  return Math.max(0, Math.round((hoy - inicio) / 86_400_000));
}

const PAGE_SIZE = 25;

export default function PendientesNotificacionPage() {
  const supabase = createClient();
  const [todos, setTodos] = useState<IExpediente[]>([]);
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [orpaId, setOrpaId] = useState<string>("");

  // Trae TODOS los pendientes (paginando contra la API, que limita a 100 por página)
  const fetchPendientes = useCallback(async () => {
    setLoading(true);
    const baseParams = () => {
      const p = new URLSearchParams({
        notificacion_pendiente: "true",
        pageSize: "100",
        sort_by: "fecha_resolucion",
        sort_dir: "asc",
      });
      if (busquedaAplicada) p.set("busqueda", busquedaAplicada);
      if (orpaId) p.set("orpa_id", orpaId);
      return p;
    };

    const acc: IExpediente[] = [];
    let pageNum = 1;
    let totalPages = 1;
    do {
      const p = baseParams();
      p.set("page", String(pageNum));
      const res = await fetch(`/api/expedientes?${p.toString()}`);
      const json = await res.json();
      acc.push(...(json.data || []));
      totalPages = json.totalPages || 1;
      pageNum++;
    } while (pageNum <= totalPages);

    setTodos(acc);
    setPage(1);
    setLoading(false);
  }, [busquedaAplicada, orpaId]);

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

  const total = todos.length;
  const montoTotal = todos.reduce((s, e) => s + (e.monto_multa || 0), 0);
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const visibles = todos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(busquedaAplicada || orpaId);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-500" />
            Pendientes de notificar
          </h1>
          <p className="text-muted-foreground text-sm">
            Multas con resolución que aún no se han notificado al infractor.
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
                  <TableHead>No. Expediente</TableHead>
                  <TableHead>ORPA</TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead>Infractor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>F. Resolución</TableHead>
                  <TableHead className="text-center">Días sin notificar</TableHead>
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
                      No hay multas pendientes de notificar.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibles.map((exp) => {
                    const dias = diasDesde(exp.fecha_resolucion);
                    const urgente = dias !== null && dias >= 30;
                    const medio = dias !== null && dias >= 15 && dias < 30;
                    return (
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
                          {exp.razon_social ||
                            [exp.nombre_infractor, exp.apellido_paterno, exp.apellido_materno]
                              .filter((x) => x && x !== "SIN DATO")
                              .join(" ") ||
                            "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatMoney(exp.monto_multa)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(exp.fecha_resolucion)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={urgente ? "destructive" : "secondary"}
                            className={`text-[10px] ${medio ? "bg-amber-500 text-white" : ""}`}
                          >
                            {dias === null ? "—" : `${dias} días`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/expedientes/${exp.id}/editar`} title="Registrar notificación">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <PenLine className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
