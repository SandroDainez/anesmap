"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeader } from "@/components/SectionHeader";
import { CasoCard } from "@/components/simulacao/CasoCard";
import { ContadorSimulacoes } from "@/components/simulacao/ContadorSimulacoes";
import { CASOS_SIMULACAO } from "@/lib/simulacao/casos";
import type { CasoSimulacao } from "@/lib/simulacao/systemPrompt";
import type { LimiteInfo } from "@/lib/simulacao/limite";
import { loadMyProfile } from "@/lib/user-study";

const DIFICULDADES = ["todos", "iniciante", "intermediário", "avançado"];

export default function SimulacaoPage() {
  const router = useRouter();
  const [limite, setLimite] = useState<LimiteInfo | null>(null);
  const [userNivel, setUserNivel] = useState<string>("ME1");
  const [filtro, setFiltro] = useState("todos");
  const [modalLimite, setModalLimite] = useState(false);
  const [todosCasos, setTodosCasos] = useState<CasoSimulacao[]>(CASOS_SIMULACAO);

  useEffect(() => {
    void (async () => {
      const [perfil, resLimite, resCasos] = await Promise.all([
        loadMyProfile(),
        fetch("/api/simulacao"),
        fetch("/api/simulacao/casos"),
      ]);
      const limiteData = await resLimite.json() as LimiteInfo;
      setLimite(limiteData);
      const nivel = perfil?.nivel ?? "ME1";
      setUserNivel(nivel);

      if (resCasos.ok) {
        const dbCasos = await resCasos.json() as CasoSimulacao[];
        if (dbCasos.length > 0) {
          // Merge: DB cases override hardcoded ones with same id; extras appended
          const hardcodedById = new Map(CASOS_SIMULACAO.map((c) => [c.id, c]));
          const dbById = new Map(dbCasos.map((c) => [c.id, c]));
          const merged = [
            ...CASOS_SIMULACAO.map((c) => dbById.get(c.id) ?? c),
            ...dbCasos.filter((c) => !hardcodedById.has(c.id)),
          ];
          setTodosCasos(merged);
        }
      }
    })();
  }, []);

  const casosFiltrados = todosCasos.filter(
    (c) => filtro === "todos" || c.dificuldade === filtro,
  );

  function handleCasoClick(casoId: string, nivelRecomendado: string[]) {
    // Limit is still loading — wait for it (CasoCard will appear slightly dimmed)
    if (!limite) return;
    if (!limite.pode_simular) {
      setModalLimite(true);
      return;
    }
    void router.push(`/simulacao/${casoId}`);
  }

  function isBloqueado(nivelRecomendado: string[]): boolean {
    const ordem = ["ME1", "ME2", "ME3"];
    const minNivel = nivelRecomendado.reduce((min, n) => {
      return ordem.indexOf(n) < ordem.indexOf(min) ? n : min;
    }, nivelRecomendado[0] ?? "ME1");
    return ordem.indexOf(userNivel) < ordem.indexOf(minNivel);
  }

  return (
    <main className="min-h-screen px-4 pb-32 pt-6">
      <SectionHeader eyebrow="Treinamento" title="Simulação Clínica" description="Casos clínicos interativos com IA" />

      {limite && (
        <div className="mb-4">
          <ContadorSimulacoes
            usadas={limite.usadas}
            limite={limite.limite}
            restantes={limite.restantes}
            nivel={userNivel}
            dias_para_renovar={limite.dias_para_renovar}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {DIFICULDADES.map((d) => (
          <button
            key={d}
            onClick={() => setFiltro(d)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              filtro === d
                ? "bg-teal text-black"
                : "border border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid de casos */}
      <div className={`grid gap-3 transition-opacity ${!limite ? "pointer-events-none opacity-60" : ""}`}>
        {casosFiltrados.map((caso) => {
          const bloqueado = isBloqueado(caso.nivel_recomendado);
          return (
            <CasoCard
              key={caso.id}
              caso={caso}
              bloqueado={bloqueado}
              onClick={() => handleCasoClick(caso.id, caso.nivel_recomendado)}
            />
          );
        })}
      </div>

      {/* Modal limite atingido */}
      {modalLimite && limite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-card p-6 text-center">
            <p className="mb-2 text-4xl">🔒</p>
            <h2 className="mb-2 text-lg font-bold text-foreground">Limite Mensal Atingido</h2>
            <p className="mb-4 text-sm text-muted">
              Você utilizou todas as {limite.limite} simulações deste mês. Novas simulações
              estarão disponíveis em{" "}
              <span className="font-semibold text-foreground">{limite.dias_para_renovar} dias</span>.
            </p>
            <button
              onClick={() => setModalLimite(false)}
              className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-black"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
