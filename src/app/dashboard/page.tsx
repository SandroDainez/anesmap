import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";

const studyTracks = [
  { id: "ME1", tone: "blue" },
  { id: "ME2", tone: "purple" },
  { id: "ME3", tone: "teal" },
] as const;

export default function DashboardPage() {
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
        <h2 className="mt-2 text-xl font-semibold">62% da meta concluída</h2>
        <p className="mt-1 text-sm text-muted">
          Continue por mais 18 minutos para bater sua meta diária.
        </p>
      </AppCard>
    </main>
  );
}
