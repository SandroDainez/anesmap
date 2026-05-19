"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function readRoleWithRetry(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  userId: string,
  attempts = 5,
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (data?.role) return data.role as string;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!supabase) {
      setError("Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    const userId = signInData.user?.id;
    let destination = searchParams.get("redirect") ?? "/dashboard";

    if (userId) {
      const role = await readRoleWithRetry(supabase, userId);
      if (role === "admin") {
        destination = "/admin";
      } else {
        destination = searchParams.get("redirect") ?? "/dashboard";
      }
    }

    // Hard navigation para propagar o cookie de sessão corretamente
    window.location.href = destination;
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Acesso"
        title="Entrar"
        description="Use sua conta para salvar progresso individual e acessar seu histórico."
      />

      <AppCard>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            required
            className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
            required
            className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl border border-teal/30 bg-teal/15 px-3 py-2 text-sm font-medium text-teal transition hover:opacity-90 disabled:opacity-40"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
      </AppCard>
    </main>
  );
}
