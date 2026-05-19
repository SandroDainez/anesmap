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
  Trimestre,
  isSupabaseConfigured,
  loadFlashcardProgress,
  loadFlashcards,
  loadFlashcardsRemote,
  suggestStudyReferences,
  saveFlashcardProgress,
  saveFlashcards,
} from "@/lib/study-data";
import {
  addFlashcardEvent,
  endStudySession,
  loadFlashcardProgressRemoteByUser,
  loadMyProfile,
  startStudySession,
  upsertFlashcardProgressRemote,
} from "@/lib/user-study";

const ALL_TRACKS: StudyTrack[] = ["ME1", "ME2", "ME3"];
const ALL_TRIMESTERS: Array<Trimestre | "todos"> = ["todos", "T1", "T2", "T3", "T4"];

export default function FlashcardsPage() {
  const [selectedMe, setSelectedMe] = useState<StudyTrack>("ME1");
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre | "todos">("todos");
  const [allowedTracks, setAllowedTracks] = useState<StudyTrack[]>(ALL_TRACKS);
  // Keep SSR and first client render identical to avoid hydration mismatch.
  const [importedCards, setImportedCards] = useState<Flashcard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, FlashcardProgress>>({});
  const [now, setNow] = useState(() => new Date());
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);

  useEffect(() => {
    // Hydrate local cached data only on client.
    setImportedCards(loadFlashcards());
    setProgressMap(loadFlashcardProgress());
    setNow(new Date());

    // Restore preferred track from dashboard selection
    const preferredTrack = localStorage.getItem("anesmap_preferred_track") as StudyTrack | null;
    if (preferredTrack && ["ME1", "ME2", "ME3"].includes(preferredTrack)) {
      setSelectedMe(preferredTrack);
    }

    void (async () => {
      const profile = await loadMyProfile();
      const track = profile?.assigned_track_cards ?? profile?.assigned_track;
      if (track && track !== "ALL") {
        setAllowedTracks([track as StudyTrack]);
        setSelectedMe(track as StudyTrack);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    void (async () => {
      const remote = await loadFlashcardsRemote();
      if (remote) {
        setImportedCards(remote);
        saveFlashcards(remote);
      }
      const remoteProgress = await loadFlashcardProgressRemoteByUser();
      if (remoteProgress) {
        setProgressMap((prev) => ({ ...prev, ...remoteProgress }));
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const id = await startStudySession("flashcards");
      if (!id) return;
      setSessionId(id);
      setSessionStartedAt(new Date());
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (!sessionId || !sessionStartedAt) return;
      void endStudySession(sessionId, sessionStartedAt);
    };
  }, [sessionId, sessionStartedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const cardsByTrack = useMemo(
    () =>
      importedCards
        .filter((item) => {
          if (item.me !== selectedMe) return false;
          if (selectedTrimestre === "todos") return true;
          // Show cards tagged with this trimestre OR cards without any trimestre tag
          return !item.trimestre || item.trimestre === selectedTrimestre;
        })
        .sort((a, b) => compareCardsForStudyOrder(a, b)),
    [importedCards, selectedMe, selectedTrimestre],
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
  const safeCardIndex =
    studyDeck.length === 0 ? 0 : Math.max(0, Math.min(currentCardIndex, studyDeck.length - 1));
  const currentCard: Flashcard | undefined = studyDeck[safeCardIndex];
  const currentProgress =
    currentCard ? progressMap[currentCard.id] ?? getDefaultFlashcardProgress(now) : null;
  const currentCardFormatted = currentCard
    ? parseCardContent(currentCard.frente, currentCard.verso, currentCard.references)
    : null;

  useEffect(() => {
    if (currentCard?.id) {
      void addFlashcardEvent({ cardId: currentCard.id, eventType: "view" });
    }
  }, [currentCard?.id]);

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
    void upsertFlashcardProgressRemote({ [currentCard.id]: next });
    void addFlashcardEvent({ cardId: currentCard.id, eventType: "grade", quality });
    setNow(new Date());
  }

  function goNextCard() {
    if (safeCardIndex >= studyDeck.length - 1) return;
    setCurrentCardIndex((value) => value + 1);
    setIsFlipped(false);
  }

  function goPrevCard() {
    if (safeCardIndex <= 0) return;
    setCurrentCardIndex((value) => value - 1);
    setIsFlipped(false);
  }

  function changeTrack(track: StudyTrack) {
    setSelectedMe(track);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    localStorage.setItem("anesmap_preferred_track", track);
  }

  function changeTrimestre(t: Trimestre | "todos") {
    setSelectedTrimestre(t);
    setCurrentCardIndex(0);
    setIsFlipped(false);
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
        <h2 className="mb-4 text-sm font-medium text-muted">
          {allowedTracks.length === 1 ? "Sua trilha" : "Selecionar matéria"}
        </h2>
        {allowedTracks.length === 1 ? (
          <div className="flex items-center gap-2">
            <StatusBadge tone={selectedMe === "ME1" ? "blue" : selectedMe === "ME2" ? "purple" : "teal"}>
              {selectedMe}
            </StatusBadge>
            <span className="text-xs text-muted">Trilha atribuída pelo administrador</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <StatusBadge
              as="button"
              tone="blue"
              className={
                selectedMe === "ME1"
                  ? "ring-2 ring-blue/60 bg-blue/20 text-blue shadow-[0_0_0_1px_rgba(79,142,247,0.35)]"
                  : "opacity-95 hover:opacity-100 hover:bg-blue/12"
              }
              onClick={() => changeTrack("ME1")}
            >
              ME1
            </StatusBadge>
            <StatusBadge
              as="button"
              tone="purple"
              className={
                selectedMe === "ME2"
                  ? "ring-2 ring-purple/60 bg-purple/20 text-purple shadow-[0_0_0_1px_rgba(155,109,255,0.35)]"
                  : "opacity-95 hover:opacity-100 hover:bg-purple/12"
              }
              onClick={() => changeTrack("ME2")}
            >
              ME2
            </StatusBadge>
            <StatusBadge
              as="button"
              tone="teal"
              className={
                selectedMe === "ME3"
                  ? "ring-2 ring-teal/60 bg-teal/20 text-teal shadow-[0_0_0_1px_rgba(0,201,167,0.35)]"
                  : "opacity-95 hover:opacity-100 hover:bg-teal/12"
              }
              onClick={() => changeTrack("ME3")}
            >
              ME3
            </StatusBadge>
          </div>
        )}
      </AppCard>

      <AppCard>
        <h2 className="mb-3 text-sm font-medium text-muted">Período</h2>
        <div className="grid grid-cols-5 gap-1.5">
          {ALL_TRIMESTERS.map((t) => {
            const isActive = selectedTrimestre === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => changeTrimestre(t)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-teal bg-teal/20 text-teal shadow-sm"
                    : "border-border bg-background/30 text-muted hover:border-teal/40 hover:text-foreground"
                }`}
              >
                {t === "todos" ? "Todos" : t}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {selectedTrimestre === "todos"
            ? "Exibindo todos os cards da trilha"
            : `Exibindo cards do ${selectedTrimestre} (inclui cards sem período definido)`}
        </p>
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
              Card {safeCardIndex + 1} de {studyDeck.length}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsFlipped((value) => !value);
                if (currentCard?.id) {
                  void addFlashcardEvent({ cardId: currentCard.id, eventType: "flip" });
                }
              }}
              className="mt-2 w-full rounded-xl border border-border bg-background/35 p-4 text-left transition hover:bg-background/55"
            >
              {!isFlipped ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted">Frente</p>
                  <h2 className="mt-2 text-2xl font-semibold leading-snug">
                    {formatCardQuestionForSession(
                      currentCardFormatted?.question ?? "",
                      safeCardIndex,
                    )}
                  </h2>
                  <p className="mt-3 text-xs text-muted">Toque para virar e ver a resposta.</p>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs uppercase tracking-wider text-blue">Verso — Resposta</p>
                  <div className="mt-2 rounded-lg border border-teal/30 bg-teal/8 px-3 py-3">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {currentCardFormatted?.answer}
                    </p>
                  </div>
                  {currentCardFormatted?.reference && (
                    <div className="mt-3 rounded-lg border border-blue/25 bg-blue/8 px-3 py-2">
                      <p className="font-mono text-xs uppercase tracking-wider text-blue mb-1">
                        📚 Referência bibliográfica
                      </p>
                      <p className="text-xs leading-relaxed text-muted whitespace-pre-wrap">
                        {currentCardFormatted.reference}
                      </p>
                    </div>
                  )}
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
                disabled={safeCardIndex >= studyDeck.length - 1}
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

function parseCardContent(frente: string, verso: string, structuredReferences?: Flashcard["references"]) {
  const parsedInlineRefs = parseInlineReferences(verso);
  const explicitReference = parsedInlineRefs.length > 0 ? parsedInlineRefs.join("; ") : "";
  const reference = extractReference(verso);
  const answer = removeReferenceFromAnswer(verso);
  return {
    question: normalizeQuestionLabel(frente),
    answer: normalizeAnswerBody(answer),
    reference: mergeReferenceWithSuggestions(
      explicitReference || reference,
      `${frente}\n${verso}`,
      parsedInlineRefs,
      structuredReferences,
    ),
  };
}

function compareCardsForStudyOrder(a: Flashcard, b: Flashcard) {
  // Prioridade 1: número embutido no texto (ex: "5) Qual é...")
  const numberA = extractCardNumber(a.frente);
  const numberB = extractCardNumber(b.frente);
  if (numberA !== null && numberB !== null && numberA !== numberB) return numberA - numberB;
  if (numberA !== null && numberB === null) return -1;
  if (numberA === null && numberB !== null) return 1;

  // Prioridade 2: ordem de importação pelo ID completo (estável entre arquivos)
  return a.id.localeCompare(b.id, "pt-BR", { numeric: true });
}

function formatCardQuestionForSession(question: string, index: number) {
  // SEMPRE usa posição no array (index+1) para exibição — nunca o número embutido.
  // O número embutido é usado apenas para ordenação, não para display.
  const cleaned = question
    .trim()
    .replace(/^(?:#\s*)?(?:q(?:uest[aã]o)?\s*)?\d{1,4}[\)\.\-:–—\s]*/i, "")
    .trim();
  return `${index + 1}) ${cleaned || question}`;
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
  return "";
}

function removeReferenceFromAnswer(value: string) {
  return value
    .replace(/(?:refer[eê]ncias?|fontes?|bibliografia)\s*:[\s\S]*$/i, "")
    .trim();
}

function mergeReferenceWithSuggestions(
  reference: string,
  context: string,
  parsedInlineRefs: string[] = [],
  structuredReferences?: Flashcard["references"],
) {
  if (structuredReferences && structuredReferences.length > 0) {
    return structuredReferences
      .map((ref) => [ref.title, ref.year, ref.source, ref.url].filter(Boolean).join(" - "))
      .join("; ");
  }
  if (parsedInlineRefs.length > 0) {
    return parsedInlineRefs.join("; ");
  }
  const suggestions = suggestStudyReferences(context);
  if (reference.trim()) {
    return reference.trim();
  }
  if (suggestions.length === 0) {
    return "Referência não informada no card importado.";
  }
  return `Referências sugeridas para estudo:\n- ${suggestions.join("\n- ")}`;
}

function parseInlineReferences(verso: string) {
  const raw = extractReference(verso).trim();
  if (!raw) return [];
  return raw
    .split(/;|\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
