"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { loadAdminOverview, loadAdminUserDetails, loadAdminUsers, loadAdminContentStats, type UserProfile, type ContentStats } from "@/lib/user-study";

function humanRoleName(role: string) {
  if (role === "admin") return "Administrador";
  if (role === "student") return "Usuário";
  return role;
}

type AdminUserDetails = Awaited<ReturnType<typeof loadAdminUserDetails>>;

type AddUserForm = {
  name: string;
  email: string;
  password: string;
  role: "student" | "admin";
};

export function AdminPanel() {
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSessions: 0,
    totalCardEvents: 0,
    totalAttempts: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AdminUserDetails | null>(null);

  // Adicionar usuário
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddUserForm>({ name: "", email: "", password: "", role: "student" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Excluir usuário
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function refreshUsers() {
    const [ov, list] = await Promise.all([loadAdminOverview(), loadAdminUsers()]);
    setOverview(ov);
    setUsers(list);
  }

  useEffect(() => {
    void (async () => {
      const [ov, list, stats] = await Promise.all([
        loadAdminOverview(),
        loadAdminUsers(),
        loadAdminContentStats(),
      ]);
      setOverview(ov);
      setUsers(list);
      setContentStats(stats);
      if (list[0]?.id) setSelectedUserId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    void (async () => {
      const details = await loadAdminUserDetails(selectedUserId);
      setSelectedDetails(details);
    })();
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter(
      (item) =>
        (item.name ?? "").toLowerCase().includes(normalized) ||
        item.role.toLowerCase().includes(normalized),
    );
  }, [query, users]);

  const averageScore = useMemo(() => {
    const attempts = selectedDetails?.attempts ?? [];
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((acc, item) => acc + Number(item.score_percent ?? 0), 0);
    return Math.round(total / attempts.length);
  }, [selectedDetails]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? "Erro ao criar usuário.");
        return;
      }
      setAddForm({ name: "", email: "", password: "", role: "student" });
      setShowAddForm(false);
      await refreshUsers();
    } catch {
      setAddError("Erro inesperado ao criar usuário.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error ?? "Erro ao excluir usuário.");
        return;
      }
      setDeleteTargetId(null);
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setSelectedDetails(null);
      }
      await refreshUsers();
    } catch {
      setDeleteError("Erro inesperado ao excluir usuário.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const deleteTarget = users.find((u) => u.id === deleteTargetId);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Admin"
        title="Painel de desempenho"
        description="Acompanhe uso, cards, simulados, respostas e evolução por usuário."
      />

      <section className="grid grid-cols-2 gap-2">
        <AppCard className="text-center">
          <p className="text-xs text-muted">Usuários</p>
          <p className="mt-1 text-2xl font-semibold text-teal">{overview.totalUsers}</p>
        </AppCard>
        <AppCard className="text-center">
          <p className="text-xs text-muted">Sessões de estudo</p>
          <p className="mt-1 text-2xl font-semibold text-blue">{overview.totalSessions}</p>
        </AppCard>
        <AppCard className="text-center">
          <p className="text-xs text-muted">Eventos de cards</p>
          <p className="mt-1 text-2xl font-semibold text-purple">{overview.totalCardEvents}</p>
        </AppCard>
        <AppCard className="text-center">
          <p className="text-xs text-muted">Tentativas simulados</p>
          <p className="mt-1 text-2xl font-semibold text-amber">{overview.totalAttempts}</p>
        </AppCard>
      </section>

      {/* Estatísticas de conteúdo */}
      {contentStats && (
        <section className="space-y-3">
          {/* Flashcards */}
          <AppCard>
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wider text-teal">Flashcards</p>
              <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">
                {contentStats.flashcards.total} total
              </span>
            </div>

            {/* Por grupo ME */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {contentStats.flashcards.byMe.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-background/35 py-2 text-center"
                >
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-lg font-bold text-teal">{item.count}</p>
                  <p className="text-xs text-muted">
                    {contentStats.flashcards.total > 0
                      ? Math.round((item.count / contentStats.flashcards.total) * 100)
                      : 0}%
                  </p>
                </div>
              ))}
            </div>

            {/* Barra de distribuição ME */}
            {contentStats.flashcards.total > 0 && (
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
                {contentStats.flashcards.byMe.map((item, i) => {
                  const colors = ["bg-teal", "bg-blue", "bg-purple"];
                  const pct = (item.count / contentStats.flashcards.total) * 100;
                  return pct > 0 ? (
                    <div
                      key={item.label}
                      className={`${colors[i]} h-full`}
                      style={{ width: `${pct}%` }}
                      title={`${item.label}: ${item.count}`}
                    />
                  ) : null;
                })}
              </div>
            )}

            {/* Por especialidade */}
            {contentStats.flashcards.byEspecialidade.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-muted">Por especialidade</p>
                <div className="max-h-40 space-y-1.5 overflow-auto">
                  {contentStats.flashcards.byEspecialidade.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-teal/60"
                          style={{
                            width: `${Math.round((item.count / contentStats.flashcards.total) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs font-medium text-foreground">
                        {item.count}
                      </span>
                      <span className="w-32 truncate text-xs text-muted" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AppCard>

          {/* Simulados */}
          <AppCard>
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wider text-purple">Simulados</p>
              <span className="rounded-full border border-purple/30 bg-purple/10 px-2 py-0.5 text-xs font-semibold text-purple">
                {contentStats.simulados.total} total
              </span>
            </div>

            {/* Por grupo ME */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {contentStats.simulados.byMe.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-background/35 py-2 text-center"
                >
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-lg font-bold text-purple">{item.count}</p>
                  <p className="text-xs text-muted">
                    {contentStats.simulados.total > 0
                      ? Math.round((item.count / contentStats.simulados.total) * 100)
                      : 0}%
                  </p>
                </div>
              ))}
            </div>

            {/* Barra de distribuição ME */}
            {contentStats.simulados.total > 0 && (
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
                {contentStats.simulados.byMe.map((item, i) => {
                  const colors = ["bg-teal", "bg-blue", "bg-purple"];
                  const pct = (item.count / contentStats.simulados.total) * 100;
                  return pct > 0 ? (
                    <div
                      key={item.label}
                      className={`${colors[i]} h-full`}
                      style={{ width: `${pct}%` }}
                      title={`${item.label}: ${item.count}`}
                    />
                  ) : null;
                })}
              </div>
            )}

            {/* Por tema */}
            {contentStats.simulados.byTema.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-muted">Por tema</p>
                <div className="max-h-40 space-y-1.5 overflow-auto">
                  {contentStats.simulados.byTema.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-purple/60"
                          style={{
                            width: `${Math.round((item.count / contentStats.simulados.total) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs font-medium text-foreground">
                        {item.count}
                      </span>
                      <span className="w-32 truncate text-xs text-muted" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AppCard>
        </section>
      )}

      {/* Lista de usuários */}
      <AppCard>
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-wider text-amber">Usuários</p>
          <button
            type="button"
            onClick={() => { setShowAddForm((v) => !v); setAddError(null); }}
            className="rounded-lg border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-medium text-teal transition hover:opacity-80"
          >
            {showAddForm ? "Cancelar" : "+ Adicionar usuário"}
          </button>
        </div>

        {/* Formulário de adição */}
        {showAddForm && (
          <form onSubmit={handleAddUser} className="mt-4 space-y-2 rounded-xl border border-teal/20 bg-teal/5 p-3">
            <p className="text-xs font-semibold text-teal">Novo usuário</p>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome completo"
              required
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
            />
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="E-mail"
              required
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
            />
            <input
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Senha inicial"
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
            />
            <select
              value={addForm.role}
              onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as "student" | "admin" }))}
              className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground focus:border-teal/40 focus:outline-none"
            >
              <option value="student">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
            {addError && <p className="text-xs text-rose">{addError}</p>}
            <button
              type="submit"
              disabled={addLoading}
              className="w-full rounded-xl border border-teal/30 bg-teal/15 px-3 py-2 text-sm font-medium text-teal transition hover:opacity-90 disabled:opacity-40"
            >
              {addLoading ? "Criando..." : "Criar usuário"}
            </button>
          </form>
        )}

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrar por nome..."
          className="mt-3 w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm"
        />
        <div className="mt-3 max-h-56 space-y-2 overflow-auto">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`flex-1 rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedUserId === user.id
                    ? "border-blue/40 bg-blue/10"
                    : "border-border bg-background/35"
                }`}
              >
                <p className="font-medium text-foreground">{user.name ?? "Sem nome"}</p>
                <p className="text-xs text-muted">
                  {humanRoleName(user.role)} · meta {user.weekly_goal_minutes} min/semana
                </p>
              </button>
              <button
                type="button"
                onClick={() => { setDeleteTargetId(user.id); setDeleteError(null); }}
                title="Excluir usuário"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-rose/20 bg-rose/10 text-rose transition hover:opacity-80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </AppCard>

      {/* Modal de confirmação de exclusão */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl">
            <p className="text-sm font-semibold text-foreground">Excluir usuário</p>
            <p className="mt-2 text-sm text-muted">
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name ?? "este usuário"}</span>?
              Esta ação é permanente e não pode ser desfeita.
            </p>
            {deleteError && <p className="mt-2 text-xs text-rose">{deleteError}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                disabled={deleteLoading}
                className="flex-1 rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-muted transition hover:opacity-80 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteTargetId)}
                disabled={deleteLoading}
                className="flex-1 rounded-xl border border-rose/30 bg-rose/15 px-3 py-2 text-sm font-medium text-rose transition hover:opacity-90 disabled:opacity-40"
              >
                {deleteLoading ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe do usuário */}
      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-blue">Detalhe do usuário</p>
        {selectedDetails?.profile ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-foreground">
              <span className="font-semibold">{selectedDetails.profile.name ?? "Sem nome"}</span> ·{" "}
              {humanRoleName(selectedDetails.profile.role)}
            </p>
            <p className="text-muted">
              Cards com progresso: {selectedDetails.progress.length} · eventos:{" "}
              {selectedDetails.events.length}
            </p>
            <p className="text-muted">
              Simulados: {selectedDetails.attempts.length} · respostas: {selectedDetails.answers.length}
            </p>
            <p className="text-muted">Acurácia média em simulados: {averageScore}%</p>
            <article className="rounded-xl border border-border bg-background/35 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">Eventos recentes de cards</p>
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {selectedDetails.events.slice(0, 8).map((event) => (
                  <li key={event.id}>
                    {new Date(event.created_at).toLocaleString("pt-BR")} · {event.event_type} ·{" "}
                    {event.card_id}
                    {event.quality !== null ? ` · qualidade ${event.quality}` : ""}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-border bg-background/35 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">Tentativas recentes</p>
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {selectedDetails.attempts.slice(0, 8).map((attempt) => (
                  <li key={attempt.id}>
                    {new Date(attempt.created_at).toLocaleString("pt-BR")} · {attempt.track} ·{" "}
                    {Math.round(Number(attempt.score_percent ?? 0))}% · {attempt.duration_sec ?? 0}s
                  </li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Selecione um usuário para visualizar os detalhes.</p>
        )}
      </AppCard>
    </main>
  );
}
