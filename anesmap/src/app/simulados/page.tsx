 "use client";

import { useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StudyTrack, loadSimulados } from "@/lib/study-data";

const examMeta = [
  { label: "Questões", value: "120" },
  { label: "Acertos", value: "74%" },
  { label: "Tempo", value: "01:32:12" },
] as const;

export default function SimuladosPage() {
  const [selectedMe, setSelectedMe] = useState<StudyTrack>("ME1");
  const importedSimulados = useMemo(() => loadSimulados(), []);
  const simuladosByTrack = useMemo(
    () => importedSimulados.filter((item) => item.me === selectedMe),
    [importedSimulados, selectedMe],
  );
  const currentQuestion = simuladosByTrack[0];

  const dynamicMeta = [
    { label: "Questões", value: String(simuladosByTrack.length) },
    { label: "Acertos", value: currentQuestion ? "--" : "0%" },
    { label: "Tempo", value: "00:00:00" },
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
            <h3 className="text-sm font-medium text-muted">Questão do simulado</h3>
            <p className="mt-2 text-base text-foreground">{currentQuestion.enunciado}</p>
            <ol className="mt-3 space-y-2 text-sm text-muted">
              <li>A) {currentQuestion.alternativaA}</li>
              <li>B) {currentQuestion.alternativaB}</li>
              <li>C) {currentQuestion.alternativaC}</li>
              <li>D) {currentQuestion.alternativaD}</li>
            </ol>
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
