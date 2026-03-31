"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function NotificationBell({ orpaId }: { orpaId?: string }) {
  const [data, setData] = useState<AlertasData | null>(null);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlertas = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orpaId) params.set("orpa_id", orpaId);
      const res = await fetch(`/api/alertas?${params.toString()}`);
      const json = await res.json();
      if (json.data) setData(json.data);
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

  // Re-fetch on navigation
  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  const totalAlertas = data
    ? data.resumen.pendientes_notificacion + data.resumen.pendientes_cobro
    : 0;
  const totalVencidos = data
    ? data.resumen.vencidos_notificacion + data.resumen.vencidos_cobro
    : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Notificaciones"
        >
          <Bell className={`w-5 h-5 ${totalVencidos > 0 ? "text-amber-500" : "text-gray-500"}`} />
          {totalAlertas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {totalAlertas > 99 ? "99+" : totalAlertas}
            </span>
          )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="text-sm font-semibold">Alertas</h4>
          {totalAlertas === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Sin alertas pendientes</p>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {/* Notificación alerts */}
          {data && data.resumen.pendientes_notificacion > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-medium text-amber-700">
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
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
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
                <p className="text-xs font-medium text-blue-700">
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
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
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
        </div>

        {/* Footer */}
        {totalAlertas > 0 && (
          <div className="p-2 border-t">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block w-full text-center text-xs text-blue-600 hover:text-blue-700 py-1"
            >
              Ver todos en el dashboard
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
