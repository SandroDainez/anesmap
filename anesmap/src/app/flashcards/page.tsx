"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  applySm2,
  Flashcard,
  FlashcardProgress,
  getDefaultFlashcardProgress,
  StudyTrack,
  isSupabaseConfigured,
  loadFlashcardProgress,
  loadFlashcards,
  loadFlashcardsRemote,
  saveFlashcardProgress,
  saveFlashcards,
} from "@/lib/study-data";

const deckStats = [
  { label: "Novos", value: 24, tone: "text-teal" },
  { label: "Revisão", value: 31, tone: "text-blue" },
  { label: "Críticos", value: 8, tone: "text-rose" },
] as const;

export default function FlashcardsPage() {
  const [selectedMe, setSelectedMe] = useState<StudyTrack>("ME1");
  const [importedCards, setImportedCards] = useState<Flashcard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, FlashcardProgress>>({});
  const [now, setNow] = useState(() => new Date());
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const local = loadFlashcards();
    setImportedCards(local);
    setProgressMap(loadFlashcardProgress());

    if (!isSupabaseConfigured()) return;

    void (async () => {
      const remote = await loadFlashcardsRemote();
      if (remote) {
        setImportedCards(remote);
        saveFlashcards(remote);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const cardsByTrack = useMemo(
    () =>
      importedCards
        .filter((item) => item.me === selectedMe)
        .sort((a, b) => compareCardsForStudyOrder(a, b)),
    [importedCards, selectedMe],
  );
  const dueCards = useMemo(
    () =>
      cardsByTrack
        .filter((card) => {
          const progress = progressMap[card.id] ?? getDefaultFlashcardProgress(now);
          return new Date(progress.nextReviewAt) <= now;
        })
        .sort((a, b) => {
          const progressA = progressMap[a.id] ?? getDefaultFlashcardProgress(now);
          const progressB = progressMap[b.id] ?? getDefaultFlashcardProgress(now);
          const nextA = new Date(progressA.nextReviewAt).getTime();
          const nextB = new Date(progressB.nextReviewAt).getTime();
          if (nextA !== nextB) return nextA - nextB;
          return compareCardsForStudyOrder(a, b);
        }),
    [cardsByTrack, progressMap, now],
  );
  const studyDeck = dueCards.length > 0 ? dueCards : cardsByTrack;
  const currentCard: Flashcard | undefined = studyDeck[currentCardIndex];
  const currentProgress =
    currentCard ? progressMap[currentCard.id] ?? getDefaultFlashcardProgress(now) : null;
  const currentCardFormatted = currentCard
    ? parseCardContent(currentCard.frente, currentCard.verso)
    : null;

  useEffect(() => {
    setIsFlipped(false);
  }, [selectedMe, currentCard?.id]);

  useEffect(() => {
    setCurrentCardIndex(0);
  }, [selectedMe]);

  useEffect(() => {
    if (studyDeck.length === 0) {
      setCurrentCardIndex(0);
      return;
    }
    if (currentCardIndex > studyDeck.length - 1) {
      setCurrentCardIndex(studyDeck.length - 1);
    }
  }, [studyDeck.length, currentCardIndex]);

  function gradeCard(quality: number) {
    if (!currentCard) return;
    const current = progressMap[currentCard.id] ?? getDefaultFlashcardProgress(now);
    const next = applySm2(current, quality, now);
    const updated = {
      ...progressMap,
      [currentCard.id]: next,
    };
    setProgressMap(updated);
    saveFlashcardProgress(updated);
    setNow(new Date());
  }

  function goNextCard() {
    if (currentCardIndex >= studyDeck.length - 1) return;
    setCurrentCardIndex((value) => value + 1);
  }

  function goPrevCard() {
    if (currentCardIndex <= 0) return;
    setCurrentCardIndex((value) => value - 1);
  }

  const deckStats = [
    { label: "Devidos", value: dueCards.length, tone: "text-teal" },
    { label: "Total", value: cardsByTrack.length, tone: "text-blue" },
    { label: "Dominados", value: cardsByTrack.length - dueCards.length, tone: "text-purple" },
  ] as const;

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
            <p className="mt-2 text-xs text-muted">
              Card {currentCardIndex + 1} de {studyDeck.length}
            </p>
            <button
              type="button"
              onClick={() => setIsFlipped((value) => !value)}
              className="mt-2 w-full rounded-xl border border-border bg-background/35 p-4 text-left transition hover:bg-background/55"
            >
              {!isFlipped ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted">Frente</p>
                  <h2 className="mt-2 text-2xl font-semibold leading-snug">
                    {currentCardFormatted?.question}
                  </h2>
                  <p className="mt-3 text-xs text-muted">Toque para virar e ver a resposta.</p>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs uppercase tracking-wider text-blue">Verso</p>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">Resposta</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {currentCardFormatted?.answer}
                  </p>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    Referência bibliográfica
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {currentCardFormatted?.reference}
                  </p>
                  <p className="mt-3 text-xs text-muted">Toque para voltar para a pergunta.</p>
                </>
              )}
            </button>
            {currentCard.especialidade ? (
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted">
                {currentCard.especialidade}
              </p>
            ) : null}
            {currentProgress ? (
              <p className="mt-2 text-xs text-muted">
                Repetições: {currentProgress.repetitions} · Intervalo:{" "}
                {currentProgress.intervalDays} dia(s)
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={goPrevCard}
                disabled={currentCardIndex === 0}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground transition hover:bg-background/55 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={goNextCard}
                disabled={currentCardIndex >= studyDeck.length - 1}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground transition hover:bg-background/55 disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Nenhum card importado para {selectedMe}. Vá em /importar e envie seus CSVs.
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-medium">
          <StatusBadge
            as="button"
            tone="rose"
            className="px-2"
            onClick={() => gradeCard(2)}
            disabled={!isFlipped}
          >
            Difícil
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="amber"
            className="px-2"
            onClick={() => gradeCard(3)}
            disabled={!isFlipped}
          >
            Médio
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="teal"
            className="px-2"
            onClick={() => gradeCard(5)}
            disabled={!isFlipped}
          >
            Fácil
          </StatusBadge>
        </div>
      </AppCard>
    </main>
  );
}

function parseCardContent(frente: string, verso: string) {
  const reference = extractReference(verso);
  const answer = removeReferenceFromAnswer(verso);
  return {
    question: normalizeQuestionLabel(frente),
    answer: normalizeAnswerBody(answer),
    reference,
  };
}

function compareCardsForStudyOrder(a: Flashcard, b: Flashcard) {
  const numA = extractCardNumber(a.frente);
  const numB = extractCardNumber(b.frente);
  if (numA !== null && numB !== null && numA !== numB) return numA - numB;
  if (numA !== null && numB === null) return -1;
  if (numA === null && numB !== null) return 1;
  return a.frente.localeCompare(b.frente, "pt-BR");
}

function extractCardNumber(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^(?:#\s*)?(?:q(?:uest[aã]o)?\s*)?(\d{1,4})[\)\.\-:–—\s]/i);
  if (!match) return null;
  return Number(match[1]);
}

function normalizeQuestionLabel(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:#\s*)?(?:q(?:uest[aã]o)?\s*)?(\d{1,3})[\)\.\-:–—\s]*(.*)$/i);
  if (!match) return trimmed;
  const suffix = (match[2] ?? "").trim();
  if (!suffix) return trimmed;
  return `${match[1]}) ${suffix}`;
}

function normalizeAnswerBody(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*;\s*/g, "; ")
    .trim();
}

function extractReference(value: string) {
  const trimmed = value.trim();
  const refMatch = trimmed.match(
    /(?:refer[eê]ncias?|fontes?|bibliografia)\s*:\s*([\s\S]*)$/i,
  );
  if (refMatch?.[1]?.trim()) {
    return refMatch[1].trim();
  }
  return "Não informada no card importado. Para evitar conteúdo inventado, adicione a referência no campo verso (ex.: Referências: Miller 9ª ed.; SBA 2023).";
}

function removeReferenceFromAnswer(value: string) {
  return value
    .replace(/(?:refer[eê]ncias?|fontes?|bibliografia)\s*:[\s\S]*$/i, "")
    .trim();
}
