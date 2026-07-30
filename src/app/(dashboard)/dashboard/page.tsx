"use client";

import { API_BASE } from "@/lib/api-base";
import { use, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Scale,
  RefreshCw,
  Bell,
  Eye,
  Search,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { SortableTableHead } from "@/components/sortable-table-head";
import { DateRangeFilter } from "@/components/date-range-filter";
import { DatePreservingLink } from "@/components/date-preserving-link";
import { formatDateRangeLabel } from "@/lib/date-range";
import { stableSort, type SortDirection } from "@/lib/table-sort";

// ============================================================
// Types
// ============================================================

interface DashboardData {
  totalExpedientes: number;
  montoTotal: number;
  montoPagado: number;
  porcentajeCobrado: number;
  statusDist: {
    pagados: number;
    enviadosCobro: number;
    impugnados: number;
    faltantesCobro: number;
  };
  monthlyTrend: Array<{ month: string; count: number; monto: number }>;
  porOrpa: Array<{
    nombre: string;
    clave: string;
    total: number;
    monto: number;
    pagados: number;
    montoPagados: number;
    impugnados: number;
    montoImpugnados: number;
    enviadosCobro: number;
    montoEnviadosCobro: number;
    faltantesCobro: number;
    montoFaltantesCobro: number;
  }>;
  porMateria: Array<{ materia: string; count: number }>;
  trends?: Array<{
    month: string;
    impuestas: number;
    montoImpuesto: number;
    cobradas: number;
    montoCobrado: number;
    impugnadas: number;
    tasaCobro: number;
    tasaImpugnacion: number;
  }>;
  orpaRanking?: Array<{
    nombre: string;
    clave: string;
    total: number;
    pagados: number;
    cobPct: number;
    faltantesCobro: number;
    faltPct: number;
  }>;
  pendientes?: {
    notificacion: {
      items: PendienteRow[];
      total: number;
      vencidos: number;
      porVencerEstaSemana: number;
    };
    cobro: {
      items: PendienteRow[];
      total: number;
      vencidos: number;
      montoTotal: number;
    };
    pago: {
      items: PendienteRow[];
      total: number;
      montoTotal: number;
    };
  };
  periodo?: {
    fecha_desde: string | null;
    fecha_hasta: string | null;
  };
}

interface PendienteRow {
  expediente_id: string;
  numero_expediente: string;
  orpa_nombre: string;
  orpa_id: string;
  materia: string;
  monto_multa: number;
  fecha_referencia: string;
  fecha_limite: string;
  dias_restantes: number;
  vencido: boolean;
  semaforo: "verde" | "amarillo" | "rojo";
}

type OrpaSortKey = "nombre" | "total" | "monto" | "pagados" | "impugnados" | "enviadosCobro" | "faltantesCobro" | "cobPct" | "faltPct";
type DashboardSearchParams = Promise<{
  fecha_desde?: string | string[];
  fecha_hasta?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

// ============================================================
// Constants
// ============================================================

const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6366F1"];
const MATERIA_COLORS: Record<string, string> = {
  INDUSTRIA: "#1B8A5A",
  FORESTAL: "#059669",
  "IMPACTO AMBIENTAL": "#0EA5E9",
  ZOFEMAT: "#8B5CF6",
  "VIDA SILVESTRE": "#F59E0B",
  "RECURSOS MARINOS": "#06B6D4",
};

const MONTH_SHORT = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
];
const MONTH_FULL = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// ============================================================
// Helpers
// ============================================================

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return formatMoney(amount);
}

function formatMonth(v: string): string {
  const [y, m] = v.split("-");
  return `${MONTH_SHORT[parseInt(m) - 1]} ${y.slice(2)}`;
}

function formatMonthFull(v: string): string {
  const [y, m] = String(v).split("-");
  return `${MONTH_FULL[parseInt(m) - 1]} ${y}`;
}

// ============================================================
// Animated counter hook
// ============================================================

