import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const caller = ctx.user;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
  if (id === caller.id) return NextResponse.json({ error: "Você não pode excluir sua própria conta." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 500 });

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
