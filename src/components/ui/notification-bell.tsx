"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, Volume2, VolumeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AlertasResumen {
  pendientes_notificacion: number;
  vencidos_notificacion: number;
  pendientes_cobro: number;
  vencidos_cobro: number;
}

interface AlertaItem {
  expediente_id: string;
  numero_expediente: string;
  orpa_nombre: string;
  dias_restantes: number;
  vencido: boolean;
}

interface AlertasData {
  notificacion: AlertaItem[];
  cobro: AlertaItem[];
  resumen: AlertasResumen;
}

interface RealtimeEvent {
  numero_expediente: string;
  id: string;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function requestBrowserNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string, url?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const n = new Notification(title, {
    body,
    icon: "/icon.png",
    tag: "sisem-notification",
  });

  if (url) {
    n.onclick = () => {
      window.focus();
      window.location.href = url;
      n.close();
    };
  }
}

export function NotificationBell({ orpaId }: { orpaId?: string }) {
  const [data, setData] = useState<AlertasData | null>(null);
  const [open, setOpen] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTotalRef = useRef<number>(0);

  // Check browser notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const fetchAlertas = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orpaId) params.set("orpa_id", orpaId);
      const res = await fetch(`/api/alertas?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        const newTotal =
          json.data.resumen.pendientes_notificacion + json.data.resumen.pendientes_cobro;

        // If alerts increased, show browser notification
        if (prevTotalRef.current > 0 && newTotal > prevTotalRef.current) {
          const diff = newTotal - prevTotalRef.current;
          showBrowserNotification(
            "SISEM — Nuevas alertas",
            `${diff} nueva${diff > 1 ? "s" : ""} alerta${diff > 1 ? "s" : ""} de vencimiento`,
            "/dashboard"
          );
        }
        prevTotalRef.current = newTotal;

        setData(json.data);
      }
    } catch {
      // Silently fail for notification polling
    }
  }, [orpaId]);

  useEffect(() => {
    fetchAlertas();
    intervalRef.current = setInterval(fetchAlertas, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAlertas]);

  // Supabase Realtime: listen for INSERT/UPDATE on expedientes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("expedientes-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "expedientes",
        },
        (payload) => {
          const exp = payload.new as { id: string; numero_expediente: string };
          setRealtimeEvents((prev) => [
            { id: exp.id, numero_expediente: exp.numero_expediente },
            ...prev.slice(0, 9),
          ]);
          toast.info(`Nuevo expediente: ${exp.numero_expediente}`);
          showBrowserNotification(
            "SISEM — Nuevo expediente",
            exp.numero_expediente,
            `/expedientes/${exp.id}`
          );
          // Refresh alerts
          fetchAlertas();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "expedientes",
        },
        (payload) => {
          const exp = payload.new as {
            id: string;
            numero_expediente: string;
            pagado?: boolean;
            impugnado?: boolean;
          };
          const old = payload.old as typeof exp;

          // Notify on important status changes
          if (exp.pagado && !old.pagado) {
            toast.success(`Pago registrado: ${exp.numero_expediente}`);
            showBrowserNotification(
              "SISEM — Pago registrado",
              exp.numero_expediente,
              `/expedientes/${exp.id}`
            );
          } else if (exp.impugnado && !old.impugnado) {
            toast.warning(`Impugnación registrada: ${exp.numero_expediente}`);
            showBrowserNotification(
              "SISEM — Impugnación",
              exp.numero_expediente,
              `/expedientes/${exp.id}`
            );
          }
          // Refresh alerts
          fetchAlertas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlertas]);

  const totalAlertas = data
    ? data.resumen.pendientes_notificacion + data.resumen.pendientes_cobro
    : 0;
  const totalVencidos = data
    ? data.resumen.vencidos_notificacion + data.resumen.vencidos_cobro
    : 0;
  const realtimeCount = realtimeEvents.length;

  function handleEnableNotifications() {
    requestBrowserNotificationPermission();
    // Re-check after a short delay (permission dialog is async)
    setTimeout(() => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationsEnabled(Notification.permission === "granted");
      }
    }, 1000);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Notificaciones"
        >
          <Bell className={`w-5 h-5 ${totalVencidos > 0 ? "text-amber-500" : "text-gray-500 dark:text-gray-400"}`} />
          {(totalAlertas + realtimeCount) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {(totalAlertas + realtimeCount) > 99 ? "99+" : totalAlertas + realtimeCount}
            </span>
          )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="text-sm font-semibold">Alertas</h4>
          <div className="flex items-center gap-1">
            {!notificationsEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={handleEnableNotifications}
              >
                <VolumeOff className="h-3 w-3" />
                Activar
              </Button>
            )}
            {notificationsEnabled && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <Volume2 className="h-3 w-3" />
                Activas
              </span>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {/* Realtime events */}
          {realtimeCount > 0 && (
            <div className="p-3 border-b bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {realtimeCount} cambio{realtimeCount !== 1 ? "s" : ""} reciente{realtimeCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-1">
                {realtimeEvents.slice(0, 5).map((evt) => (
                  <Link
                    key={evt.id}
                    href={`/expedientes/${evt.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  >
                    <p className="text-xs font-mono">{evt.numero_expediente}</p>
                    <Badge variant="secondary" className="text-[10px]">Nuevo</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notificación alerts */}
          {data && data.resumen.pendientes_notificacion > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {data.resumen.pendientes_notificacion} pendiente{data.resumen.pendientes_notificacion !== 1 ? "s" : ""} de notificación
                  {data.resumen.vencidos_notificacion > 0 && (
                    <span className="text-red-500 ml-1">
                      ({data.resumen.vencidos_notificacion} vencido{data.resumen.vencidos_notificacion !== 1 ? "s" : ""})
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                {data.notificacion.slice(0, 5).map((item) => (
                  <Link
                    key={item.expediente_id}
                    href={`/expedientes/${item.expediente_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-mono">{item.numero_expediente}</p>
                      <p className="text-[10px] text-muted-foreground">{item.orpa_nombre}</p>
                    </div>
                    <Badge
                      variant={item.vencido ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {item.vencido ? `${Math.abs(item.dias_restantes)}d vencido` : `${item.dias_restantes}d`}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cobro alerts */}
          {data && data.resumen.pendientes_cobro > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {data.resumen.pendientes_cobro} pendiente{data.resumen.pendientes_cobro !== 1 ? "s" : ""} de cobro
                  {data.resumen.vencidos_cobro > 0 && (
                    <span className="text-red-500 ml-1">
                      ({data.resumen.vencidos_cobro} vencido{data.resumen.vencidos_cobro !== 1 ? "s" : ""})
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                {data.cobro.slice(0, 5).map((item) => (
                  <Link
                    key={item.expediente_id}
                    href={`/expedientes/${item.expediente_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-mono">{item.numero_expediente}</p>
                      <p className="text-[10px] text-muted-foreground">{item.orpa_nombre}</p>
                    </div>
                    <Badge
                      variant={item.vencido ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {item.vencido ? `${Math.abs(item.dias_restantes)}d vencido` : `${item.dias_restantes}d`}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {totalAlertas === 0 && realtimeCount === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Sin alertas pendientes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(totalAlertas + realtimeCount) > 0 && (
          <div className="p-2 border-t flex gap-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex-1 text-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 py-1"
            >
              Ver todos en el dashboard
            </Link>
            {realtimeCount > 0 && (
              <button
                onClick={() => setRealtimeEvents([])}
                className="text-xs text-muted-foreground hover:text-foreground py-1"
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
