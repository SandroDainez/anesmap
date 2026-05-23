"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-rose/30 bg-card p-6 text-center">
        <p className="mb-2 text-3xl">⚠️</p>
        <h2 className="mb-2 text-lg font-bold text-foreground">Algo deu errado</h2>
        <p className="mb-4 text-sm text-muted">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
