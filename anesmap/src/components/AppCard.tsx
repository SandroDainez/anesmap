import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AppCardProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">;

export function AppCard({
  children,
  className = "",
  as: Tag = "section",
  ...props
}: AppCardProps) {
  return (
    <Tag className={`rounded-2xl border border-border bg-card p-5 ${className}`} {...props}>
      {children}
    </Tag>
  );
}
