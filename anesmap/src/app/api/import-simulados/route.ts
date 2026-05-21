import { NextRequest, NextResponse } from "next/server";

const IMPORT_SECRET = process.env.IMPORT_API_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!IMPORT_SECRET || token !== IMPORT_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const items: Record<string, string>[] = Array.isArray(body) ? body : [body as Record<string, string>];
  if (items.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão recebida." }, { status: 400 });
  }

  // Validar campos obrigatórios
  const invalid = items.filter(
    (q) =>
      !q.enunciado?.trim() ||
      !q.alternativaA?.trim() ||
      !q.alternativaB?.trim() ||
      !q.alternativaC?.trim() ||
      !q.alternativaD?.trim() ||
      !["A", "B", "C", "D", "E"].includes((q.correta ?? "").toUpperCase()),
  );

  if (invalid.length > 0) {
    return NextResponse.json({
      error: `${invalid.length} questão(ões) com campos obrigatórios faltando.`,
    }, { status: 400 });
  }

  // Montar rows no formato exato do banco (underscore)
  const rows = items.map((q, idx) => ({
    id: `q_${Date.now()}_${idx}`,
    me: (q.me ?? "").toUpperCase() || null,
    trimestre: q.trimestre?.toUpperCase() || null,
    prova: q.prova?.toUpperCase() || null,
    tema: q.tema?.trim() || null,
    enunciado: q.enunciado.trim(),
    alternativa_a: q.alternativaA.trim(),
    alternativa_b: q.alternativaB.trim(),
    alternativa_c: q.alternativaC.trim(),
    alternativa_d: q.alternativaD.trim(),
    alternativa_e: q.alternativaE?.trim() || null,
    correta: q.correta.toUpperCase(),
    explicacao_a: q.explicacaoA?.trim() || null,
    explicacao_b: q.explicacaoB?.trim() || null,
    explicacao_c: q.explicacaoC?.trim() || null,
    explicacao_d: q.explicacaoD?.trim() || null,
    explicacao_e: q.explicacaoE?.trim() || null,
    explicacao: q.explicacao?.trim() || null,
  }));

  const res = await fetch(`${supabaseUrl}/rest/v1/simulados`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Erro ao salvar: ${err}` }, { status: 500 });
  }

  const data = await res.json() as { id: string }[];
  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? rows.length,
    message: `${data?.length ?? rows.length} questão(ões) salva(s) com sucesso.`,
  });
}
