"use client";

type Props = {
  usadas: number;
  limite: number;
  restantes: number;
  nivel: string;
  dias_para_renovar: number;
};

export function ContadorSimulacoes({ usadas, limite, restantes, nivel, dias_para_renovar }: Props) {
  const pct = Math.min(100, (usadas / limite) * 100);
  const cor =
    restantes >= 3 ? "bg-teal" : restantes === 2 ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <p className="mb-2 font-semibold text-foreground">
        Simulações — <span className="text-teal">{nivel}</span>
      </p>

      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-muted">
        {usadas} de {limite} utilizadas &bull; {restantes} restante{restantes !== 1 ? "s" : ""}
      </p>

      {restantes === 0 && (
        <p className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">
          Limite mensal atingido — renova em {dias_para_renovar} dia{dias_para_renovar !== 1 ? "s" : ""}
        </p>
      )}

      {restantes === 1 && (
        <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-400">
          Última simulação disponível este mês
        </p>
      )}
    </div>
  );
}
