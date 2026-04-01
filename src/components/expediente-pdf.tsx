import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { IExpediente, IExpedienteHistorial } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "2px solid #1B8A5A", paddingBottom: 10 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#1B8A5A", fontFamily: "Helvetica-Bold" },
  headerSubtitle: { fontSize: 9, color: "#666", marginTop: 2 },
  expedienteNum: { fontSize: 12, fontWeight: "bold", marginTop: 4, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", fontFamily: "Helvetica-Bold", color: "#1B8A5A", marginBottom: 6, borderBottom: "1px solid #e5e7eb", paddingBottom: 3 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 160, color: "#6B7280", fontSize: 9 },
  value: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
  badge: { backgroundColor: "#ECFDF5", color: "#065F46", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 8 },
  badgeRed: { backgroundColor: "#FEF2F2", color: "#991B1B", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 8 },
  historialItem: { marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #d1d5db" },
  historialField: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151" },
  historialValues: { fontSize: 8, color: "#6B7280" },
  historialDate: { fontSize: 7, color: "#9CA3AF" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#9CA3AF", borderTop: "1px solid #e5e7eb", paddingTop: 6 },
  montoHighlight: { fontSize: 14, fontWeight: "bold", fontFamily: "Helvetica-Bold", color: "#1B8A5A" },
});

function formatMoney(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

interface Props {
  expediente: IExpediente & { historial?: IExpedienteHistorial[] };
}

export function ExpedientePDF({ expediente }: Props) {
  const e = expediente;
  const now = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFEPA — SISEM</Text>
          <Text style={styles.headerSubtitle}>Sistema de Seguimiento de Multas</Text>
          <Text style={styles.expedienteNum}>Expediente: {e.numero_expediente}</Text>
        </View>

        {/* Datos del Expediente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Expediente</Text>
          <Field label="Número de expediente" value={e.numero_expediente} />
          <Field label="Materia" value={e.materia} />
          <Field label="ORPA" value={e.orpa?.nombre || "Sin ORPA"} />
          <Field label="Número de acta" value={e.numero_acta} />
          <Field label="Fecha de acta" value={formatDate(e.fecha_acta)} />
          <Field label="Número de resolución" value={e.numero_resolucion} />
          <Field label="Fecha de resolución" value={formatDate(e.fecha_resolucion)} />
          <Field label="Fecha de notificación" value={formatDate(e.fecha_notificacion)} />
          <Field label="Giro / Actividad" value={e.giro_actividad} />
          <Field label="Artículo infringido" value={e.articulo_infringido} />
          <Field label="Descripción de infracción" value={e.descripcion_infraccion} />
        </View>

        {/* Datos del Infractor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Infractor</Text>
          <Field label="Tipo de persona" value={e.tipo_persona === "fisica" ? "Persona Física" : e.tipo_persona === "moral" ? "Persona Moral" : e.tipo_persona} />
          {e.tipo_persona === "fisica" ? (
            <>
              <Field label="Nombre" value={e.nombre_infractor} />
              <Field label="Apellido paterno" value={e.apellido_paterno} />
              <Field label="Apellido materno" value={e.apellido_materno} />
            </>
          ) : (
            <Field label="Razón social" value={e.razon_social} />
          )}
          <Field label="RFC" value={e.rfc_infractor} />
          <Field label="Domicilio" value={e.domicilio_infractor} />
        </View>

        {/* Multa y Pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Multa y Pago</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Monto de multa:</Text>
            <Text style={styles.montoHighlight}>{formatMoney(e.monto_multa)}</Text>
          </View>
          <Field label="Días UME" value={e.dias_ume} />
          <View style={styles.row}>
            <Text style={styles.label}>Pagado:</Text>
            <Text style={e.pagado ? styles.badge : styles.badgeRed}>{e.pagado ? "Sí" : "No"}</Text>
          </View>
          {e.pagado && (
            <>
              <Field label="Fecha de pago" value={formatDate(e.fecha_pago)} />
              <Field label="Monto pagado" value={formatMoney(e.monto_pagado)} />
              <Field label="Folio de pago" value={e.folio_pago} />
            </>
          )}
        </View>

        {/* Impugnación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impugnación</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Impugnado:</Text>
            <Text style={e.impugnado ? styles.badgeRed : styles.badge}>{e.impugnado ? "Sí" : "No"}</Text>
          </View>
          {e.impugnado && (
            <>
              <Field label="Tipo de impugnación" value={e.tipo_impugnacion} />
              <Field label="Fecha de impugnación" value={formatDate(e.fecha_impugnacion)} />
              <Field label="Resultado" value={e.resultado_impugnacion} />
            </>
          )}
        </View>

        {/* Cobro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cobro</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Enviada a cobro:</Text>
            <Text style={e.enviada_a_cobro ? styles.badge : styles.badgeRed}>{e.enviada_a_cobro ? "Sí" : "No"}</Text>
          </View>
          <Field label="Oficio de cobro" value={e.oficio_cobro} />
          <Field label="Documentación anexa" value={e.documentacion_anexa ? "Sí" : "No"} />
          <Field label="Observaciones" value={e.observaciones} />
        </View>

        {/* Historial */}
        {e.historial && e.historial.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Historial de Cambios ({e.historial.length})</Text>
            {e.historial.slice(0, 50).map((h) => (
              <View key={h.id} style={styles.historialItem}>
                <Text style={styles.historialField}>{h.campo_modificado}</Text>
                <Text style={styles.historialValues}>
                  {h.valor_anterior || "(vacío)"} → {h.valor_nuevo}
                </Text>
                <Text style={styles.historialDate}>
                  {new Date(h.created_at).toLocaleString("es-MX")} — {h.usuario_id || "sistema"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>PROFEPA — SISEM — Generado: {now}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
