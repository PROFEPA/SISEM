"use client";

import { API_BASE } from "@/lib/api-base";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, History, Users2, ChevronLeft, ChevronRight } from "lucide-react";
import { SUPER_ADMIN_ID } from "@/lib/auth/super-admin";

type Tab = "cambios" | "logins" | "recurrentes";

interface AuditRow {
  id: number;
  created_at: string;
  actor_nombre: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

interface LoginRow {
  id: number;
  created_at: string;
  user_id: string;
  nombre_completo: string | null;
  role: string | null;
  user_agent: string | null;
}

interface RecurrenteRow {
  user_id: string;
  nombre_completo: string | null;
  role: string | null;
  total: number;
  ultimo_login: string;
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  UPDATE: "bg-blue-50 text-blue-700 hover:bg-blue-50",
  DELETE: "bg-red-50 text-red-700 hover:bg-red-50",
  IMPERSONATE: "bg-amber-50 text-amber-700 hover:bg-amber-50",
};

const ENTITY_FILTERS = [
  { value: "", label: "Todas las entidades" },
  { value: "profile", label: "Usuarios" },
  { value: "expediente", label: "Expedientes" },
  { value: "permiso_rol", label: "Permisos" },
];

export default function AuditoriaPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("cambios");
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [cambios, setCambios] = useState<AuditRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [recurrentes, setRecurrentes] = useState<RecurrenteRow[]>([]);
  const pageSize = 25;

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== SUPER_ADMIN_ID) {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
      setChecking(false);
    }
    checkAccess();
  }, [router]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    if (tab === "cambios") {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (entityType) params.set("entity_type", entityType);
      const res = await fetch(`${API_BASE}/api/admin/auditoria?${params}`);
      const json = await res.json();
      if (json.data) {
        setCambios(json.data);
        setCount(json.count || 0);
      }
    } else if (tab === "logins") {
      const params = new URLSearchParams({ source: "logins", page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`${API_BASE}/api/admin/auditoria?${params}`);
      const json = await res.json();
      if (json.data) {
        setLogins(json.data);
        setCount(json.count || 0);
      }
    } else {
      const res = await fetch(`${API_BASE}/api/admin/auditoria?source=recurrentes`);
      const json = await res.json();
      if (json.data) setRecurrentes(json.data);
    }
    setLoading(false);
  }, [allowed, tab, page, entityType]);

  useEffect(() => {
    load();
  }, [load]);

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  if (checking) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          Auditoría del Super Usuario
        </h1>
        <p className="text-muted-foreground text-sm">
          Registro completo de cambios, inicios de sesión y usuarios recurrentes. Visible solo para ti.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border/60">
        {[
          { key: "cambios", label: "Cambios", icon: History },
          { key: "logins", label: "Inicios de sesión", icon: ShieldCheck },
          { key: "recurrentes", label: "Usuarios recurrentes", icon: Users2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => changeTab(key as Tab)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px cursor-pointer ${
              tab === key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "cambios" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {ENTITY_FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={entityType === f.value ? "default" : "outline"}
                onClick={() => { setEntityType(f.value); setPage(1); }}
                className="cursor-pointer"
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Card className="border border-border/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                    ))
                  ) : cambios.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin registros</TableCell></TableRow>
                  ) : (
                    cambios.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm whitespace-nowrap">{new Date(row.created_at).toLocaleString("es-MX")}</TableCell>
                        <TableCell className="text-sm">{row.actor_nombre || "Sistema"}</TableCell>
                        <TableCell><Badge className={ACTION_COLORS[row.action] || ""}>{row.action}</Badge></TableCell>
                        <TableCell className="text-sm">{row.entity_type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{row.entity_id}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "logins" && (
        <Card className="border border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Navegador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : logins.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin registros</TableCell></TableRow>
                ) : (
                  logins.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm whitespace-nowrap">{new Date(row.created_at).toLocaleString("es-MX")}</TableCell>
                      <TableCell className="text-sm">{row.nombre_completo || "—"}</TableCell>
                      <TableCell className="text-sm">{row.role}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{row.user_agent}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "recurrentes" && (
        <Card className="border border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Total inicios de sesión</TableHead>
                  <TableHead>Último acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : recurrentes.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin registros</TableCell></TableRow>
                ) : (
                  recurrentes.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="text-sm">{row.nombre_completo || "—"}</TableCell>
                      <TableCell className="text-sm">{row.role}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{row.total}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{new Date(row.ultimo_login).toLocaleString("es-MX")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(tab === "cambios" || tab === "logins") && count > pageSize && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {Math.ceil(count / pageSize)}
          </span>
          <Button size="sm" variant="outline" disabled={page >= Math.ceil(count / pageSize)} onClick={() => setPage((p) => p + 1)} className="cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
