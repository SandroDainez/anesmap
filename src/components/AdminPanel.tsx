"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { loadAdminOverview, loadAdminUserDetails, loadAdminUsers, type UserProfile } from "@/lib/user-study";

type AdminUserDetails = Awaited<ReturnType<typeof loadAdminUserDetails>>;

export function AdminPanel() {
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSessions: 0,
    totalCardEvents: 0,
    totalAttempts: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AdminUserDetails | null>(null);

  useEffect(() => {
    void (async () => {
      const [ov, list] = await Promise.all([loadAdminOverview(), loadAdminUsers()]);
      setOverview(ov);
      setUsers(list);
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

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-amber">Usuários</p>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrar por nome/role"
          className="mt-3 w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm"
        />
        <div className="mt-3 max-h-56 space-y-2 overflow-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                selectedUserId === user.id
                  ? "border-blue/40 bg-blue/10"
                  : "border-border bg-background/35"
              }`}
            >
              <p className="font-medium text-foreground">{user.name ?? "Sem nome"}</p>
              <p className="text-xs text-muted">
                {user.role} · meta {user.weekly_goal_minutes} min/semana
              </p>
            </button>
          ))}
        </div>
      </AppCard>

      <AppCard>
        <p className="font-mono text-xs uppercase tracking-wider text-blue">Detalhe do usuário</p>
        {selectedDetails?.profile ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-foreground">
              <span className="font-semibold">{selectedDetails.profile.name ?? "Sem nome"}</span> ·{" "}
              {selectedDetails.profile.role}
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
