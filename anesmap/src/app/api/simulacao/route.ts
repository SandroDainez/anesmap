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

    const body = await request.json() as {
      acao: "iniciar" | "continuar";
      caso_id?: string;
      sessao_id?: string;
      conduta?: string;
      historico?: HistoricoItem[];
      turno?: number;
      nivel_residente?: string;
      tempo_resposta_segundos?: number;
    };

    const { acao, caso_id, sessao_id, conduta, historico = [], turno, nivel_residente, tempo_resposta_segundos } = body;

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

      const caso = CASOS_SIMULACAO.find((c) => c.id === caso_id);
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

      const casoAtual = CASOS_SIMULACAO.find((c) => c.id === caso_id);
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
        tipo_conduta: conduta.length < 60 ? "opcao_rapida" : "digitada",
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
