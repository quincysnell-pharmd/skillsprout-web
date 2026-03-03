import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /profile/me → redirect to child dashboard ──────────────
  if (pathname === "/profile/me") {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const { data: child } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (child?.id) {
      return NextResponse.redirect(
        new URL(`/dashboard/child/${child.id}`, request.url)
      );
    }

    return NextResponse.redirect(new URL("/dashboard/parent", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/me"],
};