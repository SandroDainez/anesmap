"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginMode = "student" | "admin" | "signup";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<LoginMode>("student");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setSignupSuccess(false);
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
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

    const profile = await readProfileWithRetry(supabase, user.id);

    // Block pending users
    if (profile?.status === "pending") {
      await supabase.auth.signOut();
      setError("Seu cadastro está aguardando aprovação do administrador. Você receberá acesso em breve.");
      setIsLoading(false);
      return;
    }

    // Block blocked users
    if (profile?.status === "blocked") {
      await supabase.auth.signOut();
      setError("Seu acesso foi bloqueado. Entre em contato com o administrador.");
      setIsLoading(false);
      return;
    }

    const role = profile?.role ?? null;

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
    const isRelativePath = (url: string) =>
      url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
    const safeRequestedRedirect =
      requestedRedirect &&
      isRelativePath(requestedRedirect) &&
      requestedRedirect !== "/logout" &&
      ((mode === "admin" && requestedRedirect.startsWith("/admin")) ||
        (mode === "student" && !requestedRedirect.startsWith("/admin")))
        ? requestedRedirect
        : null;
    const redirect = safeRequestedRedirect ?? (mode === "admin" ? "/admin" : "/dashboard");
    window.location.href = redirect;
  }

  // ── Signup ─────────────────────────────────────────────────────────────────
  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });
      const json = await res.json() as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(json.error ?? "Erro ao criar conta. Tente novamente.");
        return;
      }
      setSignupSuccess(true);
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Acesso"
        title={mode === "signup" ? "Criar Conta" : "Entrar"}
        description={
          mode === "signup"
            ? "Crie sua conta e aguarde a aprovação do administrador para ter acesso."
            : "Use sua conta para salvar progresso individual e acessar seu histórico."
        }
      />

      <AppCard>
        {/* Mode tabs */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => switchMode("student")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "student"
                ? "border-teal/60 bg-teal/20 text-teal ring-2 ring-teal/60 shadow-[0_0_0_1px_rgba(0,201,167,0.35)]"
                : "border-border bg-background/35 text-muted hover:text-foreground hover:bg-background/55"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("admin")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "admin"
                ? "border-purple/60 bg-purple/20 text-purple ring-2 ring-purple/60 shadow-[0_0_0_1px_rgba(155,109,255,0.35)]"
                : "border-border bg-background/35 text-muted hover:text-foreground hover:bg-background/55"
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "signup"
                ? "border-blue/60 bg-blue/20 text-blue ring-2 ring-blue/60 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
                : "border-border bg-background/35 text-muted hover:text-foreground hover:bg-background/55"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* ── Login form ── */}
        {(mode === "student" || mode === "admin") && (
          <form onSubmit={handleLogin} className="space-y-3">
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
        )}

        {/* ── Signup form ── */}
        {mode === "signup" && !signupSuccess && (
          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="text"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              placeholder="Nome completo"
              required
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-blue/40 focus:outline-none"
            />
            <input
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="E-mail"
              required
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-blue/40 focus:outline-none"
            />
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Senha (mín. 6 caracteres)"
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-blue/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue transition hover:opacity-90 disabled:opacity-40"
            >
              {isLoading ? "Cadastrando..." : "Criar conta"}
            </button>
          </form>
        )}

        {/* ── Signup success ── */}
        {mode === "signup" && signupSuccess && (
          <div className="rounded-xl border border-teal/30 bg-teal/10 px-4 py-5 text-center">
            <p className="text-2xl">✓</p>
            <p className="mt-2 font-semibold text-teal">Cadastro realizado!</p>
            <p className="mt-1 text-sm text-muted">
              Seu acesso será liberado após aprovação do administrador.
              Você já pode fazer login assim que for aprovado.
            </p>
            <button
              type="button"
              onClick={() => switchMode("student")}
              className="mt-4 text-xs text-muted underline underline-offset-2 hover:text-foreground"
            >
              Ir para o login
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-rose">{error}</p>
        ) : null}
      </AppCard>
    </main>
  );
}

async function readProfileWithRetry(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  userId: string,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", userId)
      .maybeSingle();
    if (data?.role) {
      return data as { role: string; status: string };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return null;
}
