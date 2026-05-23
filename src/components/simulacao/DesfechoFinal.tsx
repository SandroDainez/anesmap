"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

type Desfecho = "recuperacao" | "complicacao" | "obito";

type HistoricoItem = {
  conduta_usuario?: string;
  avaliacao_ia?: string;
  pontuacao_turno?: number;
  turno?: number;
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

const avaliacaoLabel: Record<string, string> = {
  correto: "✅",
  parcial: "🟡",
  incorreto: "❌",
  tardio: "🟠",
};

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

      {/* Timeline de turnos */}
      {historico.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Timeline da Simulação</h3>
          <ul className="space-y-2">
            {historico.map((h, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 text-base">
                  {avaliacaoLabel[h.avaliacao_ia ?? ""] ?? "•"}
                </span>
                <div className="flex-1">
                  <span className="text-muted">Turno {h.turno ?? i + 1}: </span>
                  <span className="text-foreground">{h.conduta_usuario}</span>
                  {h.pontuacao_turno !== undefined && (
                    <span className="ml-2 text-xs text-muted">+{h.pontuacao_turno} pts</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
