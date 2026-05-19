"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  SimuladoQuestion,
  StudyTrack,
  Trimestre,
  isSupabaseConfigured,
  loadSimulados,
  loadSimuladosRemote,
  saveSimulados,
  suggestStudyReferences,
} from "@/lib/study-data";
import {
  endStudySession,
  finishSimuladoAttempt,
  loadMyProfile,
  recordSimuladoAnswer,
  startSimuladoAttempt,
  startStudySession,
} from "@/lib/user-study";

const ALL_TRACKS: StudyTrack[] = ["ME1", "ME2", "ME3"];
// Trimestres T1–T4 = simulados de 30q (trimestrais); "anual" = 50q (anuais); "todos" = sem filtro
const ALL_TRIMESTERS: Array<Trimestre | "todos"> = ["todos", "T1", "T2", "T3", "T4", "anual"];

export default function SimuladosPage() {
  const [selectedMe, setSelectedMe] = useState<StudyTrack>("ME1");
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre | "todos">("todos");
  const [allowedTracks, setAllowedTracks] = useState<StudyTrack[]>(ALL_TRACKS);
  // Keep SSR and first client render consistent to avoid hydration mismatch.
  const [importedSimulados, setImportedSimulados] = useState<SimuladoQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [answers, setAnswers] = useState<
    Record<string, { selected: "A" | "B" | "C" | "D" | "E"; isCorrect: boolean }>
  >({});
  const [attemptState, setAttemptState] = useState<{
    attemptId: string;
    startedAt: Date;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);

  useEffect(() => {
    // Hydrate local cached data only after mount (client-side).
    setImportedSimulados(loadSimulados());

    // Restore preferred track from dashboard selection
    const preferredTrack = localStorage.getItem("anesmap_preferred_track") as StudyTrack | null;
    if (preferredTrack && ["ME1", "ME2", "ME3"].includes(preferredTrack)) {
      setSelectedMe(preferredTrack);
    }

    void (async () => {
      const profile = await loadMyProfile();
      const track = profile?.assigned_track_simulados ?? profile?.assigned_track;
      if (track && track !== "ALL") {
        setAllowedTracks([track as StudyTrack]);
        setSelectedMe(track as StudyTrack);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    void (async () => {
      const remote = await loadSimuladosRemote();
      if (remote) {
        setImportedSimulados(remote);
        saveSimulados(remote);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const id = await startStudySession("simulados");
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

  const simuladosByTrack = useMemo(
    () =>
      importedSimulados
        .filter((item) => {
          if (item.me !== selectedMe) return false;
          if (selectedTrimestre === "todos") return true;
          // Match exactly by trimestre, or include untagged questions in all views
          return !item.trimestre || item.trimestre === selectedTrimestre;
        })
        .sort((a, b) => compareSimuladosForSessionOrder(a, b)),
    [importedSimulados, selectedMe, selectedTrimestre],
  );
  const safeIndex =
    simuladosByTrack.length === 0 ? 0 : Math.max(0, Math.min(currentIndex, simuladosByTrack.length - 1));
  const currentQuestion = simuladosByTrack[safeIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  useEffect(() => {
    void (async () => {
      const started = await startSimuladoAttempt(selectedMe);
      setAttemptState(started);
    })();
  }, [selectedMe]);

  function chooseAlternative(letter: "A" | "B" | "C" | "D" | "E") {
    if (!currentQuestion) return;
    const isCorrect = currentQuestion.correta === letter;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { selected: letter, isCorrect },
    }));
    if (attemptState) {
      void recordSimuladoAnswer({
        attemptId: attemptState.attemptId,
        questionId: currentQuestion.id,
        selected: letter,
        correct: isCorrect,
      });
    }
    setShowBack(true);
  }

  function goNext() {
    if (safeIndex >= simuladosByTrack.length - 1) return;
    setCurrentIndex((value) => value + 1);
    setShowBack(false);
  }

  function goPrev() {
    if (safeIndex <= 0) return;
    setCurrentIndex((value) => value - 1);
    setShowBack(false);
  }

  function changeTrack(track: StudyTrack) {
    setSelectedMe(track);
    setCurrentIndex(0);
    setShowBack(false);
    setAnswers({});
    localStorage.setItem("anesmap_preferred_track", track);
  }

  function changeTrimestre(t: Trimestre | "todos") {
    setSelectedTrimestre(t);
    setCurrentIndex(0);
    setShowBack(false);
    setAnswers({});
  }

  const answeredCount = Object.keys(answers).length;
  const hits = Object.values(answers).filter((item) => item.isCorrect).length;
  const score = answeredCount > 0 ? Math.round((hits / answeredCount) * 100) : 0;

  useEffect(() => {
    if (!attemptState) return;
    if (answeredCount === 0 || answeredCount < simuladosByTrack.length) return;
    void finishSimuladoAttempt({
      attemptId: attemptState.attemptId,
      startedAt: attemptState.startedAt,
      scorePercent: score,
    });
  }, [attemptState, answeredCount, simuladosByTrack.length, score]);

  const dynamicMeta = [
    { label: "Questões", value: String(simuladosByTrack.length) },
    { label: "Acertos", value: `${score}%` },
    { label: "Respondidas", value: String(answeredCount) },
  ] as const;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 02"
        title="Simulados TEA"
        description="Questões no formato TEA — Título de Especialista em Anestesiologia."
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
        <h2 className="mb-3 text-sm font-medium text-muted">Período / Prova</h2>
        <div className="grid grid-cols-3 gap-1.5">
          {ALL_TRIMESTERS.map((t) => {
            const isActive = selectedTrimestre === t;
            const label =
              t === "todos" ? "Todos" : t === "anual" ? "Anual (50q)" : `${t} (30q)`;
            return (
              <button
                key={t}
                type="button"
                onClick={() => changeTrimestre(t)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-blue bg-blue/20 text-blue shadow-sm"
                    : "border-border bg-background/30 text-muted hover:border-blue/40 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {selectedTrimestre === "todos"
            ? "Todas as questões da trilha"
            : selectedTrimestre === "anual"
            ? "Simulado anual — conteúdo dos 4 trimestres (50 questões)"
            : `Simulado trimestral ${selectedTrimestre} — 30 questões`}
        </p>
      </AppCard>

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-blue">
          Sessão ativa
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {currentQuestion?.tema
            ? `${currentQuestion.tema} - ${selectedMe}`
            : `Simulado Geral - ${selectedMe}`}
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {dynamicMeta.map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-border bg-background/40 px-3 py-3 text-center"
            >
              <p className="text-xs text-muted">{item.label}</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      </AppCard>

      <AppCard>
        {currentQuestion ? (
          <>
            <h3 className="text-sm font-medium text-muted">
              Questão {safeIndex + 1} de {simuladosByTrack.length}
            </h3>
            {!showBack ? (
              <>
                <p className="mt-2 text-base text-foreground">
                  {formatQuestionWithNumber(currentQuestion.enunciado, safeIndex)}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {buildAlternativesList(currentQuestion).map(([letter, content]) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => chooseAlternative(letter as "A" | "B" | "C" | "D" | "E")}
                      className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-left text-muted transition hover:bg-background/60"
                    >
                      <span className="font-medium text-foreground">{letter})</span> {content}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className={`mt-2 font-medium ${currentAnswer?.isCorrect ? "text-teal" : "text-rose"}`}>
                  {currentAnswer?.isCorrect
                    ? "✅ Resposta correta!"
                    : `❌ Você marcou ${currentAnswer?.selected ?? "-"} — a correta é ${currentQuestion.correta}.`}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {buildAlternativesList(currentQuestion).map(([letter, content]) => {
                    const isCorrect = currentQuestion.correta === letter;
                    const isSelected = currentAnswer?.selected === letter;
                    const isWrong = isSelected && !isCorrect;
                    const comment = buildOptionComment(letter as "A" | "B" | "C" | "D" | "E", currentQuestion);
                    return (
                      <article
                        key={letter}
                        className={`rounded-xl border px-3 py-2 ${
                          isCorrect
                            ? "border-teal/40 bg-teal/10"
                            : isWrong
                              ? "border-rose/40 bg-rose/10"
                              : "border-border bg-background/40"
                        }`}
                      >
                        <p className={`font-semibold ${isCorrect ? "text-teal" : isWrong ? "text-rose" : "text-foreground"}`}>
                          {letter}) {content}
                          {isCorrect && <span className="ml-2 text-xs font-medium">✓ correta</span>}
                          {isWrong && <span className="ml-2 text-xs font-medium">✗ sua resposta</span>}
                        </p>
                        {comment && (
                          <p className="mt-1 text-xs leading-relaxed text-muted">{comment}</p>
                        )}
                      </article>
                    );
                  })}
                </div>
                <article className="mt-3 rounded-xl border border-blue/30 bg-blue/8 px-3 py-2 text-xs text-muted">
                  <p className="font-semibold text-foreground">📚 Referências bibliográficas</p>
                  <ul className="mt-1 space-y-1">
                    {getQuestionReferences(currentQuestion).map((ref) => (
                      <li key={ref} className="leading-relaxed">— {ref}</li>
                    ))}
                  </ul>
                </article>
                <button
                  type="button"
                  onClick={() => setShowBack(false)}
                  className="mt-3 rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue transition hover:opacity-90"
                >
                  Voltar para a pergunta
                </button>
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground transition hover:bg-background/55 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={safeIndex >= simuladosByTrack.length - 1}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground transition hover:bg-background/55 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-medium text-muted">Questão do simulado</h3>
            <p className="mt-2 text-sm text-muted">
              Nenhuma questão importada para {selectedMe}. Vá em /importar e envie
              os CSVs de simulados.
            </p>
          </>
        )}
      </AppCard>
    </main>
  );
}

function extractQuestionOrder(enunciado: string) {
  const match = enunciado.trim().match(/^(?:q(?:uest[aã]o)?\s*)?(\d{1,3})[\)\.\-:\s]/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]);
}

function extractImportedRowOrder(id: string) {
  const match = id.match(/-(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}

function compareSimuladosForSessionOrder(a: SimuladoQuestion, b: SimuladoQuestion) {
  const numA = extractQuestionOrder(a.enunciado);
  const numB = extractQuestionOrder(b.enunciado);
  if (numA !== numB) return numA - numB;

  const rowA = extractImportedRowOrder(a.id);
  const rowB = extractImportedRowOrder(b.id);
  if (rowA !== null && rowB !== null && rowA !== rowB) return rowA - rowB;
  if (rowA !== null && rowB === null) return -1;
  if (rowA === null && rowB !== null) return 1;
  return a.enunciado.localeCompare(b.enunciado, "pt-BR");
}

function formatQuestionWithNumber(enunciado: string, index: number) {
  const text = enunciado.trim();
  const cleaned = text.replace(/^(?:q(?:uest[aã]o)?\s*)?\d{1,3}[\)\.\-:\s]*/i, "").trim();
  return `${index + 1}) ${cleaned || text}`;
}

/** Retorna lista de alternativas [letra, texto] incluindo E quando presente */
function buildAlternativesList(question: SimuladoQuestion): [string, string][] {
  const alts: [string, string][] = [
    ["A", question.alternativaA],
    ["B", question.alternativaB],
    ["C", question.alternativaC],
    ["D", question.alternativaD],
  ];
  if (question.alternativaE) {
    alts.push(["E", question.alternativaE]);
  }
  return alts;
}

/** Retorna o comentário individual para uma alternativa, priorizando explicação por alternativa */
function buildOptionComment(letter: "A" | "B" | "C" | "D" | "E", question: SimuladoQuestion) {
  const isCorrect = letter === question.correta;

  // Prioridade 1: explicação individual por alternativa (formato interativo)
  const perAlt = (
    letter === "A" ? question.explicacaoA :
    letter === "B" ? question.explicacaoB :
    letter === "C" ? question.explicacaoC :
    letter === "D" ? question.explicacaoD :
    question.explicacaoE
  )?.trim();

  if (perAlt) return perAlt;

  // Prioridade 2: explicação geral da questão
  if (isCorrect) {
    if (question.explicacao?.trim()) return question.explicacao.trim();
    return "Alternativa correta conforme gabarito.";
  }

  if (question.explicacao?.trim()) {
    return `Incorreta. A correta é ${question.correta}. ${question.explicacao.trim()}`;
  }
  return `Incorreta — gabarito: ${question.correta}.`;
}

function getQuestionReferences(question: SimuladoQuestion) {
  if (question.references && question.references.length > 0) {
    return question.references.map((ref) =>
      [ref.title, ref.year, ref.source, ref.url].filter(Boolean).join(" - "),
    );
  }
  return suggestStudyReferences(
    `${question.tema ?? ""}\n${question.enunciado}\n${question.explicacao ?? ""}`,
  );
}
