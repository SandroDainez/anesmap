"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, MoveUp, MoveDown } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SinaisVitais = {
  PA: string;
  FC: number;
  SpO2: number;
  ETCO2: number;
  FR: number;
  Temp: number;
};

type Fase = {
  titulo: string;
  situacao: string;
  sinais_vitais: SinaisVitais;
  opcoes: string[];
};

type Caso = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  dificuldade: string;
  nivel_recomendado: string[];
  duracao_estimada: string;
  tags: string[];
  situacao_inicial: string;
  sinais_vitais_iniciais: SinaisVitais;
  opcoes_iniciais: string[];
  fases: Fase[] | null;
  ativo: boolean;
  revisado: boolean;
  created_at?: string;
};

type CasoPayload = Omit<Caso, "id" | "ativo" | "revisado" | "created_at">;

const NIVEIS = ["ME1", "ME2", "ME3"] as const;
const DIFICULDADES = ["iniciante", "intermediário", "avançado"] as const;

const SINAIS_VAZIOS: SinaisVitais = { PA: "", FC: 0, SpO2: 0, ETCO2: 0, FR: 0, Temp: 0 };

function sinaisFromUnknown(raw: unknown): SinaisVitais {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return {
      PA: String(r.PA ?? ""),
      FC: Number(r.FC ?? 0),
      SpO2: Number(r.SpO2 ?? 0),
      ETCO2: Number(r.ETCO2 ?? 0),
      FR: Number(r.FR ?? 0),
      Temp: Number(r.Temp ?? 0),
    };
  }
  return { ...SINAIS_VAZIOS };
}

function emptyFase(index = 0): Fase {
  return {
    titulo: index === 0 ? "Fase 1 — Apresentação inicial" : `Fase ${index + 1}`,
    situacao: "",
    sinais_vitais: { ...SINAIS_VAZIOS },
    opcoes: ["", "", "", ""],
  };
}

function emptyForm(): CasoPayload {
  const fase0 = emptyFase(0);
  return {
    titulo: "",
    slug: "",
    descricao: "",
    dificuldade: "iniciante",
    nivel_recomendado: [],
    duracao_estimada: "",
    tags: [],
    fases: [fase0],
    situacao_inicial: fase0.situacao,
    sinais_vitais_iniciais: { ...SINAIS_VAZIOS },
    opcoes_iniciais: ["", "", "", ""],
  };
}

/** Before saving, auto-populate legacy top-level fields from fases[0] */
function buildPayload(form: CasoPayload): CasoPayload {
  const f0 = (form.fases ?? [])[0];
  return {
    ...form,
    situacao_inicial: f0?.situacao ?? "",
    sinais_vitais_iniciais: f0?.sinais_vitais ?? { ...SINAIS_VAZIOS },
    opcoes_iniciais: (f0?.opcoes ?? []).filter(Boolean),
  };
}

// ─── Badge colours ────────────────────────────────────────────────────────────

function dificuldadeBadge(d: string) {
  if (d === "avançado")      return "bg-red-100   dark:bg-red-500/15   text-red-700   dark:text-red-400   border border-red-500/30";
  if (d === "intermediário") return "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30";
  return                            "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400 border border-green-500/30";
}

// ─── Fluxograma ──────────────────────────────────────────────────────────────

