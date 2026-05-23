"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginMode = "student" | "admin";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>("student");
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

    const user = signInData.user;
    if (!user?.id) {
      setError("Falha ao carregar sessão após login. Tente novamente.");
      setIsLoading(false);
      return;
    }

    const role = await readRoleWithRetry(supabase, user.id);

    if (role && mode === "admin" && role !== "admin") {
      await supabase.auth.signOut();
      setError("Esta conta não possui acesso de admin.");
      setIsLoading(false);
      return;
    }

    if (role && mode === "student" && role === "admin") {
      await supabase.auth.signOut();
      setError("Conta admin deve entrar pelo modo Admin.");
      setIsLoading(false);
      return;
    }

    const requestedRedirect = searchParams.get("redirect");
    const safeRequestedRedirect =
      requestedRedirect &&
      requestedRedirect !== "/logout" &&
      ((mode === "admin" && requestedRedirect.startsWith("/admin")) ||
        (mode === "student" && !requestedRedirect.startsWith("/admin")))
        ? requestedRedirect
        : null;
    const redirect = safeRequestedRedirect ?? (mode === "admin" ? "/admin" : "/dashboard");
    // Hard navigation keeps session cookies intact for the next page
    window.location.href = redirect;
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Acesso"
        title="Entrar"
        description="Use sua conta para salvar progresso individual e acessar seu histórico."
      />

      <AppCard>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("student")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "student"
                ? "border-teal/60 bg-teal/20 text-teal ring-2 ring-teal/60 shadow-[0_0_0_1px_rgba(0,201,167,0.35)]"
                : "border-border bg-background/35 text-muted hover:text-foreground hover:bg-background/55"
            }`}
          >
            Login Usuário
          </button>
          <button
            type="button"
            onClick={() => setMode("admin")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "admin"
                ? "border-purple/60 bg-purple/20 text-purple ring-2 ring-purple/60 shadow-[0_0_0_1px_rgba(155,109,255,0.35)]"
                : "border-border bg-background/35 text-muted hover:text-foreground hover:bg-background/55"
            }`}
          >
            Login Admin
          </button>
        </div>
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
            {isLoading
              ? "Entrando..."
              : mode === "admin"
                ? "Entrar como admin"
                : "Entrar como usuário"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
      </AppCard>
    </main>
  );
}

async function readRoleWithRetry(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  userId: string,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (data?.role === "admin" || data?.role === "student") {
      return data.role as LoginMode;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return null;
}
