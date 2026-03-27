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
