"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

type Desfecho = "recuperacao" | "complicacao" | "obito";

type HistoricoItem = {
  conduta_usuario?: string;
  avaliacao_ia?: string;
  pontuacao_turno?: number;
  turno?: number;
  feedback?: string;
  explicacao_clinica?: string;
  situacao?: string;
  nova_situacao?: string;
};

type Props = {
  desfecho: Desfecho;
  pontuacao_final: number;
  historico: HistoricoItem[];
  resumo_final: string;
  pontos_fortes: string[];
  pontos_melhorar: string[];
  onTentarNovamente: () => void;
  onEscolherOutro: () => void;
};

const desfechoConfig: Record<Desfecho, { icon: React.ReactNode; titulo: string; bg: string; cor: string }> = {
  recuperacao: {
    icon: <CheckCircle size={48} className="text-green-400" />,
    titulo: "Paciente Recuperado",
    bg: "bg-green-500/10 border-green-500/30",
    cor: "text-green-400",
  },
  complicacao: {
    icon: <AlertTriangle size={48} className="text-yellow-400" />,
    titulo: "Complicação Ocorreu",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    cor: "text-yellow-400",
  },
  obito: {
    icon: <XCircle size={48} className="text-red-400" />,
    titulo: "Óbito do Paciente",
    bg: "bg-red-500/10 border-red-500/30",
    cor: "text-red-400",
  },
};

type AvaliacaoKey = "correto" | "parcial" | "incorreto" | "tardio";

const avaliacaoConfig: Record<AvaliacaoKey, { label: string; bg: string; text: string }> = {
  correto: { label: "Correto", bg: "bg-green-500/15", text: "text-green-400" },
  parcial: { label: "Parcial", bg: "bg-yellow-500/15", text: "text-yellow-400" },
  incorreto: { label: "Incorreto", bg: "bg-red-500/15", text: "text-red-400" },
  tardio: { label: "Tardio", bg: "bg-orange-500/15", text: "text-orange-400" },
};

function AvaliacaoBadge({ avaliacao }: { avaliacao: string | undefined }) {
  const cfg = avaliacaoConfig[avaliacao as AvaliacaoKey] ?? { label: avaliacao ?? "—", bg: "bg-white/10", text: "text-muted" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export function DesfechoFinal({
  desfecho,
  pontuacao_final,
  historico,
  resumo_final,
  pontos_fortes,
  pontos_melhorar,
  onTentarNovamente,
  onEscolherOutro,
}: Props) {
  const cfg = desfechoConfig[desfecho] ?? desfechoConfig.complicacao;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 pb-24"
    >
      {/* Desfecho principal */}
      <div className={`rounded-xl border p-6 text-center ${cfg.bg}`}>
        <div className="mb-3 flex justify-center">{cfg.icon}</div>
        <h2 className={`mb-1 text-2xl font-bold ${cfg.cor}`}>{cfg.titulo}</h2>
        <p className={`text-4xl font-black ${cfg.cor}`}>{pontuacao_final} pts</p>
      </div>

      {/* Resumo */}
      {resumo_final && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 font-semibold text-foreground">Resumo do Caso</h3>
          <p className="text-sm leading-relaxed text-muted">{resumo_final}</p>
        </div>
      )}

      {/* Pontos fortes */}
      {pontos_fortes?.length > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <h3 className="mb-2 font-semibold text-green-400">Seus Acertos</h3>
          <ul className="space-y-1">
            {pontos_fortes.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span>✅</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pontos a melhorar */}
      {pontos_melhorar?.length > 0 && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <h3 className="mb-2 font-semibold text-orange-400">Pontos a Melhorar</h3>
          <ul className="space-y-1">
            {pontos_melhorar.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span>⚠️</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline de turnos — rich per-turn cards */}
      {historico.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Timeline da Simulação</h3>
          <div className="space-y-3">
            {historico.map((h, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-white/3 p-3"
              >
                {/* Turn badge + score */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    Turno {h.turno ?? i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <AvaliacaoBadge avaliacao={h.avaliacao_ia} />
                    {h.pontuacao_turno !== undefined && (
                      <span className="text-xs font-semibold text-teal">
                        +{h.pontuacao_turno} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Conduta do residente */}
                {h.conduta_usuario && (
                  <p className="mb-2 text-sm font-semibold text-foreground leading-snug">
                    {h.conduta_usuario}
                  </p>
                )}

                {/* Feedback da IA */}
                {h.feedback && (
                  <p className="mb-1.5 text-xs leading-relaxed text-muted line-clamp-2">
                    {h.feedback}
                  </p>
                )}

                {/* Explicação clínica */}
                {h.explicacao_clinica && (
                  <p className="mt-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5 text-xs italic leading-relaxed text-blue-300">
                    {h.explicacao_clinica}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3">
        <button
          onClick={onTentarNovamente}
          className="flex-1 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Tentar Novamente
        </button>
        <button
          onClick={onEscolherOutro}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/5"
        >
          Outro Caso
        </button>
      </div>
    </motion.div>
  );
}
