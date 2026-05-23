"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loadFlashcardProgress } from "@/lib/study-data";
import { loadMyDashboardMetrics, updateWeeklyGoal } from "@/lib/user-study";

const PREFERRED_TRACK_KEY = "anesmap_preferred_track";

const studyTracks = [
  { id: "ME1", tone: "blue" },
  { id: "ME2", tone: "purple" },
  { id: "ME3", tone: "teal" },
] as const;

type TrackId = "ME1" | "ME2" | "ME3";

const moduleLinks = [
  { href: "/flashcards", label: "Flashcards SM-2", description: "Revisão espaçada com algoritmo SM-2", color: "teal" },
  { href: "/simulados", label: "Simulados TEA", description: "Banco de questões com cronômetro", color: "blue" },
  { href: "/complicacoes", label: "Complicações", description: "Protocolos de intercorrências", color: "purple" },
  { href: "/avaliacao", label: "Autoavaliação", description: "Progresso e lacunas de conhecimento", color: "blue" },
] as const;

export default function DashboardPage() {
  const [selectedTrack, setSelectedTrack] = useState<TrackId>("ME1");
  const [goalInput, setGoalInput] = useState("300");
  const [serverMetrics, setServerMetrics] = useState<{
    reviewed: number;
    mastered: number;
    retention: number;
    thisWeekMinutes: number;
    goal: number;
    goalProgress: number;
    attemptsCount: number;
  } | null>(null);

  const progress = useMemo(() => {
    const entries = Object.values(loadFlashcardProgress());
    const reviewed = entries.filter((item) => item.repetitions > 0).length;
    const mastered = entries.filter((item) => item.repetitions >= 3).length;
    const completion = reviewed > 0 ? Math.round((mastered / reviewed) * 100) : 0;
    return { reviewed, mastered, completion };
  }, []);

  // Restore preferred track from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_TRACK_KEY) as TrackId | null;
    if (saved && ["ME1", "ME2", "ME3"].includes(saved)) {
      setSelectedTrack(saved);
    }
  }, []);

  function selectTrack(track: TrackId) {
    setSelectedTrack(track);
    localStorage.setItem(PREFERRED_TRACK_KEY, track);
  }

  useEffect(() => {
    void (async () => {
      const metrics = await loadMyDashboardMetrics();
      setGoalInput(String(metrics.goal));
      setServerMetrics({
        reviewed: metrics.reviewed,
        mastered: metrics.mastered,
        retention: metrics.retention,
        thisWeekMinutes: metrics.thisWeekMinutes,
        goal: metrics.goal,
        goalProgress: metrics.goalProgress,
        attemptsCount: metrics.attemptsCount,
      });
    })();
  }, []);

  async function saveGoal() {
    const minutes = Number(goalInput);
    if (!Number.isFinite(minutes)) return;
    const ok = await updateWeeklyGoal(minutes);
    if (!ok) return;
    const refreshed = await loadMyDashboardMetrics();
    setServerMetrics({
      reviewed: refreshed.reviewed,
      mastered: refreshed.mastered,
      retention: refreshed.retention,
      thisWeekMinutes: refreshed.thisWeekMinutes,
      goal: refreshed.goal,
      goalProgress: refreshed.goalProgress,
      attemptsCount: refreshed.attemptsCount,
    });
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="AnesMap"
        title="Dashboard"
        description="Visão geral de progresso e acesso rápido aos módulos."
      />

      <AppCard>
        <h2 className="mb-3 text-sm font-medium text-muted">Selecionar matéria</h2>
        <div className="grid grid-cols-3 gap-2">
          {studyTracks.map((track) => {
            const isSelected = selectedTrack === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => selectTrack(track.id as TrackId)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? track.tone === "blue"
                      ? "border-blue bg-blue/25 text-blue shadow-sm"
                      : track.tone === "purple"
                      ? "border-purple bg-purple/25 text-purple shadow-sm"
                      : "border-teal bg-teal/25 text-teal shadow-sm"
                    : track.tone === "blue"
                    ? "border-blue/30 bg-blue/10 text-blue/60 hover:bg-blue/20"
                    : track.tone === "purple"
                    ? "border-purple/30 bg-purple/10 text-purple/60 hover:bg-purple/20"
                    : "border-teal/30 bg-teal/10 text-teal/60 hover:bg-teal/20"
                }`}
              >
                {track.id}
                {isSelected && <span className="ml-1 text-[10px]">●</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Matéria selecionada: <span className="font-medium text-foreground">{selectedTrack}</span> — acesse os módulos abaixo.
        </p>
      </AppCard>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Módulos — {selectedTrack}</h2>
        <div className="grid gap-2">
          {moduleLinks.map((mod) => (
            <Link
              key={mod.href}
              href={`${mod.href}?me=${selectedTrack}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-border/80 hover:bg-card/80 active:scale-[0.99]"
            >
              <div>
                <p className={`font-mono text-[11px] uppercase tracking-wider text-${mod.color}`}>
                  {selectedTrack}
                </p>
                <h3 className="mt-0.5 text-base font-semibold">{mod.label}</h3>
                <p className="mt-0.5 text-xs text-muted">{mod.description}</p>
              </div>
              <span className="text-muted">→</span>
            </Link>
          ))}
        </div>
      </section>

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-teal">
          Progresso semanal
        </p>
        {(serverMetrics?.reviewed ?? progress.reviewed) > 0 ? (
          <>
            <h2 className="mt-2 text-xl font-semibold">
              {serverMetrics?.retention ?? progress.completion}% de retenção atual
            </h2>
            <p className="mt-1 text-sm text-muted">
              {serverMetrics?.mastered ?? progress.mastered} card(s) consolidados de{" "}
              {serverMetrics?.reviewed ?? progress.reviewed} revisado(s) nesta base.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-xl font-semibold">Sem dados de progresso ainda</h2>
            <p className="mt-1 text-sm text-muted">
              Comece a revisar os flashcards para gerar métricas reais no painel.
            </p>
          </>
        )}
      </AppCard>

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-blue">Metas individuais</p>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input
            value={goalInput}
            onChange={(event) => setGoalInput(event.target.value)}
            type="number"
            min={30}
            max={6000}
            className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => {
              void saveGoal();
            }}
            className="rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue"
          >
            Salvar
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          Semana: {serverMetrics?.thisWeekMinutes ?? 0} min de {serverMetrics?.goal ?? 300} min (
          {serverMetrics?.goalProgress ?? 0}%)
        </p>
        <p className="mt-1 text-sm text-muted">
          Tentativas de simulados: {serverMetrics?.attemptsCount ?? 0}
        </p>
      </AppCard>
    </main>
  );
}
