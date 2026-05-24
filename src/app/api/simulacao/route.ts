import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gerarRespostaSimulacao } from "@/lib/ai/deepseek";
import { SYSTEM_PROMPT_SIMULACAO, montarMensagem } from "@/lib/simulacao/systemPrompt";
import type { HistoricoItem, CasoSimulacao } from "@/lib/simulacao/systemPrompt";
import { verificarLimite, incrementarUso } from "@/lib/simulacao/limite";
import { CASOS_SIMULACAO } from "@/lib/simulacao/casos";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ erro: "configuracao_invalida" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
    }

    // Verify user is active (not pending or blocked)
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    const userStatus = (profileRow as { status?: string } | null)?.status ?? "active";
    if (userStatus !== "active") {
      return NextResponse.json({ erro: "acesso_negado" }, { status: 403 });
    }

    const body = await request.json() as {
      acao: "iniciar" | "continuar";
      caso_id?: string;
      sessao_id?: string;
      conduta?: string;
      tipo_conduta?: "opcao_rapida" | "digitada";
      historico?: HistoricoItem[];
      turno?: number;
      nivel_residente?: string;
      tempo_resposta_segundos?: number;
    };

    const { acao, caso_id, sessao_id, conduta, historico = [], turno, nivel_residente, tempo_resposta_segundos, tipo_conduta } = body;

    // ─── INICIAR NOVA SIMULAÇÃO ───────────────────────────────
    if (acao === "iniciar") {
      const limite = await verificarLimite(user.id);
      if (!limite.pode_simular) {
        return NextResponse.json(
          {
            erro: "limite_atingido",
            usadas: limite.usadas,
            limite: limite.limite,
            dias_para_renovar: limite.dias_para_renovar,
            mensagem: `Você utilizou todas as ${limite.limite} simulações disponíveis este mês. Novas simulações estarão disponíveis em ${limite.dias_para_renovar} dias.`,
          },
          { status: 429 },
        );
      }

      // Look up case: first in hardcoded library, then in DB
      let caso = CASOS_SIMULACAO.find((c) => c.id === caso_id);
      if (!caso && caso_id) {
        // caso_id from URL is always a slug for DB cases; only use id lookup if it's a valid UUID
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = UUID_RE.test(caso_id);
        const dbQuery = supabase.from("casos_simulacao").select("*").eq("ativo", true);
        const { data: dbCaso } = await (
          isUuid ? dbQuery.eq("id", caso_id) : dbQuery.eq("slug", caso_id)
        ).single();
        if (dbCaso) {
          const row = dbCaso as Record<string, unknown>;
          caso = {
            id: row.slug as string ?? row.id as string,
            titulo: row.titulo as string,
            descricao: row.descricao as string ?? "",
            dificuldade: row.dificuldade as string ?? "iniciante",
            nivel_recomendado: (row.nivel_recomendado as string[]) ?? ["ME1"],
            nivel_residente: ((row.nivel_recomendado as string[])?.[0]) ?? "ME1",
            duracao_estimada: row.duracao_estimada as string ?? "15 min",
            tags: (row.tags as string[]) ?? [],
            situacao_inicial: row.situacao_inicial as string ?? "",
            sinais_vitais_iniciais: (row.sinais_vitais_iniciais as CasoSimulacao["sinais_vitais_iniciais"]) ?? {
              PA: "120/80", FC: 72, SpO2: 98, ETCO2: 35, FR: 14, Temp: 36.5,
            },
            opcoes_iniciais: (row.opcoes_iniciais as string[]) ?? [],
            fases: Array.isArray(row.fases) ? (row.fases as CasoSimulacao["fases"]) : undefined,
          };
        }
      }
      if (!caso) {
        return NextResponse.json({ erro: "caso_nao_encontrado" }, { status: 404 });
      }

      const mesAtual = new Date().toISOString().slice(0, 7);
      const { data: sessao, error: sessaoError } = await supabase
        .from("simulacao_sessoes")
        .insert({
          usuario_id: user.id,
          caso_id,
          caso_titulo: caso.titulo,
          mes_ano: mesAtual,
        })
        .select()
        .single();

      if (sessaoError || !sessao) {
        return NextResponse.json({ erro: "erro_criar_sessao" }, { status: 500 });
      }

      await incrementarUso(user.id);

      return NextResponse.json({
        sessao_id: (sessao as { id: string }).id,
        limite_atualizado: {
          usadas: limite.usadas + 1,
          restantes: limite.restantes - 1,
          limite: limite.limite,
        },
      });
    }

    // ─── CONTINUAR SIMULAÇÃO (enviar conduta) ─────────────────
    if (acao === "continuar") {
      if (!sessao_id || !conduta || !caso_id) {
        return NextResponse.json({ erro: "parametros_invalidos" }, { status: 400 });
      }

      let casoAtual = CASOS_SIMULACAO.find((c) => c.id === caso_id);
      if (!casoAtual && caso_id) {
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = UUID_RE.test(caso_id);
        const dbQuery = supabase.from("casos_simulacao").select("*").eq("ativo", true);
        const { data: dbRow } = await (
          isUuid ? dbQuery.eq("id", caso_id) : dbQuery.eq("slug", caso_id)
        ).single();
        if (dbRow) {
          const row = dbRow as Record<string, unknown>;
          casoAtual = {
            id: row.slug as string ?? row.id as string,
            titulo: row.titulo as string,
            descricao: row.descricao as string ?? "",
            dificuldade: row.dificuldade as string ?? "iniciante",
            nivel_recomendado: (row.nivel_recomendado as string[]) ?? ["ME1"],
            nivel_residente: ((row.nivel_recomendado as string[])?.[0]) ?? "ME1",
            duracao_estimada: row.duracao_estimada as string ?? "15 min",
            tags: (row.tags as string[]) ?? [],
            situacao_inicial: row.situacao_inicial as string ?? "",
            sinais_vitais_iniciais: (row.sinais_vitais_iniciais as CasoSimulacao["sinais_vitais_iniciais"]) ?? {
              PA: "120/80", FC: 72, SpO2: 98, ETCO2: 35, FR: 14, Temp: 36.5,
            },
            opcoes_iniciais: (row.opcoes_iniciais as string[]) ?? [],
            fases: Array.isArray(row.fases) ? (row.fases as CasoSimulacao["fases"]) : undefined,
          };
        }
      }
      if (!casoAtual) {
        return NextResponse.json({ erro: "caso_nao_encontrado" }, { status: 404 });
      }

      const casoComNivel: CasoSimulacao = {
        ...casoAtual,
        nivel_residente: nivel_residente ?? casoAtual.nivel_residente,
      };

      const mensagem = montarMensagem(casoComNivel, historico, conduta);
      const resultado = await gerarRespostaSimulacao(SYSTEM_PROMPT_SIMULACAO, mensagem);

      const situacaoAtual =
        historico.length === 0
          ? casoAtual.situacao_inicial
          : (historico[historico.length - 1]?.nova_situacao ?? "");

      await supabase.from("simulacao_passos").insert({
        sessao_id,
        turno: turno ?? historico.length + 1,
        situacao_apresentada: situacaoAtual,
        sinais_vitais: resultado.sinais_vitais,
        conduta_usuario: conduta,
        tipo_conduta: tipo_conduta ?? (conduta.length < 60 ? "opcao_rapida" : "digitada"),
        avaliacao_ia: resultado.avaliacao,
        feedback_ia: resultado.feedback,
        nova_situacao: resultado.nova_situacao,
        pontuacao_turno: resultado.pontuacao_turno,
        tempo_resposta_segundos: tempo_resposta_segundos ?? 0,
      });

      if (resultado.desfecho) {
        const pontuacaoTotal =
          historico.reduce((acc, h) => acc + (h.pontuacao_turno ?? 0), 0) +
          ((resultado.pontuacao_turno as number) ?? 0);

        await supabase
          .from("simulacao_sessoes")
          .update({
            status: "concluida",
            desfecho: resultado.desfecho,
            pontuacao_final: pontuacaoTotal,
            concluida_em: new Date().toISOString(),
          })
          .eq("id", sessao_id);
      }

      return NextResponse.json(resultado);
    }

    return NextResponse.json({ erro: "acao_invalida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na simulação:", error);
    return NextResponse.json(
      { erro: "erro_interno", mensagem: "Erro ao processar a simulação. Tente novamente." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ erro: "configuracao_invalida" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });

  const limite = await verificarLimite(user.id);
  return NextResponse.json(limite);
}
