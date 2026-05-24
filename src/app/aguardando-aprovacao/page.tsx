"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMemo } from "react";

export default function AguardandoAprovacaoPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function sair() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
          <span className="text-3xl">⏳</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Cadastro em análise</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Seu cadastro foi recebido e está aguardando aprovação do administrador.
          Você receberá acesso assim que for aprovado.
        </p>
        <p className="mt-4 text-xs text-muted/60">
          Se precisar de suporte, entre em contato com o administrador do sistema.
        </p>
        <button
          type="button"
          onClick={() => void sair()}
          className="mt-6 w-full rounded-xl border border-border bg-background/35 px-4 py-2.5 text-sm font-medium text-muted transition hover:text-foreground"
        >
          Sair
        </button>
      </div>
    </main>
  );
}
