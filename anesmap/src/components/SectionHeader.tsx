type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <header className="space-y-4 pt-4">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-teal">
        {eyebrow}
      </p>
      <h1 className="text-5xl font-bold leading-none tracking-tight">{title}</h1>
      <p className="text-base text-muted leading-relaxed">{description}</p>
    </header>
  );
}
