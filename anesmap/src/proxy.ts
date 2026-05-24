import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Paths that are always public (no auth required)
const PUBLIC_PATHS = new Set(["/login", "/aguardando-aprovacao"]);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth — always pass through
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public signup API endpoint
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() validates against Supabase auth server — no stale cache
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!user) {
    if (PUBLIC_PATHS.has(pathname)) return response;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname !== "/logout") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Public routes stay accessible for authenticated users too
  if (PUBLIC_PATHS.has(pathname)) {
    // If an active user lands on the waiting page → send to app
    // (profile check below will handle this)
  }

  // ── Load profile (role + status) ───────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRow as { role?: string; status?: string } | null;
  const status = profile?.status ?? "active"; // legacy users without status column → treat as active
  const role = profile?.role ?? "student";

  // ── Blocked user → sign out + redirect to login ────────────────────────────
  if (status === "blocked") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("bloqueado", "1");
    const redirect = NextResponse.redirect(loginUrl);
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) redirect.cookies.delete(name);
    });
    return redirect;
  }

  // ── Pending user → waiting page ────────────────────────────────────────────
  if (status === "pending" && pathname !== "/aguardando-aprovacao") {
    const waitUrl = request.nextUrl.clone();
    waitUrl.pathname = "/aguardando-aprovacao";
    return NextResponse.redirect(waitUrl);
  }

  // ── Approved user on waiting page → send to app ───────────────────────────
  if (status !== "pending" && pathname === "/aguardando-aprovacao") {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashUrl);
  }

  // ── Admin-only pages ───────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && role !== "admin") {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
