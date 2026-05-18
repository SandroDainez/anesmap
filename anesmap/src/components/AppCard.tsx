import type { ReactNode } from "react";

type AppCardProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
};

export function AppCard({
  children,
  className = "",
  as: Tag = "section",
}: AppCardProps) {
  return (
    <Tag className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      {children}
    </Tag>
  );
}
