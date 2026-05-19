"use client";

import { useEffect, useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { AppCard } from "@/components/AppCard";
import { loadMyProfile } from "@/lib/user-study";

export default function AdminPage() {
  const [status, setStatus] = useState<"loading" | "admin" | "blocked">("loading");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const profile = await loadMyProfile();
      if (!mounted) return;
      if (profile?.role === "admin") {
        setStatus("admin");
      } else {
        setStatus("blocked");
        window.location.href = "/dashboard";
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (status === "admin") return <AdminPanel />;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppCard>
        <p className="text-sm text-muted">
          {status === "loading" ? "Validando acesso admin..." : "Redirecionando..."}
        </p>
      </AppCard>
    </main>
  );
}
