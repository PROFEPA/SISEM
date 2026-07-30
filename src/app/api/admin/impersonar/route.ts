import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPER_ADMIN_ID } from "@/lib/auth/super-admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Exclusivo del super usuario: generar un enlace mágico para iniciar sesión
// como otro usuario (impersonación), quedando registrado en audit_log.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== SUPER_ADMIN_ID) {
    return NextResponse.json(
      { data: null, error: "Solo el super usuario puede usar esta función" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { target_user_id: targetUserId } = body as { target_user_id?: string };

  if (!targetUserId || !UUID_PATTERN.test(targetUserId)) {
    return NextResponse.json(
      { data: null, error: "target_user_id inválido" },
      { status: 400 }
    );
  }

  if (targetUserId === SUPER_ADMIN_ID) {
    return NextResponse.json(
      { data: null, error: "No puedes impersonarte a ti mismo" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: targetUser, error: targetError } =
    await serviceClient.auth.admin.getUserById(targetUserId);

  if (targetError || !targetUser.user?.email) {
    return NextResponse.json(
      { data: null, error: "No se encontró el usuario objetivo" },
      { status: 404 }
    );
  }

  const { data: linkData, error: linkError } =
    await serviceClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email,
    });

  if (linkError || !linkData) {
    return NextResponse.json(
      { data: null, error: `No se pudo generar el enlace: ${linkError?.message}` },
      { status: 500 }
    );
  }

  await serviceClient.from("audit_log").insert({
    actor_id: user.id,
    actor_nombre: "Alan Guerrero",
    actor_role: "admin",
    action: "IMPERSONATE",
    entity_type: "profile",
    entity_id: targetUserId,
    old_data: null,
    new_data: { target_email: targetUser.user.email },
  });

  return NextResponse.json({
    data: { action_link: linkData.properties.action_link },
    error: null,
  });
}
