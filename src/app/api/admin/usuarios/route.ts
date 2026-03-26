import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Sin permisos", status: 403 };
  return { user, error: null, status: 200 };
}

// POST — Create a new user (admin only)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json(
      { data: null, error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json();
  const { email, password, nombre_completo, role, orpa_id } = body as {
    email?: string;
    password?: string;
    nombre_completo?: string;
    role?: string;
    orpa_id?: string | null;
  };

  if (!email || !password || !nombre_completo || !role) {
    return NextResponse.json(
      { data: null, error: "Faltan campos requeridos: email, password, nombre_completo, role" },
      { status: 400 }
    );
  }

  const validRoles = ["admin", "capturador", "visualizador"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { data: null, error: "Rol inválido" },
      { status: 400 }
    );
  }

  // Use service role key to create auth user
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create auth user
  const { data: newUser, error: createError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError) {
    return NextResponse.json(
      { data: null, error: createError.message },
      { status: 400 }
    );
  }

  // Create profile
  const { error: profileError } = await serviceClient
    .from("profiles")
    .upsert({
      id: newUser.user.id,
      nombre_completo,
      role,
      orpa_id: orpa_id || null,
      activo: true,
    });

  if (profileError) {
    return NextResponse.json(
      { data: null, error: `Usuario creado pero error en perfil: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { id: newUser.user.id, email, nombre_completo, role, orpa_id },
    error: null,
  });
}
