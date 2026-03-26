import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
      orpa_id: string;
      monto_multa: unknown;
      pagado: boolean;
      impugnado: boolean;
      tipo_impugnacion: string | null;
      fecha_resolucion: string | null;
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
        .select("orpa_id, monto_multa, pagado, impugnado, tipo_impugnacion, fecha_resolucion, materia, enviada_a_cobro, orpa:orpas(nombre, clave)")
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
    const orpaStats = new Map<string, { nombre: string; clave: string; total: number; monto: number; pagados: number; impugnados: number }>();
    const materiaDist = new Map<string, number>();
    const monthlyMap = new Map<string, { count: number; monto: number }>();

    // Status distribution — use *priority* classification (mutually exclusive)
    // Priority: pagado > impugnado > enviado a cobro > pendiente
    const statusDist = { pagados: 0, impugnados: 0, enviadosCobro: 0, pendientes: 0 };
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
            total: 0, monto: 0, pagados: 0, impugnados: 0,
          });
        }
        const stats = orpaStats.get(key)!;
        stats.total += 1;
        stats.monto += monto;
        if (exp.pagado) stats.pagados += 1;
        if (exp.impugnado) stats.impugnados += 1;

        // Totals
        montoTotal += monto;
        if (exp.pagado) montoPagado += monto;

        // Status classification — mutually exclusive by priority
        if (exp.pagado) {
          statusDist.pagados += 1;
        } else if (exp.impugnado) {
          statusDist.impugnados += 1;
        } else if (exp.enviada_a_cobro) {
          statusDist.enviadosCobro += 1;
        } else {
          statusDist.pendientes += 1;
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
          }
        }
      }
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const orpaArray = Array.from(orpaStats.values())
      .sort((a, b) => b.monto - a.monto);

    const materiaArray = Array.from(materiaDist.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([materia, count]) => ({ materia, count }));

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
