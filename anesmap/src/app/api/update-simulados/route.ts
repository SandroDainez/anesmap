import { NextRequest, NextResponse } from "next/server";

const IMPORT_SECRET = process.env.IMPORT_API_SECRET;

export async function PATCH(req: NextRequest) {
  // Auth
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
    Prefer: "return=minimal",
  };

  type UpdateItem = {
    id?: string;
    frente?: string;
    verso?: string;
    explicacaoA?: string;
    explicacaoB?: string;
    explicacaoC?: string;
    explicacaoD?: string;
    explicacaoE?: string;
    referencias?: string;
  };

  let body: UpdateItem[];

  try {
    body = await req.json() as UpdateItem[];
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: "Envie um array com pelo menos 1 item." }, { status: 400 });
  }

  let updated = 0;
  let errors: string[] = [];

  for (const item of body) {
    if (!item.id) {
      errors.push("Item sem id");
      continue;
    }

    // Build the update payload with Supabase column names (snake_case)
    const payload: Record<string, string> = {};
    const isFlashcard = item.frente !== undefined || item.verso !== undefined;
    if (item.explicacaoA !== undefined) payload.explicacao_a = item.explicacaoA;
    if (item.explicacaoB !== undefined) payload.explicacao_b = item.explicacaoB;
    if (item.explicacaoC !== undefined) payload.explicacao_c = item.explicacaoC;
    if (item.explicacaoD !== undefined) payload.explicacao_d = item.explicacaoD;
    if (item.explicacaoE !== undefined) payload.explicacao_e = item.explicacaoE;
    if (item.frente !== undefined) payload.frente = item.frente;
    if (item.verso !== undefined) payload.verso = item.verso;

    if (Object.keys(payload).length === 0) {
      errors.push(`Item ${item.id} sem campos para atualizar`);
      continue;
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${isFlashcard ? "flashcards" : "simulados"}?id=eq.${encodeURIComponent(item.id)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      errors.push(`Erro ao atualizar ${item.id}: ${errText}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    errors: errors.length > 0 ? errors : undefined,
    message: `${updated} questão(ões) atualizada(s) com sucesso.${errors.length > 0 ? ` ${errors.length} erro(s).` : ""}`,
  });
}
