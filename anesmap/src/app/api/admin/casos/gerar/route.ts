import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gerarRespostaSimulacao } from "@/lib/ai/deepseek";

async function requireAdmin() {
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

const SYSTEM_PROMPT = `Você é um especialista em anestesiologia e simulação clínica. Gere um caso de simulação clínica completo e realista em JSON.

Retorne EXATAMENTE este JSON:
{
  "titulo": "string",
  "slug": "kebab-case-unico",
  "descricao": "string - contexto do paciente, procedimento, histórico (3-5 linhas)",
  "dificuldade": "iniciante|intermediário|avançado",
  "nivel_recomendado": ["ME1"|"ME2"|"ME3"],
  "duracao_estimada": "X min",
  "tags": ["tag1", "tag2", "tag3"],
  "situacao_inicial": "string - cena clínica detalhada que o residente verá",
  "sinais_vitais_iniciais": { "PA": "120/80", "FC": 90, "SpO2": 98, "ETCO2": 35, "FR": 14, "Temp": 36.5 },
  "opcoes_iniciais": ["opção A", "opção B", "opção C", "opção D"]
}`;

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: { topico?: string; nivel?: string; dificuldade?: string };
  try {
    body = (await request.json()) as { topico?: string; nivel?: string; dificuldade?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const { topico, nivel, dificuldade } = body;
  if (!topico || !nivel || !dificuldade) {
    return NextResponse.json(
      { error: "Campos obrigatórios: topico, nivel, dificuldade." },
      { status: 400 },
    );
  }

  const mensagem = `Tópico: ${topico}. Nível: ${nivel}. Dificuldade: ${dificuldade}. Gere um caso clínico realista de anestesiologia.`;

  try {
    const caso = await gerarRespostaSimulacao(SYSTEM_PROMPT, mensagem);
    return NextResponse.json(caso);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar caso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
