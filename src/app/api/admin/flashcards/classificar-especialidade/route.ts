import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import OpenAI from "openai";

const ESPECIALIDADES = [
  "Farmacologia dos Opioides", "Farmacologia dos Anestésicos Inalatórios",
  "Farmacologia dos Anestésicos Venosos", "Bloqueio Neuromuscular",
  "Via Aérea", "Ventilação Mecânica", "Monitorização Anestésica",
  "Anestesia Regional", "Bloqueio de Neuroeixo", "Anestesia Locorregional",
  "Anestesia Obstétrica", "Anestesia Pediátrica", "Anestesia Cardíaca",
  "Anestesia Torácica", "Neuroanestesia", "Anestesia para Trauma",
  "Anestesia Ambulatorial", "Dor Aguda", "Dor Crônica",
  "Cuidados Intensivos", "Reanimação Cardiopulmonar", "Sepse",
  "Complicações Anestésicas", "Fisiologia Cardiovascular",
  "Fisiologia Respiratória", "Fisiologia Renal", "Fisiologia Neurológica",
  "Anatomia", "Geriatria", "Obesidade", "Posicionamento Cirúrgico",
  "Equipamentos e Aparelhos", "TIVA", "Anestesia Geral",
  "Anestesia Endócrina e Metabólica",
];

const BATCH_SIZE = 40;

export async function POST() {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY não configurada." }, { status: 500 });

  // Busca próximo lote de flashcards sem especialidade
  const { data: rows, error: fetchErr } = await supabase
    .from("flashcards")
    .select("id, frente, verso")
    .or("especialidade.is.null,especialidade.eq.")
    .limit(BATCH_SIZE);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ processados: 0, restantes: 0, mensagem: "Todos os flashcards já têm especialidade!" });
  }

  // Conta total sem especialidade
  const { count: restantesTotal } = await supabase
    .from("flashcards")
    .select("id", { count: "exact", head: true })
    .or("especialidade.is.null,especialidade.eq.");

  // Prepara payload para IA — usa frente + início do verso
  const cardsTexto = rows.map((r, i) =>
    `${i + 1}. [ID:${r.id}]\nPergunta: ${(r.frente as string).slice(0, 200)}\nResposta: ${(r.verso as string).slice(0, 150)}`
  ).join("\n\n");

  const client = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey });

  let classified: { id: string; especialidade: string }[] = [];
  try {
    const resp = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em anestesiologia. Classifique cada flashcard em UMA das seguintes especialidades:\n${ESPECIALIDADES.join(", ")}\n\nRetorne APENAS um array JSON:\n[{"id":"<id>","especialidade":"<especialidade>"},...]\n\nSem texto adicional, sem markdown.`,
        },
        {
          role: "user",
          content: `Classifique os flashcards:\n\n${cardsTexto}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = resp.choices[0].message.content ?? "[]";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = []; }

    if (Array.isArray(parsed)) {
      classified = parsed as { id: string; especialidade: string }[];
    } else if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const candidate = obj.classificacoes ?? obj.especialidades ?? obj.items ?? obj.data ?? Object.values(obj)[0];
      classified = Array.isArray(candidate) ? candidate as { id: string; especialidade: string }[] : [];
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

  // Atualiza banco
  let atualizados = 0;
  for (const item of classified) {
    if (!item.id || !item.especialidade) continue;
    const { error } = await supabase
      .from("flashcards")
      .update({ especialidade: item.especialidade.trim() })
      .eq("id", item.id);
    if (!error) atualizados++;
  }

  const restantes = Math.max(0, (restantesTotal ?? 0) - atualizados);

  return NextResponse.json({
    processados: atualizados,
    restantes,
    mensagem: `${atualizados} flashcards classificados. ${restantes} ainda sem especialidade.`,
  });
}
