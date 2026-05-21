import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IMPORT_SECRET = process.env.IMPORT_API_SECRET ?? "";
const CHUNK_SIZE = 200;

type FlashcardRow = {
  id: string;
  me: string;
  frente: string;
  verso: string;
  tags?: string[];
  especialidade?: string | null;
};

type SimuladoRow = {
  id: string;
  me: string;
  tema?: string | null;
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  correta: string;
  explicacao?: string | null;
};

type PushPayload = {
  flashcards?: FlashcardRow[];
  simulados?: SimuladoRow[];
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient<any>>;

async function upsertInChunks(
  supabase: AnySupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<{ updated: number; error: string | null }> {
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
    if (error) return { updated, error: error.message };
    updated += chunk.length;
  }
  return { updated, error: null };
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!IMPORT_SECRET || token !== IMPORT_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  let body: PushPayload;
  try {
    body = (await req.json()) as PushPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  if (body.flashcards?.length) {
    const { updated, error } = await upsertInChunks(supabase, "flashcards", body.flashcards as Record<string, unknown>[]);
    results.flashcards = error ? { error } : { updated };
    if (error) {
      return NextResponse.json({ error: `Flashcards: ${error}`, partial: results }, { status: 500 });
    }
  }

  if (body.simulados?.length) {
    const { updated, error } = await upsertInChunks(supabase, "simulados", body.simulados as Record<string, unknown>[]);
    results.simulados = error ? { error } : { updated };
    if (error) {
      return NextResponse.json({ error: `Simulados: ${error}`, partial: results }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, results });
}
