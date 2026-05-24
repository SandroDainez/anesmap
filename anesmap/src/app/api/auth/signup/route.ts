import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json() as { name?: string; email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { name, email, password } = body;
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: "Nome, e-mail e senha são obrigatórios." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    );
  }

  // Create auth user (email pre-confirmed — admin approval is the gate, not email)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim() },
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ error: msg || "Erro ao criar conta." }, { status: 400 });
  }

  // Create profile with status = 'pending' (awaiting admin approval)
  const { error: profileError } = await admin.from("profiles").upsert({
    id: authData.user.id,
    name: name.trim(),
    role: "student",
    status: "pending",
    weekly_goal_minutes: 300,
  });

  if (profileError) {
    // Roll back auth user if profile creation fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Erro ao salvar perfil: " + profileError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
