import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const requestUrl = new URL(request.url);
  const basePath = (process.env.NEXT_BASE_PATH ?? "").replace(/\/$/, "");
  const appUrl = configuredAppUrl || `${requestUrl.origin}${basePath}`;

  function redirectTo(path: string) {
    const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
    return NextResponse.redirect(`${appUrl}${safePath === "/" ? "" : safePath}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectTo(next);
    }
  }

  return redirectTo("/login");
}
