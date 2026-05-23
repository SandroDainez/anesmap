"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MonitorVital } from "@/components/simulacao/MonitorVital";
import { FeedbackConduta } from "@/components/simulacao/FeedbackConduta";
import { DesfechoFinal } from "@/components/simulacao/DesfechoFinal";
import { CASOS_SIMULACAO } from "@/lib/simulacao/casos";
import type { SinaisVitais, HistoricoItem } from "@/lib/simulacao/systemPrompt";
import { loadMyProfile } from "@/lib/user-study";

type Avaliacao = "correto" | "parcial" | "incorreto" | "tardio";

type TurnoResposta = {
  avaliacao: Avaliacao;
  feedback: string;
  explicacao_clinica?: string;
  sinais_vitais: SinaisVitais;
  nova_situacao: string;
  opcoes: string[];
  turno_atual: number;
  pontuacao_turno: number;
  desfecho?: "recuperacao" | "complicacao" | "obito";
  resumo_final?: string;
  pontos_fortes?: string[];
  pontos_melhorar?: string[];
};

type HistoricoLocal = HistoricoItem & {
  avaliacao_ia?: string;
  conduta_usuario?: string;
  turno?: number;
};

export default function SimulacaoAtiva() {
  const { caso_id } = useParams<{ caso_id: string }>();
  const router = useRouter();

  const caso = CASOS_SIMULACAO.find((c) => c.id === caso_id);

  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [userNivel, setUserNivel] = useState("ME1");
  const [iniciando, setIniciando] = useState(true);
  const [erroInicio, setErroInicio] = useState<string | null>(null);

  const [sinaisAtuais, setSinaisAtuais] = useState<SinaisVitais | null>(null);
  const [situacaoAtual, setSituacaoAtual] = useState<string>("");
  const [opcoesAtuais, setOpcoesAtuais] = useState<string[]>([]);
  const [historico, setHistorico] = useState<HistoricoLocal[]>([]);
  const [turno, setTurno] = useState(1);
  const [pontuacaoTotal, setPontuacaoTotal] = useState(0);

  const [ultimoFeedback, setUltimoFeedback] = useState<TurnoResposta | null>(null);
  const [desfecho, setDesfecho] = useState<TurnoResposta | null>(null);

  const [condutaTexto, setCondutaTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tempoInicio = useRef<number>(Date.now());

  useEffect(() => {
    if (!caso) return;
    void (async () => {
      const perfil = await loadMyProfile();
      const nivel = (perfil as { nivel?: string } | null)?.nivel ?? "ME1";
      setUserNivel(nivel);

      const res = await fetch("/api/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "iniciar", caso_id }),
      });

      const data = await res.json() as { sessao_id?: string; erro?: string; mensagem?: string };

      if (!res.ok || !data.sessao_id) {
        setErroInicio(data.mensagem ?? data.erro ?? "Erro ao iniciar simulação.");
        setIniciando(false);
        return;
      }

      setSessaoId(data.sessao_id);
      setSinaisAtuais(caso.sinais_vitais_iniciais);
      setSituacaoAtual(caso.situacao_inicial);
      setOpcoesAtuais(caso.opcoes_iniciais);
      setIniciando(false);
      tempoInicio.current = Date.now();
    })();
  }, [caso, caso_id]);

  async function enviarConduta(conduta: string) {
    if (!sessaoId || !caso || enviando) return;
    setEnviando(true);
    const tempo_resposta_segundos = Math.round((Date.now() - tempoInicio.current) / 1000);

    const historicoParaApi: HistoricoItem[] = historico.map((h) => ({
      situacao: h.situacao,
      conduta: h.conduta,
      avaliacao: h.avaliacao,
      feedback: h.feedback,
      nova_situacao: h.nova_situacao,
      pontuacao_turno: h.pontuacao_turno,
    }));

    const res = await fetch("/api/simulacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "continuar",
        caso_id,
        sessao_id: sessaoId,
        conduta,
        historico: historicoParaApi,
        turno,
        nivel_residente: userNivel,
        tempo_resposta_segundos,
      }),
    });

    const resultado = await res.json() as TurnoResposta;
    setEnviando(false);
    setCondutaTexto("");
    tempoInicio.current = Date.now();

    const novoHistorico: HistoricoLocal = {
      situacao: situacaoAtual,
      conduta,
      avaliacao: resultado.avaliacao,
      feedback: resultado.feedback,
      nova_situacao: resultado.nova_situacao,
      pontuacao_turno: resultado.pontuacao_turno,
      avaliacao_ia: resultado.avaliacao,
      conduta_usuario: conduta,
      turno,
    };

    setHistorico((h) => [...h, novoHistorico]);
    setPontuacaoTotal((p) => p + (resultado.pontuacao_turno ?? 0));
    setUltimoFeedback(resultado);

    if (resultado.desfecho) {
      setDesfecho(resultado);
    } else {
      setSinaisAtuais(resultado.sinais_vitais);
      setSituacaoAtual(resultado.nova_situacao);
      setOpcoesAtuais(resultado.opcoes ?? []);
      setTurno((t) => t + 1);
    }
  }

  if (!caso) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted">Caso não encontrado.</p>
      </main>
    );
  }

  if (iniciando) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          <p className="text-sm text-muted">Iniciando simulação...</p>
        </div>
      </main>
    );
  }

  if (erroInicio) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-red-500/30 bg-card p-6 text-center">
          <p className="mb-2 text-2xl">🔒</p>
          <p className="mb-4 text-sm text-foreground">{erroInicio}</p>
          <button
            onClick={() => router.push("/simulacao")}
            className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-black"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  if (desfecho) {
    return (
      <main className="min-h-screen px-4 pb-32 pt-6">
        <button
          onClick={() => router.push("/simulacao")}
          className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <DesfechoFinal
          desfecho={desfecho.desfecho!}
          pontuacao_final={pontuacaoTotal}
          historico={historico}
          resumo_final={desfecho.resumo_final ?? ""}
          pontos_fortes={desfecho.pontos_fortes ?? []}
          pontos_melhorar={desfecho.pontos_melhorar ?? []}
          onTentarNovamente={() => router.refresh()}
          onEscolherOutro={() => router.push("/simulacao")}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-32 pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/simulacao")}
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="text-right text-xs text-muted">
          <span className="font-semibold text-foreground">Turno {turno}</span>
          {" · "}
          <span className="text-teal font-semibold">{pontuacaoTotal} pts</span>
        </div>
      </div>

      <h1 className="mb-4 text-base font-bold text-foreground">{caso.titulo}</h1>

      {/* Monitor de sinais vitais */}
      {sinaisAtuais && (
        <div className="mb-4">
          <MonitorVital sinais_vitais={sinaisAtuais} animado />
        </div>
      )}

      {/* Situação atual */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Situação</p>
        <p className="text-sm leading-relaxed text-foreground">{situacaoAtual}</p>
      </div>

      {/* Feedback do último turno */}
      <AnimatePresence mode="wait">
        {ultimoFeedback && !desfecho && (
          <div className="mb-4">
            <FeedbackConduta
              key={turno}
              avaliacao={ultimoFeedback.avaliacao}
              feedback={ultimoFeedback.feedback}
              explicacao_clinica={ultimoFeedback.explicacao_clinica}
              pontuacao_turno={ultimoFeedback.pontuacao_turno}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Opções rápidas */}
      {opcoesAtuais.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Opções de conduta
          </p>
          {opcoesAtuais.map((opcao) => (
            <button
              key={opcao}
              onClick={() => void enviarConduta(opcao)}
              disabled={enviando}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition hover:border-teal/40 hover:bg-white/5 disabled:opacity-50"
            >
              {opcao}
            </button>
          ))}
        </div>
      )}

      {/* Input livre */}
      <div className="flex gap-2">
        <input
          value={condutaTexto}
          onChange={(e) => setCondutaTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && condutaTexto.trim()) {
              void enviarConduta(condutaTexto.trim());
            }
          }}
          placeholder="Ou descreva sua conduta livremente..."
          disabled={enviando}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-teal focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => condutaTexto.trim() && void enviarConduta(condutaTexto.trim())}
          disabled={enviando || !condutaTexto.trim()}
          className="flex items-center justify-center rounded-xl bg-teal px-4 text-black transition hover:opacity-90 disabled:opacity-40"
        >
          {enviando ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      {enviando && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-xs text-muted"
        >
          IA avaliando conduta...
        </motion.p>
      )}
    </main>
  );
}
