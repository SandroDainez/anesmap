"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadAdminOverview,
  loadAdminUserDetails,
  loadAdminUsers,
  loadInviteCodes,
  createInviteCode,
  deleteInviteCode,
  updateUserTrack,
  updateUserRole,
  type UserProfile,
  type InviteCode,
} from "@/lib/user-study";
import { loadFlashcardsRemote, loadSimuladosRemote } from "@/lib/study-data";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function flashcardsToCSV(cards: Awaited<ReturnType<typeof loadFlashcardsRemote>>): string {
  if (!cards?.length) return "";
  const header = "id,me,frente,verso,tags,especialidade";
  const rows = cards.map((c) =>
    [c.id, c.me, c.frente, c.verso, (c.tags ?? []).join("|"), c.especialidade ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

function simuladosToCSV(qs: Awaited<ReturnType<typeof loadSimuladosRemote>>): string {
  if (!qs?.length) return "";
  const header = "id,me,tema,enunciado,alternativa_a,alternativa_b,alternativa_c,alternativa_d,correta,explicacao";
  const rows = qs.map((q) =>
    [q.id, q.me, q.tema ?? "", q.enunciado, q.alternativaA, q.alternativaB, q.alternativaC, q.alternativaD, q.correta, q.explicacao ?? ""]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

type Tab = "overview" | "users" | "content" | "export" | "invites";
type AdminUserDetails = Awaited<ReturnType<typeof loadAdminUserDetails>>;
type Track = "ME1" | "ME2" | "ME3" | "ALL";

const TRACKS: Track[] = ["ME1", "ME2", "ME3", "ALL"];

const TRACK_STYLE: Record<Track, string> = {
  ME1: "border-blue/40 bg-blue/10 text-blue",
  ME2: "border-purple/40 bg-purple/10 text-purple",
  ME3: "border-teal/40 bg-teal/10 text-teal",
  ALL: "border-border bg-background/20 text-muted",
};

function shortCardId(id: string): string {
  const parts = id.split("-");
  if (parts.length <= 2) return id.slice(0, 24);
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  return `…${secondLast}-${last}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtSec(sec: number | null) {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m${sec % 60 > 0 ? `${sec % 60}s` : ""}`;
}

function humanCardEvent(eventType: string, quality: number | null) {
  if (eventType === "view") return "visualizou o card";
  if (eventType === "flip") return "virou o card para ver resposta";
  if (eventType === "grade") {
    if (quality === null) return "avaliou o card";
    if (quality <= 2) return "marcou o card como difícil";
    if (quality === 3) return "marcou o card como médio";
    return "marcou o card como fácil";
  }
  return eventType;
}

function humanTrackName(track: string) {
  if (track === "ME1") return "ME1 (R1 / início da formação)";
  if (track === "ME2") return "ME2 (R2 / intermediário)";
  if (track === "ME3") return "ME3 (R3 / avançado)";
  return track;
}

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Visão Geral", icon: "◈" },
  { id: "users", label: "Usuários", icon: "◎" },
  { id: "content", label: "Conteúdo", icon: "⊞" },
  { id: "export", label: "Exportar", icon: "↓" },
  { id: "invites", label: "Convites", icon: "⌘" },
];

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("overview");

  const [overview, setOverview] = useState({ totalUsers: 0, totalSessions: 0, totalCardEvents: 0, totalAttempts: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AdminUserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [trackFilter, setTrackFilter] = useState<Track | "">("");

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  // Export state
  const [exportStatus, setExportStatus] = useState<Record<string, "idle" | "loading" | "done">>({});

  useEffect(() => {
    void (async () => {
      const [ov, list, codes] = await Promise.all([
        loadAdminOverview(), loadAdminUsers(), loadInviteCodes(),
      ]);
      setOverview(ov);
      setUsers(list);
      setInviteCodes(codes);
      if (list[0]?.id) setSelectedUserId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setDetailsLoading(true);
    void (async () => {
      const d = await loadAdminUserDetails(selectedUserId);
      setSelectedDetails(d);
      setDetailsLoading(false);
    })();
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (trackFilter) list = list.filter((u) => (u.assigned_track ?? "ALL") === trackFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((u) => (u.name ?? "").toLowerCase().includes(q) || u.role.includes(q));
    return list;
  }, [query, users, trackFilter]);

  const perTrackStats = useMemo(() => {
    const attempts = selectedDetails?.attempts ?? [];
    return (["ME1", "ME2", "ME3"] as Track[]).map((t) => {
      const group = attempts.filter((a) => a.track === t && a.score_percent !== null);
      const avg = group.length > 0
        ? Math.round(group.reduce((s, a) => s + Number(a.score_percent), 0) / group.length)
        : null;
      return { track: t, total: attempts.filter((a) => a.track === t).length, avg };
    });
  }, [selectedDetails]);

  async function handleTrackChange(userId: string, track: Track) {
    await updateUserTrack(userId, track);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, assigned_track: track } : u));
    if (selectedDetails?.profile?.id === userId) {
      setSelectedDetails((prev) => prev ? { ...prev, profile: { ...prev.profile!, assigned_track: track } } : prev);
    }
  }

  async function handleRoleToggle(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "student" : "admin";
    const ok = await updateUserRole(userId, newRole);
    if (!ok) return;
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    if (selectedDetails?.profile?.id === userId) {
      setSelectedDetails((prev) => prev ? { ...prev, profile: { ...prev.profile!, role: newRole } } : prev);
    }
  }

  async function handleCreateCode() {
    setInviteLoading(true);
    setNewCode(null);
    const code = await createInviteCode(newLabel, newMaxUses);
    if (code) {
      setNewCode(code);
      setNewLabel("");
      setNewMaxUses(1);
      setInviteCodes(await loadInviteCodes());
    }
    setInviteLoading(false);
  }

  async function handleDeleteCode(id: string) {
    await deleteInviteCode(id);
    setInviteCodes((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleExport(key: string, format: "json" | "csv") {
    setExportStatus((prev) => ({ ...prev, [key]: "loading" }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (key === "flashcards") {
      const data = await loadFlashcardsRemote();
      if (data) {
        if (format === "json") {
          downloadFile(`flashcards-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
        } else {
          downloadFile(`flashcards-${stamp}.csv`, flashcardsToCSV(data), "text/csv");
        }
      }
    } else if (key === "simulados") {
      const data = await loadSimuladosRemote();
      if (data) {
        if (format === "json") {
          downloadFile(`simulados-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
        } else {
          downloadFile(`simulados-${stamp}.csv`, simuladosToCSV(data), "text/csv");
        }
      }
    } else if (key === "backup") {
      const [cards, qs] = await Promise.all([loadFlashcardsRemote(), loadSimuladosRemote()]);
      const payload = { exportedAt: new Date().toISOString(), flashcards: cards ?? [], simulados: qs ?? [] };
      downloadFile(`anesmap-backup-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
    }
    setExportStatus((prev) => ({ ...prev, [key]: "done" }));
    setTimeout(() => setExportStatus((prev) => ({ ...prev, [key]: "idle" })), 2000);
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-teal">AnesMap</span>
          <span className="text-border">|</span>
          <span className="text-sm font-semibold text-foreground">Painel Administrativo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-purple/30 bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
            Admin
          </span>
          <a
            href="/dashboard"
            className="rounded-lg border border-border bg-background/35 px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            ← App
          </a>
          <a
            href="/logout"
            className="rounded-lg border border-border bg-background/35 px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            Sair
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-background/50 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                tab === item.id
                  ? "bg-teal/10 text-teal font-medium"
                  : "text-muted hover:bg-background/60 hover:text-foreground"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="mt-auto border-t border-border pt-4 space-y-1 text-xs text-muted px-1">
            <p className="font-mono uppercase tracking-wider text-[10px]">Resumo</p>
            <p>{overview.totalUsers} usuários</p>
            <p>{overview.totalSessions} sessões</p>
            <p>{overview.totalAttempts} simulados</p>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6 max-w-4xl">
              <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Usuários", value: overview.totalUsers, color: "text-teal" },
                  { label: "Sessões de estudo", value: overview.totalSessions, color: "text-blue" },
                  { label: "Eventos de cards", value: overview.totalCardEvents, color: "text-purple" },
                  { label: "Tentativas simulados", value: overview.totalAttempts, color: "text-amber" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-background/40 p-5 text-center">
                    <p className="text-xs text-muted">{stat.label}</p>
                    <p className={`mt-2 text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Distribuição por trilha</h3>
                <div className="grid grid-cols-4 gap-3">
                  {(["ME1", "ME2", "ME3", "ALL"] as Track[]).map((t) => {
                    const count = users.filter((u) => (u.assigned_track ?? "ALL") === t).length;
                    const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                    return (
                      <div key={t} className={`rounded-xl border p-4 text-center ${TRACK_STYLE[t]}`}>
                        <p className="text-sm font-bold">{t}</p>
                        <p className="mt-1 text-2xl font-bold">{count}</p>
                        <p className="text-xs opacity-70">{pct}% do total</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Usuários recentes</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th className="pb-2 text-left">Nome</th>
                      <th className="pb-2 text-left">Role</th>
                      <th className="pb-2 text-left">Trilha</th>
                      <th className="pb-2 text-left">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 10).map((u) => {
                      const track = (u.assigned_track ?? "ALL") as Track;
                      return (
                        <tr key={u.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 font-medium text-foreground">{u.name ?? "—"}</td>
                          <td className="py-2">
                            <span className={`rounded-md border px-1.5 py-0.5 text-xs ${
                              u.role === "admin" ? "border-purple/40 bg-purple/10 text-purple" : "border-border text-muted"
                            }`}>{u.role}</span>
                          </td>
                          <td className="py-2">
                            <span className={`rounded-md border px-1.5 py-0.5 text-xs ${TRACK_STYLE[track]}`}>{track}</span>
                          </td>
                          <td className="py-2 text-xs text-muted">{fmtDate(u.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="flex h-full gap-5">
              {/* User list */}
              <div className="flex w-72 shrink-0 flex-col gap-3">
                <h2 className="text-lg font-bold text-foreground">Usuários</h2>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setTrackFilter("")}
                    className={`rounded-lg border px-2 py-1 text-xs ${!trackFilter ? "border-teal/40 bg-teal/10 text-teal" : "border-border text-muted"}`}
                  >
                    Todos
                  </button>
                  {TRACKS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrackFilter(t)}
                      className={`rounded-lg border px-2 py-1 text-xs ${trackFilter === t ? TRACK_STYLE[t] : "border-border text-muted"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex-1 space-y-2 overflow-auto">
                  {filteredUsers.map((user) => {
                    const track = (user.assigned_track ?? "ALL") as Track;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                          selectedUserId === user.id ? "border-blue/40 bg-blue/10" : "border-border bg-background/35 hover:bg-background/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">{user.name ?? "Sem nome"}</p>
                          <span className={`ml-2 shrink-0 rounded-md border px-1.5 py-0.5 text-xs ${TRACK_STYLE[track]}`}>{track}</span>
                        </div>
                        <p className="text-xs text-muted">{user.role}</p>
                      </button>
                    );
                  })}
                  {filteredUsers.length === 0 && <p className="text-xs text-muted">Nenhum usuário encontrado.</p>}
                </div>
              </div>

              {/* User detail */}
              <div className="flex-1 overflow-auto">
                {selectedUser ? (
                  <div className="space-y-5">
                    {/* User header */}
                    <div className="rounded-2xl border border-border bg-background/40 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{selectedUser.name ?? "Sem nome"}</h2>
                          <p className="mt-1 text-sm text-muted">Cadastro: {fmtDate(selectedUser.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRoleToggle(selectedUser.id, selectedUser.role)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                            selectedUser.role === "admin"
                              ? "border-purple/40 bg-purple/10 text-purple hover:bg-purple/20"
                              : "border-border bg-background/35 text-muted hover:text-foreground"
                          }`}
                        >
                          {selectedUser.role === "admin" ? "Admin — Rebaixar" : "Promover a Admin"}
                        </button>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs text-muted">Trilha:</span>
                        {TRACKS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleTrackChange(selectedUser.id, t)}
                            className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                              (selectedUser.assigned_track ?? "ALL") === t ? TRACK_STYLE[t] : "border-border text-muted hover:text-foreground"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {detailsLoading ? (
                      <p className="text-sm text-muted">Carregando dados...</p>
                    ) : selectedDetails ? (
                      <>
                        {/* Resumo em linguagem humana */}
                        <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">Resumo do desempenho (linguagem humana)</h3>
                          <p className="text-sm text-muted leading-relaxed">
                            {selectedUser.name ?? "Este usuário"} está seguindo a trilha{" "}
                            <span className="text-foreground font-medium">
                              {humanTrackName((selectedUser.assigned_track ?? "ALL") as string)}
                            </span>.
                            Até agora, ele(a) estudou{" "}
                            <span className="text-foreground font-semibold">{selectedDetails.events.length}</span> interações com cards,
                            consolidou progresso em{" "}
                            <span className="text-foreground font-semibold">{selectedDetails.progress.length}</span> cards,
                            realizou{" "}
                            <span className="text-foreground font-semibold">{selectedDetails.attempts.length}</span> simulados
                            e enviou{" "}
                            <span className="text-foreground font-semibold">{selectedDetails.answers.length}</span> respostas.
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {perTrackStats.map(({ track, total, avg }) => (
                              <div key={track} className={`rounded-xl border p-3 ${TRACK_STYLE[track as Track]}`}>
                                <p className="text-xs font-semibold">{track}</p>
                                <p className="mt-1 text-lg font-bold">{avg !== null ? `${avg}%` : "Sem nota"}</p>
                                <p className="text-[11px] opacity-80">{total} tentativa{total !== 1 ? "s" : ""}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Timeline unificada item a item */}
                        <div className="rounded-2xl border border-border bg-background/40 p-5">
                          <h3 className="mb-3 text-sm font-semibold text-foreground">
                            Linha do tempo da atividade (item a item)
                          </h3>
                          {(() => {
                            const cardTimeline = selectedDetails.events.map((ev) => ({
                              id: `card-${ev.id}`,
                              when: ev.created_at,
                              type: "card" as const,
                              text: `${humanCardEvent(ev.event_type, ev.quality)} no ${shortCardId(ev.card_id)}${ev.quality !== null ? ` (qualidade ${ev.quality})` : ""}.`,
                              badge: "Card",
                              badgeClass: "border-teal/30 bg-teal/10 text-teal",
                            }));
                            const simTimeline = selectedDetails.attempts.map((a) => {
                              const score = Math.round(Number(a.score_percent ?? 0));
                              const scoreText = a.score_percent === null ? "ainda sem nota final" : `${score}%`;
                              return {
                                id: `attempt-${a.id}`,
                                when: a.created_at,
                                type: "attempt" as const,
                                text: `realizou simulado ${a.track} com resultado ${scoreText} em ${fmtSec(a.duration_sec)}.`,
                                badge: "Simulado",
                                badgeClass: "border-blue/30 bg-blue/10 text-blue",
                              };
                            });
                            const answerTimeline = selectedDetails.answers.map((ans) => ({
                              id: `answer-${ans.id}`,
                              when: ans.answered_at,
                              type: "answer" as const,
                              text: `respondeu questão ${shortCardId(ans.question_id)} e marcou alternativa ${ans.selected} (${ans.correct ? "acertou" : "errou"}).`,
                              badge: "Resposta",
                              badgeClass: ans.correct
                                ? "border-teal/30 bg-teal/10 text-teal"
                                : "border-rose/30 bg-rose/10 text-rose",
                            }));

                            const timeline = [...cardTimeline, ...simTimeline, ...answerTimeline]
                              .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
                              .slice(0, 120);

                            if (timeline.length === 0) {
                              return <p className="text-xs text-muted">Nenhuma atividade registrada ainda.</p>;
                            }

                            return (
                              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                                {timeline.map((item) => (
                                  <div key={item.id} className="rounded-xl border border-border bg-background/35 px-3 py-2">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${item.badgeClass}`}>
                                        {item.badge}
                                      </span>
                                      <span className="text-[11px] text-muted">{fmtDate(item.when)}</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-muted">
                                      <span className="font-medium text-foreground">{selectedUser.name ?? "Usuário"}</span> {item.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Tabela objetiva também mantida */}
                        <div className="grid grid-cols-2 gap-5">
                          <div className="rounded-2xl border border-border bg-background/40 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">Simulados recentes (tabela)</h3>
                            {selectedDetails.attempts.length === 0 ? (
                              <p className="text-xs text-muted">Nenhum simulado realizado.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted">
                                    <th className="pb-2 text-left">Trilha</th>
                                    <th className="pb-2 text-right">Score</th>
                                    <th className="pb-2 text-right">Tempo</th>
                                    <th className="pb-2 text-right">Data</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedDetails.attempts.slice(0, 15).map((a) => {
                                    const score = Math.round(Number(a.score_percent ?? 0));
                                    const scoreColor = score >= 70 ? "text-teal" : score >= 50 ? "text-amber" : "text-rose";
                                    return (
                                      <tr key={a.id} className="border-b border-border/40 last:border-0">
                                        <td className="py-1.5">
                                          <span className={`rounded border px-1 text-[10px] ${TRACK_STYLE[a.track as Track]}`}>{a.track}</span>
                                        </td>
                                        <td className={`py-1.5 text-right font-bold ${scoreColor}`}>{score}%</td>
                                        <td className="py-1.5 text-right text-muted">{fmtSec(a.duration_sec)}</td>
                                        <td className="py-1.5 text-right text-muted">{fmtDate(a.created_at)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>

                          <div className="rounded-2xl border border-border bg-background/40 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">Eventos de cards recentes (tabela)</h3>
                            {selectedDetails.events.length === 0 ? (
                              <p className="text-xs text-muted">Nenhum evento registrado.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted">
                                    <th className="pb-2 text-left">Card</th>
                                    <th className="pb-2 text-left">Evento</th>
                                    <th className="pb-2 text-right">Data</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedDetails.events.slice(0, 20).map((ev) => (
                                    <tr key={ev.id} className="border-b border-border/40 last:border-0">
                                      <td className="py-1.5 font-mono text-[10px] text-muted">{shortCardId(ev.card_id)}</td>
                                      <td className="py-1.5 text-foreground">
                                        {humanCardEvent(ev.event_type, ev.quality)}
                                        {ev.quality !== null ? <span className="ml-1 text-muted">Q{ev.quality}</span> : null}
                                      </td>
                                      <td className="py-1.5 text-right text-muted">{fmtDate(ev.created_at)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted">Selecione um usuário para ver os detalhes.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CONTENT ── */}
          {tab === "content" && (
            <div className="space-y-5 max-w-4xl">
              <h2 className="text-xl font-bold text-foreground">Gerenciar Conteúdo</h2>

              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <p className="text-sm text-muted mb-4">
                  Importe novos flashcards e simulados, faça backup ou remova conteúdo desatualizado.
                  Todas as alterações ficam disponíveis para todos os usuários em tempo real.
                </p>
                <a
                  href="/importar"
                  className="inline-flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/15 px-5 py-2.5 text-sm font-medium text-teal transition hover:opacity-90"
                >
                  ⊞ Abrir gerenciador de conteúdo
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border bg-background/40 p-5">
                  <p className="text-xs text-muted mb-1">Cards importados</p>
                  <p className="text-3xl font-bold text-teal">{overview.totalCardEvents > 0 ? "✓" : "—"}</p>
                  <p className="mt-2 text-xs text-muted">
                    Acesse o gerenciador para ver o total exato e importar novos arquivos CSV ou HTML.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/40 p-5">
                  <p className="text-xs text-muted mb-1">Simulados</p>
                  <p className="text-3xl font-bold text-blue">{overview.totalAttempts > 0 ? "✓" : "—"}</p>
                  <p className="mt-2 text-xs text-muted">
                    Importe questões no formato TEA. Suporte a ME1, ME2 e ME3.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/40 p-5">
                  <p className="text-xs text-muted mb-1">Formatos aceitos</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["CSV", "HTML", "JSON (backup)"].map((f) => (
                      <span key={f} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted">{f}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Exporte do Google Drive como página web (.html) ou planilha (.csv).
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber/20 bg-amber/5 p-5">
                <p className="text-sm font-semibold text-amber mb-2">⚠ Atenção ao limpar conteúdo</p>
                <p className="text-xs text-muted">
                  Remover cards ou simulados apaga o conteúdo para todos os usuários mas <strong className="text-foreground">não</strong> apaga
                  o progresso individual de cada aluno. O histórico de estudo é preservado.
                </p>
              </div>
            </div>
          )}

          {/* ── EXPORT ── */}
          {tab === "export" && (
            <div className="max-w-3xl space-y-6">
              <h2 className="text-xl font-bold text-foreground">Exportar conteúdo</h2>
              <p className="text-sm text-muted">
                Baixe os dados do app para guardar como backup ou reimportar depois. Os arquivos JSON podem ser
                reimportados diretamente pela página de importação.
              </p>

              {/* Backup completo */}
              <div className="rounded-2xl border border-teal/20 bg-teal/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">Backup completo</h3>
                    <p className="mt-1 text-sm text-muted">
                      Exporta todos os flashcards e simulados em um único arquivo JSON.
                      Ideal para guardar antes de fazer grandes alterações.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExport("backup", "json")}
                    disabled={exportStatus["backup"] === "loading"}
                    className="shrink-0 rounded-xl border border-teal/30 bg-teal/15 px-5 py-2.5 text-sm font-medium text-teal transition hover:opacity-90 disabled:opacity-40"
                  >
                    {exportStatus["backup"] === "loading" ? "Baixando..." : exportStatus["backup"] === "done" ? "✓ Baixado" : "↓ Baixar backup"}
                  </button>
                </div>
              </div>

              {/* Cards e simulados separados */}
              <div className="grid grid-cols-2 gap-4">
                {/* Flashcards */}
                <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-3">
                  <h3 className="font-semibold text-foreground">Flashcards</h3>
                  <p className="text-xs text-muted">
                    Exporta todos os cards com frente, verso, trilha (ME1/ME2/ME3), tags e especialidade.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleExport("flashcards", "json")}
                      disabled={exportStatus["flashcards"] === "loading"}
                      className="flex-1 rounded-xl border border-blue/30 bg-blue/10 py-2 text-xs font-medium text-blue transition hover:opacity-90 disabled:opacity-40"
                    >
                      {exportStatus["flashcards"] === "loading" ? "..." : exportStatus["flashcards"] === "done" ? "✓" : "↓ JSON"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("flashcards", "csv")}
                      disabled={exportStatus["flashcards-csv"] === "loading"}
                      className="flex-1 rounded-xl border border-purple/30 bg-purple/10 py-2 text-xs font-medium text-purple transition hover:opacity-90 disabled:opacity-40"
                    >
                      {exportStatus["flashcards-csv"] === "loading" ? "..." : exportStatus["flashcards-csv"] === "done" ? "✓" : "↓ CSV"}
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    O JSON pode ser reimportado pelo app. O CSV pode ser aberto no Excel ou Google Sheets.
                  </p>
                </div>

                {/* Simulados */}
                <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-3">
                  <h3 className="font-semibold text-foreground">Simulados</h3>
                  <p className="text-xs text-muted">
                    Exporta todas as questões com enunciado, alternativas, gabarito e explicação.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleExport("simulados", "json")}
                      disabled={exportStatus["simulados"] === "loading"}
                      className="flex-1 rounded-xl border border-blue/30 bg-blue/10 py-2 text-xs font-medium text-blue transition hover:opacity-90 disabled:opacity-40"
                    >
                      {exportStatus["simulados"] === "loading" ? "..." : exportStatus["simulados"] === "done" ? "✓" : "↓ JSON"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("simulados", "csv")}
                      disabled={exportStatus["simulados-csv"] === "loading"}
                      className="flex-1 rounded-xl border border-purple/30 bg-purple/10 py-2 text-xs font-medium text-purple transition hover:opacity-90 disabled:opacity-40"
                    >
                      {exportStatus["simulados-csv"] === "loading" ? "..." : exportStatus["simulados-csv"] === "done" ? "✓" : "↓ CSV"}
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    O JSON pode ser reimportado pelo app. O CSV pode ser editado e reimportado.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Como usar os arquivos exportados</h3>
                <ol className="space-y-1 text-sm text-muted list-decimal list-inside">
                  <li>Salve o arquivo baixado em local seguro (Google Drive, etc.)</li>
                  <li>Para reimportar, vá em <strong className="text-foreground">Conteúdo → Abrir gerenciador</strong></li>
                  <li>Arraste o arquivo JSON ou CSV para a área de importação</li>
                  <li>O app faz merge automático sem duplicar conteúdo existente</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── INVITES ── */}
          {tab === "invites" && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-xl font-bold text-foreground">Códigos de convite</h2>

              <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Gerar novo código</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Rótulo (ex: Turma 2026)"
                    className="flex-1 rounded-xl border border-border bg-background/35 px-3 py-2 text-sm"
                  />
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background/35 px-3 py-2">
                    <span className="text-xs text-muted whitespace-nowrap">Usos máx.</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={newMaxUses}
                      onChange={(e) => setNewMaxUses(Number(e.target.value))}
                      className="w-16 bg-transparent text-sm text-foreground focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCode}
                    disabled={inviteLoading}
                    className="rounded-xl border border-teal/30 bg-teal/15 px-5 py-2 text-sm font-medium text-teal transition hover:opacity-90 disabled:opacity-40"
                  >
                    {inviteLoading ? "Gerando..." : "Gerar código"}
                  </button>
                </div>
                {newCode && (
                  <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-center">
                    <p className="text-xs text-muted">Código gerado — envie aos alunos:</p>
                    <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-teal">{newCode}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Códigos existentes</h3>
                {inviteCodes.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum código criado ainda.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="pb-2 text-left">Código</th>
                        <th className="pb-2 text-left">Rótulo</th>
                        <th className="pb-2 text-center">Usos</th>
                        <th className="pb-2 text-left">Expiração</th>
                        <th className="pb-2 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inviteCodes.map((c) => (
                        <tr key={c.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2 font-mono font-bold tracking-widest text-foreground">{c.code}</td>
                          <td className="py-2 text-muted">{c.label ?? "—"}</td>
                          <td className="py-2 text-center">
                            <span className={c.use_count >= c.max_uses ? "text-rose" : "text-teal"}>
                              {c.use_count}/{c.max_uses}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-muted">
                            {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "Sem prazo"}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteCode(c.id)}
                              className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-1 text-xs text-rose transition hover:bg-rose/20"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
