"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Scale,
  RefreshCw,
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
} from "recharts";

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
    impugnados: number;
    enviadosCobro: number;
    pendientes: number;
  };
  monthlyTrend: Array<{ month: string; count: number; monto: number }>;
  porOrpa: Array<{
    nombre: string;
    clave: string;
    total: number;
    monto: number;
    pagados: number;
    impugnados: number;
  }>;
  porMateria: Array<{ materia: string; count: number }>;
}

// ============================================================
// Constants
// ============================================================

const PIE_COLORS = ["#10B981", "#EF4444", "#F59E0B", "#6366F1"];
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
    <Card className="border border-gray-200/60">
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
      className={`group relative overflow-hidden border border-gray-200/60 shadow-sm
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out
        ${visible ? "animate-fadeInUp" : "opacity-0"}`}
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`}
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div
            className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center
              group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight tabular-nums">
          {displayValue}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
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
      className={`border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-900">
          {title}
        </CardTitle>
        <p className="text-xs text-gray-400">{subtitle}</p>
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      const res = await r.json();
      if (res.data) setData(res.data);
      else if (res.error) setError(res.error);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const pieData = data
    ? [
        { name: "Pagados", value: data.statusDist.pagados },
        { name: "Impugnados", value: data.statusDist.impugnados },
        { name: "Enviados a cobro", value: data.statusDist.enviadosCobro },
        { name: "Pendientes", value: data.statusDist.pendientes },
      ].filter((d) => d.value > 0)
    : [];

  const totalStatus = pieData.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Panorama general de expedientes de multas — PROFEPA
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </button>
      </div>

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
              subtitle="Activos en el sistema"
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
              subtitle="Acumulado desde oct 2024"
              icon={DollarSign}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              gradient="bg-gradient-to-br from-blue-50/50 to-transparent"
              delay={100}
            />
            <AnimatedKPI
              title="Porcentaje Cobrado"
              rawValue={Math.round(data.porcentajeCobrado * 10)}
              formattedValue={`${data.porcentajeCobrado.toFixed(1)}%`}
              subtitle={`${formatMoney(data.montoPagado)} recuperados`}
              icon={TrendingUp}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              gradient="bg-gradient-to-br from-violet-50/50 to-transparent"
              delay={200}
            />
            <AnimatedKPI
              title="Expedientes Impugnados"
              rawValue={data.statusDist.impugnados}
              formattedValue={data.statusDist.impugnados.toLocaleString(
                "es-MX"
              )}
              subtitle="Con recurso o amparo"
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
                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-900">
                        {orpa?.nombre || label}
                      </p>
                      <p className="text-xs text-gray-400 mb-2">{label}</p>
                      <p className="text-emerald-600 font-bold">
                        {formatMoney(Number(payload[0].value))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
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
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
                        <p className="font-semibold text-gray-900">{d.name}</p>
                        <p
                          className="text-lg font-bold"
                          style={{ color: String(d.payload?.fill) }}
                        >
                          {Number(d.value).toLocaleString("es-MX")}
                        </p>
                        <p className="text-xs text-gray-400">
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
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="font-semibold text-gray-900 tabular-nums w-14 text-right">
                          {entry.value.toLocaleString("es-MX")}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
          subtitle="Expedientes nuevos por mes (oct 2024 - presente)"
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
                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-900">
                        {formatMonthFull(String(label ?? ""))}
                      </p>
                      <p className="text-emerald-600 font-bold">
                        {Number(payload[0].value).toLocaleString("es-MX")}{" "}
                        expedientes
                      </p>
                      {payload[0].payload?.monto > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
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
                    <span className="text-sm font-medium text-gray-700">
                      {item.materia
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                      {item.count.toLocaleString("es-MX")}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
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

      {/* ORPA summary table */}
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Resumen por ORPA
              </CardTitle>
              <p className="text-xs text-gray-400">
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
                  <tr className="bg-gray-50/80">
                    <th className="py-3 px-6 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      #
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      ORPA
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Expedientes
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Monto Total
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Pagados
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Impugnados
                    </th>
                    <th className="py-3 px-6 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                      % Cobrado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.porOrpa.map((orpa, idx) => {
                    const cobPct =
                      orpa.total > 0 ? (orpa.pagados / orpa.total) * 100 : 0;
                    return (
                      <tr
                        key={orpa.clave}
                        className="hover:bg-emerald-50/30 transition-colors duration-150"
                      >
                        <td className="py-3 px-6 text-gray-400 tabular-nums text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {orpa.nombre}
                            </p>
                            <p className="text-xs text-gray-400">
                              {orpa.clave}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900 tabular-nums">
                          {orpa.total.toLocaleString("es-MX")}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900 tabular-nums">
                          {formatMoney(orpa.monto)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">
                            {orpa.pagados}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                              orpa.impugnados > 0
                                ? "bg-rose-50 text-rose-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {orpa.impugnados}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{
                                  width: `${Math.min(cobPct, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-500 tabular-nums w-10 text-right">
                              {cobPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {data && (
                  <tfoot>
                    <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                      <td className="py-3 px-6" />
                      <td className="py-3 px-4 font-bold text-gray-900">
                        TOTAL
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
                        {data.totalExpedientes.toLocaleString("es-MX")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
                        {formatMoney(data.montoTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                        {data.statusDist.pagados.toLocaleString("es-MX")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 tabular-nums">
                        {data.statusDist.impugnados.toLocaleString("es-MX")}
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-gray-900 tabular-nums">
                        {data.porcentajeCobrado.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
