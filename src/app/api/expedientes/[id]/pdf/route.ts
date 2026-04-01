import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ExpedientePDF } from "@/components/expediente-pdf";
import { checkPermission } from "@/lib/auth/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const perm = await checkPermission("puede_exportar");
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || "Sin permisos" }, { status: perm.user ? 403 : 401 });
    }

    const { data: expediente, error } = await supabase
      .from("expedientes")
      .select("*, orpa:orpas(*)")
      .eq("id", id)
      .single();

    if (error || !expediente) {
      return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
    }

    // Get historial
    const { data: historial } = await supabase
      .from("expediente_historial")
      .select("*")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false });

    const expWithHistorial = { ...expediente, historial: historial || [] };

    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(ExpedientePDF, { expediente: expWithHistorial }) as any
    );

    const filename = `expediente_${expediente.numero_expediente.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando PDF" },
      { status: 500 }
    );
  }
}
