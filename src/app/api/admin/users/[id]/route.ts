import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await requireAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
  }

  // Impedir que o admin exclua a si mesmo
  if (id === caller.id) {
    return NextResponse.json({ error: "Você não pode excluir sua própria conta." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  // Deletar usuário do Auth (em cascata remove dados relacionados se configurado no Supabase)
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
