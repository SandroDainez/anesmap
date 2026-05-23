"use client";

import { FormEvent, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateInviteCode, consumeInviteCode } from "@/lib/user-study";

export default function SignupPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!supabase) {
      setError("Supabase não configurado.");
      setIsLoading(false);
      return;
    }

    const codeNormalized = inviteCode.toUpperCase().trim();
    if (!codeNormalized) {
      setError("Informe o código de convite.");
      setIsLoading(false);
      return;
    }

    const valid = await validateInviteCode(codeNormalized);
    if (!valid) {
      setError("Código de convite inválido, expirado ou já utilizado.");
      setIsLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    await consumeInviteCode(codeNormalized);

    setSuccess("Conta criada com sucesso! Faça login para continuar.");
    setIsLoading(false);
    setTimeout(() => { window.location.href = "/login"; }, 1500);
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Acesso"
        title="Criar conta"
        description="Você precisa de um código de convite para se cadastrar."
      />

      <AppCard>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            required
            className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
            className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
          />
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Código de convite"
            required
            maxLength={8}
            className="w-full rounded-xl border border-amber/30 bg-amber/5 px-3 py-2 text-sm font-mono tracking-widest text-foreground placeholder:text-muted placeholder:font-sans placeholder:tracking-normal focus:border-amber/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl border border-teal/30 bg-teal/15 px-3 py-2 text-sm font-medium text-teal transition hover:opacity-90 disabled:opacity-40"
          >
            {isLoading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-teal">{success}</p> : null}
      </AppCard>
    </main>
  );
}
