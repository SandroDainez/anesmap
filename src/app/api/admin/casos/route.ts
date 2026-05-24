import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";

// Whitelist of columns that can be written by the admin UI
const ALLOWED_FIELDS = new Set([
  "slug", "titulo", "descricao", "dificuldade", "nivel_recomendado",
  "duracao_estimada", "tags", "situacao_inicial", "sinais_vitais_iniciais",
  "opcoes_iniciais", "fases", "ativo", "revisado",
]);

function sanitizeBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([k]) => ALLOWED_FIELDS.has(k)),
  );
}

export async function GET() {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("casos_simulacao")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { user, supabase } = ctx;

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json({ error: "Corpo inválido." }, { status: 400 }); }

  const body = sanitizeBody(rawBody);
  if (!body.slug || !body.titulo) {
    return NextResponse.json({ error: "slug e titulo são obrigatórios." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("casos_simulacao")
    .insert({ ...body, criado_por: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json({ error: "Corpo inválido." }, { status: 400 }); }

  const body = sanitizeBody(rawBody);
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("casos_simulacao")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase } = ctx;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

  const { error } = await supabase.from("casos_simulacao").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
