"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

type UsoItem = {
  usuario_id: string;
  quantidade: number;
  ultima_simulacao: string | null;
  profiles: { name: string; role: string; nivel: string } | null;
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

export default function AdminSimulacoesPage() {
  const [uso, setUso] = useState<UsoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string | null>(null);
  const [sessoes, setSessoes] = useState<SessaoItem[]>([]);
  const [loadingSessoes, setLoadingSessoes] = useState(false);

  async function carregarUso() {
    setLoading(true);
    const res = await fetch("/api/admin/simulacoes");
    const data = await res.json() as UsoItem[];
    setUso(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function carregarSessoes(usuario_id: string) {
    setLoadingSessoes(true);
    setUsuarioSelecionado(usuario_id);
    const res = await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}`);
    const data = await res.json() as SessaoItem[];
    setSessoes(Array.isArray(data) ? data : []);
    setLoadingSessoes(false);
  }

  async function resetarUso(usuario_id: string) {
    await fetch(`/api/admin/simulacoes?usuario_id=${usuario_id}&acao=resetar`, {
      method: "PATCH",
    });
    await carregarUso();
  }

  useEffect(() => {
    void carregarUso();
  }, []);

  const desfechoEmoji: Record<string, string> = {
    recuperacao: "✅",
    complicacao: "⚠️",
    obito: "❌",
  };

  return (
    <main className="min-h-screen px-4 pb-32 pt-6">
      <SectionHeader eyebrow="Admin" title="Controle de Simulações" description="Uso mensal por residente" />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Uso do mês atual por usuário</p>
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
        <div className="space-y-2">
          {uso.map((item) => (
            <div
              key={item.usuario_id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {item.profiles?.name ?? item.usuario_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted">
                    {item.profiles?.nivel ?? "—"} · {item.profiles?.role}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{item.quantidade}</p>
                  <p className="text-xs text-muted">simulações</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => void carregarSessoes(item.usuario_id)}
                  className="flex-1 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
                >
                  Ver Sessões
                </button>
                <button
                  onClick={() => void resetarUso(item.usuario_id)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                >
                  Resetar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sessões do usuário selecionado */}
      {usuarioSelecionado && (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-foreground">Sessões do Usuário</h2>
          {loadingSessoes ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            </div>
          ) : sessoes.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma sessão encontrada.</p>
          ) : (
            <div className="space-y-2">
              {sessoes.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{s.caso_titulo}</p>
                    <span className="text-lg">
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
    </main>
  );
}
