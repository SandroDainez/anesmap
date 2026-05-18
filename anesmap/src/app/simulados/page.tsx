"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  SimuladoQuestion,
  StudyTrack,
  isSupabaseConfigured,
  loadSimulados,
  loadSimuladosRemote,
  saveSimulados,
  suggestStudyReferences,
} from "@/lib/study-data";

const examMeta = [
  { label: "Questões", value: "120" },
  { label: "Acertos", value: "74%" },
  { label: "Tempo", value: "01:32:12" },
] as const;

export default function SimuladosPage() {
  const [selectedMe, setSelectedMe] = useState<StudyTrack>("ME1");
  const [importedSimulados, setImportedSimulados] = useState<SimuladoQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [answers, setAnswers] = useState<
    Record<string, { selected: "A" | "B" | "C" | "D"; isCorrect: boolean }>
  >({});

  useEffect(() => {
    const local = loadSimulados();
    setImportedSimulados(local);

    if (!isSupabaseConfigured()) return;

    void (async () => {
      const remote = await loadSimuladosRemote();
      if (remote) {
        setImportedSimulados(remote);
        saveSimulados(remote);
      }
    })();
  }, []);

  const simuladosByTrack = useMemo(
    () =>
      importedSimulados
        .filter((item) => item.me === selectedMe)
        .sort((a, b) => extractQuestionOrder(a.enunciado) - extractQuestionOrder(b.enunciado)),
    [importedSimulados, selectedMe],
  );
  const currentQuestion = simuladosByTrack[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  useEffect(() => {
    setCurrentIndex(0);
    setShowBack(false);
    setAnswers({});
  }, [selectedMe]);

  useEffect(() => {
    setShowBack(false);
  }, [currentIndex]);

  function chooseAlternative(letter: "A" | "B" | "C" | "D") {
    if (!currentQuestion) return;
    const isCorrect = currentQuestion.correta === letter;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { selected: letter, isCorrect },
    }));
    setShowBack(true);
  }

  function goNext() {
    if (currentIndex >= simuladosByTrack.length - 1) return;
    setCurrentIndex((value) => value + 1);
  }

  function goPrev() {
    if (currentIndex <= 0) return;
    setCurrentIndex((value) => value - 1);
  }

  const answeredCount = Object.keys(answers).length;
  const hits = Object.values(answers).filter((item) => item.isCorrect).length;
  const score = answeredCount > 0 ? Math.round((hits / answeredCount) * 100) : 0;

  const dynamicMeta = [
    { label: "Questões", value: String(simuladosByTrack.length) },
    { label: "Acertos", value: `${score}%` },
    { label: "Respondidas", value: String(answeredCount) },
  ] as const;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 02"
        title="Simulados TSBA"
        description="Treine com cronômetro e métricas no padrão da prova."
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
              Questão {currentIndex + 1} de {simuladosByTrack.length}
            </h3>
            {!showBack ? (
              <>
                <p className="mt-2 text-base text-foreground">
                  {formatQuestionWithNumber(currentQuestion.enunciado, currentIndex)}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {(
                    [
                      ["A", currentQuestion.alternativaA],
                      ["B", currentQuestion.alternativaB],
                      ["C", currentQuestion.alternativaC],
                      ["D", currentQuestion.alternativaD],
                    ] as const
                  ).map(([letter, content]) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => chooseAlternative(letter)}
                      className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-left text-muted transition hover:bg-background/60"
                    >
                      <span className="font-medium text-foreground">{letter})</span> {content}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 font-medium text-foreground">
                  {currentAnswer?.isCorrect
                    ? "Resposta correta!"
                    : `Você marcou ${currentAnswer?.selected ?? "-"}, mas a correta é ${currentQuestion.correta}.`}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {(
                    [
                      ["A", currentQuestion.alternativaA],
                      ["B", currentQuestion.alternativaB],
                      ["C", currentQuestion.alternativaC],
                      ["D", currentQuestion.alternativaD],
                    ] as const
                  ).map(([letter, content]) => (
                    <article
                      key={letter}
                      className="rounded-xl border border-border bg-background/40 px-3 py-2"
                    >
                      <p className="text-foreground">
                        <span className="font-semibold">{letter})</span> {content}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {buildOptionComment(letter, currentQuestion)}
                      </p>
                    </article>
                  ))}
                </div>
                <article className="mt-3 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted">
                  <p className="font-semibold text-foreground">Referências sugeridas</p>
                  <ul className="mt-1 space-y-1">
                    {suggestStudyReferences(
                      `${currentQuestion.tema ?? ""}\n${currentQuestion.enunciado}\n${currentQuestion.explicacao ?? ""}`,
                    ).map((ref) => (
                      <li key={ref}>- {ref}</li>
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
                disabled={currentIndex >= simuladosByTrack.length - 1}
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

function formatQuestionWithNumber(enunciado: string, index: number) {
  const text = enunciado.trim();
  const cleaned = text.replace(/^(?:q(?:uest[aã]o)?\s*)?\d{1,3}[\)\.\-:\s]*/i, "").trim();
  return `${index + 1}) ${cleaned || text}`;
}

function buildOptionComment(letter: "A" | "B" | "C" | "D", question: SimuladoQuestion) {
  if (letter === question.correta) {
    if (question.explicacao?.trim()) {
      return `Correta. ${question.explicacao.trim()}`;
    }
    return "Correta de acordo com o gabarito importado para esta questão.";
  }
  if (question.explicacao?.trim()) {
    return `Não é a correta. O gabarito indica ${question.correta}. Veja a justificativa da correta: ${question.explicacao.trim()}`;
  }
  return `Não é a correta para esta questão. O gabarito importado indica ${question.correta}.`;
}
