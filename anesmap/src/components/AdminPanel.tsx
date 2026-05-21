"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadAdminOverview,
  loadAdminUserDetails,
  loadAdminUsers,
  loadAdminMEStats,
  loadAdminAssessmentData,
  loadInviteCodes,
  createInviteCode,
  deleteInviteCode,
  updateUserTrack,
  updateUserRole,
  type UserProfile,
  type InviteCode,
} from "@/lib/user-study";
import { loadFlashcardsRemote, loadSimuladosRemote, updateFlashcardRemote } from "@/lib/study-data";

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

type Tab = "overview" | "users" | "duplicados" | "content" | "export" | "invites" | "revisar";
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

function humanItemLabel(id: string, prefix: "Card" | "Questão" = "Card"): string {
  const match = id.match(/-(\d+)$/);
  if (match) return `${prefix} ${match[1]}`;
  return `${prefix} registrado`;
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

function humanRoleName(role: string) {
  if (role === "admin") return "Administrador";
  if (role === "student") return "Usuário";
  return role;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Visão Geral", icon: "◈" },
  { id: "users", label: "Usuários", icon: "◎" },
  { id: "duplicados", label: "Duplicados", icon: "⊟" },
  { id: "content", label: "Conteúdo", icon: "⊞" },
  { id: "export", label: "Exportar", icon: "↓" },
  { id: "invites", label: "Convites", icon: "⌘" },
  { id: "revisar", label: "Revisar Cards", icon: "✎" },
];

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [showEmbeddedImporter, setShowEmbeddedImporter] = useState(false);
  const [embeddedImportMode, setEmbeddedImportMode] = useState<"flashcards" | "simulados" | "all">("all");

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

  // ME Stats state
  type MEStatsData = Awaited<ReturnType<typeof loadAdminMEStats>>;
  const [meStatsData, setMeStatsData] = useState<MEStatsData>(null);
  const [meStatsLoading, setMeStatsLoading] = useState(false);

  // Duplicados state
  type RemoteCard = NonNullable<Awaited<ReturnType<typeof loadFlashcardsRemote>>>[number];
  type RemoteSimulado = NonNullable<Awaited<ReturnType<typeof loadSimuladosRemote>>>[number];
  const [dupCards, setDupCards] = useState<RemoteCard[] | null>(null);
  const [dupSimulados, setDupSimulados] = useState<RemoteSimulado[] | null>(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupKind, setDupKind] = useState<"cards" | "simulados">("simulados");
  const [selectedDupIds, setSelectedDupIds] = useState<string[]>([]);
  const [dupDeleteStatus, setDupDeleteStatus] = useState<string | null>(null);

  // Revisar Cards state
  type RevisarCard = NonNullable<Awaited<ReturnType<typeof loadFlashcardsRemote>>>[number];
  const REVISAR_PAGE_SIZE = 20;
  const [revisarCards, setRevisarCards] = useState<RevisarCard[] | null>(null);
  const [revisarLoading, setRevisarLoading] = useState(false);
  const [revisarError, setRevisarError] = useState<string | null>(null);
  const [revisarSearch, setRevisarSearch] = useState("");
  const [revisarTrack, setRevisarTrack] = useState<Track | "">("");
  const [revisarPage, setRevisarPage] = useState(0);
  const [editingCard, setEditingCard] = useState<RevisarCard | null>(null);
  const [editFrente, setEditFrente] = useState("");
  const [editVerso, setEditVerso] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  useEffect(() => {
    if (tab !== "duplicados") return;
    if (dupCards !== null && dupSimulados !== null) return;
    setDupLoading(true);
    void (async () => {
      const [cards, sims] = await Promise.all([
        loadFlashcardsRemote(),
        loadSimuladosRemote(),
      ]);
      setDupCards(cards ?? []);
      setDupSimulados(sims ?? []);
      setDupLoading(false);
    })();
  }, [tab, dupCards, dupSimulados]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (trackFilter) list = list.filter((u) => (u.assigned_track ?? "ALL") === trackFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.role.includes(q) ||
          humanRoleName(u.role).toLowerCase().includes(q),
      );
    }
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

  const detailedStats = useMemo(() => {
    const events = selectedDetails?.events ?? [];
    const attempts = selectedDetails?.attempts ?? [];
    const answers = selectedDetails?.answers ?? [];

    const cardViews = events.filter((e) => e.event_type === "view").length;
    const cardFlips = events.filter((e) => e.event_type === "flip").length;
    const cardGrades = events.filter((e) => e.event_type === "grade");
    const cardEasy = cardGrades.filter((e) => Number(e.quality ?? 0) >= 4).length;
    const cardMedium = cardGrades.filter((e) => Number(e.quality ?? 0) === 3).length;
    const cardHard = cardGrades.filter((e) => Number(e.quality ?? 0) <= 2).length;
    const uniqueCards = new Set(events.map((e) => e.card_id)).size;

    const totalAnswers = answers.length;
    const correctAnswers = answers.filter((a) => a.correct).length;
    const wrongAnswers = totalAnswers - correctAnswers;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    const finishedAttempts = attempts.filter((a) => a.ended_at || a.score_percent !== null).length;
    const avgScoreFinished =
      attempts.filter((a) => a.score_percent !== null).length > 0
        ? Math.round(
            attempts
              .filter((a) => a.score_percent !== null)
              .reduce((acc, a) => acc + Number(a.score_percent ?? 0), 0) /
              attempts.filter((a) => a.score_percent !== null).length,
          )
        : 0;

    const answersByAttempt = new Map<
      string,
      { total: number; correct: number; wrong: number }
    >();
    for (const ans of answers) {
      const prev = answersByAttempt.get(ans.attempt_id) ?? { total: 0, correct: 0, wrong: 0 };
      prev.total += 1;
      if (ans.correct) prev.correct += 1;
      else prev.wrong += 1;
      answersByAttempt.set(ans.attempt_id, prev);
    }

    return {
      cards: { cardViews, cardFlips, cardGrades: cardGrades.length, cardEasy, cardMedium, cardHard, uniqueCards },
      simulados: { totalAnswers, correctAnswers, wrongAnswers, accuracy, finishedAttempts, avgScoreFinished, answersByAttempt },
    };
  }, [selectedDetails]);

  function handleDownloadUserPdf() {
    if (!selectedUser || !selectedDetails) return;

    const attemptsRows = selectedDetails.attempts
      .slice(0, 30)
      .map((a) => {
        const score = a.score_percent === null ? "Sem nota final" : `${Math.round(Number(a.score_percent))}%`;
        return `
          <tr>
            <td>${escapeHtml(a.track)}</td>
            <td>${escapeHtml(score)}</td>
            <td>${escapeHtml(fmtSec(a.duration_sec))}</td>
            <td>${escapeHtml(fmtDate(a.created_at))}</td>
          </tr>
        `;
      })
      .join("");

    const answerRows = selectedDetails.answers
      .slice(0, 60)
      .map(
        (ans) => `
          <tr>
            <td>${escapeHtml(humanItemLabel(ans.question_id, "Questão"))}</td>
            <td>${escapeHtml(ans.selected)}</td>
            <td>${ans.correct ? "Acertou" : "Errou"}</td>
            <td>${escapeHtml(fmtDate(ans.answered_at))}</td>
          </tr>
        `,
      )
      .join("");

    const cardRows = selectedDetails.events
      .slice(0, 60)
      .map(
        (ev) => `
          <tr>
            <td>${escapeHtml(humanItemLabel(ev.card_id, "Card"))}</td>
            <td>${escapeHtml(humanCardEvent(ev.event_type, ev.quality))}</td>
            <td>${ev.quality !== null ? `Q${ev.quality}` : "—"}</td>
            <td>${escapeHtml(fmtDate(ev.created_at))}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório de desempenho - ${escapeHtml(selectedUser.name ?? "Usuário")}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { margin: 0 0 4px; font-size: 24px; }
          h2 { margin: 24px 0 8px; font-size: 18px; }
          p { margin: 4px 0; }
          .muted { color: #6b7280; }
          .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Relatório do estagiário</h1>
        <p><strong>Nome:</strong> ${escapeHtml(selectedUser.name ?? "Sem nome")}</p>
        <p><strong>Perfil:</strong> ${escapeHtml(humanRoleName(selectedUser.role))}</p>
        <p><strong>Trilha de cards:</strong> ${escapeHtml(selectedUser.assigned_track_cards ?? selectedUser.assigned_track ?? "ALL")}</p>
        <p><strong>Trilha de simulados:</strong> ${escapeHtml(selectedUser.assigned_track_simulados ?? selectedUser.assigned_track ?? "ALL")}</p>
        <p><strong>Cadastro:</strong> ${escapeHtml(fmtDate(selectedUser.created_at))}</p>

        <h2>Resumo geral</h2>
        <p>
          ${escapeHtml(selectedUser.name ?? "O usuário")} estudou ${detailedStats.cards.uniqueCards} cards diferentes,
          realizou ${selectedDetails.attempts.length} simulados, enviou ${detailedStats.simulados.totalAnswers} respostas,
          com ${detailedStats.simulados.correctAnswers} acertos e ${detailedStats.simulados.wrongAnswers} erros
          (taxa de acerto: ${detailedStats.simulados.accuracy}%).
        </p>

        <div class="grid">
          <div class="card"><strong>Cards vistos:</strong> ${detailedStats.cards.cardViews}</div>
          <div class="card"><strong>Cards virados:</strong> ${detailedStats.cards.cardFlips}</div>
          <div class="card"><strong>Cards avaliados:</strong> ${detailedStats.cards.cardGrades}</div>
          <div class="card"><strong>Marcados fácil:</strong> ${detailedStats.cards.cardEasy}</div>
          <div class="card"><strong>Marcados médio:</strong> ${detailedStats.cards.cardMedium}</div>
          <div class="card"><strong>Marcados difícil:</strong> ${detailedStats.cards.cardHard}</div>
          <div class="card"><strong>Simulados iniciados:</strong> ${selectedDetails.attempts.length}</div>
          <div class="card"><strong>Simulados concluídos:</strong> ${detailedStats.simulados.finishedAttempts}</div>
          <div class="card"><strong>Média de nota:</strong> ${detailedStats.simulados.avgScoreFinished}%</div>
        </div>

        <h2>Desempenho por trilha</h2>
        <table>
          <thead><tr><th>Trilha</th><th>Tentativas</th><th>Média</th></tr></thead>
          <tbody>
            ${perTrackStats
              .map(
                (row) => `<tr><td>${escapeHtml(row.track)}</td><td>${row.total}</td><td>${row.avg !== null ? `${row.avg}%` : "Sem nota"}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>

        <h2>Simulados realizados (últimos 30)</h2>
        <table>
          <thead><tr><th>Trilha</th><th>Resultado</th><th>Tempo</th><th>Data</th></tr></thead>
          <tbody>${attemptsRows || '<tr><td colspan="4">Sem registros</td></tr>'}</tbody>
        </table>

        <h2>Respostas de simulados (últimas 60)</h2>
        <table>
          <thead><tr><th>Questão</th><th>Alternativa</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>${answerRows || '<tr><td colspan="4">Sem registros</td></tr>'}</tbody>
        </table>

        <h2>Histórico de cards (últimos 60 eventos)</h2>
        <table>
          <thead><tr><th>Card</th><th>Ação</th><th>Qualidade</th><th>Data</th></tr></thead>
          <tbody>${cardRows || '<tr><td colspan="4">Sem registros</td></tr>'}</tbody>
        </table>

        <p class="muted" style="margin-top:20px;">
          Relatório gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}.
        </p>
      </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  }

  async function handleTrackChange(userId: string, track: Track, kind: "cards" | "simulados" | "all" = "all") {
    await updateUserTrack(userId, track, kind);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              assigned_track: kind === "all" ? track : u.assigned_track,
              assigned_track_cards: kind === "cards" || kind === "all" ? track : u.assigned_track_cards,
              assigned_track_simulados:
                kind === "simulados" || kind === "all" ? track : u.assigned_track_simulados,
            }
          : u,
      ),
    );
    if (selectedDetails?.profile?.id === userId) {
      setSelectedDetails((prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...prev.profile!,
                assigned_track: kind === "all" ? track : prev.profile!.assigned_track,
                assigned_track_cards:
                  kind === "cards" || kind === "all" ? track : prev.profile!.assigned_track_cards,
                assigned_track_simulados:
                  kind === "simulados" || kind === "all"
                    ? track
                    : prev.profile!.assigned_track_simulados,
              },
            }
          : prev,
      );
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

  async function handleLoadRevisarCards() {
    setRevisarLoading(true);
    setRevisarError(null);
    try {
      const cards = await loadFlashcardsRemote();
      setRevisarCards(cards ?? []);
      setRevisarPage(0);
    } catch (e) {
      setRevisarError(e instanceof Error ? e.message : "Erro ao carregar cards");
    } finally {
      setRevisarLoading(false);
    }
  }

  function handleOpenEdit(card: NonNullable<typeof revisarCards>[number]) {
    setEditingCard(card);
    setEditFrente(card.frente);
    setEditVerso(card.verso);
    setSaveSuccess(false);
  }

  async function handleSaveCard() {
    if (!editingCard) return;
    setSavingCard(true);
    try {
      await updateFlashcardRemote(editingCard.id, { frente: editFrente, verso: editVerso });
      setRevisarCards((prev) =>
        prev ? prev.map((c) => (c.id === editingCard.id ? { ...c, frente: editFrente, verso: editVerso } : c)) : prev,
      );
      setSaveSuccess(true);
      setTimeout(() => setEditingCard(null), 800);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingCard(false);
    }
  }

  const revisarFiltered = useMemo(() => {
    if (!revisarCards) return [];
    return revisarCards.filter((c) => {
      const matchTrack = !revisarTrack || c.me === revisarTrack;
      const q = revisarSearch.toLowerCase();
      const matchSearch = !q || c.frente.toLowerCase().includes(q) || c.verso.toLowerCase().includes(q);
      return matchTrack && matchSearch;
    });
  }, [revisarCards, revisarTrack, revisarSearch]);

  const revisarPageCards = useMemo(
    () => revisarFiltered.slice(revisarPage * REVISAR_PAGE_SIZE, (revisarPage + 1) * REVISAR_PAGE_SIZE),
    [revisarFiltered, revisarPage],
  );

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
          <span className="rounded-lg border border-purple/40 bg-purple/15 px-4 py-2 text-sm font-semibold text-purple">
            Admin
          </span>
          <a
            href="/dashboard"
            className="rounded-lg border border-border bg-background/35 px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
          >
            ← App
          </a>
          <a
            href="/logout"
            className="rounded-lg border border-border bg-background/35 px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
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

          <div className="mt-auto border-t border-border pt-5 space-y-3 px-1">
            <p className="font-mono uppercase tracking-widest text-xs text-muted">Resumo</p>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold text-teal leading-none">{overview.totalUsers}</p>
                <p className="mt-1 text-xs text-muted">usuários ativos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue leading-none">{overview.totalSessions}</p>
                <p className="mt-1 text-xs text-muted">sessões de estudo</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple leading-none">{overview.totalAttempts}</p>
                <p className="mt-1 text-xs text-muted">simulados realizados</p>
              </div>
            </div>
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
                      <th className="pb-2 text-left">Perfil</th>
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
                            }`}>{humanRoleName(u.role)}</span>
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
                        <p className="text-xs text-muted">{humanRoleName(user.role)}</p>
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
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-xs text-muted">Perfil:</span>
                          <button
                            type="button"
                            onClick={() => selectedUser.role !== "student" && handleRoleToggle(selectedUser.id, selectedUser.role)}
                            className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                              selectedUser.role === "student"
                                ? "border-teal/40 bg-teal/10 text-teal"
                                : "border-border text-muted hover:text-foreground"
                            }`}
                          >
                            Usuário
                          </button>
                          <button
                            type="button"
                            onClick={() => selectedUser.role !== "admin" && handleRoleToggle(selectedUser.id, selectedUser.role)}
                            className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                              selectedUser.role === "admin"
                                ? "border-purple/40 bg-purple/10 text-purple"
                                : "border-border text-muted hover:text-foreground"
                            }`}
                          >
                            Administrador
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-xs text-muted">Cards:</span>
                            {TRACKS.map((t) => (
                              <button
                                key={`cards-${t}`}
                                type="button"
                                onClick={() => handleTrackChange(selectedUser.id, t, "cards")}
                                className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                                  (selectedUser.assigned_track_cards ?? selectedUser.assigned_track ?? "ALL") === t
                                    ? TRACK_STYLE[t]
                                    : "border-border text-muted hover:text-foreground"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-xs text-muted">Simulados:</span>
                            {TRACKS.map((t) => (
                              <button
                                key={`simulados-${t}`}
                                type="button"
                                onClick={() => handleTrackChange(selectedUser.id, t, "simulados")}
                                className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                                  (selectedUser.assigned_track_simulados ?? selectedUser.assigned_track ?? "ALL") === t
                                    ? TRACK_STYLE[t]
                                    : "border-border text-muted hover:text-foreground"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleDownloadUserPdf}
                            className="rounded-xl border border-blue/30 bg-blue/15 px-4 py-2 text-xs font-medium text-blue transition hover:opacity-90"
                          >
                            Gerar relatório PDF do estagiário
                          </button>
                        </div>
                      </div>
                    </div>

                    {detailsLoading ? (
                      <p className="text-sm text-muted">Carregando dados...</p>
                    ) : selectedDetails ? (
                      <>
                        {/* Resumo em linguagem humana */}
                        {(() => {
                          const DOMAINS_SUMMARY = [
                            { id: "farmacologia", label: "Farmacologia" },
                            { id: "via_aerea", label: "Via Aérea" },
                            { id: "anestesia_geral", label: "Anest. Geral" },
                            { id: "anestesia_regional", label: "Regional" },
                            { id: "hemodinamica", label: "Hemodinâmica" },
                            { id: "ventilacao", label: "Ventilação" },
                            { id: "emergencias", label: "Emergências" },
                            { id: "pediatria", label: "Pediatria" },
                          ];
                          const snapshots = selectedDetails.assessmentSnapshots ?? [];
                          const latestSnap = snapshots[0] ?? null;
                          const avgComp = latestSnap
                            ? (DOMAINS_SUMMARY.map((d) => Number(latestSnap.ratings[d.id] ?? 1)).reduce((a, b) => a + b, 0) / DOMAINS_SUMMARY.length).toFixed(1)
                            : null;
                          const weakAreas = latestSnap
                            ? DOMAINS_SUMMARY.filter((d) => Number(latestSnap.ratings[d.id] ?? 1) <= 2).map((d) => d.label)
                            : [];

                          return (
                            <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-3">
                              <h3 className="text-sm font-semibold text-foreground">Resumo do desempenho (linguagem humana)</h3>
                              <p className="text-sm text-muted leading-relaxed">
                                {selectedUser.name ?? "Este usuário"} está com trilha de cards em{" "}
                                <span className="text-foreground font-medium">
                                  {humanTrackName(
                                    (selectedUser.assigned_track_cards ??
                                      selectedUser.assigned_track ??
                                      "ALL") as string,
                                  )}
                                </span>{" "}
                                e trilha de simulados em{" "}
                                <span className="text-foreground font-medium">
                                  {humanTrackName(
                                    (selectedUser.assigned_track_simulados ??
                                      selectedUser.assigned_track ??
                                      "ALL") as string,
                                  )}
                                </span>.
                                Até agora, ele(a) estudou{" "}
                                <span className="text-foreground font-semibold">{detailedStats.cards.uniqueCards}</span> cards diferentes
                                (total de {selectedDetails.events.length} interações),
                                realizou{" "}
                                <span className="text-foreground font-semibold">{selectedDetails.attempts.length}</span> simulados
                                com taxa de acerto de{" "}
                                <span className="text-foreground font-semibold">{detailedStats.simulados.accuracy}%</span>.
                                {avgComp !== null && (
                                  <>
                                    {" "}Na autoavaliação de competências, a média é{" "}
                                    <span className="text-foreground font-semibold">{avgComp}/5</span>
                                    {weakAreas.length > 0 ? (
                                      <>
                                        {" "}— áreas com atenção necessária:{" "}
                                        <span className="font-semibold text-rose">{weakAreas.join(", ")}</span>.
                                      </>
                                    ) : "."}
                                  </>
                                )}
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
                          );
                        })()}

                        <div className="grid grid-cols-3 gap-5">
                          <div className="rounded-2xl border border-border bg-background/40 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">Estatísticas de cards</h3>
                            <ul className="space-y-1.5 text-sm text-muted">
                              <li>• Cards diferentes estudados: <span className="font-semibold text-foreground">{detailedStats.cards.uniqueCards}</span></li>
                              <li>• Visualizações de cards: <span className="font-semibold text-foreground">{detailedStats.cards.cardViews}</span></li>
                              <li>• Viradas para ver resposta: <span className="font-semibold text-foreground">{detailedStats.cards.cardFlips}</span></li>
                              <li>• Avaliações de cards: <span className="font-semibold text-foreground">{detailedStats.cards.cardGrades}</span></li>
                              <li>• Marcados como fácil: <span className="font-semibold text-teal">{detailedStats.cards.cardEasy}</span></li>
                              <li>• Marcados como médio: <span className="font-semibold text-amber">{detailedStats.cards.cardMedium}</span></li>
                              <li>• Marcados como difícil: <span className="font-semibold text-rose">{detailedStats.cards.cardHard}</span></li>
                            </ul>
                          </div>
                          <div className="rounded-2xl border border-border bg-background/40 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">Estatísticas de simulados</h3>
                            <ul className="space-y-1.5 text-sm text-muted">
                              <li>• Simulados iniciados: <span className="font-semibold text-foreground">{selectedDetails.attempts.length}</span></li>
                              <li>• Simulados concluídos: <span className="font-semibold text-foreground">{detailedStats.simulados.finishedAttempts}</span></li>
                              <li>• Respostas totais: <span className="font-semibold text-foreground">{detailedStats.simulados.totalAnswers}</span></li>
                              <li>• Respostas corretas: <span className="font-semibold text-teal">{detailedStats.simulados.correctAnswers}</span></li>
                              <li>• Respostas erradas: <span className="font-semibold text-rose">{detailedStats.simulados.wrongAnswers}</span></li>
                              <li>• Taxa de acerto: <span className="font-semibold text-foreground">{detailedStats.simulados.accuracy}%</span></li>
                              <li>• Média de nota (finalizados): <span className="font-semibold text-foreground">{detailedStats.simulados.avgScoreFinished}%</span></li>
                            </ul>
                          </div>
                          {/* ── 3ª coluna: Autoavaliação de competências ── */}
                          {(() => {
                            const DOMAINS_CARD = [
                              { id: "farmacologia", label: "Farmacologia" },
                              { id: "via_aerea", label: "Via Aérea" },
                              { id: "anestesia_geral", label: "Anest. Geral" },
                              { id: "anestesia_regional", label: "Regional" },
                              { id: "hemodinamica", label: "Hemodinâmica" },
                              { id: "ventilacao", label: "Ventilação" },
                              { id: "emergencias", label: "Emergências" },
                              { id: "pediatria", label: "Pediatria" },
                            ];
                            const PROCS_CARD = [
                              { id: "iot_laringoscopia", label: "IOT laringoscopia direta", meta: 50 },
                              { id: "iot_video", label: "IOT videolaringoscopia", meta: 20 },
                              { id: "dsg_insercao", label: "Dispositivo supraglótico", meta: 30 },
                              { id: "cricotireoidostomia", label: "Cricotireoidostomia", meta: 5 },
                              { id: "raquianestesia", label: "Raquianestesia", meta: 50 },
                              { id: "peridural", label: "Anestesia peridural", meta: 30 },
                              { id: "peridural_cateter", label: "Cateter peridural", meta: 20 },
                              { id: "bloqueio_plexo", label: "Bloqueio plexo braquial", meta: 20 },
                              { id: "bloqueio_us", label: "Bloqueio periférico US", meta: 20 },
                              { id: "acesso_central", label: "Acesso venoso central", meta: 20 },
                              { id: "arteria_radial", label: "Cateter arterial radial", meta: 30 },
                              { id: "rcpbasica", label: "RCP básica (BLS)", meta: 1 },
                              { id: "rcpavancada", label: "RCP avançada (ACLS)", meta: 1 },
                              { id: "cardioversao", label: "Cardioversão elétrica", meta: 5 },
                              { id: "pediatria_inducao", label: "Indução inalatória pediátrica", meta: 20 },
                            ];
                            const snapshots = selectedDetails.assessmentSnapshots ?? [];
                            const procData = selectedDetails.procedureCounts;
                            const latestSnap = snapshots[0] ?? null;

                            if (!latestSnap && !procData) {
                              return (
                                <div className="rounded-2xl border border-border bg-background/40 p-5 flex flex-col gap-3">
                                  <h3 className="text-sm font-semibold text-foreground">Autoavaliação</h3>
                                  <p className="text-xs text-muted">Nenhuma autoavaliação registrada.</p>
                                </div>
                              );
                            }

                            const avgComp = latestSnap
                              ? (DOMAINS_CARD.map((d) => Number(latestSnap.ratings[d.id] ?? 1)).reduce((a, b) => a + b, 0) / DOMAINS_CARD.length).toFixed(1)
                              : null;
                            const weakDomains = latestSnap
                              ? DOMAINS_CARD.filter((d) => Number(latestSnap.ratings[d.id] ?? 1) <= 2)
                              : [];
                            const strongDomain = latestSnap
                              ? DOMAINS_CARD.reduce((best, d) =>
                                  Number(latestSnap.ratings[d.id] ?? 1) > Number(latestSnap.ratings[best.id] ?? 1) ? d : best
                                )
                              : null;

                            const procsCompleted = procData
                              ? PROCS_CARD.filter((p) => (procData.counts[p.id] ?? 0) >= p.meta).length
                              : null;
                            const procsTotal = PROCS_CARD.length;

                            return (
                              <div className="rounded-2xl border border-purple/30 bg-purple/5 p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-semibold text-foreground">Autoavaliação</h3>
                                  <span className="rounded-lg border border-purple/30 bg-purple/10 px-2 py-0.5 text-[10px] font-bold text-purple">
                                    {snapshots.length} avaliação{snapshots.length !== 1 ? "ões" : ""}
                                  </span>
                                </div>

                                {avgComp !== null && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-purple">{avgComp}<span className="text-sm font-normal text-muted">/5</span></span>
                                    <div className="text-xs text-muted">média de competências</div>
                                  </div>
                                )}

                                {/* Barras de competência coloridas por nível */}
                                {latestSnap && (
                                  <div className="space-y-1">
                                    {DOMAINS_CARD.map((d) => {
                                      const val = Number(latestSnap.ratings[d.id] ?? 1);
                                      const barColor = val >= 5 ? "#a78bfa" : val >= 4 ? "#2dd4bf" : val >= 3 ? "#facc15" : val >= 2 ? "#fb923c" : "#f87171";
                                      const isWeak = val <= 2;
                                      return (
                                        <div key={d.id} className={`flex items-center gap-2 ${isWeak ? "opacity-100" : "opacity-75"}`}>
                                          <span className={`w-[80px] shrink-0 text-[10px] truncate ${isWeak ? "text-rose font-semibold" : "text-muted"}`}>{d.label}</span>
                                          <div className="flex-1 h-1.5 rounded-full bg-background/40 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${(val / 5) * 100}%`, backgroundColor: barColor }} />
                                          </div>
                                          <span className="text-[10px] font-bold w-3" style={{ color: barColor }}>{val}</span>
                                          {isWeak && <span className="text-[9px] text-rose font-bold">!</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Áreas fracas em destaque */}
                                {weakDomains.length > 0 && (
                                  <div className="rounded-lg border border-rose/30 bg-rose/10 px-2.5 py-2">
                                    <p className="text-[10px] font-bold text-rose mb-1">⚠ Foco de ensino necessário:</p>
                                    {weakDomains.map((d) => (
                                      <p key={d.id} className="text-[10px] text-rose/80">• {d.label} (nota {latestSnap!.ratings[d.id] ?? 1}/5)</p>
                                    ))}
                                  </div>
                                )}

                                {/* Procedimentos */}
                                {procsCompleted !== null && (
                                  <div className="text-xs text-muted">
                                    Procedimentos concluídos:{" "}
                                    <span className={`font-semibold ${procsCompleted === procsTotal ? "text-teal" : "text-amber"}`}>
                                      {procsCompleted}/{procsTotal}
                                    </span>
                                  </div>
                                )}

                                {strongDomain && (
                                  <div className="text-xs text-muted">
                                    Ponto forte:{" "}
                                    <span className="font-semibold text-teal">{strongDomain.label} ({latestSnap!.ratings[strongDomain.id] ?? 1}/5)</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Timelines separadas */}
                        <div className="grid grid-cols-2 gap-5">
                          <div className="rounded-2xl border border-border bg-background/40 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">
                              Histórico de Cards (item a item)
                            </h3>
                            {(() => {
                              const cardTimeline = selectedDetails.events
                                .map((ev) => ({
                                  id: `card-${ev.id}`,
                                  when: ev.created_at,
                                  text: `${humanCardEvent(ev.event_type, ev.quality)} no ${humanItemLabel(ev.card_id, "Card")}${ev.quality !== null ? ` (qualidade ${ev.quality})` : ""}.`,
                                }))
                                .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
                                .slice(0, 80);

                              if (cardTimeline.length === 0) {
                                return <p className="text-xs text-muted">Nenhuma atividade de card registrada.</p>;
                              }

                              return (
                                <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                                  {cardTimeline.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-border bg-background/35 px-3 py-2">
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="rounded-md border border-teal/30 bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-teal">
                                          Card
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

                          <div className="rounded-2xl border border-border bg-background/40 p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">
                              Histórico de Simulados e Respostas
                            </h3>
                            {(() => {
                              const simTimeline = selectedDetails.attempts.map((a) => {
                                const score = Math.round(Number(a.score_percent ?? 0));
                                const scoreText = a.score_percent === null ? "ainda sem nota final" : `${score}%`;
                                const attemptAnswers = detailedStats.simulados.answersByAttempt.get(a.id) ?? {
                                  total: 0,
                                  correct: 0,
                                  wrong: 0,
                                };
                                return {
                                  id: `attempt-${a.id}`,
                                  when: a.created_at,
                                  badge: "Simulado",
                                  badgeClass: "border-blue/30 bg-blue/10 text-blue",
                                  text: `realizou simulado ${a.track} com resultado ${scoreText} em ${fmtSec(a.duration_sec)}. Respondeu ${attemptAnswers.total} questões (${attemptAnswers.correct} acertos e ${attemptAnswers.wrong} erros).`,
                                };
                              });
                              const answerTimeline = selectedDetails.answers.map((ans) => ({
                                id: `answer-${ans.id}`,
                                when: ans.answered_at,
                                badge: "Resposta",
                                badgeClass: ans.correct
                                  ? "border-teal/30 bg-teal/10 text-teal"
                                  : "border-rose/30 bg-rose/10 text-rose",
                                text: `respondeu ${humanItemLabel(ans.question_id, "Questão")} e marcou alternativa ${ans.selected} (${ans.correct ? "acertou" : "errou"}).`,
                              }));

                              const timeline = [...simTimeline, ...answerTimeline]
                                .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
                                .slice(0, 120);

                              if (timeline.length === 0) {
                                return <p className="text-xs text-muted">Nenhuma atividade de simulado/resposta registrada.</p>;
                              }

                              return (
                                <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
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
                                      <td className="py-1.5 text-[11px] text-muted">{humanItemLabel(ev.card_id, "Card")}</td>
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
                        {/* ── AUTOAVALIAÇÃO DETALHADA DO USUÁRIO (colapsável) ── */}
                        {(() => {
                          const DOMAINS_DEF = [
                            { id: "farmacologia", label: "Farmacologia", color: "#2dd4bf" },
                            { id: "via_aerea", label: "Via Aérea", color: "#60a5fa" },
                            { id: "anestesia_geral", label: "Anest. Geral", color: "#a78bfa" },
                            { id: "anestesia_regional", label: "Regional", color: "#f472b6" },
                            { id: "hemodinamica", label: "Hemodinâmica", color: "#fb923c" },
                            { id: "ventilacao", label: "Ventilação", color: "#facc15" },
                            { id: "emergencias", label: "Emergências", color: "#f87171" },
                            { id: "pediatria", label: "Pediatria", color: "#34d399" },
                          ];
                          const PROCS_DEF = [
                            { id: "iot_laringoscopia", label: "IOT laringoscopia direta", meta: 50 },
                            { id: "iot_video", label: "IOT videolaringoscopia", meta: 20 },
                            { id: "dsg_insercao", label: "Dispositivo supraglótico", meta: 30 },
                            { id: "cricotireoidostomia", label: "Cricotireoidostomia", meta: 5 },
                            { id: "raquianestesia", label: "Raquianestesia", meta: 50 },
                            { id: "peridural", label: "Anestesia peridural", meta: 30 },
                            { id: "peridural_cateter", label: "Cateter peridural", meta: 20 },
                            { id: "bloqueio_plexo", label: "Bloqueio plexo braquial", meta: 20 },
                            { id: "bloqueio_us", label: "Bloqueio periférico US", meta: 20 },
                            { id: "acesso_central", label: "Acesso venoso central", meta: 20 },
                            { id: "arteria_radial", label: "Cateter arterial radial", meta: 30 },
                            { id: "rcpbasica", label: "RCP básica (BLS)", meta: 1 },
                            { id: "rcpavancada", label: "RCP avançada (ACLS)", meta: 1 },
                            { id: "cardioversao", label: "Cardioversão elétrica", meta: 5 },
                            { id: "pediatria_inducao", label: "Indução inalatória pediátrica", meta: 20 },
                          ];
                          const RATING_LABELS_U: Record<number, string> = {
                            1: "Sem experiência", 2: "Teórico", 3: "Supervisionado", 4: "Autônomo", 5: "Referência",
                          };
                          const snapshots = selectedDetails.assessmentSnapshots ?? [];
                          const procData = selectedDetails.procedureCounts;
                          const hasAny = snapshots.length > 0 || procData !== null;
                          const rColor = (v: number) => {
                            if (v >= 5) return "#a78bfa";
                            if (v >= 4) return "#2dd4bf";
                            if (v >= 3) return "#facc15";
                            if (v >= 2) return "#fb923c";
                            return "#f87171";
                          };

                          return (
                            <details className="group rounded-2xl border border-border bg-background/40 overflow-hidden">
                              <summary className="flex cursor-pointer items-center justify-between p-5 hover:bg-background/20 transition select-none">
                                <h3 className="text-sm font-semibold text-foreground">Autoavaliação — detalhe completo</h3>
                                <div className="flex items-center gap-2">
                                  {snapshots.length > 0 && (
                                    <span className="rounded-lg border border-purple/30 bg-purple/10 px-2 py-0.5 text-xs text-purple">
                                      {snapshots.length} avaliação{snapshots.length !== 1 ? "ões" : ""}
                                    </span>
                                  )}
                                  <span className="text-muted text-xs group-open:rotate-180 transition-transform">▼</span>
                                </div>
                              </summary>
                            <div className="px-5 pb-5 space-y-4">
                              {!hasAny ? (
                                <p className="text-xs text-muted">Nenhuma autoavaliação registrada ainda.</p>
                              ) : (
                                <>
                                  {/* Última avaliação de competências — mostra botões clicados */}
                                  {snapshots.length > 0 && (() => {
                                    const latest = snapshots[0];
                                    const me = latest.me;
                                    const avg = (
                                      DOMAINS_DEF.map((d) => Number(latest.ratings[d.id] ?? 1))
                                        .reduce((a, b) => a + b, 0) / DOMAINS_DEF.length
                                    ).toFixed(1);
                                    return (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs text-muted">
                                            Última avaliação:{" "}
                                            <span className="text-foreground font-medium">
                                              {new Date(latest.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          </p>
                                          {me && (
                                            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${TRACK_STYLE[me as Track] ?? "border-border text-muted"}`}>
                                              {me}
                                            </span>
                                          )}
                                          <span className="ml-auto rounded-lg border border-purple/30 bg-purple/10 px-2 py-0.5 text-xs font-bold text-purple">
                                            Média: {avg}/5
                                          </span>
                                        </div>
                                        {/* Grid de competências com botões visuais */}
                                        <div className="grid grid-cols-2 gap-2">
                                          {DOMAINS_DEF.map((d) => {
                                            const val = Number(latest.ratings[d.id] ?? 1);
                                            return (
                                              <div key={d.id} className="rounded-xl border border-border bg-background/35 px-3 py-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                  <p className="text-xs font-medium text-foreground">{d.label}</p>
                                                  <span className="text-xs font-bold" style={{ color: d.color }}>{val}/5</span>
                                                </div>
                                                {/* Botões 1-5 mostrando qual foi clicado */}
                                                <div className="flex gap-1">
                                                  {[1, 2, 3, 4, 5].map((r) => (
                                                    <div
                                                      key={r}
                                                      className="flex-1 rounded-lg py-1 text-center text-[10px] font-bold transition"
                                                      style={
                                                        val === r
                                                          ? { backgroundColor: d.color, color: "#0f172a" }
                                                          : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }
                                                      }
                                                    >
                                                      {r}
                                                    </div>
                                                  ))}
                                                </div>
                                                <p className="mt-1 text-[10px] text-muted">{RATING_LABELS_U[val]}</p>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Histórico de avaliações anteriores */}
                                        {snapshots.length > 1 && (
                                          <details className="group">
                                            <summary className="cursor-pointer text-xs text-muted hover:text-foreground transition">
                                              Ver histórico ({snapshots.length - 1} avaliação{snapshots.length - 1 !== 1 ? "ões" : ""} anterior{snapshots.length - 1 !== 1 ? "es" : ""})
                                            </summary>
                                            <div className="mt-2 space-y-2 max-h-60 overflow-auto">
                                              {snapshots.slice(1).map((snap) => {
                                                const snapAvg = (
                                                  DOMAINS_DEF.map((d) => Number(snap.ratings[d.id] ?? 1))
                                                    .reduce((a, b) => a + b, 0) / DOMAINS_DEF.length
                                                ).toFixed(1);
                                                return (
                                                  <div key={snap.id} className="rounded-xl border border-border bg-background/20 px-3 py-2">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                      <span className="text-[11px] text-muted">
                                                        {new Date(snap.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                                        {snap.me && <span className="ml-1 font-bold" style={{ color: "#2dd4bf" }}>{snap.me}</span>}
                                                      </span>
                                                      <span className="text-[11px] font-bold text-purple">Média: {snapAvg}/5</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                      {DOMAINS_DEF.map((d) => {
                                                        const v = Number(snap.ratings[d.id] ?? 1);
                                                        return (
                                                          <div key={d.id} className="text-center">
                                                            <p className="text-[9px] text-muted truncate">{d.label}</p>
                                                            <p className="text-xs font-bold" style={{ color: rColor(v) }}>{v}</p>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </details>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Procedimentos realizados */}
                                  {procData && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold text-foreground border-t border-border pt-3">Procedimentos realizados</p>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {PROCS_DEF.map((proc) => {
                                          const count = (procData.counts[proc.id] ?? 0) as number;
                                          const pct = Math.min(100, Math.round((count / proc.meta) * 100));
                                          const barColor = pct >= 100 ? "#2dd4bf" : pct >= 50 ? "#60a5fa" : count > 0 ? "#fb923c" : "rgba(255,255,255,0.1)";
                                          return (
                                            <div key={proc.id} className="rounded-lg border border-border bg-background/25 px-2.5 py-1.5">
                                              <div className="flex items-center justify-between mb-1">
                                                <p className="text-[10px] text-muted leading-tight truncate">{proc.label}</p>
                                                <span className={`text-[10px] font-bold ml-1 shrink-0 ${pct >= 100 ? "text-teal" : count > 0 ? "text-amber" : "text-muted"}`}>
                                                  {count}/{proc.meta}
                                                  {pct >= 100 ? " ✓" : ""}
                                                </span>
                                              </div>
                                              <div className="h-1 rounded-full bg-background/40 overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            </details>
                          );
                        })()}
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

          {/* ── DUPLICADOS ── */}
          {tab === "duplicados" && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Conteúdo duplicado</h2>
                <button
                  type="button"
                  onClick={() => { setDupCards(null); setDupSimulados(null); setSelectedDupIds([]); setDupDeleteStatus(null); }}
                  className="rounded-xl border border-border bg-background/35 px-4 py-2 text-xs font-medium text-muted hover:text-foreground transition"
                >
                  ↺ Atualizar dados
                </button>
              </div>

              {/* Subtabs: Cards / Simulados */}
              <div className="flex gap-2">
                {(["simulados", "cards"] as const).map((k) => (
                  <button key={k} type="button"
                    onClick={() => { setDupKind(k); setSelectedDupIds([]); }}
                    className={`rounded-xl border px-4 py-2 text-xs font-medium transition capitalize ${
                      dupKind === k
                        ? k === "simulados" ? "border-blue/40 bg-blue/15 text-blue" : "border-teal/40 bg-teal/15 text-teal"
                        : "border-border bg-background/35 text-muted hover:text-foreground"
                    }`}
                  >
                    {k === "simulados" ? "Simulados" : "Cards"}
                  </button>
                ))}
              </div>

              {dupLoading ? (
                <div className="rounded-2xl border border-border bg-background/40 p-10 text-center">
                  <p className="text-sm text-muted">Carregando conteúdo...</p>
                </div>
              ) : (() => {
                // Domain definitions (same as avaliacao/page.tsx)
                // ── Helpers de normalização para detecção de duplicados ──
                function normDup(s: string) {
                  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
                }

                const allCards = dupCards ?? [];
                const allSims = dupSimulados ?? [];

                // Agrupar cards duplicados por (frente + verso)
                const cardGroups = new Map<string, typeof allCards>();
                for (const c of allCards) {
                  const key = normDup(c.frente) + "||" + normDup(c.verso);
                  if (!cardGroups.has(key)) cardGroups.set(key, []);
                  cardGroups.get(key)!.push(c);
                }
                const dupCardGroups = Array.from(cardGroups.values()).filter((g) => g.length > 1);

                // Agrupar simulados duplicados por (enunciado + alternativaA + correta)
                const simGroups = new Map<string, typeof allSims>();
                for (const s of allSims) {
                  const key = normDup(s.enunciado) + "||" + normDup(s.alternativaA) + "||" + normDup(s.correta);
                  if (!simGroups.has(key)) simGroups.set(key, []);
                  simGroups.get(key)!.push(s);
                }
                const dupSimGroups = Array.from(simGroups.values()).filter((g) => g.length > 1);

                const groups = dupKind === "cards" ? dupCardGroups : dupSimGroups;
                const totalDupItems = groups.reduce((acc, g) => acc + g.length - 1, 0); // extras a remover

                return (
                  <>
                    {/* Resumo */}
                    <div className="rounded-2xl border border-border bg-background/40 p-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <p className="text-xs text-muted">Total de {dupKind === "cards" ? "cards" : "simulados"}</p>
                          <p className="text-2xl font-bold text-foreground">{dupKind === "cards" ? allCards.length : allSims.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">Grupos com duplicatas</p>
                          <p className={`text-2xl font-bold ${groups.length > 0 ? "text-rose" : "text-teal"}`}>{groups.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">Itens extras (removíveis)</p>
                          <p className={`text-2xl font-bold ${totalDupItems > 0 ? "text-amber" : "text-teal"}`}>{totalDupItems}</p>
                        </div>
                        {groups.length === 0 && (
                          <p className="ml-auto text-sm text-teal font-medium">✓ Sem duplicatas encontradas</p>
                        )}
                      </div>
                    </div>

                    {/* Lista de grupos duplicados */}
                    {groups.length > 0 && (
                      <>
                        <div className="flex items-center gap-3">
                          <button type="button"
                            onClick={() => setSelectedDupIds(groups.flatMap((g) => g.slice(1).map((i) => i.id)))}
                            className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs font-medium text-rose hover:opacity-90 transition"
                          >
                            Selecionar todos os extras ({totalDupItems})
                          </button>
                          <button type="button"
                            onClick={() => setSelectedDupIds([])}
                            className="rounded-xl border border-border bg-background/35 px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition"
                          >
                            Limpar seleção
                          </button>
                          {selectedDupIds.length > 0 && (
                            <button type="button"
                              onClick={async () => {
                                if (!window.confirm(`Excluir ${selectedDupIds.length} item(ns) duplicado(s)?`)) return;
                                setDupDeleteStatus("Excluindo...");
                                try {
                                  const { createClient: mkClient } = await import("@supabase/supabase-js");
                                  const sc = mkClient(
                                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                                  );
                                  const table = dupKind === "cards" ? "flashcards" : "simulados";
                                  const { error } = await sc.from(table).delete().in("id", selectedDupIds);
                                  if (error) throw new Error(error.message);
                                  setDupDeleteStatus(`${selectedDupIds.length} item(ns) excluído(s) com sucesso.`);
                                  setSelectedDupIds([]);
                                  setDupCards(null);
                                  setDupSimulados(null);
                                } catch (err: unknown) {
                                  setDupDeleteStatus(`Erro: ${err instanceof Error ? err.message : "desconhecido"}`);
                                }
                              }}
                              className="ml-auto rounded-xl border border-rose/40 bg-rose/15 px-4 py-2 text-xs font-bold text-rose hover:opacity-90 transition"
                            >
                              Excluir selecionados ({selectedDupIds.length})
                            </button>
                          )}
                        </div>

                        {dupDeleteStatus && (
                          <p className={`text-sm ${dupDeleteStatus.startsWith("Erro") ? "text-rose" : "text-teal"}`}>
                            {dupDeleteStatus}
                          </p>
                        )}

                        <div className="space-y-3">
                          {groups.map((group, gi) => {
                            const original = group[0];
                            const extras = group.slice(1);
                            return (
                              <div key={gi} className="rounded-2xl border border-rose/25 bg-background/40 p-4 space-y-3">
                                {/* Original (manter) */}
                                <div className="rounded-xl border border-teal/30 bg-teal/5 px-3 py-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="rounded-md border border-teal/30 bg-teal/10 px-1.5 py-0.5 text-[10px] font-bold text-teal">MANTER</span>
                                    <span className="text-[10px] text-muted font-mono">{shortCardId(original.id)}</span>
                                    {original.me && (
                                      <span className={`rounded border px-1 text-[10px] font-bold ${TRACK_STYLE[original.me as Track] ?? "border-border text-muted"}`}>{original.me}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                                    {dupKind === "cards"
                                      ? (original as RemoteCard).frente
                                      : (original as RemoteSimulado).enunciado}
                                  </p>
                                </div>

                                {/* Extras (remover) */}
                                {extras.map((item) => {
                                  const checked = selectedDupIds.includes(item.id);
                                  return (
                                    <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-rose/25 bg-rose/5 px-3 py-2">
                                      <input type="checkbox" checked={checked}
                                        onChange={(e) => setSelectedDupIds((prev) =>
                                          e.target.checked ? [...prev, item.id] : prev.filter((x) => x !== item.id)
                                        )}
                                        className="mt-0.5 accent-rose-500"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="rounded-md border border-rose/30 bg-rose/10 px-1.5 py-0.5 text-[10px] font-bold text-rose">DUPLICATA</span>
                                          <span className="text-[10px] text-muted font-mono">{shortCardId(item.id)}</span>
                                          {item.me && (
                                            <span className={`rounded border px-1 text-[10px] font-bold ${TRACK_STYLE[item.me as Track] ?? "border-border text-muted"}`}>{item.me}</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted leading-relaxed line-clamp-2">
                                          {dupKind === "cards"
                                            ? (item as RemoteCard).frente
                                            : (item as RemoteSimulado).enunciado}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── CONTENT ── */}
          {tab === "content" && (
            <div className="space-y-5 max-w-4xl">
              <h2 className="text-xl font-bold text-foreground">Gerenciar Conteúdo</h2>

              <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-5">
                <p className="text-sm text-muted">
                  Use em dois passos simples: <strong className="text-foreground">1) baixar</strong> os arquivos que você quer usar,
                  depois <strong className="text-foreground">2) enviar para o app</strong> para publicar para todos os usuários.
                </p>

                {/* PASSO 1 */}
                <div className="rounded-xl border border-blue/20 bg-blue/5 px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue">Passo 1 — Baixar conteúdo</p>
                  <p className="text-xs text-muted">
                    Se você quer pegar os arquivos para guardar/editar, use a aba <strong className="text-foreground">Exportar</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("export")}
                    className="inline-flex items-center justify-center rounded-xl border border-blue/30 bg-blue/15 px-4 py-2 text-xs font-medium text-blue transition hover:opacity-90"
                  >
                    Ir para Exportar (baixar arquivos)
                  </button>
                </div>

                {/* PASSO 2 */}
                <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal">Passo 2 — Enviar conteúdo para o app</p>
                  <p className="text-xs text-muted">
                    Escolha o tipo de conteúdo e envie os arquivos direto aqui no admin. Ao concluir, o conteúdo já fica publicado no app.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmbeddedImportMode("flashcards");
                        setShowEmbeddedImporter(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal/40 bg-teal/20 px-4 py-2.5 text-sm font-medium text-teal transition hover:opacity-90"
                    >
                      Enviar Cards para o app
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmbeddedImportMode("simulados");
                        setShowEmbeddedImporter(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue/40 bg-blue/20 px-4 py-2.5 text-sm font-medium text-blue transition hover:opacity-90"
                    >
                      Enviar Simulados para o app
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmbeddedImportMode("all");
                        setShowEmbeddedImporter(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple/40 bg-purple/20 px-4 py-2.5 text-sm font-medium text-purple transition hover:opacity-90"
                    >
                      Enviar Lote para o app
                    </button>
                  </div>
                </div>

                <a
                  href="/importar"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/35 px-4 py-2 text-xs font-medium text-muted transition hover:text-foreground"
                >
                  Abrir gerenciador completo (modo avançado) →
                </a>
              </div>

              {showEmbeddedImporter ? (
                <div className="rounded-2xl border border-border bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Importador embutido no Admin ({embeddedImportMode === "flashcards"
                        ? "Cards"
                        : embeddedImportMode === "simulados"
                          ? "Simulados"
                          : "Lote"})
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEmbeddedImporter(false)}
                      className="rounded-lg border border-border bg-background/35 px-3 py-1 text-xs text-muted hover:text-foreground"
                    >
                      Fechar
                    </button>
                  </div>
                  <iframe
                    src={`/importar?embedded=1&mode=${embeddedImportMode}`}
                    title="Importador embutido"
                    className="h-[980px] w-full rounded-xl border border-border bg-background"
                  />
                </div>
              ) : null}

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
              <div className="rounded-2xl border border-border bg-background/40 p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground">O que você quer fazer agora?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport("backup", "json")}
                    className="rounded-xl border border-teal/35 bg-teal/15 px-4 py-3 text-sm font-medium text-teal transition hover:opacity-90"
                  >
                    1) Quero baixar todos os arquivos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("content")}
                    className="rounded-xl border border-blue/35 bg-blue/15 px-4 py-3 text-sm font-medium text-blue transition hover:opacity-90"
                  >
                    2) Quero enviar conteúdo para o app
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Dica: se você vai apenas guardar backup, clique em <strong className="text-foreground">baixar</strong>.
                  Se quer publicar conteúdo novo no app, vá em <strong className="text-foreground">enviar conteúdo para o app</strong>.
                </p>
              </div>

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
                <h3 className="mb-2 text-sm font-semibold text-foreground">Como usar sem dúvida</h3>
                <ol className="space-y-1 text-sm text-muted list-decimal list-inside">
                  <li>Para guardar backup: clique em <strong className="text-foreground">Quero baixar todos os arquivos</strong>.</li>
                  <li>Para publicar conteúdo novo no app: vá para a aba <strong className="text-foreground">Conteúdo</strong>.</li>
                  <li>Na aba Conteúdo, clique em <strong className="text-foreground">Enviar Cards/Simulados/Lote para o app</strong>.</li>
                  <li>Quando finalizar o envio, o conteúdo já aparece para os usuários automaticamente.</li>
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

          {/* Revisar Cards tab */}
          {tab === "revisar" && (
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Revisar Cards</h2>
                <button
                  type="button"
                  onClick={() => void handleLoadRevisarCards()}
                  disabled={revisarLoading}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm transition hover:bg-muted disabled:opacity-50"
                >
                  {revisarLoading ? "Carregando..." : revisarCards ? "Recarregar" : "Carregar Cards"}
                </button>
              </div>
              {revisarError && <p className="text-sm text-rose">{revisarError}</p>}
              {revisarCards && (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Buscar frente/verso..."
                      value={revisarSearch}
                      onChange={(e) => { setRevisarSearch(e.target.value); setRevisarPage(0); }}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={revisarTrack}
                      onChange={(e) => { setRevisarTrack(e.target.value as Track | ""); setRevisarPage(0); }}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Todos os módulos</option>
                      {(["ME1", "ME2", "ME3"] as Track[]).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">{revisarFiltered.length} cards • Página {revisarPage + 1}/{Math.max(1, Math.ceil(revisarFiltered.length / REVISAR_PAGE_SIZE))}</p>
                  <div className="flex flex-col gap-2">
                    {revisarPageCards.map((card) => (
                      <div key={card.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">[{card.me}]</p>
                          <p className="text-sm font-medium line-clamp-2">{card.frente}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.verso}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(card)}
                          className="shrink-0 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button type="button" disabled={revisarPage === 0} onClick={() => setRevisarPage((p) => p - 1)} className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40">← Anterior</button>
                    <button type="button" disabled={(revisarPage + 1) * REVISAR_PAGE_SIZE >= revisarFiltered.length} onClick={() => setRevisarPage((p) => p + 1)} className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40">Próximo →</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edit modal */}
          {editingCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl flex flex-col gap-4">
                <h3 className="font-semibold">Editar Card</h3>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Frente</label>
                  <textarea value={editFrente} onChange={(e) => setEditFrente(e.target.value)} rows={4} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm resize-y" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Verso</label>
                  <textarea value={editVerso} onChange={(e) => setEditVerso(e.target.value)} rows={6} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm resize-y" />
                </div>
                {saveSuccess && <p className="text-sm text-green-500">Salvo com sucesso!</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditingCard(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
                  <button type="button" onClick={() => void handleSaveCard()} disabled={savingCard} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {savingCard ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
