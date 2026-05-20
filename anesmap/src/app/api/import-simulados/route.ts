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

  // Ler body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body] as any[];
  if (items.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão recebida." }, { status: 400 });
  }

  // Validar
  const invalid = items.filter(
    (q: any) =>
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

  // Montar rows com nomes minúsculos (padrão Postgres)
  const rows = items.map((q: any) => ({
    me: (q.me ?? "").toUpperCase() || null,
    trimestre: q.trimestre?.toLowerCase() || null,
    prova: q.prova?.toUpperCase() || null,
    tema: q.tema?.trim() || null,
    enunciado: q.enunciado.trim(),
    "alternativaa": q.alternativaA.trim(),
    "alternativab": q.alternativaB.trim(),
    "alternativac": q.alternativaC.trim(),
    "alternativad": q.alternativaD.trim(),
    "alternativae": q.alternativaE?.trim() || null,
    correta: q.correta.toUpperCase(),
    "explicacaoa": q.explicacaoA?.trim() || null,
    "explicacaob": q.explicacaoB?.trim() || null,
    "explicacaoc": q.explicacaoC?.trim() || null,
    "explicacaod": q.explicacaoD?.trim() || null,
    "explicacaoe": q.explicacaoE?.trim() || null,
    referencias: q.referencias?.trim() || null,
  }));

  // Inserir via REST API direta
  const res = await fetch(`${supabaseUrl}/rest/v1/simulados`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Se deu erro de coluna, tentar com nomes maiúsculos
    if (errText.includes("column")) {
      const rowsUpper = items.map((q: any) => ({
        me: (q.me ?? "").toUpperCase() || null,
        trimestre: q.trimestre?.toLowerCase() || null,
        prova: q.prova?.toUpperCase() || null,
        tema: q.tema?.trim() || null,
        enunciado: q.enunciado.trim(),
        alternativaA: q.alternativaA.trim(),
        alternativaB: q.alternativaB.trim(),
        alternativaC: q.alternativaC.trim(),
        alternativaD: q.alternativaD.trim(),
        alternativaE: q.alternativaE?.trim() || null,
        correta: q.correta.toUpperCase(),
        explicacaoA: q.explicacaoA?.trim() || null,
        explicacaoB: q.explicacaoB?.trim() || null,
        explicacaoC: q.explicacaoC?.trim() || null,
        explicacaoD: q.explicacaoD?.trim() || null,
        explicacaoE: q.explicacaoE?.trim() || null,
        referencias: q.referencias?.trim() || null,
      }));

      const res2 = await fetch(`${supabaseUrl}/rest/v1/simulados`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(rowsUpper),
      });

      if (!res2.ok) {
        const err2 = await res2.text();
        return NextResponse.json({ error: `Erro ao salvar: ${err2}` }, { status: 500 });
      }

      const data = await res2.json();
      return NextResponse.json({
        ok: true,
        inserted: data?.length ?? rows.length,
        message: `${data?.length ?? rows.length} questão(ões) salva(s) com sucesso.`,
      });
    }

    return NextResponse.json({ error: `Erro ao salvar: ${errText}` }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? rows.length,
    message: `${data?.length ?? rows.length} questão(ões) salva(s) com sucesso.`,
  });
}
