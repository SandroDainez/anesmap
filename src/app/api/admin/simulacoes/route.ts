import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { resetarLimiteUsuario, ajustarLimiteUsuario } from "@/lib/simulacao/limite";

export async function GET(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const usuario_id = searchParams.get("usuario_id");
  const sessao_id = searchParams.get("sessao_id");

  if (sessao_id) {
    const { data, error } = await supabase
      .from("simulacao_passos")
      .select("*")
      .eq("sessao_id", sessao_id)
      .order("turno", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (usuario_id) {
    const { data, error } = await supabase
      .from("simulacao_sessoes")
      .select("*")
      .eq("usuario_id", usuario_id)
      .order("iniciada_em", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const mesAtual = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from("uso_simulacao")
    .select("*, profiles(name, role, nivel)")
    .eq("mes_ano", mesAtual)
    .order("quantidade", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const usuario_id = searchParams.get("usuario_id");
  const acao = searchParams.get("acao");

  if (!usuario_id) return NextResponse.json({ error: "usuario_id obrigatório." }, { status: 400 });

  if (acao === "resetar") {
    await resetarLimiteUsuario(usuario_id);
    return NextResponse.json({ ok: true });
  }

  if (acao === "limite") {
    const body = await request.json() as { limite: number };
    if (!body.limite || typeof body.limite !== "number") {
      return NextResponse.json({ error: "limite inválido." }, { status: 400 });
    }
    await ajustarLimiteUsuario(usuario_id, body.limite);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
