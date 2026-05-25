"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/admin", label: "Painel", exact: true },
  { href: "/admin/simulacoes", label: "Simulações", exact: false },
  { href: "/admin/casos", label: "Banco de Casos", exact: false },
  { href: "/admin/importar-ia", label: "✦ Importar IA", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
      {/* Top nav */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm">
        <span className="mr-2 font-mono text-xs font-bold uppercase tracking-widest text-teal">
          Admin
        </span>
        <span className="mr-2 text-border">|</span>
        <div className="flex flex-1 items-center gap-1">
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
        </div>
        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <a
            href="/dashboard"
            className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-white/5 hover:text-foreground"
          >
            ← App
          </a>
          <a
            href="/logout"
            className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-white/5 hover:text-foreground"
          >
            Sair
          </a>
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
