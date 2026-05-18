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
    <header className="space-y-2 pt-2">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
      <p className="text-sm text-muted">{description}</p>
    </header>
  );
}
