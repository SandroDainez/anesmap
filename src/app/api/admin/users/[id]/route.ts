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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 500 });

  let body: { status?: string; nivel?: string };
  try {
    body = await request.json() as { status?: string; nivel?: string };
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!["pending", "active", "blocked"].includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.nivel !== undefined) {
    if (!["ME1", "ME2", "ME3"].includes(body.nivel)) {
      return NextResponse.json({ error: "Nível inválido." }, { status: 400 });
    }
    updates.nivel = body.nivel;
    updates.assigned_track = body.nivel;
    updates.assigned_track_cards = body.nivel;
    updates.assigned_track_simulados = body.nivel;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
