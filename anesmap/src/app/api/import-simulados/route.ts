import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IMPORT_SECRET = process.env.IMPORT_API_SECRET;

type SimuladoPayload = {
  me: string;
  trimestre?: string;
  prova?: string;
  tema?: string;
  enunciado: string;
  alternativaA: string;
  alternativaB: string;
  alternativaC: string;
  alternativaD: string;
  alternativaE?: string;
  correta: string;
  explicacaoA?: string;
  explicacaoB?: string;
  explicacaoC?: string;
  explicacaoD?: string;
  explicacaoE?: string;
  referencias?: string;
};

export async function POST(req: NextRequest) {
  // 1. Verificar chave secreta
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!IMPORT_SECRET || token !== IMPORT_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // 2. Verificar Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 3. Ler body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const simulados: SimuladoPayload[] = Array.isArray(body) ? body : [body as SimuladoPayload];

  if (simulados.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão recebida." }, { status: 400 });
  }

  // 4. Validar campos obrigatórios
  const invalid = simulados.filter(
    (q) =>
      !q.enunciado?.trim() ||
      !q.alternativaA?.trim() ||
      !q.alternativaB?.trim() ||
      !q.alternativaC?.trim() ||
      !q.alternativaD?.trim() ||
      !["A", "B", "C", "D", "E"].includes((q.correta ?? "").toUpperCase()),
  );

  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: `${invalid.length} questão(ões) com campos obrigatórios faltando (enunciado, alternativaA-D, correta).`,
        invalid,
      },
      { status: 400 },
    );
  }

  // 5. Inserir no Supabase
  const rows = simulados.map((q) => ({
    me: (q.me ?? "").toUpperCase() || null,
    trimestre: q.trimestre?.toLowerCase() || null,
    prova: q.prova?.toUpperCase() || null,
    tema: q.tema?.trim() || null,
    enunciado: q.enunciado.trim(),
    "alternativaA": q.alternativaA.trim(),
    "alternativaB": q.alternativaB.trim(),
    "alternativaC": q.alternativaC.trim(),
    "alternativaD": q.alternativaD.trim(),
    "alternativaE": q.alternativaE?.trim() || null,
    correta: q.correta.toUpperCase(),
    "explicacaoA": q.explicacaoA?.trim() || null,
    "explicacaoB": q.explicacaoB?.trim() || null,
    "explicacaoC": q.explicacaoC?.trim() || null,
    "explicacaoD": q.explicacaoD?.trim() || null,
    "explicacaoE": q.explicacaoE?.trim() || null,
    referencias: q.referencias?.trim() || null,
  }));

  const { data, error } = await supabase.from("simulados").insert(rows).select("id");

  if (error) {
    return NextResponse.json({ error: `Erro ao salvar: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? rows.length,
    message: `${data?.length ?? rows.length} questão(ões) salva(s) com sucesso.`,
  });
}
