"use client";

import { useMemo } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loadFlashcardProgress } from "@/lib/study-data";

const studyTracks = [
  { id: "ME1", tone: "blue" },
  { id: "ME2", tone: "purple" },
  { id: "ME3", tone: "teal" },
] as const;

export default function DashboardPage() {
  const progress = useMemo(() => {
    const entries = Object.values(loadFlashcardProgress());
    const reviewed = entries.filter((item) => item.repetitions > 0).length;
    const mastered = entries.filter((item) => item.repetitions >= 3).length;
    const completion = reviewed > 0 ? Math.round((mastered / reviewed) * 100) : 0;
    return { reviewed, mastered, completion };
  }, []);

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
        {progress.reviewed > 0 ? (
          <>
            <h2 className="mt-2 text-xl font-semibold">{progress.completion}% de retenção atual</h2>
            <p className="mt-1 text-sm text-muted">
              {progress.mastered} card(s) consolidados de {progress.reviewed} revisado(s) nesta base.
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
    </main>
  );
}
