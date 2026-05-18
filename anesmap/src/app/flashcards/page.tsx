 "use client";

import { useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Flashcard, StudyTrack, loadFlashcards } from "@/lib/study-data";

const deckStats = [
  { label: "Novos", value: 24, tone: "text-teal" },
  { label: "Revisão", value: 31, tone: "text-blue" },
  { label: "Críticos", value: 8, tone: "text-rose" },
] as const;

export default function FlashcardsPage() {
  const [selectedMe, setSelectedMe] = useState<StudyTrack>("ME1");
  const importedCards = useMemo(() => loadFlashcards(), []);
  const cardsByTrack = useMemo(
    () => importedCards.filter((item) => item.me === selectedMe),
    [importedCards, selectedMe],
  );
  const currentCard: Flashcard | undefined = cardsByTrack[0];

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 01"
        title="Flashcards SM-2"
        description="Classifique por Difícil, Médio ou Fácil."
      />

      <AppCard>
        <h2 className="mb-4 text-sm font-medium text-muted">Selecionar matéria</h2>
        <div className="grid grid-cols-3 gap-2">
          <StatusBadge
            as="button"
            tone="blue"
            className={selectedMe === "ME1" ? "ring-1 ring-blue/40" : "opacity-70"}
            onClick={() => setSelectedMe("ME1")}
          >
            ME1
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="purple"
            className={selectedMe === "ME2" ? "ring-1 ring-purple/40" : "opacity-70"}
            onClick={() => setSelectedMe("ME2")}
          >
            ME2
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="teal"
            className={selectedMe === "ME3" ? "ring-1 ring-teal/40" : "opacity-70"}
            onClick={() => setSelectedMe("ME3")}
          >
            ME3
          </StatusBadge>
        </div>
      </AppCard>

      <section className="grid grid-cols-3 gap-2">
        {deckStats.map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-border bg-card px-3 py-4 text-center"
          >
            <p className="text-xs text-muted">{item.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${item.tone}`}>{item.value}</p>
          </article>
        ))}
      </section>

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-teal">
          Próximo card
        </p>
        {currentCard ? (
          <>
            <h2 className="mt-2 text-lg font-semibold">{currentCard.frente}</h2>
            <p className="mt-2 text-sm text-muted">{currentCard.verso}</p>
            {currentCard.especialidade ? (
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted">
                {currentCard.especialidade}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Nenhum card importado para {selectedMe}. Vá em /importar e envie seus CSVs.
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-medium">
          <StatusBadge as="button" tone="rose" className="px-2">
            Difícil
          </StatusBadge>
          <StatusBadge as="button" tone="amber" className="px-2">
            Médio
          </StatusBadge>
          <StatusBadge as="button" tone="teal" className="px-2">
            Fácil
          </StatusBadge>
        </div>
      </AppCard>
    </main>
  );
}
