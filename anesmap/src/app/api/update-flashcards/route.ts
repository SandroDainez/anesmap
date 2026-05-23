import { NextRequest, NextResponse } from "next/server";

const IMPORT_SECRET = proces…RET;

export async function PATCH(req: NextRequest) {
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

  let body: { id: string; frente?: string; verso?: string }[];
  
  try {
    body = await req.json();
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

    const payload: Record<string, string> = {};
    if (item.frente !== undefined) payload.frente = item.frente;
    if (item.verso !== undefined) payload.verso = item.verso;

    if (Object.keys(payload).length === 0) {
      errors.push(`Item ${item.id} sem campos para atualizar`);
      continue;
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/flashcards?id=eq.${encodeURIComponent(item.id)}`,
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
    message: `${updated} flashcard(s) atualizado(s) com sucesso.${errors.length > 0 ? ` ${errors.length} erro(s).` : ""}`,
  });
}
