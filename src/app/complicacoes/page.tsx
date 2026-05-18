import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";

const complications = [
  {
    title: "Hipertermia maligna",
    severity: "Crítica",
    tone: "rose",
    action: "Suspender gatilho e iniciar dantrolene imediatamente.",
  },
  {
    title: "Broncoespasmo intraoperatório",
    severity: "Alta",
    tone: "amber",
    action: "Ventilar com O2 100%, broncodilatador e ajustar anestesia.",
  },
  {
    title: "Hipotensão pós-indução",
    severity: "Média",
    tone: "blue",
    action: "Avaliar volume, vasopressor e profundidade anestésica.",
  },
] as const;

export default function ComplicacoesPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 05"
        title="Complicações"
        description="Condutas rápidas com classificação por severidade."
      />

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-rose">
          Triage de severidade
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatusBadge tone="rose" className="w-full">
            Crítica
          </StatusBadge>
          <StatusBadge tone="amber" className="w-full">
            Alta
          </StatusBadge>
          <StatusBadge tone="blue" className="w-full">
            Média
          </StatusBadge>
        </div>
      </AppCard>

      <section className="space-y-3">
        {complications.map((item) => (
          <AppCard key={item.title} as="article" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold leading-tight">{item.title}</h2>
              <StatusBadge tone={item.tone} className="px-2 py-1 text-xs">
                {item.severity}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted">{item.action}</p>
          </AppCard>
        ))}
      </section>
    </main>
  );
}
