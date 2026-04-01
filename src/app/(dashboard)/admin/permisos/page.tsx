"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Check, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PermisosRol {
  role: string;
  puede_importar: boolean;
  puede_exportar: boolean;
  puede_crear_expediente: boolean;
  puede_editar_expediente: boolean;
  puede_eliminar_expediente: boolean;
  puede_editar_cobro: boolean;
  puede_ver_dashboard: boolean;
  puede_gestionar_orpas: boolean;
  puede_gestionar_usuarios: boolean;
}

const PERMISO_LABELS: Record<string, string> = {
  puede_importar: "Importar Excel",
  puede_exportar: "Exportar PDF",
  puede_crear_expediente: "Crear expedientes",
  puede_editar_expediente: "Editar expedientes",
  puede_eliminar_expediente: "Eliminar expedientes",
  puede_editar_cobro: "Editar datos de cobro",
  puede_ver_dashboard: "Ver dashboard",
  puede_gestionar_orpas: "Gestionar ORPAs",
  puede_gestionar_usuarios: "Gestionar usuarios",
};

const PERMISO_KEYS = Object.keys(PERMISO_LABELS) as (keyof typeof PERMISO_LABELS)[];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  capturador: "Capturador",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-emerald-600 text-white hover:bg-emerald-600",
  capturador: "bg-blue-500 text-white hover:bg-blue-500",
  visualizador: "bg-muted text-muted-foreground hover:bg-muted",
};

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<PermisosRol[]>([]);
  const [modified, setModified] = useState<Record<string, Partial<PermisosRol>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function loadPermisos() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/permisos");
      if (!res.ok) throw new Error("Error al cargar permisos");
      const data = await res.json();
      setPermisos(data);
    } catch {
      toast.error("Error al cargar permisos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPermisos();
  }, []);

  function togglePermiso(role: string, permiso: string, currentValue: boolean) {
    // Don't allow editing admin permissions
    if (role === "admin") return;

    setModified((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permiso]: !currentValue,
      },
    }));
  }

  function getEffectiveValue(role: string, permiso: string, original: boolean): boolean {
    return modified[role]?.[permiso as keyof PermisosRol] as boolean ?? original;
  }

  function isModified(role: string, permiso: string, original: boolean): boolean {
    const mod = modified[role]?.[permiso as keyof PermisosRol];
    return mod !== undefined && mod !== original;
  }

  async function saveRole(role: string) {
    const changes = modified[role];
    if (!changes) return;

    setSaving(role);
    try {
      const res = await fetch("/api/admin/permisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, ...changes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      const updated = await res.json();
      setPermisos((prev) =>
        prev.map((p) => (p.role === role ? updated : p))
      );
      setModified((prev) => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
      toast.success(`Permisos de ${ROLE_LABELS[role] || role} actualizados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(null);
    }
  }

  function hasChanges(role: string) {
    return modified[role] && Object.keys(modified[role]).length > 0;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">Permisos por Rol</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Permisos por Rol</h1>
      </div>

      <p className="text-muted-foreground text-sm">
        Configura qué acciones puede realizar cada rol. Los permisos de Administrador no se pueden modificar.
      </p>

      <div className="grid gap-6">
        {permisos.map((rolPermisos) => (
          <Card key={rolPermisos.role}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge className={ROLE_COLORS[rolPermisos.role] || ""}>
                    {ROLE_LABELS[rolPermisos.role] || rolPermisos.role}
                  </Badge>
                  {rolPermisos.role === "admin" && (
                    <span className="text-xs text-muted-foreground">(todos los permisos, no editable)</span>
                  )}
                </div>
                {rolPermisos.role !== "admin" && hasChanges(rolPermisos.role) && (
                  <Button
                    size="sm"
                    onClick={() => saveRole(rolPermisos.role)}
                    disabled={saving === rolPermisos.role}
                  >
                    {saving === rolPermisos.role ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Guardar cambios
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PERMISO_KEYS.map((permiso) => {
                  const original = rolPermisos[permiso as keyof PermisosRol] as boolean;
                  const effective = getEffectiveValue(rolPermisos.role, permiso, original);
                  const changed = isModified(rolPermisos.role, permiso, original);
                  const isAdmin = rolPermisos.role === "admin";

                  return (
                    <button
                      key={permiso}
                      type="button"
                      onClick={() => togglePermiso(rolPermisos.role, permiso, effective)}
                      disabled={isAdmin}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
                        ${isAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"}
                        ${changed ? "ring-2 ring-blue-400 border-blue-400" : ""}
                        ${effective ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"}
                      `}
                    >
                      <div
                        className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                          ${effective ? "bg-emerald-500 text-white" : "bg-red-400 text-white"}
                        `}
                      >
                        {effective ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium">
                        {PERMISO_LABELS[permiso]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
