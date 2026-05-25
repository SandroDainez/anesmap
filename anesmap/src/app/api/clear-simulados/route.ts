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
    return NextResponse.json({ error: "Service role key não configurada no Vercel." }, { status: 500 });
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/simulados?id=neq.0`, {
    method: "DELETE",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "return=minimal",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Falha ao limpar: ${err.substring(0,200)}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Tabela de simulados limpa." });
}
