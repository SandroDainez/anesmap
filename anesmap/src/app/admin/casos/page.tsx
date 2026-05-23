"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SinaisVitais = {
  PA: string;
  FC: number;
  SpO2: number;
  ETCO2: number;
  FR: number;
  Temp: number;
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
  ativo: boolean;
  revisado: boolean;
  created_at?: string;
};

type CasoPayload = Omit<Caso, "id" | "ativo" | "revisado" | "created_at">;

const NIVEIS = ["ME1", "ME2", "ME3"] as const;
const DIFICULDADES = ["iniciante", "intermediário", "avançado"] as const;

const SINAIS_VAZIOS: SinaisVitais = {
  PA: "",
  FC: 0,
  SpO2: 0,
  ETCO2: 0,
  FR: 0,
  Temp: 0,
};

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

function emptyForm(): CasoPayload {
  return {
    titulo: "",
    slug: "",
    descricao: "",
    dificuldade: "iniciante",
    nivel_recomendado: [],
    duracao_estimada: "",
    tags: [],
    situacao_inicial: "",
    sinais_vitais_iniciais: { ...SINAIS_VAZIOS },
    opcoes_iniciais: ["", "", "", ""],
  };
}

// ─── Badge colours ────────────────────────────────────────────────────────────

function dificuldadeBadge(d: string) {
  if (d === "avançado") return "bg-red-500/15 text-red-400 border border-red-500/30";
  if (d === "intermediário") return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  return "bg-green-500/15 text-green-400 border border-green-500/30";
}

// ─── Fluxograma ──────────────────────────────────────────────────────────────

