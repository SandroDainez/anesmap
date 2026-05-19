export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2 pt-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          AnesMap
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted">
          Selecione a matéria para navegar entre os módulos de estudo.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-muted">Matriz de estudo</h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="rounded-xl border border-teal/30 bg-teal/15 px-3 py-2 text-sm font-medium text-teal"
          >
            ME1
          </button>
          <button
            type="button"
            className="rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue"
          >
            ME2
          </button>
          <button
            type="button"
            className="rounded-xl border border-purple/30 bg-purple/15 px-3 py-2 text-sm font-medium text-purple"
          >
            ME3
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Módulos</h2>
        <div className="grid gap-3">
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-teal">
              01
            </p>
            <h3 className="mt-1 text-lg font-semibold">Flashcards SM-2</h3>
            <p className="mt-1 text-sm text-muted">Difícil / Médio / Fácil</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-blue">
              02
            </p>
            <h3 className="mt-1 text-lg font-semibold">Simulados TEA</h3>
            <p className="mt-1 text-sm text-muted">Banco de questões + cronômetro</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-purple">
              03
            </p>
            <h3 className="mt-1 text-lg font-semibold">Protocolos cirúrgicos</h3>
            <p className="mt-1 text-sm text-muted">Especialidades e condutas</p>
          </article>
        </div>
      </section>
    </main>
  );
}
