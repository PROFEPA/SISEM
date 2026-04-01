import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  fechaLimiteNotificacion,
  fechaLimiteCobro,
  diasHabilesRestantesNotificacion,
  diasRestantesCobro,
  formatDate,
} from "@/lib/business-days";

// Valid date range for PROFEPA multas (oct 2024 – present)
const MIN_DATE = "2024-10-01";
const MAX_DATE = new Date().toISOString().split("T")[0];

// Known valid materias — anything else is data entry error
const VALID_MATERIAS = new Set([
  "INDUSTRIA",
  "FORESTAL",
  "IMPACTO AMBIENTAL",
  "ZOFEMAT",
  "VIDA SILVESTRE",
  "RECURSOS MARINOS",
]);

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "No autorizado" },
        { status: 401 }
      );
    }

    // Supabase defaults to 1000 rows — fetch all in batches
    const PAGE_SIZE = 1000;
    type ExpRow = {
      id: string;
      orpa_id: string;
      numero_expediente: string;
      monto_multa: unknown;
      pagado: boolean;
      impugnado: boolean;
      tipo_impugnacion: string | null;
      fecha_resolucion: string | null;
      fecha_notificacion: string | null;
      fecha_pago: string | null;
      monto_pagado: unknown;
      fecha_impugnacion: string | null;
      materia: string | null;
      enviada_a_cobro: boolean;
      orpa: { nombre: string; clave: string } | null;
    };
    let allExpedientes: ExpRow[] = [];
    let page = 0;
    let expError: { message: string } | null = null;

    while (true) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: batch, error: batchError } = await supabase
        .from("expedientes")
        .select("id, numero_expediente, orpa_id, monto_multa, pagado, impugnado, tipo_impugnacion, fecha_resolucion, fecha_notificacion, fecha_pago, monto_pagado, fecha_impugnacion, materia, enviada_a_cobro, orpa:orpas(nombre, clave)")
        .range(from, to);

      if (batchError) {
        expError = batchError;
        break;
      }
      if (!batch || batch.length === 0) break;
      allExpedientes = allExpedientes.concat(batch as unknown as ExpRow[]);
      if (batch.length < PAGE_SIZE) break; // last page
      page++;
    }

    if (expError) {
      console.error("Dashboard expError:", expError);
      return NextResponse.json(
        { data: null, error: expError.message },
        { status: 500 }
      );
    }

    const totalExpedientes = allExpedientes?.length || 0;

    // Aggregation maps
    const orpaStats = new Map<string, { nombre: string; clave: string; total: number; monto: number; pagados: number; montoPagados: number; impugnados: number; montoImpugnados: number; enviadosCobro: number; montoEnviadosCobro: number; faltantesCobro: number; montoFaltantesCobro: number }>();
    const materiaDist = new Map<string, number>();
    const monthlyMap = new Map<string, { count: number; monto: number }>();
    // v3: monthly breakdown for trends
    const monthlyBreakdown = new Map<string, { impuestas: number; montoImpuesto: number; cobradas: number; montoCobrado: number; impugnadas: number }>();

    // Status distribution — CIFRAS-compatible exclusive categories
    // Priority: pagado > enviada_a_cobro > impugnado > faltante a cobro
    const statusDist = { pagados: 0, enviadosCobro: 0, impugnados: 0, faltantesCobro: 0 };
    let montoTotal = 0;
    let montoPagado = 0;

    if (allExpedientes) {
      for (const exp of allExpedientes) {
        const orpa = exp.orpa as unknown as { nombre: string; clave: string } | null;
        const key = exp.orpa_id;
        const monto = Number(exp.monto_multa) || 0;

        // ORPA aggregation
        if (!orpaStats.has(key)) {
          orpaStats.set(key, {
            nombre: orpa?.nombre || "Desconocida",
            clave: orpa?.clave || "?",
            total: 0, monto: 0, pagados: 0, montoPagados: 0, impugnados: 0, montoImpugnados: 0, enviadosCobro: 0, montoEnviadosCobro: 0, faltantesCobro: 0, montoFaltantesCobro: 0,
          });
        }
        const stats = orpaStats.get(key)!;
        stats.total += 1;
        stats.monto += monto;
        // CIFRAS exclusive classification: pagado > enviada_a_cobro > impugnado > faltante
        if (exp.pagado) {
          stats.pagados += 1; stats.montoPagados += monto;
        } else if (exp.enviada_a_cobro) {
          stats.enviadosCobro += 1; stats.montoEnviadosCobro += monto;
        } else if (exp.impugnado) {
          stats.impugnados += 1; stats.montoImpugnados += monto;
        } else {
          stats.faltantesCobro += 1; stats.montoFaltantesCobro += monto;
        }

        // Totals
        montoTotal += monto;
        if (exp.pagado) montoPagado += monto;

        // CIFRAS-compatible exclusive classification
        if (exp.pagado) {
          statusDist.pagados += 1;
        } else if (exp.enviada_a_cobro) {
          statusDist.enviadosCobro += 1;
        } else if (exp.impugnado) {
          statusDist.impugnados += 1;
        } else {
          statusDist.faltantesCobro += 1;
        }

        // Materia distribution — clean up bad values
        if (exp.materia) {
          const mat = exp.materia.trim().toUpperCase();
          const cleanMat = VALID_MATERIAS.has(mat) ? mat : null;
          if (cleanMat) {
            materiaDist.set(cleanMat, (materiaDist.get(cleanMat) || 0) + 1);
          }
        }

        // Monthly trend — only valid dates in range
        if (exp.fecha_resolucion) {
          const dateStr = exp.fecha_resolucion;
          if (dateStr >= MIN_DATE && dateStr <= MAX_DATE) {
            const month = dateStr.substring(0, 7);
            if (!monthlyMap.has(month)) {
              monthlyMap.set(month, { count: 0, monto: 0 });
            }
            const m = monthlyMap.get(month)!;
            m.count += 1;
            m.monto += monto;

            // v3: monthly breakdown — impuestas
            if (!monthlyBreakdown.has(month)) {
              monthlyBreakdown.set(month, { impuestas: 0, montoImpuesto: 0, cobradas: 0, montoCobrado: 0, impugnadas: 0 });
            }
            const mb = monthlyBreakdown.get(month)!;
            mb.impuestas += 1;
            mb.montoImpuesto += monto;
          }
        }

        // v3: monthly breakdown — cobradas (by fecha_pago month)
        if (exp.pagado && exp.fecha_pago) {
          const payMonth = exp.fecha_pago.substring(0, 7);
          if (payMonth >= MIN_DATE.substring(0, 7)) {
            if (!monthlyBreakdown.has(payMonth)) {
              monthlyBreakdown.set(payMonth, { impuestas: 0, montoImpuesto: 0, cobradas: 0, montoCobrado: 0, impugnadas: 0 });
            }
            const mb = monthlyBreakdown.get(payMonth)!;
            mb.cobradas += 1;
            mb.montoCobrado += Number(exp.monto_pagado) || monto;
          }
        }

        // v3: monthly breakdown — impugnadas (by fecha_impugnacion month or fecha_resolucion)
        if (exp.impugnado) {
          const impMonth = (exp.fecha_impugnacion || exp.fecha_resolucion || "").substring(0, 7);
          if (impMonth && impMonth >= MIN_DATE.substring(0, 7)) {
            if (!monthlyBreakdown.has(impMonth)) {
              monthlyBreakdown.set(impMonth, { impuestas: 0, montoImpuesto: 0, cobradas: 0, montoCobrado: 0, impugnadas: 0 });
            }
            monthlyBreakdown.get(impMonth)!.impugnadas += 1;
          }
        }
      }
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // v3: monthly breakdown sorted
    const trends = Array.from(monthlyBreakdown.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        ...d,
        tasaCobro: d.impuestas > 0 ? (d.cobradas / d.impuestas) * 100 : 0,
        tasaImpugnacion: d.impuestas > 0 ? (d.impugnadas / d.impuestas) * 100 : 0,
      }));

    const orpaArray = Array.from(orpaStats.values())
      .sort((a, b) => b.monto - a.monto);

    // v3: ORPA ranking by collection %
    const orpaRanking = Array.from(orpaStats.values())
      .filter((o) => o.total >= 3) // minimum 3 expedientes for ranking
      .map((o) => ({
        nombre: o.nombre,
        clave: o.clave,
        total: o.total,
        pagados: o.pagados,
        cobPct: o.total > 0 ? (o.pagados / o.total) * 100 : 0,
        faltantesCobro: o.faltantesCobro,
        faltPct: o.total > 0 ? (o.faltantesCobro / o.total) * 100 : 0,
      }))
      .sort((a, b) => b.cobPct - a.cobPct);

    const materiaArray = Array.from(materiaDist.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([materia, count]) => ({ materia, count }));

    // ── Pendientes: notificación, cobro, pago ──
    const hoy = formatDate(new Date());

    type PendienteRow = {
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
    };

    const pendientesNotificacion: PendienteRow[] = [];
    const pendientesCobro: PendienteRow[] = [];
    const pendientesPago: PendienteRow[] = [];

    if (allExpedientes) {
      for (const exp of allExpedientes) {
        const orpa = exp.orpa as unknown as { nombre: string; clave: string } | null;
        const monto = Number(exp.monto_multa) || 0;

        // Notificación pendiente: tiene fecha_resolucion pero NO fecha_notificacion
        if (exp.fecha_resolucion && !exp.fecha_notificacion) {
          const dias = diasHabilesRestantesNotificacion(exp.fecha_resolucion, hoy);
          const limite = fechaLimiteNotificacion(exp.fecha_resolucion);
          let semaforo: "verde" | "amarillo" | "rojo" = "verde";
          if (dias < 0) semaforo = "rojo";
          else if (dias <= 5) semaforo = "amarillo";
          pendientesNotificacion.push({
            expediente_id: exp.id,
            numero_expediente: exp.numero_expediente,
            orpa_nombre: orpa?.nombre || "Sin ORPA",
            orpa_id: exp.orpa_id,
            materia: exp.materia || "—",
            monto_multa: monto,
            fecha_referencia: exp.fecha_resolucion,
            fecha_limite: limite,
            dias_restantes: dias,
            vencido: dias < 0,
            semaforo,
          });
        }

        // Cobro pendiente: tiene fecha_notificacion, NO enviada a cobro, NO pagado
        if (exp.fecha_notificacion && !exp.enviada_a_cobro && !exp.pagado) {
          const dias = diasRestantesCobro(exp.fecha_notificacion, hoy);
          const limite = fechaLimiteCobro(exp.fecha_notificacion);
          let semaforo: "verde" | "amarillo" | "rojo" = "verde";
          if (dias < 0) semaforo = "rojo";
          else if (dias <= 30) semaforo = "amarillo";
          pendientesCobro.push({
            expediente_id: exp.id,
            numero_expediente: exp.numero_expediente,
            orpa_nombre: orpa?.nombre || "Sin ORPA",
            orpa_id: exp.orpa_id,
            materia: exp.materia || "—",
            monto_multa: monto,
            fecha_referencia: exp.fecha_notificacion,
            fecha_limite: limite,
            dias_restantes: dias,
            vencido: dias < 0,
            semaforo,
          });
        }

        // Pago pendiente: no pagado
        if (!exp.pagado) {
          pendientesPago.push({
            expediente_id: exp.id,
            numero_expediente: exp.numero_expediente,
            orpa_nombre: orpa?.nombre || "Sin ORPA",
            orpa_id: exp.orpa_id,
            materia: exp.materia || "—",
            monto_multa: monto,
            fecha_referencia: exp.fecha_resolucion || "",
            fecha_limite: "",
            dias_restantes: 0,
            vencido: false,
            semaforo: "verde",
          });
        }
      }
    }

    pendientesNotificacion.sort((a, b) => a.dias_restantes - b.dias_restantes);
    pendientesCobro.sort((a, b) => a.dias_restantes - b.dias_restantes);
    pendientesPago.sort((a, b) => b.monto_multa - a.monto_multa);

    return NextResponse.json({
      data: {
        totalExpedientes,
        montoTotal,
        montoPagado,
        porcentajeCobrado: montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0,
        statusDist,
        monthlyTrend,
        porOrpa: orpaArray,
        porMateria: materiaArray,
        trends,
        orpaRanking,
        pendientes: {
          notificacion: {
            items: pendientesNotificacion,
            total: pendientesNotificacion.length,
            vencidos: pendientesNotificacion.filter((p) => p.vencido).length,
            porVencerEstaSemana: pendientesNotificacion.filter((p) => !p.vencido && p.dias_restantes <= 5).length,
          },
          cobro: {
            items: pendientesCobro,
            total: pendientesCobro.length,
            vencidos: pendientesCobro.filter((p) => p.vencido).length,
            montoTotal: pendientesCobro.reduce((s, p) => s + p.monto_multa, 0),
          },
          pago: {
            items: pendientesPago,
            total: pendientesPago.length,
            montoTotal: pendientesPago.reduce((s, p) => s + p.monto_multa, 0),
          },
        },
      },
      error: null,
    });
  } catch (err) {
    console.error("Dashboard route error:", err);
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
