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
    <header className="space-y-3 pt-2">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">
        {eyebrow}
      </p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight">{title}</h1>
      <p className="text-base text-muted">{description}</p>
    </header>
  );
}
