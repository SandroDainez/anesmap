"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        router.replace("/login");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    })();
  }, [router, supabase]);

  return (
    <main className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted">Saindo...</p>
    </main>
  );
}
