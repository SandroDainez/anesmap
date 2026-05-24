import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { resetarLimiteUsuario, ajustarLimiteUsuario } from "@/lib/simulacao/limite";

const LIMITE_PADRAO = parseInt(process.env.LIMITE_SIMULACOES_MES ?? "5");

export async function GET(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const usuario_id = searchParams.get("usuario_id");
  const sessao_id = searchParams.get("sessao_id");

  // Detalhes de uma sessão específica
  if (sessao_id) {
    const { data, error } = await supabase
      .from("simulacao_passos")
      .select("*")
      .eq("sessao_id", sessao_id)
      .order("turno", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Sessões de um usuário específico
  if (usuario_id) {
    const { data, error } = await supabase
      .from("simulacao_sessoes")
      .select("*")
      .eq("usuario_id", usuario_id)
      .order("iniciada_em", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Lista completa: todos os usuários + uso deste mês
  const mesAtual = new Date().toISOString().slice(0, 7);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, role, nivel, limite_simulacoes_mes")
    .order("name");

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const { data: usoData } = await supabase
    .from("uso_simulacao")
    .select("*")
    .eq("mes_ano", mesAtual);

  type UsoRow = { usuario_id: string; quantidade: number; ultima_simulacao: string | null };
  const usoMap = new Map<string, UsoRow>(
    ((usoData ?? []) as UsoRow[]).map((u) => [u.usuario_id, u])
  );

  type ProfileRow = {
    id: string;
    name: string;
    role: string;
    nivel: string;
    limite_simulacoes_mes?: number;
  };

  const merged = ((profiles ?? []) as ProfileRow[]).map((p) => ({
    usuario_id: p.id,
    quantidade: usoMap.get(p.id)?.quantidade ?? 0,
    ultima_simulacao: usoMap.get(p.id)?.ultima_simulacao ?? null,
    profiles: {
      name: p.name,
      role: p.role,
      nivel: p.nivel,
      limite_simulacoes_mes: p.limite_simulacoes_mes,
    },
  }));

  return NextResponse.json(merged);
}

export async function PATCH(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const usuario_id = searchParams.get("usuario_id");
  const acao = searchParams.get("acao");

  if (!usuario_id) return NextResponse.json({ error: "usuario_id obrigatório." }, { status: 400 });

  // Zerar contador do mês atual
  if (acao === "resetar") {
    await resetarLimiteUsuario(usuario_id);
    return NextResponse.json({ ok: true });
  }

  // Definir limite mensal fixo
  if (acao === "limite") {
    const body = await request.json() as { limite: number };
    if (body.limite === undefined || typeof body.limite !== "number" || body.limite < 0) {
      return NextResponse.json({ error: "limite inválido." }, { status: 400 });
    }
    await ajustarLimiteUsuario(usuario_id, body.limite);
    return NextResponse.json({ ok: true });
  }

  // Adicionar crédito extra (incrementa o limite)
  if (acao === "credito") {
    const body = await request.json() as { quantidade: number };
    const qty = body.quantidade ?? 1;
    if (typeof qty !== "number" || qty < 1) {
      return NextResponse.json({ error: "quantidade inválida." }, { status: 400 });
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("limite_simulacoes_mes")
      .eq("id", usuario_id)
      .single();
    const limiteAtual =
      (perfil as { limite_simulacoes_mes?: number } | null)?.limite_simulacoes_mes ??
      LIMITE_PADRAO;
    await supabase
      .from("profiles")
      .update({ limite_simulacoes_mes: limiteAtual + qty })
      .eq("id", usuario_id);
    return NextResponse.json({ ok: true });
  }

  // Bloquear usuário (limite = 0)
  if (acao === "bloquear") {
    await supabase
      .from("profiles")
      .update({ limite_simulacoes_mes: 0 })
      .eq("id", usuario_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
