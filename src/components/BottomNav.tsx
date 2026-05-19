"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  ClipboardList,
  Home,
  Layers,
  Siren,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadMyProfile } from "@/lib/user-study";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/simulados", label: "Simulados", icon: ClipboardList },
  { href: "/admin", label: "Admin", icon: BarChart3 },
  { href: "/complicacoes", label: "Complicações", icon: Siren },
  { href: "/avaliacao", label: "Avaliação", icon: Target },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<"student" | "admin">("student");

  useEffect(() => {
    void (async () => {
      const profile = await loadMyProfile();
      if (profile?.role === "admin") {
        setRole("admin");
      } else {
        setRole("student");
      }
    })();
  }, []);

  const items = useMemo(
    () => navItems.filter((item) => (item.href === "/admin" ? role === "admin" : true)),
    [role],
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-border bg-card/95 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur"
    >
      <ul className={`grid gap-1 ${items.length === 6 ? "grid-cols-6" : "grid-cols-5"}`}>
        {items.map(({ href, icon: Icon, label }) => {
          const isDashboardRoute = href === "/dashboard";
          const isActive =
            pathname === href ||
            (isDashboardRoute && pathname === "/") ||
            (!isDashboardRoute && pathname.startsWith(`${href}/`));

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`group relative z-10 flex flex-col items-center justify-center rounded-xl px-1 py-2 transition ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white/8"
                  />
                ) : null}
                <motion.span
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                >
                  <Icon
                    size={18}
                    className={`mb-1 ${
                      isActive ? "text-teal" : "text-muted group-hover:text-teal"
                    }`}
                  />
                </motion.span>
                <span className="text-[10px] font-medium leading-none">
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
