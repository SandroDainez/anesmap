"use client";

import { useState } from "react";
import { ArrowLeft, Sparkles, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type Tipo = "simulados" | "flashcards" | "casos";
type ME = "ME1" | "ME2" | "ME3";
type Trimestre = "T1" | "T2" | "T3" | "T4" | "anual" | "";
type Prova = "A1" | "A2" | "A3" | "A4" | "";

// ─── Tipos de itens gerados pela IA ──────────────────────────────────────────

type CasoSimulacaoIA = {
  titulo: string;
  descricao: string;
  dificuldade: string;
  nivel_recomendado: string[];
  duracao_estimada: string;
  tags: string[];
  slug: string;
  situacao_inicial: string;
  sinais_vitais_iniciais: {
    PA: string;
    FC: number;
    SpO2: number;
    ETCO2: number;
    FR: number;
    Temp: number;
  };
  opcoes_iniciais: string[];
};

type SimuladoIA = {
  enunciado: string;
  alternativaA: string;
  alternativaB: string;
  alternativaC: string;
  alternativaD: string;
  alternativaE?: string | null;
  correta: string;
  explicacaoA: string;
  explicacaoB: string;
  explicacaoC: string;
  explicacaoD: string;
  explicacaoE?: string | null;
  explicacao?: string;
  tema?: string;
  referencias?: string[];
  me?: string;
  trimestre?: string | null;
  prova?: string | null;
};

type FlashcardIA = {
  frente: string;
  verso: string;
  tema?: string;
  me?: string;
  trimestre?: string | null;
};

type ItemIA = SimuladoIA | FlashcardIA | CasoSimulacaoIA;

function isSimulado(item: ItemIA): item is SimuladoIA {
  return "enunciado" in item;
}

function isCaso(item: ItemIA): item is CasoSimulacaoIA {
  return "situacao_inicial" in item;
}

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

// ─── Componente de preview de caso de simulação clínica ──────────────────────

function CasoCard({
  item,
  index,
  onRemove,
}: {
  item: CasoSimulacaoIA;
  index: number;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const difColor = item.dificuldade === "avançado"
    ? "text-rose border-rose/30 bg-rose/8"
    : item.dificuldade === "intermediário"
    ? "text-amber border-amber/30 bg-amber/8"
    : "text-green-400 border-green-500/30 bg-green-500/8";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-purple/15 px-2 py-0.5 text-[10px] font-semibold text-purple">
            Caso {index + 1}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${difColor}`}>
            {item.dificuldade}
          </span>
          {(item.nivel_recomendado ?? []).map((n) => (
            <span key={n} className="rounded-full bg-blue/15 px-2 py-0.5 text-[10px] font-semibold text-blue">{n}</span>
          ))}
        </div>
        <button onClick={onRemove} className="shrink-0 rounded-lg p-1 text-muted hover:bg-rose/10 hover:text-rose">
          <Trash2 size={14} />
        </button>
      </div>

      <div>
        <p className="text-sm font-bold text-foreground">{item.titulo}</p>
        <p className="mt-0.5 text-xs text-muted">{item.descricao}</p>
      </div>

      {/* Sinais vitais */}
      <div className="grid grid-cols-6 gap-1">
        {Object.entries(item.sinais_vitais_iniciais ?? {}).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-background/40 px-2 py-1.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">{k}</p>
            <p className="text-xs font-bold text-teal">{String(v)}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Ocultar detalhes" : "Ver situação e opções"}
      </button>

      {expanded && (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
            <p className="mb-1 font-semibold text-foreground">Situação inicial:</p>
            <p className="leading-relaxed text-muted">{item.situacao_inicial}</p>
          </div>
          <div className="rounded-lg border border-blue/20 bg-blue/5 px-3 py-2 text-xs">
            <p className="mb-1 font-semibold text-blue">Opções de conduta:</p>
            <ul className="space-y-1">
              {(item.opcoes_iniciais ?? []).map((op, i) => (
                <li key={i} className="text-muted">• {op}</li>
              ))}
            </ul>
          </div>
          {(item.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente de preview de simulado ───────────────────────────────────────

function SimuladoCard({
  item,
  index,
  onRemove,
}: {
  item: SimuladoIA;
  index: number;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const altLabels = ["A", "B", "C", "D", "E"] as const;
  const alts: Record<string, string | undefined> = {
    A: item.alternativaA,
    B: item.alternativaB,
    C: item.alternativaC,
    D: item.alternativaD,
    E: item.alternativaE ?? undefined,
  };
  const explicacoes: Record<string, string | undefined> = {
    A: item.explicacaoA,
    B: item.explicacaoB,
    C: item.explicacaoC,
    D: item.explicacaoD,
    E: item.explicacaoE ?? undefined,
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="shrink-0 rounded-full bg-blue/15 px-2 py-0.5 text-[10px] font-semibold text-blue">
          Q{index + 1} {item.tema ? `· ${item.tema}` : ""}
        </span>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1 text-muted hover:bg-rose/10 hover:text-rose"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Enunciado */}
      <p className="text-sm font-medium text-foreground leading-relaxed">{item.enunciado}</p>

      {/* Alternativas */}
      <div className="space-y-1.5">
        {altLabels.map((letter) => {
          const text = alts[letter];
          if (!text) return null;
          const isCorreta = item.correta?.toUpperCase() === letter;
          return (
            <div
              key={letter}
              className={`rounded-lg border px-3 py-2 text-xs ${
                isCorreta
                  ? "border-green-500/30 bg-green-500/8 text-green-300"
                  : "border-border bg-background/40 text-muted"
              }`}
            >
              <span className={`font-semibold ${isCorreta ? "text-green-400" : "text-foreground"}`}>
                {letter})
              </span>{" "}
              {text}
              {isCorreta && <span className="ml-1.5 text-[10px] font-semibold text-green-500">✓ CORRETA</span>}
            </div>
          );
        })}
      </div>

      {/* Toggle explicações */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Ocultar justificativas" : "Ver justificativas"}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {altLabels.map((letter) => {
            const text = alts[letter];
            const explicacao = explicacoes[letter];
            if (!text || !explicacao) return null;
            const isCorreta = item.correta?.toUpperCase() === letter;
            return (
              <div key={letter} className={`rounded-lg border px-3 py-2 text-xs ${
                isCorreta ? "border-green-500/20 bg-green-500/5" : "border-border bg-background/30"
              }`}>
                <p className={`mb-1 font-semibold ${isCorreta ? "text-green-400" : "text-rose"}`}>
                  {letter}) {isCorreta ? "✓ Por que está CORRETA:" : "✗ Por que está ERRADA:"}
                </p>
                <p className="leading-relaxed text-muted">{explicacao}</p>
              </div>
            );
          })}

          {item.explicacao && (
            <div className="rounded-lg border border-blue/20 bg-blue/5 px-3 py-2 text-xs">
              <p className="mb-1 font-semibold text-blue">📋 Raciocínio geral:</p>
              <p className="leading-relaxed text-muted">{item.explicacao}</p>
            </div>
          )}

          {item.referencias && item.referencias.length > 0 && (
            <div className="rounded-lg border border-purple/20 bg-purple/5 px-3 py-2 text-xs">
              <p className="mb-1 font-semibold text-purple">📚 Referências:</p>
              <ul className="space-y-0.5 text-muted">
                {item.referencias.map((ref, i) => (
                  <li key={i}>— {ref}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente de preview de flashcard ──────────────────────────────────────

function FlashcardCard({
  item,
  index,
  onRemove,
}: {
  item: FlashcardIA;
  index: number;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="shrink-0 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal">
          FC{index + 1} {item.tema ? `· ${item.tema}` : ""}
        </span>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1 text-muted hover:bg-rose/10 hover:text-rose"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Frente</p>
        <p className="text-sm font-medium text-foreground leading-relaxed">{item.frente}</p>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Ocultar verso" : "Ver verso"}
      </button>

      {expanded && (
        <div className="rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal mb-1">Verso</p>
          <p className="whitespace-pre-wrap leading-relaxed text-muted">{item.verso}</p>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ImportarIAPage() {
  const [tipo, setTipo] = useState<Tipo>("simulados");
  const [me, setMe] = useState<ME>("ME1");
  const [trimestre, setTrimestre] = useState<Trimestre>("");
  const [prova, setProva] = useState<Prova>("");
  const [texto, setTexto] = useState("");
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemIA[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  async function processar() {
    if (!texto.trim()) {
      setErroIA("Cole o texto que deseja processar.");
      return;
    }
    setProcessando(true);
    setErroIA(null);
    setItens([]);
    setSavedCount(null);

    try {
      const res = await fetch("/api/admin/importar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          tipo,
          me,
          trimestre: trimestre || null,
          prova: prova || null,
        }),
      });

      const data = await res.json() as {
        ok?: boolean;
        itens?: ItemIA[];
        erro?: string;
        detalhe?: string;
        raw?: string;
      };

      if (!res.ok || !data.ok) {
        setErroIA(data.erro ?? "Erro ao processar com IA.");
        return;
      }

      setItens(data.itens ?? []);
    } catch (err) {
      setErroIA(err instanceof Error ? err.message : "Erro de conexão.");
    } finally {
      setProcessando(false);
    }
  }

  async function salvar() {
    if (itens.length === 0) return;
    setSalvando(true);
    setErroIA(null);

    const supabase = getSupabase();
    if (!supabase) {
      setErroIA("Supabase não configurado.");
      setSalvando(false);
      return;
    }

    try {
      if (tipo === "simulados") {
        const rows = (itens as SimuladoIA[]).map((item, idx) => ({
          id: `ai_${tipo}_${Date.now()}_${idx}`,
          me: item.me ?? me,
          trimestre: item.trimestre ?? (trimestre || null),
          prova: item.prova ?? (prova || null),
          tema: item.tema?.trim() || null,
          enunciado: item.enunciado.trim(),
          alternativa_a: item.alternativaA.trim(),
          alternativa_b: item.alternativaB.trim(),
          alternativa_c: item.alternativaC.trim(),
          alternativa_d: item.alternativaD.trim(),
          alternativa_e: item.alternativaE?.trim() || null,
          correta: item.correta.toUpperCase(),
          explicacao_a: item.explicacaoA?.trim() || null,
          explicacao_b: item.explicacaoB?.trim() || null,
          explicacao_c: item.explicacaoC?.trim() || null,
          explicacao_d: item.explicacaoD?.trim() || null,
          explicacao_e: item.explicacaoE?.trim() || null,
          explicacao: [
            item.explicacao?.trim(),
            item.referencias?.length ? `Referências: ${item.referencias.join("; ")}` : null,
          ].filter(Boolean).join("\n\n") || null,
        }));

        const { error } = await supabase.from("simulados").insert(rows);
        if (error) throw new Error(error.message);
        setSavedCount(rows.length);
      } else if (tipo === "casos") {
        // Insert one caso at a time via admin API (handles auth + column sanitization)
        const casos = itens as CasoSimulacaoIA[];
        let saved = 0;
        for (const item of casos) {
          // Ensure slug uniqueness by appending timestamp if needed
          const slug = item.slug
            ? `${item.slug}-${Date.now()}`
            : `caso-ia-${Date.now()}`;

          const res = await fetch("/api/admin/casos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              titulo: item.titulo?.trim(),
              descricao: item.descricao?.trim() || null,
              dificuldade: item.dificuldade || "intermediário",
              nivel_recomendado: item.nivel_recomendado ?? [],
              duracao_estimada: item.duracao_estimada || null,
              tags: item.tags ?? [],
              situacao_inicial: item.situacao_inicial?.trim() || null,
              sinais_vitais_iniciais: item.sinais_vitais_iniciais ?? null,
              opcoes_iniciais: item.opcoes_iniciais ?? [],
              ativo: false,
              revisado: false,
            }),
          });
          if (!res.ok) {
            const err = await res.json() as { error?: string };
            throw new Error(err.error ?? `Erro ao salvar caso: ${res.status}`);
          }
          saved++;
        }
        setSavedCount(saved);
      } else {
        const rows = (itens as FlashcardIA[]).map((item, idx) => ({
          id: `ai_fc_${Date.now()}_${idx}`,
          me: item.me ?? me,
          trimestre: item.trimestre ?? (trimestre || null),
          frente: item.frente.trim(),
          verso: item.verso.trim(),
          tags: item.tema ? [item.tema] : [],
          especialidade: item.tema?.trim() || null,
        }));

        const { error } = await supabase.from("flashcards").insert(rows);
        if (error) throw new Error(error.message);
        setSavedCount(rows.length);
      }

      setItens([]);
      setTexto("");
    } catch (err) {
      setErroIA(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main className="min-h-full px-4 pb-16 pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles size={18} className="text-teal" />
              Importar com IA
            </h1>
            <p className="text-xs text-muted">
              Cole qualquer texto — anotação, capítulo, slide — e a IA estrutura questões ou flashcards completos.
            </p>
          </div>
        </div>

        {/* Tipo */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tipo de conteúdo</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "simulados", label: "Questões TEA", activeClass: "border-blue/50 bg-blue/15 text-blue" },
              { value: "flashcards", label: "Flashcards", activeClass: "border-teal/50 bg-teal/15 text-teal" },
              { value: "casos", label: "Simulação Clínica", activeClass: "border-purple/50 bg-purple/15 text-purple" },
            ] as { value: Tipo; label: string; activeClass: string }[]).map(({ value, label, activeClass }) => (
              <button
                key={value}
                onClick={() => { setTipo(value); setItens([]); setSavedCount(null); }}
                className={`rounded-xl border py-2.5 text-xs font-medium transition ${
                  tipo === value ? activeClass : "border-border bg-background/40 text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Metadados — só para simulados e flashcards */}
          {tipo !== "casos" && (
            <div className="grid grid-cols-3 gap-2">
              {/* ME */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">ME</label>
                <select
                  value={me}
                  onChange={(e) => setMe(e.target.value as ME)}
                  className="w-full rounded-lg border border-border bg-background/40 px-2 py-1.5 text-xs text-foreground focus:border-teal focus:outline-none"
                >
                  {["ME1", "ME2", "ME3"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Trimestre */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Trimestre</label>
                <select
                  value={trimestre}
                  onChange={(e) => { setTrimestre(e.target.value as Trimestre); setProva(""); }}
                  className="w-full rounded-lg border border-border bg-background/40 px-2 py-1.5 text-xs text-foreground focus:border-teal focus:outline-none"
                >
                  <option value="">—</option>
                  {["T1", "T2", "T3", "T4", "anual"].map((v) => (
                    <option key={v} value={v}>{v === "anual" ? "Anual" : v}</option>
                  ))}
                </select>
              </div>

              {/* Prova — só para simulados com trimestre */}
              {tipo === "simulados" && trimestre && (
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prova</label>
                  <select
                    value={prova}
                    onChange={(e) => setProva(e.target.value as Prova)}
                    className="w-full rounded-lg border border-border bg-background/40 px-2 py-1.5 text-xs text-foreground focus:border-teal focus:outline-none"
                  >
                    <option value="">—</option>
                    {["A1", "A2", "A3", "A4"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Info para casos */}
          {tipo === "casos" && (
            <div className="rounded-lg border border-purple/20 bg-purple/5 px-3 py-2 text-xs text-muted">
              💡 Descreva o cenário clínico livremente — a IA vai estruturar um caso de simulação interativa com situação inicial, sinais vitais e opções de conduta. O caso ficará inativo até você ativá-lo no Banco de Casos.
            </div>
          )}
        </div>

        {/* Área de texto */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Material de origem
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              tipo === "simulados"
                ? "Cole aqui anotações de aula, capítulo de livro, slides, questões em qualquer formato...\n\nA IA vai estruturar em questões TEA com alternativas A-E e justificativas individuais para cada alternativa."
                : tipo === "casos"
                ? "Descreva o cenário clínico: paciente, procedimento cirúrgico, contexto, complicação ou situação...\n\nEx: Paciente de 68 anos, obeso grau III (IMC 42), diabético, para colecistectomia laparoscópica eletiva. Inicia-se indução anestésica e ao laringoscopia direta visualiza-se apenas palato mole (Cormack-Lehane IV).\n\nA IA vai criar um caso de simulação interativa completo com sinais vitais e opções de conduta."
                : "Cole aqui o material de estudo que deseja converter em flashcards...\n\nA IA vai gerar perguntas inteligentes com respostas estruturadas e referências bibliográficas."
            }
            rows={12}
            className="w-full resize-none rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-teal focus:outline-none"
          />
          <p className="text-xs text-muted">
            {texto.length} caracteres · A IA processa textos de qualquer tamanho (PDF, slides, anotações)
          </p>

          <button
            onClick={processar}
            disabled={processando || !texto.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
          >
            {processando ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Processando com IA...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {tipo === "simulados" ? "Gerar questões" : tipo === "casos" ? "Gerar caso clínico" : "Gerar flashcards"} com IA
              </>
            )}
          </button>
        </div>

        {/* Erro */}
        {erroIA && (
          <div className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
            {erroIA}
          </div>
        )}

        {/* Sucesso */}
        {savedCount !== null && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            ✅ {savedCount}{" "}
            {tipo === "simulados" ? "questão(ões)" : tipo === "casos" ? "caso(s) de simulação" : "flashcard(s)"}{" "}
            salvo(s) com sucesso!
            {tipo === "casos" && (
              <span className="block mt-1 text-xs opacity-80">
                Os casos estão inativos — ative-os no{" "}
                <a href="/admin/casos" className="underline">Banco de Casos</a>{" "}
                após revisão.
              </span>
            )}
          </div>
        )}

        {/* Preview dos itens gerados */}
        {itens.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {itens.length}{" "}
                {tipo === "simulados" ? "questão(ões) gerada(s)" : tipo === "casos" ? "caso(s) gerado(s)" : "flashcard(s) gerado(s)"}{" "}
                — revise antes de salvar
              </p>
              <button
                onClick={() => setItens([])}
                className="text-xs text-muted hover:text-rose transition"
              >
                Descartar tudo
              </button>
            </div>

            {itens.map((item, i) =>
              isSimulado(item) ? (
                <SimuladoCard
                  key={i}
                  item={item}
                  index={i}
                  onRemove={() => removerItem(i)}
                />
              ) : isCaso(item) ? (
                <CasoCard
                  key={i}
                  item={item}
                  index={i}
                  onRemove={() => removerItem(i)}
                />
              ) : (
                <FlashcardCard
                  key={i}
                  item={item as FlashcardIA}
                  index={i}
                  onRemove={() => removerItem(i)}
                />
              )
            )}

            <button
              onClick={salvar}
              disabled={salvando || itens.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
            >
              {salvando ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar {itens.length}{" "}
                  {tipo === "simulados" ? "questão(ões)" : tipo === "casos" ? "caso(s)" : "flashcard(s)"} no banco
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
