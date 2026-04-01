interface AlertData {
  numero_expediente: string;
  orpa_nombre: string;
  fecha_referencia: string;
  fecha_limite: string;
  dias_restantes: number;
  monto_multa: number;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(n);
}

export function notificacionVencimientoTemplate(alerts: AlertData[]) {
  const rows = alerts.map((a) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${a.numero_expediente}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${a.orpa_nombre}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${a.fecha_referencia}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${a.fecha_limite}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${a.dias_restantes < 0 ? '#DC2626' : a.dias_restantes <= 3 ? '#D97706' : '#059669'}">${a.dias_restantes} días</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMoney(a.monto_multa)}</td>
    </tr>
  `).join("");

  return {
    subject: `⚠️ SISEM: ${alerts.length} expediente(s) próximos a vencer notificación`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto">
        <div style="background:#1B8A5A;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:18px">PROFEPA — SISEM</h1>
          <p style="margin:4px 0 0;opacity:0.9;font-size:13px">Alerta de vencimiento de notificación</p>
        </div>
        <div style="padding:20px;background:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
          <p style="color:#374151;margin-bottom:16px">
            Los siguientes <strong>${alerts.length}</strong> expedientes requieren atención por proximidad a su fecha límite de notificación (15 días hábiles):
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Expediente</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">ORPA</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">F. Resolución</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">F. Límite</th>
                <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Días</th>
                <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Monto</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#6b7280;font-size:12px;margin-top:20px">
            Ingrese a <a href="https://sisem.vercel.app/dashboard" style="color:#1B8A5A">SISEM</a> para más detalles.
          </p>
        </div>
      </div>
    `,
  };
}

export function cobroVencimientoTemplate(alerts: AlertData[]) {
  const rows = alerts.map((a) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${a.numero_expediente}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${a.orpa_nombre}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${a.fecha_referencia}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${a.fecha_limite}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${a.dias_restantes < 0 ? '#DC2626' : '#D97706'}">${a.dias_restantes} días</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMoney(a.monto_multa)}</td>
    </tr>
  `).join("");

  return {
    subject: `🔴 SISEM: ${alerts.length} expediente(s) próximos a vencer cobro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto">
        <div style="background:#DC2626;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:18px">PROFEPA — SISEM</h1>
          <p style="margin:4px 0 0;opacity:0.9;font-size:13px">Alerta de vencimiento de cobro</p>
        </div>
        <div style="padding:20px;background:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
          <p style="color:#374151;margin-bottom:16px">
            Los siguientes <strong>${alerts.length}</strong> expedientes están próximos a vencer su plazo de envío a cobro (2 meses / 60 días naturales):
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Expediente</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">ORPA</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">F. Notificación</th>
                <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">F. Límite</th>
                <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Días</th>
                <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Monto</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#6b7280;font-size:12px;margin-top:20px">
            Ingrese a <a href="https://sisem.vercel.app/dashboard" style="color:#DC2626">SISEM</a> para más detalles.
          </p>
        </div>
      </div>
    `,
  };
}
