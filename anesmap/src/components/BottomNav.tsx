"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Home,
  Layers,
  Siren,
  Target,
} from "lucide-react";

// Admin is a desktop-only panel — accessed via header link, not bottom nav
const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/flashcards", label: "Cards", icon: Layers },
  { href: "/simulados", label: "Simulados", icon: ClipboardList },
  { href: "/complicacoes", label: "Complic.", icon: Siren },
  { href: "/avaliacao", label: "Avaliação", icon: Target },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on admin pages (full-screen desktop layout)
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-border bg-card/95 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isDashboard = href === "/dashboard";
          const isActive =
            pathname === href ||
            (isDashboard && pathname === "/") ||
            (!isDashboard && pathname.startsWith(`${href}/`));

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`group relative z-10 flex flex-col items-center justify-center gap-1 py-3 transition ${
                  isActive ? "text-foreground" : "text-muted"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-x-1 inset-y-1 -z-10 rounded-xl bg-white/8"
                  />
                )}
                <motion.span
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? "text-teal" : "text-muted group-hover:text-foreground transition"}
                  />
                </motion.span>
                <span className={`text-[11px] font-medium leading-none ${isActive ? "text-foreground" : "text-muted"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
