import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  fechaLimiteNotificacion,
  fechaLimiteCobro,
  diasHabilesRestantesNotificacion,
  diasRestantesCobro,
  formatDate,
} from "@/lib/business-days";

interface AlertaNotificacion {
  expediente_id: string;
  numero_expediente: string;
  orpa_nombre: string;
  orpa_id: string;
  fecha_resolucion: string;
  fecha_limite: string;
  dias_restantes: number;
  vencido: boolean;
  monto_multa: number;
}

interface AlertaCobro {
  expediente_id: string;
  numero_expediente: string;
  orpa_nombre: string;
  orpa_id: string;
  fecha_notificacion: string;
  fecha_limite: string;
  dias_restantes: number;
  vencido: boolean;
  monto_multa: number;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { data: null, error: "No autorizado" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const orpaId = searchParams.get("orpa_id");
  const hoy = formatDate(new Date());

  // ── Alertas de notificación ──
  // Expedientes con fecha_resolucion pero SIN fecha_notificacion
  let notifQuery = supabase
    .from("expedientes")
    .select("id, numero_expediente, orpa_id, fecha_resolucion, monto_multa, orpa:orpas(nombre)")
    .not("fecha_resolucion", "is", null)
    .is("fecha_notificacion", null);

  if (orpaId) notifQuery = notifQuery.eq("orpa_id", orpaId);

  const { data: notifRows, error: notifError } = await notifQuery;

  if (notifError) {
    return NextResponse.json(
      { data: null, error: notifError.message },
      { status: 500 }
    );
  }

  const alertasNotificacion: AlertaNotificacion[] = (notifRows || []).map((row) => {
    const diasRestantes = diasHabilesRestantesNotificacion(row.fecha_resolucion!, hoy);
    const fechaLimite = fechaLimiteNotificacion(row.fecha_resolucion!);
    const orpa = row.orpa as unknown as { nombre: string } | null;
    return {
      expediente_id: row.id,
      numero_expediente: row.numero_expediente,
      orpa_nombre: orpa?.nombre || "Sin ORPA",
      orpa_id: row.orpa_id,
      fecha_resolucion: row.fecha_resolucion!,
      fecha_limite: fechaLimite,
      dias_restantes: diasRestantes,
      vencido: diasRestantes < 0,
      monto_multa: row.monto_multa || 0,
    };
  });

  // ── Alertas de cobro ──
  // Expedientes con fecha_notificacion, NO enviada_a_cobro, NO pagado
  let cobroQuery = supabase
    .from("expedientes")
    .select("id, numero_expediente, orpa_id, fecha_notificacion, monto_multa, orpa:orpas(nombre)")
    .not("fecha_notificacion", "is", null)
    .eq("enviada_a_cobro", false)
    .eq("pagado", false);

  if (orpaId) cobroQuery = cobroQuery.eq("orpa_id", orpaId);

  const { data: cobroRows, error: cobroError } = await cobroQuery;

  if (cobroError) {
    return NextResponse.json(
      { data: null, error: cobroError.message },
      { status: 500 }
    );
  }

  const alertasCobro: AlertaCobro[] = (cobroRows || []).map((row) => {
    const diasRestantes = diasRestantesCobro(row.fecha_notificacion!, hoy);
    const fechaLimite = fechaLimiteCobro(row.fecha_notificacion!);
    const orpa = row.orpa as unknown as { nombre: string } | null;
    return {
      expediente_id: row.id,
      numero_expediente: row.numero_expediente,
      orpa_nombre: orpa?.nombre || "Sin ORPA",
      orpa_id: row.orpa_id,
      fecha_notificacion: row.fecha_notificacion!,
      fecha_limite: fechaLimite,
      dias_restantes: diasRestantes,
      vencido: diasRestantes < 0,
      monto_multa: row.monto_multa || 0,
    };
  });

  // ── Resumen ──
  const resumen = {
    pendientes_notificacion: alertasNotificacion.length,
    vencidos_notificacion: alertasNotificacion.filter((a) => a.vencido).length,
    pendientes_cobro: alertasCobro.length,
    vencidos_cobro: alertasCobro.filter((a) => a.vencido).length,
  };

  return NextResponse.json({
    data: {
      notificacion: alertasNotificacion.sort((a, b) => a.dias_restantes - b.dias_restantes),
      cobro: alertasCobro.sort((a, b) => a.dias_restantes - b.dias_restantes),
      resumen,
    },
    error: null,
  });
}
