import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import OpenAI from "openai";

const TEMAS_PADRAO = [
  "Farmacologia", "TIVA", "Via Aérea", "Ventilação", "Monitorização",
  "Bloqueio Neuromuscular", "Anestesia Regional", "Anestesia Obstétrica",
  "Anestesia Pediátrica", "Anestesia Cardíaca", "Anestesia Torácica",
  "Neuroanestesia", "Anestesia para Trauma", "Anestesia Ambulatorial",
  "Dor Aguda", "Dor Crônica", "Cuidados Intensivos", "Reanimação",
  "Sepse", "Complicações Anestésicas", "Fisiologia", "Anatomia",
  "Geriatria", "Obesidade", "Posicionamento", "Equipamentos",
  "Anestesia Geral", "Bloqueio de Neuroeixo", "Anestesia Locorregional",
];

const BATCH_SIZE = 40; // questões por chamada de IA

export async function POST() {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY não configurada." }, { status: 500 });

  // Busca próximo lote de simulados sem tema
  const { data: rows, error: fetchErr } = await supabase
    .from("simulados")
    .select("id, enunciado")
    .or("tema.is.null,tema.eq.")
    .limit(BATCH_SIZE);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ processados: 0, restantes: 0, mensagem: "Todas as questões já têm tema!" });
  }

  // Conta total sem tema (para mostrar progresso)
  const { count: restantesTotal } = await supabase
    .from("simulados")
    .select("id", { count: "exact", head: true })
    .or("tema.is.null,tema.eq.");

  // Prepara payload para IA
  const questoesTexto = rows.map((r, i) =>
    `${i + 1}. [ID:${r.id}] ${(r.enunciado as string).slice(0, 300)}`
  ).join("\n\n");

  const client = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey });

  let classified: { id: string; tema: string }[] = [];
  try {
    const resp = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em anestesiologia. Classifique cada questão abaixo em UM dos seguintes temas padrão:\n${TEMAS_PADRAO.join(", ")}\n\nRetorne APENAS um array JSON no formato:\n[{"id":"<id>","tema":"<tema>"},...]\n\nSem texto adicional, sem markdown.`,
        },
        {
          role: "user",
          content: `Classifique as questões abaixo:\n\n${questoesTexto}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = resp.choices[0].message.content ?? "[]";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = []; }

    // Normaliza resposta (pode vir como { classificacoes: [...] } ou array direto)
    if (Array.isArray(parsed)) {
      classified = parsed as { id: string; tema: string }[];
    } else if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const candidate = obj.classificacoes ?? obj.temas ?? obj.items ?? obj.data ?? Object.values(obj)[0];
      classified = Array.isArray(candidate) ? candidate as { id: string; tema: string }[] : [];
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Erro na chamada à IA.", detalhe: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  if (classified.length === 0) {
    return NextResponse.json({ error: "IA não retornou classificações." }, { status: 422 });
  }

  // Atualiza banco em lote
  let atualizados = 0;
  for (const item of classified) {
    if (!item.id || !item.tema) continue;
    const tema = TEMAS_PADRAO.includes(item.tema) ? item.tema : item.tema.trim();
    const { error } = await supabase
      .from("simulados")
      .update({ tema })
      .eq("id", item.id);
    if (!error) atualizados++;
  }

  const restantes = Math.max(0, (restantesTotal ?? 0) - atualizados);

  return NextResponse.json({
    processados: atualizados,
    restantes,
    mensagem: `${atualizados} questões classificadas. ${restantes} ainda sem tema.`,
  });
}
