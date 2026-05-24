import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that never require auth
const PUBLIC_PATHS = new Set(["/login", "/aguardando-aprovacao"]);
const PUBLIC_PREFIXES = ["/_next", "/favicon", "/api/auth/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through static assets and public API routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Admin API routes and simulacao API handle their own auth via checkAdminAccess()
  // We still let them through here — the route handlers enforce access
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public pages (login, waiting page)
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) return NextResponse.next();

  // Build response object so Supabase can refresh tokens via Set-Cookie
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() always validates against the Supabase auth server (no stale cache)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Load profile (role + status) ───────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRow as { role?: string; status?: string } | null;
  const status = profile?.status ?? "active"; // assume active if no profile yet (admin-created legacy)
  const role = profile?.role ?? "student";

  // ── Blocked user ───────────────────────────────────────────────────────────
  if (status === "blocked") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("bloqueado", "1");
    const redirect = NextResponse.redirect(loginUrl);
    // Clear all Supabase auth cookies so the session is invalidated client-side
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) redirect.cookies.delete(name);
    });
    return redirect;
  }

  // ── Pending user — send to waiting page ───────────────────────────────────
  if (status === "pending" && pathname !== "/aguardando-aprovacao") {
    return NextResponse.redirect(new URL("/aguardando-aprovacao", request.url));
  }

  // ── Active pending user on waiting page — redirect to app ─────────────────
  if (status !== "pending" && pathname === "/aguardando-aprovacao") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Admin-only pages ───────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Run on all paths except static files and images
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
