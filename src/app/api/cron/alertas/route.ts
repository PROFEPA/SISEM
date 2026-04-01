import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  diasHabilesRestantesNotificacion,
  fechaLimiteNotificacion,
  diasRestantesCobro,
  fechaLimiteCobro,
  formatDate,
} from "@/lib/business-days";
import { getResend, FROM_EMAIL } from "@/lib/email/client";
import {
  notificacionVencimientoTemplate,
  cobroVencimientoTemplate,
} from "@/lib/email/templates";

// Use service role key for cron (no user session)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const hoy = formatDate(new Date());

    // Fetch all expedientes that might need alerts
    const { data: expedientes, error } = await supabaseAdmin
      .from("expedientes")
      .select("id, numero_expediente, orpa_id, monto_multa, fecha_resolucion, fecha_notificacion, pagado, enviada_a_cobro, orpa:orpas(nombre)")
      .eq("pagado", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Alerts for notification deadline (≤5 business days remaining)
    const notifAlerts: Array<{
      numero_expediente: string;
      orpa_nombre: string;
      fecha_referencia: string;
      fecha_limite: string;
      dias_restantes: number;
      monto_multa: number;
    }> = [];

    // Alerts for collection deadline (≤30 days remaining)
    const cobroAlerts: Array<{
      numero_expediente: string;
      orpa_nombre: string;
      fecha_referencia: string;
      fecha_limite: string;
      dias_restantes: number;
      monto_multa: number;
    }> = [];

    for (const exp of expedientes || []) {
      const orpa = exp.orpa as unknown as { nombre: string } | null;
      const monto = Number(exp.monto_multa) || 0;

      // Notification pending
      if (exp.fecha_resolucion && !exp.fecha_notificacion) {
        const dias = diasHabilesRestantesNotificacion(exp.fecha_resolucion, hoy);
        if (dias <= 5) {
          notifAlerts.push({
            numero_expediente: exp.numero_expediente,
            orpa_nombre: orpa?.nombre || "Sin ORPA",
            fecha_referencia: exp.fecha_resolucion,
            fecha_limite: fechaLimiteNotificacion(exp.fecha_resolucion),
            dias_restantes: dias,
            monto_multa: monto,
          });
        }
      }

      // Collection pending
      if (exp.fecha_notificacion && !exp.enviada_a_cobro) {
        const dias = diasRestantesCobro(exp.fecha_notificacion, hoy);
        if (dias <= 30) {
          cobroAlerts.push({
            numero_expediente: exp.numero_expediente,
            orpa_nombre: orpa?.nombre || "Sin ORPA",
            fecha_referencia: exp.fecha_notificacion,
            fecha_limite: fechaLimiteCobro(exp.fecha_notificacion),
            dias_restantes: dias,
            monto_multa: monto,
          });
        }
      }
    }

    // Get admin emails
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id, email:id")
      .eq("role", "admin")
      .eq("activo", true);

    // Get admin auth emails
    const adminEmails: string[] = [];
    if (admins) {
      for (const admin of admins) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(admin.id);
        if (user?.email) adminEmails.push(user.email);
      }
    }

    const emailsSent: string[] = [];

    // Send notification alerts
    if (notifAlerts.length > 0 && adminEmails.length > 0) {
      const { subject, html } = notificacionVencimientoTemplate(notifAlerts);
      const { error: sendErr } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject,
        html,
      });
      if (!sendErr) {
        emailsSent.push(`notificacion: ${notifAlerts.length} alertas → ${adminEmails.join(", ")}`);
      }
    }

    // Send collection alerts
    if (cobroAlerts.length > 0 && adminEmails.length > 0) {
      const { subject, html } = cobroVencimientoTemplate(cobroAlerts);
      const { error: sendErr } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject,
        html,
      });
      if (!sendErr) {
        emailsSent.push(`cobro: ${cobroAlerts.length} alertas → ${adminEmails.join(", ")}`);
      }
    }

    return NextResponse.json({
      ok: true,
      notifAlerts: notifAlerts.length,
      cobroAlerts: cobroAlerts.length,
      adminEmails: adminEmails.length,
      emailsSent,
    });
  } catch (err) {
    console.error("Cron alertas error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
