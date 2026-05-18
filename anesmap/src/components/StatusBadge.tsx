import type { ReactNode } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

const toneMap = {
  teal: "border-teal/30 bg-teal/15 text-teal",
  blue: "border-blue/30 bg-blue/15 text-blue",
  purple: "border-purple/30 bg-purple/15 text-purple",
  amber: "border-amber/30 bg-amber/15 text-amber",
  rose: "border-rose/30 bg-rose/15 text-rose",
} as const;

type Tone = keyof typeof toneMap;

type StatusBadgeProps = {
  children: ReactNode;
  tone: Tone;
  className?: string;
  as?: "span" | "button";
  type?: "button" | "submit" | "reset";
} & Pick<HTMLAttributes<HTMLSpanElement>, "title"> &
  Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled">;

export function StatusBadge({
  children,
  tone,
  className = "",
  as: Tag = "span",
  type = "button",
  title,
  onClick,
  disabled,
}: StatusBadgeProps) {
  const baseClassName = `inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium ${toneMap[tone]} ${className}`;

  if (Tag === "button") {
    return (
      <button
        type={type}
        className={baseClassName}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={baseClassName} title={title}>
      {children}
    </span>
  );
}