function Fluxograma() {
  const etapas = [
    { label: "PACIENTE", color: "border-teal text-teal bg-teal/10" },
    { label: "SITUAÇÃO INICIAL", color: "border-blue-400 text-blue-300 bg-blue-400/10" },
    { label: "SINAIS VITAIS", color: "border-purple-400 text-purple-300 bg-purple-400/10" },
    { label: "4 OPÇÕES DE CONDUTA", color: "border-amber-400 text-amber-300 bg-amber-400/10" },
  ];

  const etapas2 = [
    { label: "IA AVALIA CONDUTA", color: "border-pink-400 text-pink-300 bg-pink-400/10" },
    { label: "FEEDBACK + NOVA SITUAÇÃO", color: "border-indigo-400 text-indigo-300 bg-indigo-400/10" },
    { label: "DESFECHO FINAL", color: "border-emerald-400 text-emerald-300 bg-emerald-400/10" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-white/3 p-6">
      <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted">
        Estrutura do caso
      </p>

      {/* Linha horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {etapas.map((e, i) => (
          <div key={e.label} className="flex shrink-0 items-center gap-2">
            <div
              className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${e.color}`}
            >
              {e.label}
            </div>
            {i < etapas.length - 1 && (
              <span className="text-lg font-light text-muted">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Seta para baixo */}
      <div className="my-2 ml-[calc(75%-1rem)] flex flex-col items-center" style={{ marginLeft: "75%" }}>
        <span className="text-lg text-muted">↓</span>
      </div>

      {/* Linha vertical para a segunda fase */}
      <div className="flex flex-col items-end gap-2 pr-0">
        <div className="flex flex-col items-center gap-2">
          {etapas2.map((e, i) => (
            <div key={e.label} className="flex flex-col items-center gap-1">
              <div
                className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${e.color}`}
                style={{ minWidth: "200px" }}
              >
                {e.label}
              </div>
              {i < etapas2.length - 1 && (
                <span className="text-lg text-muted">↓</span>
              )}
            </div>
          ))}
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

// ─── Shared form fields (used in both modals) ────────────────────────────────

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

  function setSinal<K extends keyof SinaisVitais>(key: K, value: string) {
    onChange({
      ...form,
      sinais_vitais_iniciais: {
        ...form.sinais_vitais_iniciais,
        [key]: key === "PA" ? value : Number(value),
      },
    });
  }

  function setOpcao(index: number, value: string) {
    const opcoes = [...form.opcoes_iniciais];
    opcoes[index] = value;
    onChange({ ...form, opcoes_iniciais: opcoes });
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
    <div className="space-y-4">
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
        <label className={labelClass}>Descrição</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Contexto do paciente, procedimento, histórico..."
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

      {/* Situação inicial */}
      <div>
        <label className={labelClass}>Situação inicial</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          value={form.situacao_inicial}
          onChange={(e) => set("situacao_inicial", e.target.value)}
          placeholder="Cena clínica detalhada que o residente verá..."
        />
      </div>

      {/* Sinais vitais */}
      <div>
        <label className={labelClass}>Sinais vitais iniciais</label>
        <div className="grid grid-cols-3 gap-2">
          {(["PA", "FC", "SpO2", "ETCO2", "FR", "Temp"] as const).map((key) => (
            <div key={key}>
              <label className="mb-0.5 block text-[11px] text-muted">{key}</label>
              <input
                className={inputClass}
                value={String(form.sinais_vitais_iniciais[key])}
                onChange={(e) => setSinal(key, e.target.value)}
                placeholder={key === "PA" ? "120/80" : "0"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Opções iniciais */}
      <div>
        <label className={labelClass}>Opções iniciais (4 condutas)</label>
        <div className="space-y-2">
          {["A", "B", "C", "D"].map((letra, i) => (
            <div key={letra} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs font-bold text-muted">{letra}</span>
              <input
                className={inputClass}
                value={form.opcoes_iniciais[i] ?? ""}
                onChange={(e) => setOpcao(i, e.target.value)}
                placeholder={`Opção ${letra}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Criar com IA ─────────────────────────────────────────────────────

function ModalIA({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [topico, setTopico] = useState("");
  const [nivel, setNivel] = useState<string>("ME1");
  const [dificuldade, setDificuldade] = useState<string>("intermediário");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<CasoPayload | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gerar() {
    if (!topico.trim()) {
      setErro("Descreva o cenário clínico.");
      return;
    }
    setErro("");
    setGerando(true);
    try {
      const res = await fetch("/api/admin/casos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico, nivel, dificuldade }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setErro(String(data.error ?? "Erro ao gerar."));
        return;
      }
      setForm({
        titulo: String(data.titulo ?? ""),
        slug: String(data.slug ?? ""),
        descricao: String(data.descricao ?? ""),
        dificuldade: String(data.dificuldade ?? "iniciante"),
        nivel_recomendado: Array.isArray(data.nivel_recomendado)
          ? (data.nivel_recomendado as string[])
          : [],
        duracao_estimada: String(data.duracao_estimada ?? ""),
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        situacao_inicial: String(data.situacao_inicial ?? ""),
        sinais_vitais_iniciais: sinaisFromUnknown(data.sinais_vitais_iniciais),
        opcoes_iniciais: Array.isArray(data.opcoes_iniciais)
          ? (data.opcoes_iniciais as string[])
          : ["", "", "", ""],
      });
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setGerando(false);
    }
  }

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setErro(String(data.error ?? "Erro ao salvar."));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-muted";

  return (
    <ModalOverlay title="Criar com IA" onClose={onClose}>
      <div className="space-y-4">
        {/* Campos de geração */}
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
            <select
              className={inputClass}
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              disabled={gerando}
            >
              {NIVEIS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Dificuldade</label>
            <select
              className={inputClass}
              value={dificuldade}
              onChange={(e) => setDificuldade(e.target.value)}
              disabled={gerando}
            >
              {DIFICULDADES.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => void gerar()}
          disabled={gerando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {gerando ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Gerando…
            </>
          ) : (
            "✦ Gerar com IA"
          )}
        </button>

        {erro && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {erro}
          </p>
        )}

        {/* Preview editável */}
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

function ModalManual({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CasoPayload>(emptyForm());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!form.titulo.trim() || !form.slug.trim()) {
      setErro("Título e slug são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setErro(String(data.error ?? "Erro ao salvar."));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay title="Criar Caso Manual" onClose={onClose}>
      <div className="space-y-4">
        <CamposForm form={form} onChange={setForm} />

        {erro && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {erro}
          </p>
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

// ─── Card de caso ─────────────────────────────────────────────────────────────

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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-white/20">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{caso.titulo}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted">{caso.slug}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${dificuldadeBadge(caso.dificuldade)}`}
          >
            {caso.dificuldade}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              caso.ativo
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-muted border border-border"
            }`}
          >
            {caso.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>

      {/* Descrição curta */}
      {caso.descricao && (
        <p className="mb-3 line-clamp-2 text-xs text-muted">{caso.descricao}</p>
      )}

      {/* Meta */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        {caso.duracao_estimada && (
          <span className="flex items-center gap-1">
            <span className="text-teal">⏱</span>
            {caso.duracao_estimada}
          </span>
        )}
        {caso.nivel_recomendado?.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-teal">🎓</span>
            {caso.nivel_recomendado.join(", ")}
          </span>
        )}
      </div>

      {/* Tags */}
      {caso.tags?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {caso.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-[11px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ações */}
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

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function toggleAtivo(id: string, ativoAtual: boolean) {
    const res = await fetch(`/api/admin/casos?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativoAtual }),
    });
    if (res.ok) {
      setCasos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ativo: !ativoAtual } : c)),
      );
    }
  }

  async function excluir(id: string) {
    const res = await fetch(`/api/admin/casos?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCasos((prev) => prev.filter((c) => c.id !== id));
    }
  }

  const ativos = casos.filter((c) => c.ativo).length;
  const inativos = casos.length - ativos;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      {/* Cabeçalho */}
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-teal">
              Admin · Simulação
            </p>
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

        {/* Lista de casos */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          </div>
        ) : casos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-2xl">🩺</p>
            <p className="mt-3 text-sm text-muted">Nenhum caso cadastrado ainda.</p>
            <p className="text-xs text-muted">
              Use os botões acima para criar o primeiro caso.
            </p>
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

      {/* Modais */}
      {modalIA && (
        <ModalIA
          onClose={() => setModalIA(false)}
          onSaved={() => void carregar()}
        />
      )}
      {modalManual && (
        <ModalManual
          onClose={() => setModalManual(false)}
          onSaved={() => void carregar()}
        />
      )}
    </main>
  );
}
