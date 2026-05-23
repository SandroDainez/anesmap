"use client";

import { Lock } from "lucide-react";

type Caso = {
  id: string;
  titulo: string;
  dificuldade: string;
  nivel_recomendado: string[];
  duracao_estimada: string;
  tags: string[];
};

type Props = {
  caso: Caso;
  onClick: () => void;
  bloqueado?: boolean;
};

const difConfig: Record<string, { label: string; style: string }> = {
  iniciante: { label: "Iniciante", style: "bg-green-500/20 text-green-300" },
  intermediário: { label: "Intermediário", style: "bg-yellow-500/20 text-yellow-300" },
  avançado: { label: "Avançado", style: "bg-red-500/20 text-red-300" },
};

export function CasoCard({ caso, onClick, bloqueado = false }: Props) {
  const dif = difConfig[caso.dificuldade] ?? { label: caso.dificuldade, style: "bg-white/10 text-white" };

  return (
    <button
      onClick={bloqueado ? undefined : onClick}
      disabled={bloqueado}
      className={`relative w-full rounded-xl border bg-card p-4 text-left transition ${
        bloqueado
          ? "cursor-not-allowed opacity-60"
          : "border-border hover:border-teal/40 hover:bg-white/5"
      }`}
    >
      {bloqueado && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/50">
          <Lock size={20} className="mb-1 text-muted" />
          <span className="text-xs text-muted">
            Nível {caso.nivel_recomendado[0]}+ requerido
          </span>
        </div>
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground">{caso.titulo}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${dif.style}`}>
          {dif.label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {caso.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>⏱ {caso.duracao_estimada}</span>
        <span>{caso.nivel_recomendado.join(" · ")}</span>
      </div>
    </button>
  );
}
