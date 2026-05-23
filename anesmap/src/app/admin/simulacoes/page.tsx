"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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

const desfechoEmoji: Record<string, string> = {
  recuperacao: "✅",
  complicacao: "⚠️",
  obito: "❌",
};

export default function AdminSimulacoesPage() {
  const [uso, setUso] = useState<UsoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string | null>(null);
  const [sessoes, setSessoes] = useState<SessaoItem[]>([]);
  const [loadingSessoes, setLoadingSessoes] = useState(false);
  const [novoLimite, setNovoLimite] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  async function carregarUso() {
    setLoading(true);
    const res = await fetch("/api/admin/simulacoes");
    const data = await res.json() as UsoItem[];
    setUso(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function carregarSessoes(usuario_id: string) {
    if (usuarioSelecionado === usuario_id) {
      setUsuarioSelecionado(null);
      return;
    }
    setLoadingSessoes(true);
    setUsuarioSelecionado(usuario_id);
    const res = await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}`);
    const data = await res.json() as SessaoItem[];
    setSessoes(Array.isArray(data) ? data : []);
    setLoadingSessoes(false);
  }

  async function resetarUso(usuario_id: string) {
    if (!confirm("Zerar o contador deste mês para este usuário?")) return;
    await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}&acao=resetar`, {
      method: "PATCH",
    });
    await carregarUso();
  }

  async function salvarLimite(usuario_id: string) {
    const val = parseInt(novoLimite[usuario_id] ?? "");
    if (isNaN(val) || val < 1) return;
    setSalvando(usuario_id);
    await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}&acao=limite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limite: val }),
    });
    setSalvando(null);
    setNovoLimite((prev) => ({ ...prev, [usuario_id]: "" }));
    await carregarUso();
  }

  useEffect(() => {
    void carregarUso();
  }, []);

  return (
    <main className="min-h-screen px-4 pb-32 pt-6">
      <SectionHeader
        eyebrow="Admin"
        title="Controle de Simulações"
        description="Gerencie limites e uso mensal por residente"
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Mês atual</p>
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
      ) : uso.length === 0 ? (
        <p className="text-center text-sm text-muted">Nenhum uso registrado este mês.</p>
      ) : (
        <div className="space-y-3">
          {uso.map((item) => {
            const limite = item.profiles?.limite_simulacoes_mes ?? 5;
            const pct = Math.min(100, Math.round((item.quantidade / limite) * 100));
            const aberto = usuarioSelecionado === item.usuario_id;

            return (
              <div key={item.usuario_id} className="rounded-xl border border-border bg-card">
                {/* Cabeçalho do card */}
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.profiles?.name ?? item.usuario_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted">
                        {item.profiles?.nivel ?? "—"} · {item.profiles?.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">
                        {item.quantidade}
                        <span className="text-sm font-normal text-muted">/{limite}</span>
                      </p>
                      <p className="text-xs text-muted">simulações</p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? "bg-red-500" : pct >= 60 ? "bg-amber-400" : "bg-teal"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Ajuste de limite inline */}
                  <div className="mb-3 flex items-center gap-2">
                    <p className="text-xs text-muted">Limite/mês:</p>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      placeholder={String(limite)}
                      value={novoLimite[item.usuario_id] ?? ""}
                      onChange={(e) =>
                        setNovoLimite((prev) => ({ ...prev, [item.usuario_id]: e.target.value }))
                      }
                      className="w-16 rounded-lg border border-border bg-white/5 px-2 py-1 text-center text-sm text-foreground focus:border-teal focus:outline-none"
                    />
                    <button
                      onClick={() => void salvarLimite(item.usuario_id)}
                      disabled={
                        !novoLimite[item.usuario_id] || salvando === item.usuario_id
                      }
                      className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1 text-xs text-teal disabled:opacity-40 hover:bg-teal/20"
                    >
                      {salvando === item.usuario_id ? "..." : "Salvar"}
                    </button>
                    <span className="ml-auto text-xs text-muted">
                      {item.quantidade >= limite ? "🔴 Limite atingido" : `🟢 ${limite - item.quantidade} restantes`}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => void carregarSessoes(item.usuario_id)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
                    >
                      Ver Sessões {aberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => void resetarUso(item.usuario_id)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                    >
                      Zerar contador
                    </button>
                  </div>
                </div>

                {/* Sessões expandidas */}
                {aberto && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    {loadingSessoes ? (
                      <div className="flex justify-center py-4">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                      </div>
                    ) : sessoes.length === 0 ? (
                      <p className="text-xs text-muted">Nenhuma sessão encontrada.</p>
                    ) : (
                      <div className="space-y-2">
                        {sessoes.map((s) => (
                          <div key={s.id} className="rounded-lg border border-border/50 bg-white/3 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">{s.caso_titulo}</p>
                              <span className="text-base">
                                {s.desfecho ? (desfechoEmoji[s.desfecho] ?? "•") : "🔄"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted">
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
                                <span className="font-semibold text-teal">{s.pontuacao_final} pts</span>
                              )}
                              <span>{new Date(s.iniciada_em).toLocaleDateString("pt-BR")}</span>
                            </div>
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
