import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "student" | "admin";

export type AuthContext = {
  userId: string;
  role: AppRole;
  name?: string;
  weeklyGoalMinutes: number;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, weekly_goal_minutes")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    role: (profile?.role as AppRole) ?? "student",
    name: profile?.name ?? undefined,
    weeklyGoalMinutes: profile?.weekly_goal_minutes ?? 300,
  };
}

export async function requireAuth() {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("AUTH_REQUIRED");
  }
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireAuth();
  if (ctx.role !== "admin") {
    throw new Error("ADMIN_REQUIRED");
  }
  return ctx;
}

/**
 * Lightweight admin guard for API routes — returns null instead of throwing.
 * Usage: const ctx = await checkAdminAccess(); if (!ctx) return 401;
 */
export async function checkAdminAccess() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role?: string } | null)?.role !== "admin") return null;
  return { user, supabase };
}
