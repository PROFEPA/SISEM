import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public paths that don't require auth
  const publicPaths = ["/login", "/auth/callback"];
  const isPublicPath = publicPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role-based access control for protected paths
  if (user) {
    const pathname = request.nextUrl.pathname;
    const needsRole =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/importar") ||
      pathname.startsWith("/captura") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/importar");

    if (needsRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, activo")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.activo) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      // /admin/* — admin only
      if (
        (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
        profile.role !== "admin"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      // /importar, /captura — admin or capturador
      if (
        (pathname.startsWith("/importar") || pathname.startsWith("/api/importar") || pathname.startsWith("/captura")) &&
        !["admin", "capturador"].includes(profile.role)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
