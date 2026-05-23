import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { gerarRespostaSimulacao } from "@/lib/ai/deepseek";

const SYSTEM_PROMPT = `Você é um especialista em anestesiologia e simulação clínica. Gere um caso de simulação clínica completo, realista e com múltiplas fases em JSON.

Retorne EXATAMENTE este JSON (sem texto adicional, apenas JSON válido):
{
  "titulo": "string",
  "slug": "kebab-case-unico",
  "descricao": "string - contexto do paciente, procedimento, histórico (3-5 linhas)",
  "dificuldade": "iniciante|intermediário|avançado",
  "nivel_recomendado": ["ME1"],
  "duracao_estimada": "X min",
  "tags": ["tag1", "tag2", "tag3"],
  "fases": [
    {
      "titulo": "Fase 1 — Nome curto da fase inicial",
      "situacao": "Cena clínica detalhada que o residente verá no início",
      "sinais_vitais": { "PA": "120/80", "FC": 90, "SpO2": 98, "ETCO2": 35, "FR": 14, "Temp": 36.5 },
      "opcoes": ["conduta correta principal", "conduta parcialmente correta", "conduta incorreta comum", "conduta incorreta grave"]
    },
    {
      "titulo": "Fase 2 — Agravamento / Evolução",
      "situacao": "Situação após intervenção — o quadro evoluiu. Descreva a nova cena clínica.",
      "sinais_vitais": { "PA": "90/60", "FC": 120, "SpO2": 88, "ETCO2": 50, "FR": 22, "Temp": 36.2 },
      "opcoes": ["conduta principal desta fase", "alternativa aceitável", "conduta incorreta", "conduta contraindicada"]
    },
    {
      "titulo": "Fase 3 — Controle / Resolução",
      "situacao": "Com as condutas corretas, o quadro começa a responder. Descreva a evolução positiva.",
      "sinais_vitais": { "PA": "110/70", "FC": 98, "SpO2": 95, "ETCO2": 40, "FR": 16, "Temp": 36.4 },
      "opcoes": ["conduta de manutenção", "monitoramento ativo", "ajuste de parâmetros", "comunicação com equipe"]
    }
  ]
}

REGRAS:
- Gere entre 3 e 5 fases que representem a progressão clínica natural do caso
- Fase 1: apresentação inicial do problema
- Fases intermediárias: agravamento progressivo ou resposta às condutas
- Última fase: estabilização com condutas corretas
- Os sinais vitais devem fazer sentido fisiológico e evoluir coerentemente
- As opções de conduta devem ser realistas para o contexto de anestesiologia`;

export async function POST(request: NextRequest) {
  const ctx = await checkAdminAccess();
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

  const mensagem = `Tópico: ${topico}. Nível: ${nivel}. Dificuldade: ${dificuldade}. Gere um caso clínico realista de anestesiologia com múltiplas fases de evolução.`;

  try {
    const caso = await gerarRespostaSimulacao(SYSTEM_PROMPT, mensagem) as Record<string, unknown>;

    // Derive situacao_inicial / sinais_vitais_iniciais / opcoes_iniciais from fases[0]
    // for backward compatibility with the simulation engine
    type FaseRaw = { titulo?: string; situacao?: string; sinais_vitais?: unknown; opcoes?: unknown[] };
    const fases = Array.isArray(caso.fases) ? (caso.fases as FaseRaw[]) : [];
    const fase0 = fases[0];

    const enriched = {
      ...caso,
      situacao_inicial: (fase0?.situacao as string) ?? (caso.situacao_inicial as string) ?? "",
      sinais_vitais_iniciais: fase0?.sinais_vitais ?? caso.sinais_vitais_iniciais ?? {},
      opcoes_iniciais: Array.isArray(fase0?.opcoes) ? fase0.opcoes : (caso.opcoes_iniciais ?? []),
    };

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar caso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
