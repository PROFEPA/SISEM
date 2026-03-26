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
  const [pageSize] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [orpaId, setOrpaId] = useState<string>("");
  const [pagado, setPagado] = useState<string>("");
  const [impugnado, setImpugnado] = useState<string>("");
  const [materia, setMateria] = useState<string>("");

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

    const res = await fetch(`/api/expedientes?${params.toString()}`);
    const json = await res.json();
    setExpedientes(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  }, [page, pageSize, busqueda, orpaId, pagado, impugnado, materia]);

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

    const res = await fetch(`/api/expedientes?${params.toString()}`);
    const json = await res.json();
    const rows = (json.data || []).map((exp: IExpediente) => ({
      "No. Expediente": exp.numero_expediente,
      ORPA: exp.orpa?.nombre || "",
      Materia: exp.materia || "",
      "Fecha Resolución": exp.fecha_resolucion || "",
      "Monto Multa": exp.monto_multa,
      Pagado: exp.pagado ? "SI" : "NO",
      "Fecha Pago": exp.fecha_pago || "",
      Impugnado: exp.impugnado ? "SI" : "NO",
      "Tipo Impugnación": exp.tipo_impugnacion || "",
      "Resultado Impugnación": exp.resultado_impugnacion || "",
      "Enviada a Cobro": exp.enviada_a_cobro ? "SI" : "NO",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expedientes");
    XLSX.writeFile(wb, `SISEM_Expedientes_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters = busqueda || orpaId || pagado || impugnado || materia;

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
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : expedientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} ({total.toLocaleString("es-MX")} registros)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
