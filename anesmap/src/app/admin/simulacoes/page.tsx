"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Lock, LockOpen, Plus, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

type UsoItem = {
  usuario_id: string;
  quantidade: number;
  ultima_simulacao: string | null;
  profiles: { name: string; role: string; nivel: string; limite_simulacoes_mes?: number } | null;
};

type SessaoItem = {
  id: string;
  caso_titulo: string;
  status: string;
  desfecho: string | null;
  pontuacao_final: number | null;
  iniciada_em: string;
  concluida_em: string | null;
};

type SessaoPasso = {
  id: string;
  turno: number;
  situacao_apresentada: string;
  conduta_usuario: string;
  tipo_conduta: string | null;
  avaliacao_ia: string | null;
  feedback_ia: string;
  explicacao_clinica: string | null;
  nova_situacao: string | null;
  pontuacao_turno: number | null;
  tempo_resposta_segundos: number | null;
  sinais_vitais: Record<string, unknown> | null;
};

const LIMITE_PADRAO = 5;

const desfechoEmoji: Record<string, string> = {
  recuperacao: "✅",
  complicacao: "⚠️",
  obito: "❌",
};

type Filtro = "todos" | "ativos" | "sem-uso" | "bloqueados";

export default function AdminSimulacoesPage() {
  const [uso, setUso] = useState<UsoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [usuarioAberto, setUsuarioAberto] = useState<string | null>(null);
  const [sessoes, setSessoes] = useState<Record<string, SessaoItem[]>>({});
  const [loadingSessoes, setLoadingSessoes] = useState<string | null>(null);
  const [novoLimite, setNovoLimite] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [passosPorSessao, setPassosPorSessao] = useState<Record<string, SessaoPasso[]>>({});
  const [sessaoDetalhada, setSessaoDetalhada] = useState<string | null>(null);

  async function loadPassosSessao(sessao_id: string) {
    if (passosPorSessao[sessao_id]) return;
    const res = await fetch(`/api/admin/simulacoes?sessao_id=${sessao_id}`);
    const data = (await res.json()) as SessaoPasso[];
    setPassosPorSessao((prev) => ({ ...prev, [sessao_id]: Array.isArray(data) ? data : [] }));
  }

  async function carregarUso() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/simulacoes");
      const data = (await res.json()) as UsoItem[];
      setUso(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSessoes(usuario_id: string) {
    if (usuarioAberto === usuario_id) {
      setUsuarioAberto(null);
      return;
    }
    setUsuarioAberto(usuario_id);
    if (sessoes[usuario_id]) return; // já carregado
    setLoadingSessoes(usuario_id);
    const res = await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}`);
    const data = (await res.json()) as SessaoItem[];
    setSessoes((prev) => ({ ...prev, [usuario_id]: Array.isArray(data) ? data : [] }));
    setLoadingSessoes(null);
  }

  async function patch(usuario_id: string, acao: string, body?: object) {
    await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}&acao=${acao}`, {
      method: "PATCH",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function salvarLimite(usuario_id: string) {
    const val = parseInt(novoLimite[usuario_id] ?? "");
    if (isNaN(val) || val < 0) return;
    setSalvando(usuario_id + ":limite");
    await patch(usuario_id, "limite", { limite: val });
    setSalvando(null);
    setNovoLimite((prev) => ({ ...prev, [usuario_id]: "" }));
    await carregarUso();
  }

  async function adicionarCredito(usuario_id: string, quantidade: number) {
    setSalvando(usuario_id + ":credito");
    await patch(usuario_id, "credito", { quantidade });
    setSalvando(null);
    await carregarUso();
  }

  async function resetarUso(usuario_id: string) {
    if (!confirm("Zerar o contador deste mês para este usuário?")) return;
    setSalvando(usuario_id + ":reset");
    await patch(usuario_id, "resetar");
    setSalvando(null);
    // limpar cache de sessões para forçar reload
    setSessoes((prev) => {
      const next = { ...prev };
      delete next[usuario_id];
      return next;
    });
    await carregarUso();
  }

  async function bloquear(usuario_id: string) {
    if (!confirm("Bloquear este usuário de realizar simulações?")) return;
    setSalvando(usuario_id + ":bloquear");
    await patch(usuario_id, "bloquear");
    setSalvando(null);
    await carregarUso();
  }

  async function desbloquear(usuario_id: string) {
    setSalvando(usuario_id + ":desbloquear");
    await patch(usuario_id, "limite", { limite: LIMITE_PADRAO });
    setSalvando(null);
    await carregarUso();
  }

  useEffect(() => {
    void carregarUso();
  }, []);

  const usuariosFiltrados = uso.filter((item) => {
    const limite = item.profiles?.limite_simulacoes_mes ?? LIMITE_PADRAO;
    const bloqueado = limite === 0;
    if (filtro === "bloqueados") return bloqueado;
    if (filtro === "sem-uso") return item.quantidade === 0 && !bloqueado;
    if (filtro === "ativos") return item.quantidade > 0 && !bloqueado;
    return true;
  });

  const counts = {
    todos: uso.length,
    ativos: uso.filter((i) => i.quantidade > 0 && (i.profiles?.limite_simulacoes_mes ?? LIMITE_PADRAO) > 0).length,
    "sem-uso": uso.filter((i) => i.quantidade === 0 && (i.profiles?.limite_simulacoes_mes ?? LIMITE_PADRAO) > 0).length,
    bloqueados: uso.filter((i) => (i.profiles?.limite_simulacoes_mes ?? LIMITE_PADRAO) === 0).length,
  };

  return (
    <main className="min-h-screen px-4 pb-32 pt-6">
      <SectionHeader
        eyebrow="Admin"
        title="Controle de Simulações"
        description="Gerencie limites, créditos e acesso por residente"
      />

      {/* Filtros + atualizar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {(["todos", "ativos", "sem-uso", "bloqueados"] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtro === f
                  ? "bg-teal text-background"
                  : "bg-white/5 text-muted hover:text-foreground"
              }`}
            >
              {f === "todos" ? "Todos" : f === "ativos" ? "Com uso" : f === "sem-uso" ? "Sem uso" : "Bloqueados"}
              <span
                className={`rounded-full px-1.5 py-0 text-[10px] ${
                  filtro === f ? "bg-black/20 text-background" : "bg-white/10 text-muted"
                }`}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => void carregarUso()}
          className="flex items-center gap-1 text-xs text-teal hover:opacity-80"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {filtro === "todos"
            ? "Nenhum usuário cadastrado."
            : filtro === "bloqueados"
            ? "Nenhum usuário bloqueado."
            : filtro === "sem-uso"
            ? "Todos os usuários já usaram simulações este mês."
            : "Nenhum usuário com uso registrado este mês."}
        </p>
      ) : (
        <div className="space-y-3">
          {usuariosFiltrados.map((item) => {
            const limite = item.profiles?.limite_simulacoes_mes ?? LIMITE_PADRAO;
            const bloqueado = limite === 0;
            const pct = limite > 0 ? Math.min(100, Math.round((item.quantidade / limite) * 100)) : 0;
            const aberto = usuarioAberto === item.usuario_id;
            const isBusy = (key: string) => salvando === item.usuario_id + ":" + key;

            return (
              <div
                key={item.usuario_id}
                className={`rounded-xl border bg-card transition-colors ${
                  bloqueado ? "border-red-500/30" : "border-border"
                }`}
              >
                {/* ─── Cabeçalho ─── */}
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {item.profiles?.name ?? item.usuario_id.slice(0, 8)}
                        </p>
                        {bloqueado ? (
                          <span className="flex items-center gap-0.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            <Lock size={8} /> Bloqueado
                          </span>
                        ) : item.quantidade === 0 ? (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted">
                            Sem uso este mês
                          </span>
                        ) : pct >= 100 ? (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            Limite atingido
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {item.profiles?.nivel ?? "—"} · {item.profiles?.role ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      {bloqueado ? (
                        <p className="text-xl font-bold text-red-400">—</p>
                      ) : (
                        <p className="text-xl font-bold text-foreground">
                          {item.quantidade}
                          <span className="text-sm font-normal text-muted">/{limite}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted">simulações</p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  {!bloqueado && (
                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-teal"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* ─── Ajustar limite mensal ─── */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted shrink-0">Limite/mês:</p>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      placeholder={String(bloqueado ? 0 : limite)}
                      value={novoLimite[item.usuario_id] ?? ""}
                      onChange={(e) =>
                        setNovoLimite((prev) => ({ ...prev, [item.usuario_id]: e.target.value }))
                      }
                      className="w-16 rounded-lg border border-border bg-white/5 px-2 py-1 text-center text-sm text-foreground focus:border-teal focus:outline-none"
                    />
                    <button
                      onClick={() => void salvarLimite(item.usuario_id)}
                      disabled={!novoLimite[item.usuario_id] || isBusy("limite")}
                      className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1 text-xs text-teal hover:bg-teal/20 disabled:opacity-40"
                    >
                      {isBusy("limite") ? "..." : "Salvar"}
                    </button>
                    <span className="ml-auto text-xs text-muted">
                      {bloqueado
                        ? "🔴 Bloqueado"
                        : item.quantidade >= limite
                        ? `🔴 ${limite - item.quantidade} restantes`
                        : `🟢 ${limite - item.quantidade} restantes`}
                    </span>
                  </div>

                  {/* ─── Crédito rápido ─── */}
                  {!bloqueado && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted shrink-0">Crédito extra:</p>
                      {([1, 3, 5] as const).map((n) => (
                        <button
                          key={n}
                          onClick={() => void adicionarCredito(item.usuario_id, n)}
                          disabled={isBusy("credito")}
                          className="flex items-center gap-0.5 rounded-lg border border-teal/30 bg-teal/5 px-2.5 py-1 text-xs text-teal hover:bg-teal/15 disabled:opacity-40"
                        >
                          <Plus size={10} />
                          {n}
                        </button>
                      ))}
                      <span className="ml-auto text-[10px] text-muted">incrementa o limite</span>
                    </div>
                  )}

                  {/* ─── Ações ─── */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void toggleSessoes(item.usuario_id)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
                    >
                      Sessões {aberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => void resetarUso(item.usuario_id)}
                      disabled={isBusy("reset")}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
                    >
                      <RotateCcw size={11} />
                      {isBusy("reset") ? "..." : "Zerar mês"}
                    </button>
                    {bloqueado ? (
                      <button
                        onClick={() => void desbloquear(item.usuario_id)}
                        disabled={isBusy("desbloquear")}
                        className="flex items-center gap-1 rounded-lg border border-teal/30 bg-teal/10 px-3 py-1.5 text-xs text-teal hover:bg-teal/20 disabled:opacity-40"
                      >
                        <LockOpen size={11} />
                        {isBusy("desbloquear") ? "..." : "Desbloquear"}
                      </button>
                    ) : (
                      <button
                        onClick={() => void bloquear(item.usuario_id)}
                        disabled={isBusy("bloquear")}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-40"
                      >
                        <Lock size={11} />
                        {isBusy("bloquear") ? "..." : "Bloquear"}
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── Sessões expandidas ─── */}
                {aberto && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    {loadingSessoes === item.usuario_id ? (
                      <div className="flex justify-center py-4">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                      </div>
                    ) : !sessoes[item.usuario_id] || sessoes[item.usuario_id].length === 0 ? (
                      <p className="text-xs text-muted">Nenhuma sessão registrada.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="mb-2 text-xs font-medium text-muted">
                          {sessoes[item.usuario_id].length} sessão(ões) registrada(s)
                        </p>
                        {sessoes[item.usuario_id].map((s) => (
                          <div
                            key={s.id}
                            className="rounded-lg border border-border/50 bg-white/3 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {s.caso_titulo}
                              </p>
                              <span className="text-base shrink-0">
                                {s.desfecho ? (desfechoEmoji[s.desfecho] ?? "•") : "🔄"}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  s.status === "concluida"
                                    ? "bg-green-500/15 text-green-400"
                                    : "bg-yellow-500/15 text-yellow-400"
                                }`}
                              >
                                {s.status}
                              </span>
                              {s.pontuacao_final !== null && (
                                <span className="font-semibold text-teal">
                                  {s.pontuacao_final} pts
                                </span>
                              )}
                              <span>{new Date(s.iniciada_em).toLocaleDateString("pt-BR")}</span>
                              {s.concluida_em && (
                                <span className="text-[10px]">
                                  {Math.round(
                                    (new Date(s.concluida_em).getTime() -
                                      new Date(s.iniciada_em).getTime()) /
                                      60000
                                  )}{" "}
                                  min
                                </span>
                              )}
                            </div>
                            {/* Ver turnos button */}
                            <button
                              onClick={() => {
                                const isOpen = sessaoDetalhada === s.id;
                                setSessaoDetalhada(isOpen ? null : s.id);
                                if (!isOpen) void loadPassosSessao(s.id);
                              }}
                              className="mt-2 text-[10px] font-medium text-teal hover:opacity-80"
                            >
                              {sessaoDetalhada === s.id ? "Ocultar turnos ↑" : "Ver turnos →"}
                            </button>

                            {/* Passo cards */}
                            {sessaoDetalhada === s.id && (
                              <div className="mt-3 space-y-2">
                                {!passosPorSessao[s.id] ? (
                                  <div className="flex justify-center py-2">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                                  </div>
                                ) : passosPorSessao[s.id].length === 0 ? (
                                  <p className="text-[10px] text-muted">Nenhum turno registrado.</p>
                                ) : (
                                  passosPorSessao[s.id].map((p) => {
                                    const avaliacaoColors: Record<string, string> = {
                                      correto: "bg-green-500/15 text-green-400",
                                      parcial: "bg-yellow-500/15 text-yellow-400",
                                      incorreto: "bg-red-500/15 text-red-400",
                                      tardio: "bg-orange-500/15 text-orange-400",
                                    };
                                    const avaliacaoClass = avaliacaoColors[p.avaliacao_ia ?? ""] ?? "bg-white/10 text-muted";
                                    const sv = p.sinais_vitais;
                                    return (
                                      <div key={p.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs">
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted">
                                            Turno {p.turno}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            {p.avaliacao_ia && (
                                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${avaliacaoClass}`}>
                                                {p.avaliacao_ia}
                                              </span>
                                            )}
                                            {p.pontuacao_turno !== null && (
                                              <span className="font-semibold text-teal">+{p.pontuacao_turno} pts</span>
                                            )}
                                          </div>
                                        </div>
                                        <p className="mb-1 font-semibold text-foreground leading-snug">
                                          {p.conduta_usuario}
                                          {p.tipo_conduta && (
                                            <span className="ml-1.5 rounded px-1 py-0.5 text-[9px] font-normal bg-white/10 text-muted">
                                              {p.tipo_conduta === "opcao_rapida" ? "opção rápida" : "digitada"}
                                            </span>
                                          )}
                                        </p>
                                        {p.feedback_ia && (
                                          <p className="mb-1 leading-relaxed text-muted">{p.feedback_ia}</p>
                                        )}
                                        {p.explicacao_clinica && (
                                          <p className="mb-1.5 rounded border border-blue-500/20 bg-blue-500/5 px-2 py-1 italic text-blue-300">
                                            {p.explicacao_clinica}
                                          </p>
                                        )}
                                        {sv && (
                                          <div className="flex flex-wrap gap-1.5 text-[10px] text-muted">
                                            {sv.PA !== undefined && <span>PA: {String(sv.PA)}</span>}
                                            {sv.FC !== undefined && <span>FC: {String(sv.FC)}</span>}
                                            {sv.SpO2 !== undefined && <span>SpO2: {String(sv.SpO2)}%</span>}
                                            {sv.ETCO2 !== undefined && <span>ETCO2: {String(sv.ETCO2)}</span>}
                                          </div>
                                        )}
                                        {p.tempo_resposta_segundos !== null && (
                                          <p className="mt-1 text-[10px] text-muted">
                                            Resp: {p.tempo_resposta_segundos}s
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