function Fluxograma() {
  const fases = [
    { label: "Fase 1", color: "border-teal text-teal bg-teal/10" },
    { label: "Fase 2", color: "border-blue-400 text-blue-300 bg-blue-400/10" },
    { label: "Fase N", color: "border-purple-400 text-purple-300 bg-purple-400/10" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-white/3 p-5">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
        Estrutura do caso
      </p>
      <div className="flex flex-col gap-2">
        {/* Phase row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="shrink-0 rounded-xl border border-border/50 bg-white/5 px-3 py-2 text-center text-xs text-muted" style={{ minWidth: 80 }}>
            PACIENTE
          </div>
          <span className="text-muted">→</span>
          {fases.map((f, i) => (
            <div key={f.label} className="flex shrink-0 items-center gap-2">
              <div className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${f.color}`} style={{ minWidth: 80 }}>
                {f.label}
              </div>
              {i < fases.length - 1 && <span className="text-muted">→</span>}
            </div>
          ))}
          <span className="text-muted">→</span>
          <div className="shrink-0 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-center text-xs font-semibold text-emerald-300" style={{ minWidth: 80 }}>
            DESFECHO
          </div>
        </div>

        {/* Legend */}
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
          <span>Cada fase define: <span className="text-foreground">situação clínica + sinais vitais + opções de conduta</span></span>
          <span>·</span>
          <span>A IA avalia cada conduta e progride pelas fases</span>
        </div>
      </div>
    </div>
  );
}

// ─── Modal overlay ────────────────────────────────────────────────────────────

function ModalOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-foreground"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

// ─── FaseEditor ──────────────────────────────────────────────────────────────

const FASE_COLORS = [
  "border-teal/40 bg-teal/5",
  "border-blue-400/40 bg-blue-400/5",
  "border-purple-400/40 bg-purple-400/5",
  "border-amber-400/40 bg-amber-400/5",
  "border-pink-400/40 bg-pink-400/5",
];

function FaseEditor({
  fase,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  fase: Fase;
  index: number;
  total: number;
  onChange: (f: Fase) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  const colorClass = FASE_COLORS[index % FASE_COLORS.length];
  const inputClass =
    "w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal focus:outline-none";

  function set<K extends keyof Fase>(key: K, value: Fase[K]) {
    onChange({ ...fase, [key]: value });
  }

  function setSinal<K extends keyof SinaisVitais>(key: K, value: string) {
    onChange({
      ...fase,
      sinais_vitais: {
        ...fase.sinais_vitais,
        [key]: key === "PA" ? value : Number(value),
      },
    });
  }

  function setOpcao(i: number, value: string) {
    const opcoes = [...fase.opcoes];
    opcoes[i] = value;
    onChange({ ...fase, opcoes });
  }

  function addOpcao() {
    onChange({ ...fase, opcoes: [...fase.opcoes, ""] });
  }

  function removeOpcao(i: number) {
    if (fase.opcoes.length <= 1) return;
    onChange({ ...fase, opcoes: fase.opcoes.filter((_, idx) => idx !== i) });
  }

  return (
    <div className={`rounded-2xl border ${colorClass} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-foreground">
            {index + 1}
          </span>
          <span className="flex-1 text-sm font-semibold text-foreground truncate">
            {fase.titulo || `Fase ${index + 1}`}
          </span>
          {open ? (
            <ChevronUp size={15} className="text-muted" />
          ) : (
            <ChevronDown size={15} className="text-muted" />
          )}
        </button>

        {/* Reorder + delete */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded-lg p-1 text-muted hover:text-foreground disabled:opacity-30"
            title="Mover para cima"
          >
            <MoveUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded-lg p-1 text-muted hover:text-foreground disabled:opacity-30"
            title="Mover para baixo"
          >
            <MoveDown size={14} />
          </button>
          {total > 1 && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1 text-red-400/60 hover:text-red-400"
              title="Remover fase"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body (collapsible) */}
      {open && (
        <div className="space-y-4 border-t border-white/8 px-4 pb-4 pt-3">
          {/* Título da fase */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Título da fase</label>
            <input
              className={inputClass}
              value={fase.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder={`Ex: Fase ${index + 1} — Agravamento do broncoespasmo`}
            />
          </div>

          {/* Situação clínica */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Situação clínica {index === 0 ? "(inicial)" : "desta fase"}
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={4}
              value={fase.situacao}
              onChange={(e) => set("situacao", e.target.value)}
              placeholder={
                index === 0
                  ? "Cena clínica detalhada que o residente verá ao iniciar..."
                  : "Como o quadro evolui ao entrar nesta fase..."
              }
            />
          </div>

          {/* Sinais vitais */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Sinais vitais {index === 0 ? "iniciais" : "desta fase"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["PA", "FC", "SpO2", "ETCO2", "FR", "Temp"] as const).map((key) => (
                <div key={key}>
                  <label className="mb-0.5 block text-[11px] text-muted">{key}</label>
                  <input
                    className={inputClass}
                    value={String(fase.sinais_vitais[key])}
                    onChange={(e) => setSinal(key, e.target.value)}
                    placeholder={key === "PA" ? "120/80" : "0"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Opções de conduta */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted">
                Opções de conduta ({fase.opcoes.length})
              </label>
              <button
                type="button"
                onClick={addOpcao}
                className="flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-xs text-muted hover:text-foreground"
              >
                <Plus size={11} /> Opção
              </button>
            </div>
            <div className="space-y-2">
              {fase.opcoes.map((opcao, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs font-bold text-muted">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    className={`${inputClass} flex-1`}
                    value={opcao}
                    onChange={(e) => setOpcao(i, e.target.value)}
                    placeholder={`Opção ${String.fromCharCode(65 + i)}`}
                  />
                  {fase.opcoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOpcao(i)}
                      className="shrink-0 text-red-400/50 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FasesEditor ─────────────────────────────────────────────────────────────

function FasesEditor({
  fases,
  onChange,
}: {
  fases: Fase[];
  onChange: (fases: Fase[]) => void;
}) {
  function addFase() {
    onChange([...fases, emptyFase(fases.length)]);
  }

  function updateFase(index: number, fase: Fase) {
    const next = [...fases];
    next[index] = fase;
    onChange(next);
  }

  function deleteFase(index: number) {
    if (fases.length <= 1) return;
    onChange(fases.filter((_, i) => i !== index));
  }

  function moveFase(index: number, dir: "up" | "down") {
    const next = [...fases];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Fases do caso
          </p>
          <p className="text-xs text-muted">
            {fases.length} fase{fases.length !== 1 ? "s" : ""} · a IA guiará a progressão fase a fase
          </p>
        </div>
        <button
          type="button"
          onClick={addFase}
          className="flex items-center gap-1.5 rounded-xl border border-teal/30 bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal transition hover:bg-teal/20"
        >
          <Plus size={13} /> Adicionar fase
        </button>
      </div>

      {fases.map((fase, i) => (
        <FaseEditor
          key={i}
          fase={fase}
          index={i}
          total={fases.length}
          onChange={(f) => updateFase(i, f)}
          onDelete={() => deleteFase(i)}
          onMoveUp={() => moveFase(i, "up")}
          onMoveDown={() => moveFase(i, "down")}
        />
      ))}
    </div>
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function CamposForm({
  form,
  onChange,
}: {
  form: CasoPayload;
  onChange: (updated: CasoPayload) => void;
}) {
  function set<K extends keyof CasoPayload>(key: K, value: CasoPayload[K]) {
    onChange({ ...form, [key]: value });
  }

  function toggleNivel(nivel: string) {
    const arr = form.nivel_recomendado.includes(nivel)
      ? form.nivel_recomendado.filter((n) => n !== nivel)
      : [...form.nivel_recomendado, nivel];
    set("nivel_recomendado", arr);
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-muted";

  return (
    <div className="space-y-5">
      {/* Título + Slug */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Título *</label>
          <input
            className={inputClass}
            value={form.titulo}
            onChange={(e) => set("titulo", e.target.value)}
            placeholder="Ex: Broncoespasmo intraoperatório"
          />
        </div>
        <div>
          <label className={labelClass}>Slug *</label>
          <input
            className={inputClass}
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="ex: broncoespasmo-intraop"
          />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className={labelClass}>Descrição do caso</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Contexto do paciente, procedimento, histórico clínico..."
        />
      </div>

      {/* Dificuldade + Duração */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Dificuldade</label>
          <select
            className={inputClass}
            value={form.dificuldade}
            onChange={(e) => set("dificuldade", e.target.value)}
          >
            {DIFICULDADES.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Duração estimada</label>
          <input
            className={inputClass}
            value={form.duracao_estimada}
            onChange={(e) => set("duracao_estimada", e.target.value)}
            placeholder="Ex: 30 min"
          />
        </div>
      </div>

      {/* Nível recomendado */}
      <div>
        <label className={labelClass}>Nível recomendado</label>
        <div className="flex gap-3">
          {NIVEIS.map((n) => (
            <label key={n} className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.nivel_recomendado.includes(n)}
                onChange={() => toggleNivel(n)}
                className="accent-teal"
              />
              {n}
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags (separadas por vírgula)</label>
        <input
          className={inputClass}
          value={form.tags.join(", ")}
          onChange={(e) =>
            set(
              "tags",
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }
          placeholder="broncoespasmo, airway, emergência"
        />
      </div>

      {/* Divisor */}
      <div className="border-t border-border pt-1" />

      {/* Fases — garantir ao menos 1 fase, inclusive quando fases=[] vindo do banco */}
      <FasesEditor
        fases={form.fases?.length ? form.fases : [emptyFase(0)]}
        onChange={(fases) => set("fases", fases)}
      />
    </div>
  );
}

// ─── Modal: Criar com IA ─────────────────────────────────────────────────────

function ModalIA({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [topico, setTopico] = useState("");
  const [nivel, setNivel] = useState<string>("ME1");
  const [dificuldade, setDificuldade] = useState<string>("intermediário");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<CasoPayload | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gerar() {
    if (!topico.trim()) { setErro("Descreva o cenário clínico."); return; }
    setErro(""); setGerando(true);
    try {
      const res = await fetch("/api/admin/casos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico, nivel, dificuldade }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setErro(String(data.error ?? "Erro ao gerar.")); return; }

      // Build fases array from AI response
      type FaseRaw = { titulo?: string; situacao?: string; sinais_vitais?: unknown; opcoes?: unknown[] };
      const fasesRaw: FaseRaw[] = Array.isArray(data.fases) ? (data.fases as FaseRaw[]) : [];
      const fases: Fase[] = fasesRaw.length > 0
        ? fasesRaw.map((f, i) => ({
            titulo: String(f.titulo ?? `Fase ${i + 1}`),
            situacao: String(f.situacao ?? ""),
            sinais_vitais: sinaisFromUnknown(f.sinais_vitais),
            opcoes: Array.isArray(f.opcoes) ? (f.opcoes as string[]) : ["", "", "", ""],
          }))
        : [
            {
              titulo: "Fase 1 — Apresentação inicial",
              situacao: String(data.situacao_inicial ?? ""),
              sinais_vitais: sinaisFromUnknown(data.sinais_vitais_iniciais),
              opcoes: Array.isArray(data.opcoes_iniciais) ? (data.opcoes_iniciais as string[]) : ["", "", "", ""],
            },
          ];

      setForm({
        titulo: String(data.titulo ?? ""),
        slug: String(data.slug ?? ""),
        descricao: String(data.descricao ?? ""),
        dificuldade: String(data.dificuldade ?? "iniciante"),
        nivel_recomendado: Array.isArray(data.nivel_recomendado) ? (data.nivel_recomendado as string[]) : [],
        duracao_estimada: String(data.duracao_estimada ?? ""),
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        fases,
        situacao_inicial: fases[0]?.situacao ?? "",
        sinais_vitais_iniciais: fases[0]?.sinais_vitais ?? { ...SINAIS_VAZIOS },
        opcoes_iniciais: fases[0]?.opcoes.filter(Boolean) ?? [],
      });
    } catch { setErro("Falha de conexão."); }
    finally { setGerando(false); }
  }

  async function salvar() {
    if (!form) return;
    setSalvando(true); setErro("");
    try {
      const payload = buildPayload(form);
      const res = await fetch("/api/admin/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setErro(String(data.error ?? "Erro ao salvar.")); return; }
      onSaved(); onClose();
    } catch { setErro("Falha de conexão."); }
    finally { setSalvando(false); }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-muted";

  return (
    <ModalOverlay title="✦ Criar com IA" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Cenário clínico *</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={topico}
            onChange={(e) => setTopico(e.target.value)}
            placeholder="Ex: Paciente com broncoespasmo grave durante cirurgia abdominal de urgência"
            disabled={gerando}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nível</label>
            <select className={inputClass} value={nivel} onChange={(e) => setNivel(e.target.value)} disabled={gerando}>
              {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Dificuldade</label>
            <select className={inputClass} value={dificuldade} onChange={(e) => setDificuldade(e.target.value)} disabled={gerando}>
              {DIFICULDADES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => void gerar()}
          disabled={gerando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {gerando ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> Gerando fases…</>
          ) : "✦ Gerar caso com múltiplas fases"}
        </button>

        {erro && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>
        )}

        {form && (
          <>
            <div className="border-t border-border pt-4">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-teal">
                Revisar e editar antes de salvar
              </p>
              <CamposForm form={form} onChange={setForm} />
            </div>
            <button
              onClick={() => void salvar()}
              disabled={salvando}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-teal bg-teal/10 px-4 py-2.5 text-sm font-semibold text-teal transition hover:bg-teal/20 disabled:opacity-50"
            >
              {salvando ? "Salvando…" : "Salvar Caso"}
            </button>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─── Modal: Criar Manual ─────────────────────────────────────────────────────

function ModalManual({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CasoPayload>(emptyForm());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!form.titulo.trim() || !form.slug.trim()) { setErro("Título e slug são obrigatórios."); return; }
    setSalvando(true); setErro("");
    try {
      const payload = buildPayload(form);
      const res = await fetch("/api/admin/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setErro(String(data.error ?? "Erro ao salvar.")); return; }
      onSaved(); onClose();
    } catch { setErro("Falha de conexão."); }
    finally { setSalvando(false); }
  }

  return (
    <ModalOverlay title="Criar Caso Manual" onClose={onClose}>
      <div className="space-y-4">
        <CamposForm form={form} onChange={setForm} />

        {erro && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>
        )}

        <button
          onClick={() => void salvar()}
          disabled={salvando}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-teal bg-teal/10 px-4 py-2.5 text-sm font-semibold text-teal transition hover:bg-teal/20 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar Caso"}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── CasoCard ────────────────────────────────────────────────────────────────

function CasoCard({
  caso,
  onToggle,
  onDelete,
}: {
  caso: Caso;
  onToggle: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggle() {
    setToggling(true);
    await onToggle(caso.id, caso.ativo);
    setToggling(false);
  }

  async function del() {
    if (!confirm(`Excluir "${caso.titulo}"? Esta ação é irreversível.`)) return;
    setDeleting(true);
    await onDelete(caso.id);
    setDeleting(false);
  }

  const numFases = caso.fases?.length ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-white/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{caso.titulo}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted">{caso.slug}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dificuldadeBadge(caso.dificuldade)}`}>
            {caso.dificuldade}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${caso.ativo ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-muted border border-border"}`}>
            {caso.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>

      {caso.descricao && (
        <p className="mb-3 line-clamp-2 text-xs text-muted">{caso.descricao}</p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        {caso.duracao_estimada && <span>⏱ {caso.duracao_estimada}</span>}
        {caso.nivel_recomendado?.length > 0 && <span>🎓 {caso.nivel_recomendado.join(", ")}</span>}
        {numFases > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-border bg-white/5 px-2 py-0.5 text-[11px]">
            {numFases} fase{numFases !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {caso.tags?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {caso.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-[11px] text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => void toggle()}
          disabled={toggling}
          className="flex-1 rounded-xl border border-border bg-white/5 px-3 py-1.5 text-xs text-foreground transition hover:bg-white/10 disabled:opacity-50"
        >
          {toggling ? "…" : caso.ativo ? "Desativar" : "Ativar"}
        </button>
        <button
          onClick={() => void del()}
          disabled={deleting}
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {deleting ? "…" : "Excluir"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CasosPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalIA, setModalIA] = useState(false);
  const [modalManual, setModalManual] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/casos");
      const data = (await res.json()) as Caso[];
      setCasos(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function toggleAtivo(id: string, ativoAtual: boolean) {
    const res = await fetch(`/api/admin/casos?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativoAtual }),
    });
    if (res.ok) setCasos((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: !ativoAtual } : c)));
  }

  async function excluir(id: string) {
    const res = await fetch(`/api/admin/casos?id=${id}`, { method: "DELETE" });
    if (res.ok) setCasos((prev) => prev.filter((c) => c.id !== id));
  }

  const ativos = casos.filter((c) => c.ativo).length;
  const inativos = casos.length - ativos;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back link */}
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Voltar ao Admin
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-teal">Admin · Simulação</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Casos de Simulação Clínica
            </h1>
            <p className="mt-1 text-sm text-muted">
              {loading
                ? "Carregando…"
                : `${casos.length} caso${casos.length !== 1 ? "s" : ""} · ${ativos} ativo${ativos !== 1 ? "s" : ""} · ${inativos} inativo${inativos !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalIA(true)}
              className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
            >
              ✦ Criar com IA
            </button>
            <button
              onClick={() => setModalManual(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/10"
            >
              + Criar Manual
            </button>
          </div>
        </div>

        {/* Fluxograma */}
        <div className="mb-8">
          <Fluxograma />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          </div>
        ) : casos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-2xl">🩺</p>
            <p className="mt-3 text-sm text-muted">Nenhum caso cadastrado ainda.</p>
            <p className="text-xs text-muted">Use os botões acima para criar o primeiro caso.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {casos.map((caso) => (
              <CasoCard
                key={caso.id}
                caso={caso}
                onToggle={(id, ativo) => void toggleAtivo(id, ativo)}
                onDelete={(id) => void excluir(id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalIA && <ModalIA onClose={() => setModalIA(false)} onSaved={() => void carregar()} />}
      {modalManual && <ModalManual onClose={() => setModalManual(false)} onSaved={() => void carregar()} />}
    </main>
  );
}
