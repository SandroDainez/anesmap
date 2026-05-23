import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";

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

  const body = await request.json();
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

  const body = await request.json();
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
