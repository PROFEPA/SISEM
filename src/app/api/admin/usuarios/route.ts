import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const VALID_ROLES = ["admin", "capturador", "visualizador"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeOrpaId(orpaId?: string | null) {
  if (!orpaId) return null;

  const normalized = orpaId.trim();
  if (!normalized || normalized.toLowerCase() === "none") {
    return null;
  }

  return normalized;
}

function isDuplicateEmailError(message: string) {
  return /already registered|already exists|already been registered/i.test(message);
}

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
      {
        data: null,
        error: "Faltan campos requeridos: email, password, nombre_completo, role",
      },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNombreCompleto = nombre_completo.trim();
  const normalizedOrpaId = normalizeOrpaId(orpa_id);

  if (!normalizedEmail || !normalizedNombreCompleto) {
    return NextResponse.json(
      { data: null, error: "Email y nombre completo son obligatorios" },
      { status: 400 }
    );
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { data: null, error: "Rol invalido" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (normalizedOrpaId && !UUID_PATTERN.test(normalizedOrpaId)) {
    return NextResponse.json(
      { data: null, error: "ORPA invalida" },
      { status: 400 }
    );
  }

  if (normalizedOrpaId) {
    const { data: orpaExists, error: orpaError } = await serviceClient
      .from("orpas")
      .select("id")
      .eq("id", normalizedOrpaId)
      .maybeSingle();

    if (orpaError) {
      return NextResponse.json(
        { data: null, error: `No se pudo validar la ORPA: ${orpaError.message}` },
        { status: 500 }
      );
    }

    if (!orpaExists) {
      return NextResponse.json(
        { data: null, error: "La ORPA seleccionada no existe" },
        { status: 400 }
      );
    }
  }

  const persistProfile = async (userId: string) =>
    serviceClient.from("profiles").upsert({
      id: userId,
      nombre_completo: normalizedNombreCompleto,
      role,
      orpa_id: normalizedOrpaId,
      activo: true,
    });

  const findExistingAuthUserByEmail = async (targetEmail: string) => {
    let page = 1;

    while (true) {
      const { data, error } = await serviceClient.auth.admin.listUsers({
        page,
        perPage: 200,
      });

      if (error) return { user: null, error };

      const existingUser = data.users.find(
        (candidate) => candidate.email?.toLowerCase() === targetEmail
      );

      if (existingUser) return { user: existingUser, error: null };
      if (!data.nextPage) return { user: null, error: null };

      page = data.nextPage;
    }
  };

  const { data: newUser, error: createError } =
    await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

  if (createError) {
    if (isDuplicateEmailError(createError.message)) {
      const { user: existingUser, error: lookupError } =
        await findExistingAuthUserByEmail(normalizedEmail);

      if (lookupError) {
        return NextResponse.json(
          {
            data: null,
            error: `No se pudo revisar el usuario existente: ${lookupError.message}`,
          },
          { status: 500 }
        );
      }

      if (existingUser) {
        const { data: existingProfile, error: profileLookupError } =
          await serviceClient
            .from("profiles")
            .select("nombre_completo, role, orpa_id")
            .eq("id", existingUser.id)
            .maybeSingle();

        if (profileLookupError) {
          return NextResponse.json(
            {
              data: null,
              error: `No se pudo revisar el perfil existente: ${profileLookupError.message}`,
            },
            { status: 500 }
          );
        }

        const isRecoverableProfile =
          !existingProfile ||
          (!existingProfile.nombre_completo &&
            existingProfile.role === "visualizador" &&
            !existingProfile.orpa_id);

        if (isRecoverableProfile) {
          const { error: updateAuthError } =
            await serviceClient.auth.admin.updateUserById(existingUser.id, {
              password,
            });

          if (updateAuthError) {
            return NextResponse.json(
              {
                data: null,
                error: `El usuario existe, pero no se pudo recuperar: ${updateAuthError.message}`,
              },
              { status: 500 }
            );
          }

          const { error: recoveredProfileError } = await persistProfile(existingUser.id);

          if (recoveredProfileError) {
            return NextResponse.json(
              {
                data: null,
                error: `El usuario auth existe, pero no se pudo completar el perfil: ${recoveredProfileError.message}`,
              },
              { status: 500 }
            );
          }

          return NextResponse.json({
            data: {
              id: existingUser.id,
              email: normalizedEmail,
              nombre_completo: normalizedNombreCompleto,
              role,
              orpa_id: normalizedOrpaId,
            },
            error: null,
            message: "Se recupero un alta incompleta y el usuario quedo listo.",
          });
        }
      }
    }

    return NextResponse.json(
      { data: null, error: createError.message },
      { status: 400 }
    );
  }

  const userId = newUser.user?.id;
  if (!userId) {
    return NextResponse.json(
      { data: null, error: "Supabase no devolvio el ID del usuario creado" },
      { status: 500 }
    );
  }

  const { error: profileError } = await persistProfile(userId);

  if (profileError) {
    const { error: rollbackError } = await serviceClient.auth.admin.deleteUser(userId);
    const rollbackMessage = rollbackError
      ? ` Ademas, no se pudo revertir el usuario en Auth: ${rollbackError.message}`
      : "";

    return NextResponse.json(
      {
        data: null,
        error: `No se pudo completar el alta del usuario: ${profileError.message}.${rollbackMessage}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        id: userId,
        email: normalizedEmail,
        nombre_completo: normalizedNombreCompleto,
        role,
        orpa_id: normalizedOrpaId,
      },
      error: null,
      message: null,
    },
    { status: 201 }
  );
}

// ── PUT — Update user profile (role, orpa, name, active, password) ──
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json(
      { data: null, error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json();
  const { user_id, nombre_completo, role, orpa_id, activo, password } = body as {
    user_id?: string;
    nombre_completo?: string;
    role?: string;
    orpa_id?: string | null;
    activo?: boolean;
    password?: string;
  };

  if (!user_id || !UUID_PATTERN.test(user_id)) {
    return NextResponse.json(
      { data: null, error: "user_id inválido" },
      { status: 400 }
    );
  }

  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { data: null, error: "Rol inválido" },
      { status: 400 }
    );
  }

  const normalizedOrpaId = normalizeOrpaId(orpa_id);

  if (normalizedOrpaId && !UUID_PATTERN.test(normalizedOrpaId)) {
    return NextResponse.json(
      { data: null, error: "ORPA inválida" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Build profile update object only with provided fields
  const profileUpdate: Record<string, unknown> = {};
  if (nombre_completo !== undefined) profileUpdate.nombre_completo = nombre_completo.trim();
  if (role !== undefined) profileUpdate.role = role;
  if (orpa_id !== undefined) profileUpdate.orpa_id = normalizedOrpaId;
  if (activo !== undefined) profileUpdate.activo = activo;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user_id);

    if (profileError) {
      return NextResponse.json(
        { data: null, error: `Error al actualizar perfil: ${profileError.message}` },
        { status: 500 }
      );
    }
  }

  // Update password if provided
  if (password && password.length >= 6) {
    const { error: authError } = await serviceClient.auth.admin.updateUserById(
      user_id,
      { password }
    );

    if (authError) {
      return NextResponse.json(
        { data: null, error: `Error al actualizar contraseña: ${authError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ data: { id: user_id }, error: null });
}

// ── DELETE — Remove user from auth and profile ──
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json(
      { data: null, error: auth.error },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId || !UUID_PATTERN.test(userId)) {
    return NextResponse.json(
      { data: null, error: "user_id inválido" },
      { status: 400 }
    );
  }

  // Prevent admin from deleting themselves
  if (userId === auth.user!.id) {
    return NextResponse.json(
      { data: null, error: "No puedes eliminarte a ti mismo" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if user has expedientes
  const { count } = await serviceClient
    .from("expedientes")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);

  if (count && count > 0) {
    return NextResponse.json(
      {
        data: null,
        error: `No se puede eliminar: el usuario tiene ${count} expediente(s) registrados. Desactívalo en su lugar.`,
      },
      { status: 409 }
    );
  }

  // Delete profile first (cascade from auth might not reach profiles without FK ON DELETE CASCADE... but it does exist)
  const { error: profileError } = await serviceClient
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json(
      { data: null, error: `Error al eliminar perfil: ${profileError.message}` },
      { status: 500 }
    );
  }

  // Delete from Supabase Auth
  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);

  if (authError) {
    return NextResponse.json(
      { data: null, error: `Perfil eliminado pero error en auth: ${authError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { id: userId },
    error: null,
    message: "Usuario eliminado exitosamente",
  });
}
