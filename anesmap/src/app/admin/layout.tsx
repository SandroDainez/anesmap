"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const ADMIN_LINKS = [
  { href: "/admin",           label: "Painel Geral",    icon: "⊞", exact: true },
  { href: "/admin/simulacoes", label: "Simulações",      icon: "▶", exact: false },
  { href: "/admin/casos",      label: "Banco de Casos",  icon: "🏥", exact: false },
  { href: "/admin/importar-ia",label: "✦ Importar IA",  icon: "",   exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-background/95 backdrop-blur-sm">
        {/* Brand */}
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-teal">
            ⚙ Admin
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {ADMIN_LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

        {/* Footer actions */}
        <div className="border-t border-border p-2 space-y-0.5">
          <div className="flex items-center px-1 py-1">
            <ThemeToggle />
            <span className="ml-2 text-xs text-muted">Tema</span>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition hover:bg-white/5 hover:text-foreground"
          >
            ← Voltar ao app
          </a>
          <a
            href="/logout"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition hover:bg-rose/10 hover:text-rose"
          >
            Sair
          </a>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
