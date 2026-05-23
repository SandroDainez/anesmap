import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CasoSimulacao } from "@/lib/simulacao/systemPrompt";

/**
 * Public (auth-required) endpoint — returns active cases from the DB.
 * Used by the simulation page to merge DB cases with the hardcoded library.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json([], { status: 200 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("casos_simulacao")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  if (error || !data) return NextResponse.json([], { status: 200 });

  // Normalise DB rows to CasoSimulacao shape
  const casos: CasoSimulacao[] = (data as Record<string, unknown>[]).map((row) => ({
    id: (row.slug as string) ?? (row.id as string),
    titulo: row.titulo as string,
    descricao: (row.descricao as string) ?? "",
    dificuldade: (row.dificuldade as string) ?? "iniciante",
    nivel_recomendado: (row.nivel_recomendado as string[]) ?? ["ME1"],
    nivel_residente: ((row.nivel_recomendado as string[])?.[0]) ?? "ME1",
    duracao_estimada: (row.duracao_estimada as string) ?? "15 min",
    tags: (row.tags as string[]) ?? [],
    situacao_inicial: (row.situacao_inicial as string) ?? "",
    sinais_vitais_iniciais: (row.sinais_vitais_iniciais as CasoSimulacao["sinais_vitais_iniciais"]) ?? {
      PA: "120/80", FC: 72, SpO2: 98, ETCO2: 35, FR: 14, Temp: 36.5,
    },
    opcoes_iniciais: (row.opcoes_iniciais as string[]) ?? [],
    fases: Array.isArray(row.fases) ? (row.fases as CasoSimulacao["fases"]) : undefined,
  }));

  return NextResponse.json(casos);
}
