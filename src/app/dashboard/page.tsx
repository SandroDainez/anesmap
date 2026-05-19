"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loadFlashcardProgress } from "@/lib/study-data";
import { loadMyDashboardMetrics, updateWeeklyGoal } from "@/lib/user-study";

const studyTracks = [
  { id: "ME1", tone: "blue" },
  { id: "ME2", tone: "purple" },
  { id: "ME3", tone: "teal" },
] as const;

export default function DashboardPage() {
  const [goalInput, setGoalInput] = useState("300");
  const [localProgress, setLocalProgress] = useState({
    reviewed: 0,
    mastered: 0,
    completion: 0,
  });
  const [serverMetrics, setServerMetrics] = useState<{
    reviewed: number;
    mastered: number;
    retention: number;
    thisWeekMinutes: number;
    goal: number;
    goalProgress: number;
    attemptsCount: number;
  } | null>(null);

  useEffect(() => {
    // Se for admin, redirecionar para o painel administrativo
    const { createSupabaseBrowserClient } = require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      void supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin") {
          window.location.href = "/admin";
        }
      });
    }
  }, []);

  useEffect(() => {
    const entries = Object.values(loadFlashcardProgress());
    const reviewed = entries.filter((item) => item.repetitions > 0).length;
    const mastered = entries.filter((item) => item.repetitions >= 3).length;
    const completion = reviewed > 0 ? Math.round((mastered / reviewed) * 100) : 0;
    setLocalProgress({ reviewed, mastered, completion });
  }, []);

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
        <h2 className="mb-4 text-sm font-medium text-muted">Selecionar matéria</h2>
        <div className="grid grid-cols-3 gap-2">
          {studyTracks.map((track) => (
            <StatusBadge key={track.id} as="button" tone={track.tone}>
              {track.id}
            </StatusBadge>
          ))}
        </div>
      </AppCard>

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-teal">
          Progresso semanal
        </p>
        {(serverMetrics?.reviewed ?? localProgress.reviewed) > 0 ? (
          <>
            <h2 className="mt-2 text-xl font-semibold">
              {serverMetrics?.retention ?? localProgress.completion}% de retenção atual
            </h2>
            <p className="mt-1 text-sm text-muted">
              {serverMetrics?.mastered ?? localProgress.mastered} card(s) consolidados de{" "}
              {serverMetrics?.reviewed ?? localProgress.reviewed} revisado(s) nesta base.
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
