import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

  const { data: tipos, error: tiposError } = await supabase
    .from("tipos_impugnacion")
    .select("id, clave, nombre")
    .order("id");

  if (tiposError) {
    return NextResponse.json(
      { data: null, error: tiposError.message },
      { status: 500 }
    );
  }

  const { data: resultados, error: resError } = await supabase
    .from("resultados_impugnacion")
    .select("id, tipo_impugnacion_clave, clave, nombre, favorable_profepa")
    .order("id");

  if (resError) {
    return NextResponse.json(
      { data: null, error: resError.message },
      { status: 500 }
    );
  }

  // Nest resultados under each tipo
  const tiposConResultados = (tipos || []).map((tipo) => ({
    ...tipo,
    resultados: (resultados || []).filter(
      (r) => r.tipo_impugnacion_clave === tipo.clave
    ),
  }));

  return NextResponse.json({ data: tiposConResultados, error: null });
}
