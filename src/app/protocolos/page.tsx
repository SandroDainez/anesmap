import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";

const specialties = [
  "Cardíaca",
  "Neurocirurgia",
  "Pediatria",
  "Obstetrícia",
] as const;

export default function ProtocolosPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 03"
        title="Protocolos Cirúrgicos"
        description="Guias por especialidade com blocos expansíveis."
      />

      <section className="space-y-3">
        {specialties.map((specialty) => (
          <AppCard key={specialty} as="div" className="p-4">
            <details className="open:text-foreground">
              <summary className="cursor-pointer list-none font-medium text-foreground">
                {specialty}
              </summary>
              <p className="mt-3 text-sm text-muted">
                Checklist pré-operatório, indução, manutenção e condutas de
                contingência para {specialty.toLowerCase()}.
              </p>
            </details>
          </AppCard>
        ))}
      </section>
    </main>
  );
}
