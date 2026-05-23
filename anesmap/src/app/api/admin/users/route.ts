import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const caller = ctx.user;

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 500 });

  let body: { name?: string; email?: string; password?: string; role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corpo inválido." }, { status: 400 }); }

  const { name, email, password, role = "student" } = body;
  if (!name || !email || !password) return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
  if (!["student", "admin"].includes(role)) return NextResponse.json({ error: "Role inválido." }, { status: 400 });

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(), password, email_confirm: true, user_metadata: { name: name.trim() },
  });
  if (authError || !authData.user) return NextResponse.json({ error: authError?.message ?? "Erro ao criar usuário." }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").upsert({ id: authData.user.id, name: name.trim(), role, weekly_goal_minutes: 300 });
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: "Erro ao salvar perfil: " + profileError.message }, { status: 500 });
  }

  return NextResponse.json({ id: authData.user.id, email: authData.user.email, name: name.trim(), role });
}