function useAnimatedNumber(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ============================================================
// Sub-components
// ============================================================

function KPISkeleton() {
  return (
    <Card className="border border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-36 mb-2" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function AnimatedKPI({
  title,
  rawValue,
  formattedValue,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  gradient,
  delay,
}: {
  title: string;
  rawValue: number;
  formattedValue: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  gradient: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const animatedNum = useAnimatedNumber(visible ? rawValue : 0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const displayValue =
    animatedNum === rawValue
      ? formattedValue
      : animatedNum.toLocaleString("es-MX");

  return (
    <Card
      className={`group relative overflow-hidden border border-border/60 shadow-sm
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out
        ${visible ? "animate-fadeInUp" : "opacity-0"}`}
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`}
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div
            className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center
              group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight tabular-nums">
          {displayValue}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  loading,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  loading: boolean;
}) {
  return (
    <Card
      className={`border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[320px] w-full rounded-lg" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main component
// ============================================================

export default function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const resolvedSearchParams = use(searchParams);
  const urlFechaDesde = firstParam(resolvedSearchParams.fecha_desde);
  const urlFechaHasta = firstParam(resolvedSearchParams.fecha_hasta);
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<OrpaSortKey>("monto");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [pendLimit, setPendLimit] = useState({ notificacion: 30, cobro: 30, pago: 30 });
  const [fechaDesde, setFechaDesde] = useState(urlFechaDesde);
  const [fechaHasta, setFechaHasta] = useState(urlFechaHasta);

  // Pendientes: search, filter, sort state
  const [pendSearch, setPendSearch] = useState("");
  const [pendOrpaFilter, setPendOrpaFilter] = useState("");
  const [pendSemaforoFilter, setPendSemaforoFilter] = useState<"" | "rojo" | "amarillo" | "verde">("");
  const [pendSortField, setPendSortField] = useState<string>("dias_restantes");
  const [pendSortDir, setPendSortDir] = useState<SortDirection>("asc");

  const togglePendSort = useCallback((field: string, defaultDirection: SortDirection = "asc") => {
    setPendSortField(prev => {
      if (prev === field) {
        setPendSortDir(d => d === "asc" ? "desc" : "asc");
        return field;
      }
      setPendSortDir(defaultDirection);
      return field;
    });
  }, []);

  const filterAndSortItems = useCallback((items: PendienteRow[]) => {
    let result = items;

    // Text search
    if (pendSearch) {
      const q = pendSearch.toLowerCase();
      result = result.filter(r =>
        r.numero_expediente.toLowerCase().includes(q) ||
        r.orpa_nombre.toLowerCase().includes(q) ||
        r.materia.toLowerCase().includes(q)
      );
    }

    // ORPA filter
    if (pendOrpaFilter) {
      result = result.filter(r => r.orpa_nombre === pendOrpaFilter);
    }

    // Semáforo filter
    if (pendSemaforoFilter) {
      result = result.filter(r => r.semaforo === pendSemaforoFilter);
    }

    // Sort
    const semaforoPriority = { rojo: 3, amarillo: 2, verde: 1 } as const;
    result = stableSort(result, (row) => {
      if (pendSortField === "semaforo") return semaforoPriority[row.semaforo];
      return row[pendSortField as keyof PendienteRow];
    }, pendSortDir);

    return result;
  }, [pendSearch, pendOrpaFilter, pendSemaforoFilter, pendSortField, pendSortDir]);

  // Get unique ORPA list from pendientes
  const pendOrpas = useMemo(() => {
    if (!data?.pendientes) return [];
    const names = new Set<string>();
    const allItems = [
      ...data.pendientes.notificacion.items,
      ...data.pendientes.cobro.items,
      ...data.pendientes.pago.items,
    ];
    for (const item of allItems) names.add(item.orpa_nombre);
    return Array.from(names).sort();
  }, [data?.pendientes]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.set("fecha_desde", fechaDesde);
      if (fechaHasta) params.set("fecha_hasta", fechaHasta);
      const query = params.toString();
      const r = await fetch(`${API_BASE}/api/dashboard${query ? `?${query}` : ""}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      const res = await r.json();
      if (res.data) {
        setData(res.data);
        setError(null);
      }
      else if (res.error) setError(res.error);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    setFechaDesde(urlFechaDesde);
    setFechaHasta(urlFechaHasta);
    setPendLimit({ notificacion: 30, cobro: 30, pago: 30 });
  }, [urlFechaDesde, urlFechaHasta]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  function updateDateRangeUrl(from: string, to: string) {
    const params = new URLSearchParams(window.location.search);
    if (from) params.set("fecha_desde", from);
    else params.delete("fecha_desde");
    if (to) params.set("fecha_hasta", to);
    else params.delete("fecha_hasta");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function applyDateRange(from: string, to: string) {
    setFechaDesde(from);
    setFechaHasta(to);
    updateDateRangeUrl(from, to);
  }

  function clearDateRange() {
    setFechaDesde("");
    setFechaHasta("");
    updateDateRangeUrl("", "");
  }

  const pieData = data
    ? [
        { name: "Pagadas", value: data.statusDist.pagados },
        { name: "Enviadas a cobro", value: data.statusDist.enviadosCobro },
        { name: "Impugnadas/Recurso", value: data.statusDist.impugnados },
        { name: "Pendientes de enviar a cobro", value: data.statusDist.faltantesCobro },
      ].filter((d) => d.value > 0)
    : [];

  const totalStatus = pieData.reduce((acc, d) => acc + d.value, 0);

  function toggleSort(key: string, defaultDirection: SortDirection = "asc") {
    const nextKey = key as OrpaSortKey;
    if (sortKey === nextKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(nextKey);
      setSortDir(defaultDirection);
    }
  }

  const sortedOrpas = data?.porOrpa ? stableSort(data.porOrpa, (orpa) => {
    let value: number | string;
    if (sortKey === "cobPct") {
      value = orpa.total > 0 ? orpa.pagados / orpa.total : 0;
    } else if (sortKey === "faltPct") {
      value = orpa.total > 0 ? orpa.faltantesCobro / orpa.total : 0;
    } else if (sortKey === "nombre") {
      value = orpa.nombre;
    } else {
      value = orpa[sortKey];
    }
    return value;
  }, sortDir) : [];

  const periodLabel = formatDateRangeLabel({
    from: fechaDesde || null,
    to: fechaHasta || null,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Panorama general de expedientes de multas — {periodLabel}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </button>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <DateRangeFilter
            from={fechaDesde}
            to={fechaHasta}
            onApply={applyDateRange}
            onClear={clearDateRange}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Todos los indicadores y resultados siguientes corresponden a: {periodLabel}.
          </p>
        </CardContent>
      </Card>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 animate-fadeInUp">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Error al cargar datos: {error}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
        ) : data ? (
          <>
            <AnimatedKPI
              title="Total Expedientes"
              rawValue={data.totalExpedientes}
              formattedValue={data.totalExpedientes.toLocaleString("es-MX")}
              subtitle={periodLabel}
              icon={FileText}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              gradient="bg-gradient-to-br from-emerald-50/50 to-transparent"
              delay={0}
            />
            <AnimatedKPI
              title="Monto Total en Multas"
              rawValue={Math.round(data.montoTotal)}
              formattedValue={formatMoney(data.montoTotal)}
              subtitle={periodLabel}
              icon={DollarSign}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              gradient="bg-gradient-to-br from-blue-50/50 to-transparent"
              delay={100}
            />
            <AnimatedKPI
              title="Monto total pagado"
              rawValue={Math.round(data.montoPagado)}
              formattedValue={formatMoney(data.montoPagado)}
              subtitle={`Porcentaje pagado: ${data.porcentajeCobrado.toFixed(1)}% del monto total`}
              icon={TrendingUp}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              gradient="bg-gradient-to-br from-violet-50/50 to-transparent"
              delay={200}
            />
            <AnimatedKPI
              title="Expedientes Impugnados o con Recurso"
              rawValue={data.statusDist.impugnados}
              formattedValue={data.statusDist.impugnados.toLocaleString(
                "es-MX"
              )}
              subtitle="Conmutación, Amparo, Nulidad, Reconsideración, Revisión, Revocación o modificación"
              icon={Scale}
              iconBg="bg-rose-50"
              iconColor="text-rose-500"
              gradient="bg-gradient-to-br from-rose-50/50 to-transparent"
              delay={300}
            />
          </>
        ) : null}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart: monto por ORPA */}
        <ChartCard
          title="Monto de multas por ORPA"
          subtitle="Top 15 delegaciones por monto acumulado"
          className="lg:col-span-2"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={data?.porOrpa.slice(0, 15) || []}
              margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
            >
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                vertical={false}
              />
              <XAxis
                dataKey="clave"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatMoneyShort(v)}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const orpa = data?.porOrpa.find((o) => o.clave === label);
                  return (
                    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">
                        {orpa?.nombre || label}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">{label}</p>
                      <p className="text-emerald-600 font-bold">
                        {formatMoney(Number(payload[0].value))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {orpa?.total} expedientes
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="monto"
                fill="url(#barGrad)"
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationBegin={200}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Donut chart: distribucion por estatus */}
        <ChartCard
          title="Distribucion por estatus"
          subtitle={`${totalStatus.toLocaleString("es-MX")} expedientes clasificados`}
          loading={loading}
        >
          <div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
                  animationBegin={300}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const pct =
                      totalStatus > 0
                        ? ((Number(d.value) / totalStatus) * 100).toFixed(1)
                        : "0";
                    return (
                      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p
                          className="text-lg font-bold"
                          style={{ color: String(d.payload?.fill) }}
                        >
                          {Number(d.value).toLocaleString("es-MX")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pct}% del total
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend with progress bars */}
            <div className="space-y-3 mt-2">
              {pieData.map((entry, index) => {
                const pct =
                  totalStatus > 0 ? (entry.value / totalStatus) * 100 : 0;
                return (
                  <div key={entry.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              PIE_COLORS[index % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="font-semibold text-foreground tabular-nums w-14 text-right">
                          {entry.value.toLocaleString("es-MX")}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area chart: tendencia mensual */}
        <ChartCard
          title="Tendencia mensual"
          subtitle={`Expedientes nuevos por mes — ${periodLabel}`}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.monthlyTrend || []}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMonth}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">
                        {formatMonthFull(String(label ?? ""))}
                      </p>
                      <p className="text-emerald-600 font-bold">
                        {Number(payload[0].value).toLocaleString("es-MX")}{" "}
                        expedientes
                      </p>
                      {payload[0].payload?.monto > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatMoney(payload[0].payload.monto)} en multas
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Expedientes"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#areaGrad)"
                dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: "#10B981",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                animationDuration={1000}
                animationBegin={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Materia distribution - horizontal bars */}
        <ChartCard
          title="Distribucion por materia"
          subtitle="Expedientes agrupados por tipo de inspeccion"
          loading={loading}
        >
          <div className="space-y-4 py-2">
            {(data?.porMateria || []).map((item, i) => {
              const max = data?.porMateria[0]?.count || 1;
              const pct = (item.count / max) * 100;
              const color = MATERIA_COLORS[item.materia] || "#6B7280";
              return (
                <div key={item.materia} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-muted-foreground">
                      {item.materia
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {item.count.toLocaleString("es-MX")}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        transitionDelay: `${i * 100}ms`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Charts row 3: Trends + ORPA Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Line chart: impuestas vs cobradas mensualmente */}
        <ChartCard
          title="Multas impuestas vs pagadas"
          subtitle="Comparativa mensual de resoluciones y pagos"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMonth}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground mb-2">{formatMonthFull(String(label ?? ""))}</p>
                      {payload.map((entry) => (
                        <p key={String(entry.name)} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: String(entry.color) }} />
                          <span className="text-muted-foreground">{String(entry.name)}:</span>
                          <span className="font-semibold">{Number(entry.value).toLocaleString("es-MX")}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="impuestas"
                name="Impuestas"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="cobradas"
                name="Pagadas"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="impugnadas"
                name="Impugnadas"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ORPA Ranking: % cobrado */}
        <ChartCard
          title="Ranking de cumplimiento por ORPA"
          subtitle="% de expedientes pagados (mín. 3 expedientes)"
          loading={loading}
        >
          <div className="space-y-2.5 py-1 max-h-[300px] overflow-y-auto">
            {(data?.orpaRanking || []).map((orpa, i) => {
              const isTop = i < 3;
              const isBottom = i >= (data?.orpaRanking?.length || 0) - 3;
              return (
                <div key={orpa.clave} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center ${isTop ? "text-emerald-600" : isBottom ? "text-red-500" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate max-w-[180px]" title={orpa.nombre}>
                        {orpa.nombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{orpa.pagados}/{orpa.total}</span>
                      <span className={`text-sm font-bold tabular-nums ${
                        orpa.cobPct >= 50 ? "text-emerald-600" :
                        orpa.cobPct >= 20 ? "text-amber-600" : "text-red-500"
                      }`}>
                        {orpa.cobPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden ml-7">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        orpa.cobPct >= 50 ? "bg-emerald-500" :
                        orpa.cobPct >= 20 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min(orpa.cobPct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!data?.orpaRanking || data.orpaRanking.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos suficientes para ranking</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ORPA summary table */}
      <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Resumen por ORPA
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Desglose completo por delegacion —{" "}
                {data?.porOrpa.length || 0} ORPAs
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-3 px-6 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      #
                    </th>
                    <SortableTableHead field="nombre" label="ORPA" current={sortKey} direction={sortDir} onSort={toggleSort} className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="total" label="Expedientes" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="monto" label="Monto Total" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="pagados" label="Pagadas" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="impugnados" label="Impugnadas/Recurso" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="enviadosCobro" label="Enviadas a cobro" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="faltantesCobro" label="Faltantes" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-4 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="cobPct" label="% Pagado" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-6 py-3 text-xs uppercase tracking-wider" />
                    <SortableTableHead field="faltPct" label="% Faltantes" current={sortKey} direction={sortDir} onSort={toggleSort} defaultDirection="desc" align="right" className="px-6 py-3 text-xs uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedOrpas.map((orpa, idx) => {
                    const cobPct =
                      orpa.total > 0 ? (orpa.pagados / orpa.total) * 100 : 0;
                    const pendPct =
                      orpa.total > 0 ? (orpa.faltantesCobro / orpa.total) * 100 : 0;
                    return (
                      <tr
                        key={orpa.clave}
                        className="hover:bg-muted/30 transition-colors duration-150"
                      >
                        <td className="py-3 px-6 text-muted-foreground tabular-nums text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {orpa.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {orpa.clave}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                          {orpa.total.toLocaleString("es-MX")}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                          {formatMoney(orpa.monto)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">
                              {orpa.pagados}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(orpa.montoPagados)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                                orpa.impugnados > 0
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {orpa.impugnados}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(orpa.montoImpugnados)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                                orpa.enviadosCobro > 0
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {orpa.enviadosCobro}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(orpa.montoEnviadosCobro)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                                orpa.faltantesCobro > 0
                                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {orpa.faltantesCobro}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(orpa.montoFaltantesCobro)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{
                                  width: `${Math.min(cobPct, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums w-10 text-right">
                              {cobPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{
                                  width: `${Math.min(pendPct, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums w-10 text-right">
                              {pendPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {data && (
                  <tfoot>
                    <tr className="bg-muted/50 border-t-2 border-border">
                      <td className="py-3 px-6" />
                      <td className="py-3 px-4 font-bold text-foreground">
                        TOTAL
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                        {data.totalExpedientes.toLocaleString("es-MX")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                        {formatMoney(data.montoTotal)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{data.statusDist.pagados.toLocaleString("es-MX")}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(data.montoPagado)}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{data.statusDist.impugnados.toLocaleString("es-MX")}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(sortedOrpas.reduce((s, o) => s + o.montoImpugnados, 0))}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{data.statusDist.enviadosCobro.toLocaleString("es-MX")}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(sortedOrpas.reduce((s, o) => s + o.montoEnviadosCobro, 0))}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{data.statusDist.faltantesCobro.toLocaleString("es-MX")}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(sortedOrpas.reduce((s, o) => s + o.montoFaltantesCobro, 0))}</p>
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-foreground tabular-nums">
                        {data.porcentajeCobrado.toFixed(1)}%
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-foreground tabular-nums">
                        {data.totalExpedientes > 0
                          ? ((data.statusDist.faltantesCobro / data.totalExpedientes) * 100).toFixed(1)
                          : "0.0"}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stacked bar chart: status por ORPA */}
      <ChartCard
        title="Expedientes por estatus y ORPA"
        subtitle="Pagadas, enviadas a cobro, impugnadas/recurso y pendientes de enviar a cobro — barras apiladas"
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={Math.max(450, (data?.porOrpa.length || 0) * 36)}>
          <BarChart
            data={data?.porOrpa.map((o) => ({
              nombre: o.clave,
              nombreFull: o.nombre,
              Pagadas: o.pagados,
              "Enviadas a cobro": o.enviadosCobro,
              "Impugnadas/Recurso": o.impugnados,
              "Pendientes de enviar a cobro": o.faltantesCobro,
              total: o.total,
            })) || []}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              width={55}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload;
                return (
                  <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[180px]">
                    <p className="font-semibold text-foreground">{item?.nombreFull || label}</p>
                    <p className="text-xs text-muted-foreground mb-2">{label} — {item?.total} expedientes</p>
                    <div className="space-y-1">
                      {payload.map((entry) => (
                        <div key={String(entry.name)} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: String(entry.color) }} />
                            <span className="text-muted-foreground">{String(entry.name)}</span>
                          </div>
                          <span className="font-semibold tabular-nums">{Number(entry.value).toLocaleString("es-MX")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="Pagadas" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Enviadas a cobro" stackId="a" fill="#F59E0B" />
            <Bar dataKey="Impugnadas/Recurso" stackId="a" fill="#EF4444" />
            <Bar dataKey="Pendientes de enviar a cobro" stackId="a" fill="#6366F1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border">
          {[
            { label: "Pagadas", color: "#10B981" },
            { label: "Enviadas a cobro", color: "#F59E0B" },
            { label: "Impugnadas/Recurso", color: "#EF4444" },
            { label: "Pendientes de enviar a cobro", color: "#6366F1" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* ── SEGUIMIENTO DE PENDIENTES ── */}
      {!loading && data?.pendientes && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-semibold text-foreground">
                Seguimiento de Pendientes
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Expedientes pendientes de notificación, cobro y pago
            </p>

            {/* Search and filter controls */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar expediente, ORPA, materia..."
                  value={pendSearch}
                  onChange={(e) => setPendSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <select
                value={pendOrpaFilter}
                onChange={(e) => setPendOrpaFilter(e.target.value)}
                className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Todas las ORPAs</option>
                {pendOrpas.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select
                value={pendSemaforoFilter}
                onChange={(e) => setPendSemaforoFilter(e.target.value as typeof pendSemaforoFilter)}
                className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Todos los estados</option>
                <option value="rojo">🔴 Vencido</option>
                <option value="amarillo">🟡 Por vencer</option>
                <option value="verde">🟢 En tiempo</option>
              </select>
              {(pendSearch || pendOrpaFilter || pendSemaforoFilter) && (
                <button
                  onClick={() => { setPendSearch(""); setPendOrpaFilter(""); setPendSemaforoFilter(""); }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="notificacion" className="w-full" onValueChange={() => {
              setPendSortField("dias_restantes");
              setPendSortDir("asc");
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notificacion" className="text-xs">
                  Notificación
                  {data.pendientes.notificacion.vencidos > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                      {data.pendientes.notificacion.vencidos}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cobro" className="text-xs">
                  Cobro
                  {data.pendientes.cobro.vencidos > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                      {data.pendientes.cobro.vencidos}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pago" className="text-xs">
                  Pago
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {data.pendientes.pago.total}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Tab: Notificación Pendiente */}
              <TabsContent value="notificacion" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pendientes</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.pendientes.notificacion.total}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Vencidos (&gt;15 días hábiles)</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{data.pendientes.notificacion.vencidos}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Por vencer esta semana</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{data.pendientes.notificacion.porVencerEstaSemana}</p>
                  </div>
                </div>
                {(() => {
                  const filtered = filterAndSortItems(data.pendientes.notificacion.items);
                  return (
                    <>
                      {(pendSearch || pendOrpaFilter || pendSemaforoFilter) && (
                        <p className="text-xs text-muted-foreground">{filtered.length} de {data.pendientes.notificacion.items.length} expedientes</p>
                      )}
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableTableHead field="numero_expediente" label="Expediente" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="orpa_nombre" label="ORPA" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="materia" label="Materia" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="monto_multa" label="Monto" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} defaultDirection="desc" align="right" />
                              <SortableTableHead field="fecha_referencia" label="F. Resolución" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="fecha_limite" label="F. Límite" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="dias_restantes" label="Días rest." current={pendSortField} direction={pendSortDir} onSort={togglePendSort} align="right" />
                              <SortableTableHead field="semaforo" label="Estado" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} defaultDirection="desc" align="center" className="w-20" />
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.slice(0, pendLimit.notificacion).map((item) => (
                              <TableRow key={item.expediente_id} className={item.vencido ? "bg-red-500/5" : ""}>
                                <TableCell className="font-mono text-xs">{item.numero_expediente}</TableCell>
                                <TableCell className="text-xs">{item.orpa_nombre}</TableCell>
                                <TableCell className="text-xs">{item.materia}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{formatMoney(item.monto_multa)}</TableCell>
                                <TableCell className="text-xs">{item.fecha_referencia}</TableCell>
                                <TableCell className="text-xs">{item.fecha_limite}</TableCell>
                                <TableCell className="text-right text-xs font-medium">
                                  <span className={item.dias_restantes < 0 ? "text-red-600 dark:text-red-400" : item.dias_restantes <= 5 ? "text-amber-600 dark:text-amber-400" : ""}>
                                    {item.dias_restantes}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className={`w-3 h-3 rounded-full ${
                                    item.semaforo === "rojo" ? "bg-red-500" :
                                    item.semaforo === "amarillo" ? "bg-amber-400" : "bg-emerald-500"
                                  }`} />
                                </TableCell>
                                <TableCell>
                                  <DatePreservingLink href={`/expedientes/${item.expediente_id}`}>
                                    <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </DatePreservingLink>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filtered.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                                  {pendSearch || pendOrpaFilter || pendSemaforoFilter
                                    ? "No hay resultados con los filtros aplicados"
                                    : "No hay expedientes pendientes de notificación"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {filtered.length > pendLimit.notificacion && (
                          <button
                            onClick={() => setPendLimit(p => ({ ...p, notificacion: p.notificacion + 50 }))}
                            className="w-full mt-2 py-2 text-xs text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Cargar más ({filtered.length - pendLimit.notificacion} restantes)
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              {/* Tab: Cobro Pendiente */}
              <TabsContent value="cobro" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pendientes</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.pendientes.cobro.total}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Vencidos (&gt;2 meses)</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{data.pendientes.cobro.vencidos}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Monto total pendiente</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(data.pendientes.cobro.montoTotal)}</p>
                  </div>
                </div>
                {(() => {
                  const filtered = filterAndSortItems(data.pendientes.cobro.items);
                  const montoFiltered = filtered.reduce((s, r) => s + r.monto_multa, 0);
                  return (
                    <>
                      {(pendSearch || pendOrpaFilter || pendSemaforoFilter) && (
                        <p className="text-xs text-muted-foreground">{filtered.length} de {data.pendientes.cobro.items.length} expedientes · {formatMoney(montoFiltered)}</p>
                      )}
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableTableHead field="numero_expediente" label="Expediente" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="orpa_nombre" label="ORPA" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="materia" label="Materia" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="fecha_referencia" label="F. Notificación" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="fecha_limite" label="F. Límite" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="monto_multa" label="Monto" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} defaultDirection="desc" align="right" />
                              <SortableTableHead field="dias_restantes" label="Días rest." current={pendSortField} direction={pendSortDir} onSort={togglePendSort} align="right" />
                              <SortableTableHead field="semaforo" label="Estado" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} defaultDirection="desc" align="center" className="w-20" />
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.slice(0, pendLimit.cobro).map((item) => (
                              <TableRow key={item.expediente_id} className={item.vencido ? "bg-red-500/5" : ""}>
                                <TableCell className="font-mono text-xs">{item.numero_expediente}</TableCell>
                                <TableCell className="text-xs">{item.orpa_nombre}</TableCell>
                                <TableCell className="text-xs">{item.materia}</TableCell>
                                <TableCell className="text-xs">{item.fecha_referencia}</TableCell>
                                <TableCell className="text-xs">{item.fecha_limite}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{formatMoney(item.monto_multa)}</TableCell>
                                <TableCell className="text-right text-xs font-medium">
                                  <span className={item.dias_restantes < 0 ? "text-red-600 dark:text-red-400" : item.dias_restantes <= 30 ? "text-amber-600 dark:text-amber-400" : ""}>
                                    {item.dias_restantes}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className={`w-3 h-3 rounded-full ${
                                    item.semaforo === "rojo" ? "bg-red-500" :
                                    item.semaforo === "amarillo" ? "bg-amber-400" : "bg-emerald-500"
                                  }`} />
                                </TableCell>
                                <TableCell>
                                  <DatePreservingLink href={`/expedientes/${item.expediente_id}`}>
                                    <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </DatePreservingLink>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filtered.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                                  {pendSearch || pendOrpaFilter || pendSemaforoFilter
                                    ? "No hay resultados con los filtros aplicados"
                                    : "No hay expedientes pendientes de cobro"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {filtered.length > pendLimit.cobro && (
                          <button
                            onClick={() => setPendLimit(p => ({ ...p, cobro: p.cobro + 50 }))}
                            className="w-full mt-2 py-2 text-xs text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Cargar más ({filtered.length - pendLimit.cobro} restantes)
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              {/* Tab: Pago Pendiente */}
              <TabsContent value="pago" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Sin pagar</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.pendientes.pago.total}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Monto total adeudado</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(data.pendientes.pago.montoTotal)}</p>
                  </div>
                </div>
                {(() => {
                  const filtered = filterAndSortItems(data.pendientes.pago.items);
                  const montoFiltered = filtered.reduce((s, r) => s + r.monto_multa, 0);
                  return (
                    <>
                      {(pendSearch || pendOrpaFilter || pendSemaforoFilter) && (
                        <p className="text-xs text-muted-foreground">{filtered.length} de {data.pendientes.pago.items.length} expedientes · {formatMoney(montoFiltered)}</p>
                      )}
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableTableHead field="numero_expediente" label="Expediente" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="orpa_nombre" label="ORPA" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="materia" label="Materia" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="fecha_referencia" label="F. Resolución" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} />
                              <SortableTableHead field="monto_multa" label="Monto" current={pendSortField} direction={pendSortDir} onSort={togglePendSort} defaultDirection="desc" align="right" />
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.slice(0, pendLimit.pago).map((item) => (
                              <TableRow key={item.expediente_id}>
                                <TableCell className="font-mono text-xs">{item.numero_expediente}</TableCell>
                                <TableCell className="text-xs">{item.orpa_nombre}</TableCell>
                                <TableCell className="text-xs">{item.materia}</TableCell>
                                <TableCell className="text-xs">{item.fecha_referencia || "—"}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{formatMoney(item.monto_multa)}</TableCell>
                                <TableCell>
                                  <DatePreservingLink href={`/expedientes/${item.expediente_id}`}>
                                    <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                                  </DatePreservingLink>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filtered.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                                  {pendSearch || pendOrpaFilter || pendSemaforoFilter
                                    ? "No hay resultados con los filtros aplicados"
                                    : "No hay expedientes pendientes de pago"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {filtered.length > pendLimit.pago && (
                          <button
                            onClick={() => setPendLimit(p => ({ ...p, pago: p.pago + 50 }))}
                            className="w-full mt-2 py-2 text-xs text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Cargar más ({filtered.length - pendLimit.pago} restantes)
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
