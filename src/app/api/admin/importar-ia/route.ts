import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OpenAI from "openai";

function getAIClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY não configurada.");
  return new OpenAI({ baseURL: "https://api.deepseek.com", apiKey });
}

// ─── System prompts ───────────────────────────────────────────────────────────

const SIMULADO_SYSTEM_PROMPT = `Você é um especialista em educação médica para anestesiologia, com amplo conhecimento no formato do TEA (Título de Especialista em Anestesiologia).

Sua tarefa é receber texto em qualquer formato (anotações de aula, capítulos de livro, slides, questões mal formatadas, textos corridos) e convertê-lo em questões de múltipla escolha de alta qualidade para residentes de anestesiologia.

Para cada questão, retorne um objeto JSON com os seguintes campos:
- "enunciado": questão clara, clínica e específica (pode ser um caso clínico)
- "alternativaA": primeira alternativa
- "alternativaB": segunda alternativa
- "alternativaC": terceira alternativa
- "alternativaD": quarta alternativa
- "alternativaE": quinta alternativa (apenas quando necessário, senão null)
- "correta": letra da alternativa correta ("A", "B", "C", "D" ou "E")
- "explicacaoA": explicação individual e detalhada da alternativa A — se correta, explique o mecanismo fisiológico/farmacológico com base científica e cite referência; se errada, explique ESPECIFICAMENTE por que está errada (não apenas "esta está incorreta")
- "explicacaoB": idem para alternativa B
- "explicacaoC": idem para alternativa C
- "explicacaoD": idem para alternativa D
- "explicacaoE": idem para alternativa E (null se não houver E)
- "explicacao": resumo geral da questão com o raciocínio clínico completo
- "tema": tópico principal da questão (ex: "Farmacologia", "TIVA", "Via Aérea")
- "referencias": array de strings com referências bibliográficas reais e específicas (ex: "Miller RD. Miller's Anesthesia, 9th ed. Elsevier, 2019. Cap. 26, p. 890.")

REGRAS CRÍTICAS:
1. Apenas cite referências REAIS: Miller's Anesthesia, Stoelting's Pharmacology & Physiology in Anesthetic Practice, Morgan & Mikhail's Clinical Anesthesiology, Barash Clinical Anesthesia, Butterworth's Morgan & Mikhail, diretrizes da ASA, SBAE, artigos do Anesthesiology, BJA, Anesth Analg
2. Nunca invente referências — se não tiver certeza, cite o livro principal sem número de página
3. As alternativas erradas devem ter uma razão clínica específica do por que estão erradas (mecanismo, dose errada, indicação incorreta, etc.)
4. As questões devem testar raciocínio clínico, não apenas memorização
5. Mantenha as alternativas paralelas em estrutura e comprimento similar
6. Gere entre 3 e 8 questões por chamada dependendo do conteúdo

Retorne APENAS um array JSON válido (sem texto adicional, sem markdown, sem \`\`\`).`;

const FLASHCARD_SYSTEM_PROMPT = `Você é um especialista em educação médica para anestesiologia.

Sua tarefa é receber texto em qualquer formato (anotações, capítulos, slides) e convertê-lo em flashcards de estudo de alta qualidade para residentes de anestesiologia.

Para cada flashcard, retorne um objeto JSON com:
- "frente": pergunta inteligente e clínica que testa compreensão real (não apenas memorização de definição)
- "verso": resposta bem estruturada no formato:
  "[Resposta direta à pergunta]

  Mecanismo/Base: [explicação do mecanismo ou raciocínio]

  Relevância clínica: [por que isso importa na prática]

  Referências:
  - [Referência bibliográfica real e específica]"
- "tema": tópico principal (ex: "Farmacologia dos Opioides", "Bloqueio Neuromuscular")

REGRAS:
1. Apenas cite referências REAIS: Miller's Anesthesia, Stoelting's, Morgan & Mikhail's, Barash, diretrizes ASA, SBAE, artigos Anesthesiology/BJA/Anesth Analg
2. Nunca invente referências
3. Perguntas devem ser específicas e clínicas
4. Respostas devem ter estrutura clara e referência ao final
5. Gere entre 5 e 15 flashcards por chamada dependendo do conteúdo

Retorne APENAS um array JSON válido (sem texto adicional, sem markdown, sem \`\`\`).`;

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth check — admin only
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ erro: "configuracao_invalida" }, { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
    }
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if ((profileRow as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ erro: "acesso_negado" }, { status: 403 });
    }

    const body = await request.json() as {
      texto: string;
      tipo: "simulados" | "flashcards";
      me?: string;
      trimestre?: string;
      prova?: string;
    };

    const { texto, tipo, me, trimestre, prova } = body;

    if (!texto?.trim()) {
      return NextResponse.json({ erro: "Texto não pode estar vazio." }, { status: 400 });
    }
    if (!tipo || !["simulados", "flashcards"].includes(tipo)) {
      return NextResponse.json({ erro: "Tipo inválido. Use 'simulados' ou 'flashcards'." }, { status: 400 });
    }

    const client = getAIClient();
    const systemPrompt = tipo === "simulados" ? SIMULADO_SYSTEM_PROMPT : FLASHCARD_SYSTEM_PROMPT;

    const userMessage = tipo === "simulados"
      ? `Converta o texto abaixo em questões de múltipla escolha no formato TEA para anestesiologia.\n\nME: ${me ?? "ME1"}\nTrimestre: ${trimestre ?? "não definido"}\nProva: ${prova ?? "não definida"}\n\n---\n${texto.trim()}`
      : `Converta o texto abaixo em flashcards de estudo para anestesiologia.\n\nME: ${me ?? "ME1"}\nTrimestre: ${trimestre ?? "não definido"}\n\n---\n${texto.trim()}`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 5000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0].message.content ?? "[]";

    // DeepSeek json_object mode returns an object — unwrap array if needed
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ erro: "IA retornou JSON inválido.", raw: rawContent }, { status: 500 });
    }

    // Normalize: might be { questoes: [...] } or { flashcards: [...] } or [...] directly
    let items: unknown[];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const candidate = obj.questoes ?? obj.flashcards ?? obj.items ?? obj.data ?? obj.cards ?? Object.values(obj)[0];
      items = Array.isArray(candidate) ? candidate : [];
    } else {
      items = [];
    }

    if (items.length === 0) {
      return NextResponse.json({ erro: "IA não retornou itens. Tente reformular o texto.", raw: rawContent }, { status: 422 });
    }

    // Attach metadata to each item
    const enriched = items.map((item) => ({
      ...(item as Record<string, unknown>),
      me: me ?? "ME1",
      trimestre: trimestre ?? null,
      prova: prova ?? null,
    }));

    return NextResponse.json({ ok: true, tipo, itens: enriched, total: enriched.length });

  } catch (err) {
    console.error("[importar-ia]", err);
    return NextResponse.json(
      { erro: "Erro interno ao processar com IA.", detalhe: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
