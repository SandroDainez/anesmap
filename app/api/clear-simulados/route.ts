import { NextRequest, NextResponse } from "next/server";

const IMPORT_SECRET = process.env.IMPORT_API_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!IMPORT_SECRET || token !== IMPORT_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Service role key não configurada." }, { status: 500 });
  }

  // SQL via Supabase REST API
  const sql = `TRUNCATE TABLE simulados`;
  
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Try direct delete as fallback
    const res2 = await fetch(`${supabaseUrl}/rest/v1/simulados?id=neq.0`, {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=minimal",
      },
    });
    if (!res2.ok) {
      const err2 = await res2.text();
      return NextResponse.json({ error: `Falha ao limpar: ${err2}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Dados limpos via DELETE direto." });
  }

  return NextResponse.json({ ok: true, message: "Tabela truncada com sucesso." });
}
