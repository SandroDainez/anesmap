"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/admin", label: "Usuários", exact: true },
  { href: "/admin/simulacoes", label: "Simulações", exact: false },
  { href: "/admin/casos", label: "Banco de Casos", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
      {/* Top nav */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm">
        <span className="mr-3 font-mono text-xs font-semibold uppercase tracking-widest text-teal">
          Admin
        </span>
        {ADMIN_LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-teal/15 text-teal"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
