import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";

const skills = [
  { name: "Via aérea", level: "Alta", tone: "teal" },
  { name: "Hemodinâmica", level: "Média", tone: "amber" },
  { name: "Ultrassom", level: "Baixa", tone: "rose" },
  { name: "Bloqueios", level: "Média", tone: "blue" },
] as const;

export default function AvaliacaoPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 06"
        title="Autoavaliação de Habilidades"
        description="Avalie competências e acompanhe evolução no radar chart."
      />

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-purple">
          Radar chart
        </p>
        <div className="mt-3 grid place-items-center rounded-xl border border-border bg-background/40 p-8">
          <div className="h-40 w-40 rounded-full border border-purple/30" />
        </div>
        <p className="mt-3 text-sm text-muted">
          Placeholder visual até integrar biblioteca de gráficos.
        </p>
      </AppCard>

      <section className="space-y-2">
        {skills.map((skill) => (
          <article
            key={skill.name}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-sm">{skill.name}</span>
            <StatusBadge tone={skill.tone} className="px-2 py-1 text-xs">
              {skill.level}
            </StatusBadge>
          </article>
        ))}
      </section>
    </main>
  );
}
