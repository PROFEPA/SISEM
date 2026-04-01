"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  FileText,
  DollarSign,
} from "lucide-react";

interface OrpaStats {
  total: number;
  monto: number;
  pagados: number;
  impugnados: number;
}

interface OrpaWithStats {
  id: string;
  clave: string;
  nombre: string;
  estado: string;
  activa: boolean;
  created_at: string;
  stats: OrpaStats;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function OrpasPage() {
  const [orpas, setOrpas] = useState<OrpaWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ clave: "", nombre: "", estado: "" });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ id: "", clave: "", nombre: "", estado: "", activa: true });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrpaWithStats | null>(null);

  async function loadOrpas() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/orpas");
      const res = await r.json();
      if (res.data) setOrpas(res.data);
    } catch (err) {
      console.error("Error loading ORPAs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrpas();
  }, []);

  // Create
  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const r = await fetch("/api/admin/orpas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const res = await r.json();
      if (!r.ok || res.error) {
        setCreateError(res.error || "Error al crear ORPA");
        return;
      }
      setCreateOpen(false);
      setForm({ clave: "", nombre: "", estado: "" });
      loadOrpas();
    } catch {
      setCreateError("Error de conexión");
    } finally {
      setCreating(false);
    }
  }

  // Edit
  function openEdit(orpa: OrpaWithStats) {
    setEditForm({ id: orpa.id, clave: orpa.clave, nombre: orpa.nombre, estado: orpa.estado, activa: orpa.activa });
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEdit() {
    setEditSaving(true);
    setEditError(null);
    try {
      const r = await fetch("/api/admin/orpas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const res = await r.json();
      if (!r.ok || res.error) {
        setEditError(res.error || "Error al actualizar");
        return;
      }
      setEditOpen(false);
      loadOrpas();
    } catch {
      setEditError("Error de conexión");
    } finally {
      setEditSaving(false);
    }
  }

  // Delete
  function openDelete(orpa: OrpaWithStats) {
    setDeleteTarget(orpa);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await fetch(`/api/admin/orpas?id=${deleteTarget.id}`, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok || res.error) {
        setDeleteError(res.error || "Error al eliminar");
        return;
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadOrpas();
    } catch {
      setDeleteError("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  // Toggle active
  async function toggleActive(orpa: OrpaWithStats) {
    await fetch("/api/admin/orpas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orpa.id, activa: !orpa.activa }),
    });
    loadOrpas();
  }

  const filtered = orpas.filter(
    (o) =>
      o.nombre.toLowerCase().includes(search.toLowerCase()) ||
      o.clave.toLowerCase().includes(search.toLowerCase()) ||
      o.estado.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpedientes = orpas.reduce((s, o) => s + o.stats.total, 0);
  const totalMonto = orpas.reduce((s, o) => s + o.stats.monto, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            ORPAs
          </h1>
          <p className="text-muted-foreground text-sm">
            Catálogo de Oficinas de Representación — {orpas.length} registradas
          </p>
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Nueva ORPA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva ORPA</DialogTitle>
              <DialogDescription>Registrar una nueva Oficina de Representación</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clave">Clave</Label>
                <Input
                  id="clave"
                  placeholder="Ej: CDMX-01"
                  value={form.clave}
                  onChange={(e) => setForm({ ...form, clave: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Delegación Federal en Ciudad de México"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  placeholder="Ej: Ciudad de México"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                />
              </div>
              {createError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {createError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating || !form.clave || !form.nombre || !form.estado}>
                {creating ? "Creando..." : "Crear ORPA"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total ORPAs</p>
            <p className="text-2xl font-bold">{orpas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Activas</p>
            <p className="text-2xl font-bold text-emerald-600">{orpas.filter((o) => o.activa).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Expedientes</p>
              <p className="text-2xl font-bold">{totalExpedientes.toLocaleString("es-MX")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Monto Total</p>
              <p className="text-2xl font-bold">{formatMoney(totalMonto)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, clave o estado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Activa</TableHead>
                <TableHead className="text-right">Expedientes</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">% Cobrado</TableHead>
                <TableHead className="text-right">Impugnados</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {search ? "Sin resultados" : "No hay ORPAs registradas"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((orpa) => {
                  const cobPct = orpa.stats.total > 0 ? (orpa.stats.pagados / orpa.stats.total) * 100 : 0;
                  return (
                    <TableRow key={orpa.id} className={!orpa.activa ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-xs font-medium">{orpa.clave}</TableCell>
                      <TableCell className="font-medium">{orpa.nombre}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{orpa.estado}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`cursor-pointer ${orpa.activa ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300" : "bg-muted text-muted-foreground hover:bg-muted"}`}
                          onClick={() => toggleActive(orpa)}
                        >
                          {orpa.activa ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{orpa.stats.total.toLocaleString("es-MX")}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatMoney(orpa.stats.monto)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(cobPct, 100)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-8 text-right">{cobPct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {orpa.stats.impugnados > 0 ? (
                          <Badge variant="destructive" className="text-xs">{orpa.stats.impugnados}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(orpa)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDelete(orpa)}
                            disabled={orpa.stats.total > 0}
                            title={orpa.stats.total > 0 ? "No se puede eliminar: tiene expedientes" : "Eliminar"}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ORPA</DialogTitle>
            <DialogDescription>Modificar datos de la Oficina de Representación</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clave</Label>
              <Input value={editForm.clave} onChange={(e) => setEditForm({ ...editForm, clave: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-activa"
                checked={editForm.activa}
                onChange={(e) => setEditForm({ ...editForm, activa: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-activa">Activa</Label>
            </div>
            {editError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {editError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Eliminar ORPA
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la ORPA <strong>{deleteTarget?.nombre}</strong> ({deleteTarget?.clave})?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
