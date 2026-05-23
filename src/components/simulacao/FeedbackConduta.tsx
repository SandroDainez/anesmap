"use client";

import { motion } from "framer-motion";

type Avaliacao = "correto" | "parcial" | "incorreto" | "tardio";

type Props = {
  avaliacao: Avaliacao;
  feedback: string;
  explicacao_clinica?: string;
  pontuacao_turno: number;
};

const config: Record<Avaliacao, { label: string; bg: string; text: string; badge: string }> = {
  correto: {
    label: "CORRETO",
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
    badge: "bg-green-500/20 text-green-300",
  },
  parcial: {
    label: "PARCIAL",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  incorreto: {
    label: "INCORRETO",
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
  },
  tardio: {
    label: "TARDIO",
    bg: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-300",
  },
};

export function FeedbackConduta({ avaliacao, feedback, explicacao_clinica, pontuacao_turno }: Props) {
  const c = config[avaliacao] ?? config.incorreto;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${c.bg}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.badge}`}>
          {c.label}
        </span>
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-lg font-bold ${c.text}`}
        >
          +{pontuacao_turno} pts
        </motion.span>
      </div>

      <p className="mb-2 text-sm leading-relaxed text-foreground">{feedback}</p>

      {explicacao_clinica && (
        <p className="text-xs italic leading-relaxed text-muted">{explicacao_clinica}</p>
      )}
    </motion.div>
  );
}
