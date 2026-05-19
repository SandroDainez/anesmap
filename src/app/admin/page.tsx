"use client";

import { useEffect, useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { window.location.href = "/login"; return; }

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Verificando acesso...</p>
      </main>
    );
  }

  return <AdminPanel />;
}
