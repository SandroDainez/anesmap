import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const IMPORT_SECRET = process.env.IMPORT_API_SECRET;

type FlashcardPayload = {
  id?: string;
  me: string;
  trimestre?: string;
  frente: string;
  verso: string;
  tags?: string[];
  especialidade?: string;
};

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!IMPORT_SECRET || token !== IMPORT_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // 2. Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 3. Parse body
  let cards: FlashcardPayload[];
  try {
    cards = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    return NextResponse.json({ error: "Envie um array com pelo menos 1 card." }, { status: 400 });
  }

  // 4. Validate and prepare - apenas colunas que existem na tabela
  const rows = cards.map((c) => ({
    id: c.id || crypto.randomUUID(),
    me: c.me,
    trimestre: c.trimestre || null,
    frente: c.frente,
    verso: c.verso,
  }));

  // 5. Insert
  const { error } = await supabase.from("flashcards").insert(rows);

  if (error) {
    console.error("Erro ao inserir flashcards:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: rows.length,
    message: `${rows.length} card(s) salvo(s) com sucesso.`,
  });
}
