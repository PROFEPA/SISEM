"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Users, UserPlus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { IProfile, IOrpa, Role } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  capturador: "Capturador",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-emerald-600 text-white hover:bg-emerald-600",
  capturador: "bg-blue-500 text-white hover:bg-blue-500",
  visualizador: "bg-gray-200 text-gray-700 hover:bg-gray-200",
};

export default function UsuariosPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<IProfile[]>([]);
  const [orpas, setOrpas] = useState<IOrpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create user dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    nombre_completo: "",
    role: "capturador" as string,
    orpa_id: "" as string,
  });

  // Edit user dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    user_id: "",
    nombre_completo: "",
    role: "" as string,
    orpa_id: "" as string,
    activo: true,
    password: "",
  });

  // Delete confirmation dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IProfile | null>(null);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*, orpa:orpas(nombre, clave)")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as IProfile[]);
    setLoading(false);
  }

  async function loadOrpas() {
    const { data } = await supabase
      .from("orpas")
      .select("*")
      .order("clave");
    if (data) setOrpas(data as IOrpa[]);
  }

  useEffect(() => {
    loadProfiles();
    loadOrpas();
  }, []);

  // ── Create User ──
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    const normalizedOrpaId =
      form.orpa_id && form.orpa_id !== "none" ? form.orpa_id : null;

    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        nombre_completo: form.nombre_completo,
        role: form.role,
        orpa_id: normalizedOrpaId,
      }),
    });

    const json = await res.json();
    setCreating(false);

    if (json.error) {
      setCreateError(json.error);
      return;
    }

    setCreateSuccess(json.message ?? `Usuario ${form.email} creado exitosamente`);
    setForm({ email: "", password: "", nombre_completo: "", role: "capturador", orpa_id: "" });
    loadProfiles();

    setTimeout(() => {
      setDialogOpen(false);
      setCreateSuccess(null);
    }, 1500);
  }

  // ── Edit User ──
  function openEdit(p: IProfile) {
    const orpa = p.orpa as unknown as { nombre: string; clave: string } | null;
    setEditForm({
      user_id: p.id,
      nombre_completo: p.nombre_completo || "",
      role: p.role,
      orpa_id: p.orpa_id || "",
      activo: p.activo,
      password: "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError(null);

    const normalizedOrpaId =
      editForm.orpa_id && editForm.orpa_id !== "none" ? editForm.orpa_id : null;

    const res = await fetch("/api/admin/usuarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: editForm.user_id,
        nombre_completo: editForm.nombre_completo,
        role: editForm.role,
        orpa_id: normalizedOrpaId,
        activo: editForm.activo,
        ...(editForm.password.length >= 6 ? { password: editForm.password } : {}),
      }),
    });

    const json = await res.json();
    setEditSaving(false);

    if (json.error) {
      setEditError(json.error);
      return;
    }

    setEditOpen(false);
    loadProfiles();
  }

  // ── Delete User ──
  function openDelete(p: IProfile) {
    setDeleteTarget(p);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const res = await fetch(`/api/admin/usuarios?user_id=${deleteTarget.id}`, {
      method: "DELETE",
    });

    const json = await res.json();
    setDeleting(false);

    if (json.error) {
      setDeleteError(json.error);
      return;
    }

    setDeleteOpen(false);
    setDeleteTarget(null);
    loadProfiles();
  }

  const filtered = profiles.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const orpa = p.orpa as unknown as { nombre: string; clave: string } | null;
    return (
      (p.nombre_completo || "").toLowerCase().includes(q) ||
      (orpa?.nombre || "").toLowerCase().includes(q) ||
      (orpa?.clave || "").toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: profiles.length,
    admins: profiles.filter((p) => p.role === "admin").length,
    capturadores: profiles.filter((p) => p.role === "capturador").length,
    visualizadores: profiles.filter((p) => p.role === "visualizador").length,
    activos: profiles.filter((p) => p.activo).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground text-sm">
            Crear, editar, eliminar y administrar roles de usuarios del sistema
          </p>
        </div>

        {/* ── Create User Dialog ── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<span />}>
            <Button className="gap-2 cursor-pointer">
              <UserPlus className="w-4 h-4" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Crear nuevo usuario</DialogTitle>
              <DialogDescription>
                El usuario podrá iniciar sesión inmediatamente con estas credenciales.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  placeholder="Juan Pérez García"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@profepa.gob.mx"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => v && setForm({ ...form, role: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capturador">Capturador</SelectItem>
                      <SelectItem value="visualizador">Visualizador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ORPA asignada</Label>
                  <Select
                    value={form.orpa_id}
                    onValueChange={(v) =>
                      setForm((c) => ({ ...c, orpa_id: v && v !== "none" ? v : "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar (Oficina Central)</SelectItem>
                      {orpas.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.clave} — {o.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {createError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}
              {createSuccess && (
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  {createSuccess}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating} className="cursor-pointer">
                  {creating ? "Creando..." : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-gray-900" },
            { label: "Admins", value: stats.admins, color: "text-emerald-600" },
            { label: "Capturadores", value: stats.capturadores, color: "text-blue-600" },
            { label: "Visualizadores", value: stats.visualizadores, color: "text-gray-500" },
            { label: "Activos", value: stats.activos, color: "text-emerald-600" },
          ].map((s) => (
            <Card key={s.label} className="border border-gray-200/60">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, ORPA o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="border border-gray-200/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>ORPA</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search
                      ? "No se encontraron usuarios con ese criterio"
                      : "No hay usuarios registrados. Crea el primero."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const orpa = p.orpa as unknown as { nombre: string; clave: string } | null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.nombre_completo || "Sin nombre"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {orpa ? (
                          <span>
                            <span className="font-medium">{orpa.clave}</span>{" "}
                            <span className="text-muted-foreground">{orpa.nombre}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[p.role] || ""}>
                          {ROLE_LABELS[p.role] || p.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            p.activo
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                          }
                        >
                          {p.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            title="Editar usuario"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar usuario"
                            onClick={() => openDelete(p)}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ── Edit User Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario. Deja la contraseña vacía para no cambiarla.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={editForm.nombre_completo}
                onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => v && setEditForm({ ...editForm, role: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capturador">Capturador</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ORPA asignada</Label>
                <Select
                  value={editForm.orpa_id || "none"}
                  onValueChange={(v) =>
                    setEditForm((c) => ({ ...c, orpa_id: v && v !== "none" ? v : "" }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {orpas.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.clave} — {o.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={editForm.activo ? "true" : "false"}
                onValueChange={(v) => setEditForm({ ...editForm, activo: v === "true" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nueva contraseña (opcional)</Label>
              <Input
                type="password"
                placeholder="Dejar vacío para no cambiar"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                minLength={6}
              />
            </div>

            {editError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" disabled={editSaving} className="cursor-pointer">
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Eliminar usuario
            </DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminará la cuenta de autenticación y el perfil del
              usuario <strong>{deleteTarget?.nombre_completo || "Sin nombre"}</strong>.
              {"\n\n"}Si el usuario tiene expedientes registrados, no podrá ser eliminado — desactívalo en su lugar.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {deleteError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteUser}
              className="cursor-pointer"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
