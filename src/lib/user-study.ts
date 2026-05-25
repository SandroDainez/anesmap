import type { FlashcardProgress, StudyTrack } from "@/lib/study-data";
import { STORAGE_KEYS, getDefaultFlashcardProgress } from "@/lib/study-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  name: string | null;
  role: "student" | "admin";
  nivel?: string;
  status?: "pending" | "active" | "blocked";
  weekly_goal_minutes: number;
  assigned_track_cards: "ME1" | "ME2" | "ME3" | "ALL";
  assigned_track_simulados: "ME1" | "ME2" | "ME3" | "ALL";
  assigned_track: "ME1" | "ME2" | "ME3" | "ALL";
  created_at: string;
};

export type SimuladoAttempt = {
  id: string;
  user_id: string;
  track: StudyTrack;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  score_percent: number | null;
  created_at: string;
};

export type SimuladoAnswer = {
  id: string;
  attempt_id: string;
  user_id: string;
  question_id: string;
  selected: "A" | "B" | "C" | "D" | "E";
  correct: boolean;
  answered_at: string;
};

function browserSupabase() {
  return createSupabaseBrowserClient();
}

function isMissingTrackColumnsError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code !== "42703") return false;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("assigned_track_cards") || msg.includes("assigned_track_simulados");
}

export async function getCurrentAuthUser() {
  const supabase = browserSupabase();
  if (!supabase) return null;
  // getSession reads from local cache (no network) – fast and reliable
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function loadMyProfile(): Promise<UserProfile | null> {
  const supabase = browserSupabase();
  if (!supabase) {
    console.warn("[loadMyProfile] Supabase client is null – env vars missing?");
    return null;
  }
  const user = await getCurrentAuthUser();
  if (!user) {
    console.warn("[loadMyProfile] No authenticated user in session");
    return null;
  }
  let { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, role, nivel, weekly_goal_minutes, assigned_track, assigned_track_cards, assigned_track_simulados, created_at",
    )
    .eq("id", user.id)
    .single();

  // Backward compatibility: DB may still have only `assigned_track`.
  if (isMissingTrackColumnsError(error)) {
    const legacyRes = await supabase
      .from("profiles")
      .select("id, name, role, nivel, weekly_goal_minutes, assigned_track, created_at")
      .eq("id", user.id)
      .single();
    data = legacyRes.data as typeof data;
    error = legacyRes.error;
  }

  if (error) {
    console.error("[loadMyProfile] profiles query error:", error.code, error.message);
    return null;
  }
  if (!data) {
    console.warn("[loadMyProfile] profiles query returned no data for user:", user.id);
    return null;
  }
  return {
    ...(data as UserProfile),
    assigned_track_cards:
      ((data as UserProfile).assigned_track_cards ??
        (data as UserProfile).assigned_track ??
        "ALL") as UserProfile["assigned_track_cards"],
    assigned_track_simulados:
      ((data as UserProfile).assigned_track_simulados ??
        (data as UserProfile).assigned_track ??
        "ALL") as UserProfile["assigned_track_simulados"],
    assigned_track:
      ((data as UserProfile).assigned_track ??
        (data as UserProfile).assigned_track_cards ??
        (data as UserProfile).assigned_track_simulados ??
        "ALL") as UserProfile["assigned_track"],
  };
}

export async function updateWeeklyGoal(minutes: number): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const user = await getCurrentAuthUser();
  if (!user) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ weekly_goal_minutes: Math.max(30, Math.min(6000, Math.round(minutes))) })
    .eq("id", user.id);
  return !error;
}

export async function loadFlashcardProgressRemoteByUser(): Promise<Record<string, FlashcardProgress> | null> {
  const supabase = browserSupabase();
  if (!supabase) return null;
  const user = await getCurrentAuthUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("flashcard_progress")
    .select("card_id, ease_factor, repetitions, interval_days, next_review_at, last_quality")
    .eq("user_id", user.id); // always filter by user — defence in depth against RLS gaps
  if (error || !data) return null;
  const map: Record<string, FlashcardProgress> = {};
  for (const item of data) {
    map[item.card_id] = {
      easeFactor: Number(item.ease_factor ?? 2.5),
      repetitions: Number(item.repetitions ?? 0),
      intervalDays: Number(item.interval_days ?? 0),
      nextReviewAt: item.next_review_at ?? new Date().toISOString(),
      lastQuality: Number(item.last_quality ?? 0),
    };
  }
  return map;
}

export async function upsertFlashcardProgressRemote(progress: Record<string, FlashcardProgress>) {
  const supabase = browserSupabase();
  if (!supabase) return;
  const user = await getCurrentAuthUser();
  if (!user) return;
  const payload = Object.entries(progress).map(([cardId, item]) => ({
    user_id: user.id,
    card_id: cardId,
    ease_factor: item.easeFactor,
    repetitions: item.repetitions,
    interval_days: item.intervalDays,
    next_review_at: item.nextReviewAt,
    last_quality: item.lastQuality,
    updated_at: new Date().toISOString(),
  }));
  if (payload.length === 0) return;
  const { error } = await supabase.from("flashcard_progress").upsert(payload, {
    onConflict: "user_id,card_id",
  });
  if (error) throw new Error(error.message);
}

export async function addFlashcardEvent(params: {
  cardId: string;
  eventType: "view" | "flip" | "grade";
  quality?: number;
}) {
  const supabase = browserSupabase();
  if (!supabase) return;
  const user = await getCurrentAuthUser();
  if (!user) return;
  const { error } = await supabase.from("flashcard_events").insert({
    user_id: user.id,
    card_id: params.cardId,
    event_type: params.eventType,
    quality: params.quality ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function startStudySession(kind: "flashcards" | "simulados") {
  const supabase = browserSupabase();
  if (!supabase) return null;
  const user = await getCurrentAuthUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ user_id: user.id, kind, started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

export async function endStudySession(sessionId: string, startedAt: Date) {
  const supabase = browserSupabase();
  if (!supabase) return;
  const durationSec = Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000));
  await supabase
    .from("study_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_sec: durationSec,
    })
    .eq("id", sessionId);
}

export async function startSimuladoAttempt(track: StudyTrack) {
  const supabase = browserSupabase();
  if (!supabase) return null;
  const user = await getCurrentAuthUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("simulado_attempts")
    .insert({
      user_id: user.id,
      track,
      started_at: new Date().toISOString(),
    })
    .select("id, started_at")
    .single();
  if (error || !data) return null;
  return { attemptId: data.id as string, startedAt: new Date(data.started_at as string) };
}

export async function recordSimuladoAnswer(params: {
  attemptId: string;
  questionId: string;
  selected: "A" | "B" | "C" | "D" | "E";
  correct: boolean;
}) {
  const supabase = browserSupabase();
  if (!supabase) return;
  const user = await getCurrentAuthUser();
  if (!user) return;
  const { error } = await supabase.from("simulado_answers").upsert(
    {
      attempt_id: params.attemptId,
      user_id: user.id,
      question_id: params.questionId,
      selected: params.selected,
      correct: params.correct,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,question_id" },
  );
  if (error) throw new Error(error.message);
}

export async function finishSimuladoAttempt(params: {
  attemptId: string;
  startedAt: Date;
  scorePercent: number;
}) {
  const supabase = browserSupabase();
  if (!supabase) return;
  const durationSec = Math.max(0, Math.round((Date.now() - params.startedAt.getTime()) / 1000));
  const { error } = await supabase
    .from("simulado_attempts")
    .update({
      ended_at: new Date().toISOString(),
      duration_sec: durationSec,
      score_percent: params.scorePercent,
    })
    .eq("id", params.attemptId);
  if (error) throw new Error(error.message);
}

export async function loadMyDashboardMetrics() {
  // allSettled: a single failure (e.g. RLS hiccup) never blanks the whole dashboard
  const [profileRes, progressRes, eventsRes, attemptsRes] = await Promise.allSettled([
    loadMyProfile(),
    loadFlashcardProgressRemoteByUser(),
    loadMyFlashcardEventsCount(),
    loadMySimuladoAttempts(),
  ]);
  const profile     = profileRes.status  === "fulfilled" ? profileRes.value   : null;
  const progressMap = progressRes.status === "fulfilled" ? progressRes.value  : null;
  const cardEvents  = eventsRes.status   === "fulfilled" ? eventsRes.value    : 0;
  const attempts    = attemptsRes.status === "fulfilled" ? attemptsRes.value  : [];

  const progressEntries = Object.values(progressMap ?? {});
  const reviewed = progressEntries.filter((item) => item.repetitions > 0).length;
  const mastered = progressEntries.filter((item) => item.repetitions >= 3).length;
  const retention = reviewed > 0 ? Math.round((mastered / reviewed) * 100) : 0;

  const thisWeekMinutes = attempts.reduce((acc, item) => acc + Math.round((item.duration_sec ?? 0) / 60), 0);
  const goal = profile?.weekly_goal_minutes ?? 300;
  const goalProgress = goal > 0 ? Math.min(100, Math.round((thisWeekMinutes / goal) * 100)) : 0;

  return {
    profile,
    reviewed,
    mastered,
    retention,
    cardEvents,
    attemptsCount: attempts.length,
    thisWeekMinutes,
    goal,
    goalProgress,
  };
}

async function loadMyFlashcardEventsCount() {
  const supabase = browserSupabase();
  if (!supabase) return 0;
  const user = await getCurrentAuthUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("flashcard_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}

export async function loadMySimuladoAttempts() {
  const supabase = browserSupabase();
  if (!supabase) return [];
  const user = await getCurrentAuthUser();
  if (!user) return [];
  // Start of current ISO week (Monday 00:00:00 UTC)
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("simulado_attempts")
    .select("id, user_id, track, started_at, ended_at, duration_sec, score_percent, created_at")
    .eq("user_id", user.id)
    .gte("created_at", monday.toISOString())
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as SimuladoAttempt[];
}

export async function loadAdminOverview() {
  const supabase = browserSupabase();
  if (!supabase) {
    return {
      totalUsers: 0,
      totalSessions: 0,
      totalCardEvents: 0,
      totalAttempts: 0,
    };
  }
  const [usersRes, sessionsRes, eventsRes, attemptsRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("study_sessions").select("id", { count: "exact", head: true }),
    supabase.from("flashcard_events").select("id", { count: "exact", head: true }),
    supabase.from("simulado_attempts").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: usersRes.count ?? 0,
    totalSessions: sessionsRes.count ?? 0,
    totalCardEvents: eventsRes.count ?? 0,
    totalAttempts: attemptsRes.count ?? 0,
  };
}

export async function loadAdminUsers() {
  const supabase = browserSupabase();
  if (!supabase) return [];
  let { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, role, status, weekly_goal_minutes, assigned_track, assigned_track_cards, assigned_track_simulados, created_at",
    )
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (isMissingTrackColumnsError(error)) {
    const legacyRes = await supabase
      .from("profiles")
      .select("id, name, role, status, weekly_goal_minutes, assigned_track, created_at")
      .neq("status", "pending")
      .order("created_at", { ascending: false });
    data = legacyRes.data as typeof data;
    error = legacyRes.error;
  }

  if (error || !data) return [];
  return (data as UserProfile[]).map((item) => ({
    ...item,
    assigned_track_cards: (item.assigned_track_cards ?? item.assigned_track ?? "ALL") as UserProfile["assigned_track_cards"],
    assigned_track_simulados: (item.assigned_track_simulados ?? item.assigned_track ?? "ALL") as UserProfile["assigned_track_simulados"],
    assigned_track: (item.assigned_track ?? item.assigned_track_cards ?? item.assigned_track_simulados ?? "ALL") as UserProfile["assigned_track"],
  }));
}

export type PendingUser = {
  id: string;
  name: string | null;
  email?: string;
  created_at: string;
};

export async function loadPendingUsers(): Promise<PendingUser[]> {
  const supabase = browserSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as PendingUser[];
}

export async function updateUserTrack(
  userId: string,
  track: string,
  kind: "cards" | "simulados" | "all" = "all",
): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const payload =
    kind === "cards"
      ? { assigned_track_cards: track }
      : kind === "simulados"
        ? { assigned_track_simulados: track }
        : { assigned_track: track, assigned_track_cards: track, assigned_track_simulados: track };
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (isMissingTrackColumnsError(error)) {
    const { error: legacyError } = await supabase
      .from("profiles")
      .update({ assigned_track: track })
      .eq("id", userId);
    return !legacyError;
  }

  return !error;
}

export async function updateUserRole(userId: string, role: "student" | "admin"): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  return !error;
}

export async function loadAdminUserDetails(userId: string) {
  const supabase = browserSupabase();
  if (!supabase) {
    return {
      profile: null,
      events: [],
      progress: [],
      attempts: [],
      answers: [],
      assessmentSnapshots: [],
      procedureCounts: null,
      simSessoes: [],
      simUso: [],
    };
  }
  let [profileRes, eventsRes, progressRes, attemptsRes, answersRes, snapshotsRes, proceduresRes, simSessoesRes, simUsoRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, role, weekly_goal_minutes, assigned_track, assigned_track_cards, assigned_track_simulados, created_at",
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("flashcard_events")
      .select("id, card_id, event_type, quality, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("flashcard_progress")
      .select("card_id, repetitions, interval_days, next_review_at, last_quality")
      .eq("user_id", userId),
    supabase
      .from("simulado_attempts")
      .select("id, user_id, track, started_at, ended_at, duration_sec, score_percent, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("simulado_answers")
      .select("id, attempt_id, question_id, selected, correct, answered_at")
      .eq("user_id", userId)
      .order("answered_at", { ascending: false })
      .limit(500),
    supabase
      .from("self_assessment_snapshots")
      .select("id, created_at, ratings, me")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("procedure_counts")
      .select("counts, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("simulacao_sessoes")
      .select("id, caso_id, caso_titulo, status, desfecho, pontuacao_final, iniciada_em, concluida_em")
      .eq("usuario_id", userId)
      .order("iniciada_em", { ascending: false })
      .limit(50),
    supabase
      .from("uso_simulacao")
      .select("mes_ano, quantidade, ultima_simulacao")
      .eq("usuario_id", userId)
      .order("mes_ano", { ascending: false })
      .limit(12),
  ]);

  if (isMissingTrackColumnsError(profileRes.error as { code?: string; message?: string })) {
    const legacyProfileRes = await supabase
      .from("profiles")
      .select("id, name, role, weekly_goal_minutes, assigned_track, created_at")
      .eq("id", userId)
      .single();
    profileRes = legacyProfileRes as typeof profileRes;
  }

  return {
    profile: profileRes.data
      ? ({
          ...(profileRes.data as UserProfile),
          assigned_track_cards:
            ((profileRes.data as UserProfile).assigned_track_cards ??
              (profileRes.data as UserProfile).assigned_track ??
              "ALL") as UserProfile["assigned_track_cards"],
          assigned_track_simulados:
            ((profileRes.data as UserProfile).assigned_track_simulados ??
              (profileRes.data as UserProfile).assigned_track ??
              "ALL") as UserProfile["assigned_track_simulados"],
          assigned_track:
            ((profileRes.data as UserProfile).assigned_track ??
              (profileRes.data as UserProfile).assigned_track_cards ??
              (profileRes.data as UserProfile).assigned_track_simulados ??
              "ALL") as UserProfile["assigned_track"],
        } as UserProfile)
      : null,
    events: eventsRes.data ?? [],
    progress: progressRes.data ?? [],
    attempts: (attemptsRes.data as SimuladoAttempt[]) ?? [],
    answers: (answersRes.data as SimuladoAnswer[]) ?? [],
    assessmentSnapshots: (snapshotsRes.data ?? []) as Array<{
      id: string;
      created_at: string;
      me: string | null;
      ratings: AssessmentRatings;
    }>,
    procedureCounts: (proceduresRes.data as { counts: ProcedureCountsMap; updated_at: string } | null) ?? null,
    simSessoes: (simSessoesRes.data ?? []) as Array<{
      id: string;
      caso_id: string;
      caso_titulo: string;
      status: string;
      desfecho: string | null;
      pontuacao_final: number | null;
      iniciada_em: string;
      concluida_em: string | null;
    }>,
    simUso: (simUsoRes.data ?? []) as Array<{
      mes_ano: string;
      quantidade: number;
      ultima_simulacao: string | null;
    }>,
  };
}

export async function loadAdminMEStats() {
  const supabase = browserSupabase();
  if (!supabase) return null;

  const [attemptsRes, profilesRes] = await Promise.all([
    supabase
      .from("simulado_attempts")
      .select("id, user_id, track, score_percent, duration_sec, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, name, assigned_track, assigned_track_simulados"),
  ]);

  return {
    attempts: (attemptsRes.data ?? []) as Array<{
      id: string;
      user_id: string;
      track: string;
      score_percent: number | null;
      duration_sec: number | null;
      created_at: string;
    }>,
    profiles: (profilesRes.data ?? []) as Array<{
      id: string;
      name: string | null;
      assigned_track: string | null;
      assigned_track_simulados: string | null;
    }>,
  };
}

// ── Auto-avaliação (competências + procedimentos) ────────────────────────────

export type AssessmentRatings = Record<string, number>; // domain_id → 1-5
export type ProcedureCountsMap = Record<string, number>; // procedure_id → count

export async function saveAssessmentSnapshot(ratings: AssessmentRatings, me?: string): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const user = await getCurrentAuthUser();
  if (!user) return false;
  const { error } = await supabase
    .from("self_assessment_snapshots")
    .insert({ user_id: user.id, ratings, me: me ?? null });
  return !error;
}

export async function loadAssessmentSnapshots(): Promise<Array<{ id: string; created_at: string; ratings: AssessmentRatings; me: string | null }>> {
  const supabase = browserSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("self_assessment_snapshots")
    .select("id, created_at, ratings, me")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data as Array<{ id: string; created_at: string; ratings: AssessmentRatings; me: string | null }>;
}

export async function saveProcedureCounts(counts: ProcedureCountsMap): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const user = await getCurrentAuthUser();
  if (!user) return false;
  const { error } = await supabase
    .from("procedure_counts")
    .upsert({ user_id: user.id, counts, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return !error;
}

export async function loadProcedureCounts(): Promise<ProcedureCountsMap | null> {
  const supabase = browserSupabase();
  if (!supabase) return null;
  const user = await getCurrentAuthUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("procedure_counts")
    .select("counts")
    .eq("user_id", user.id)
    .single();
  if (error || !data) return null;
  return (data as { counts: ProcedureCountsMap }).counts;
}

export async function loadAdminAssessmentData() {
  const supabase = browserSupabase();
  if (!supabase) return null;

  const [snapshotsRes, proceduresRes, profilesRes] = await Promise.all([
    supabase
      .from("self_assessment_snapshots")
      .select("id, user_id, created_at, ratings")
      .order("created_at", { ascending: true }),
    supabase
      .from("procedure_counts")
      .select("user_id, counts, updated_at"),
    supabase
      .from("profiles")
      .select("id, name, assigned_track, assigned_track_simulados"),
  ]);

  return {
    snapshots: (snapshotsRes.data ?? []) as Array<{
      id: string;
      user_id: string;
      created_at: string;
      ratings: AssessmentRatings;
    }>,
    procedures: (proceduresRes.data ?? []) as Array<{
      user_id: string;
      counts: ProcedureCountsMap;
      updated_at: string;
    }>,
    profiles: (profilesRes.data ?? []) as Array<{
      id: string;
      name: string | null;
      assigned_track: string | null;
      assigned_track_simulados: string | null;
    }>,
  };
}

export type ContentGroupStat = { label: string; count: number };

export type ContentStats = {
  flashcards: { total: number; byMe: ContentGroupStat[]; byEspecialidade: ContentGroupStat[] };
  simulados: { total: number; byMe: ContentGroupStat[]; byTema: ContentGroupStat[] };
};

async function fetchAllRows<T>(
  supabase: ReturnType<typeof browserSupabase>,
  table: string,
  columns: string,
): Promise<T[]> {
  if (!supabase) return [];
  const PAGE = 1000;
  let all: T[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

export async function loadAdminContentStats(): Promise<ContentStats> {
  const supabase = browserSupabase();
  const empty: ContentStats = {
    flashcards: { total: 0, byMe: [], byEspecialidade: [] },
    simulados: { total: 0, byMe: [], byTema: [] },
  };
  if (!supabase) return empty;

  const [fcRows, simRows] = await Promise.all([
    fetchAllRows<{ me: string; especialidade: string | null }>(supabase, "flashcards", "id, me, especialidade"),
    fetchAllRows<{ me: string; tema: string | null }>(supabase, "simulados", "id, me, tema"),
  ]);

  const fcByMe = new Map<string, number>();
  const fcByEsp = new Map<string, number>();
  for (const row of fcRows) {
    fcByMe.set(row.me, (fcByMe.get(row.me) ?? 0) + 1);
    const esp = (row.especialidade ?? "").trim() || "Sem especialidade";
    fcByEsp.set(esp, (fcByEsp.get(esp) ?? 0) + 1);
  }

  const simByMe = new Map<string, number>();
  const simByTema = new Map<string, number>();
  for (const row of simRows) {
    simByMe.set(row.me, (simByMe.get(row.me) ?? 0) + 1);
    const tema = (row.tema ?? "").trim() || "Sem tema";
    simByTema.set(tema, (simByTema.get(tema) ?? 0) + 1);
  }

  return {
    flashcards: {
      total: fcRows.length,
      byMe: ["ME1", "ME2", "ME3"].map((me) => ({ label: me, count: fcByMe.get(me) ?? 0 })),
      byEspecialidade: Array.from(fcByEsp.entries()).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    },
    simulados: {
      total: simRows.length,
      byMe: ["ME1", "ME2", "ME3"].map((me) => ({ label: me, count: simByMe.get(me) ?? 0 })),
      byTema: Array.from(simByTema.entries()).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    },
  };
}

export async function migrateLocalHistoryToAccount() {
  if (typeof window === "undefined") return { migrated: false, reason: "NO_WINDOW" };
  const markerKey = "anesmap.migrated.localToAccount.v1";
  if (window.localStorage.getItem(markerKey) === "1") {
    return { migrated: false, reason: "ALREADY_DONE" };
  }

  const rawProgress = window.localStorage.getItem(STORAGE_KEYS.flashcardProgress);
  if (!rawProgress) {
    window.localStorage.setItem(markerKey, "1");
    return { migrated: true, reason: "NO_LOCAL_PROGRESS" };
  }

  try {
    const parsed = JSON.parse(rawProgress) as Record<string, FlashcardProgress>;
    await upsertFlashcardProgressRemote(parsed);
    const eventEntries = Object.entries(parsed).slice(0, 1000);
    await Promise.all(
      eventEntries.map(([cardId, value]) =>
        addFlashcardEvent({
          cardId,
          eventType: "grade",
          quality: value.lastQuality ?? getDefaultFlashcardProgress().lastQuality,
        }),
      ),
    );
    window.localStorage.setItem(markerKey, "1");
    return { migrated: true, reason: "OK" };
  } catch {
    return { migrated: false, reason: "ERROR" };
  }
}

// ── Invite codes ──────────────────────────────────────────────────────────────

export type InviteCode = {
  id: string;
  code: string;
  label: string | null;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  created_at: string;
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function validateInviteCode(code: string): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const { data } = await supabase
    .from("invite_codes")
    .select("use_count, max_uses, expires_at")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();
  if (!data) return false;
  if (data.use_count >= data.max_uses) return false;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
  return true;
}

export async function consumeInviteCode(code: string): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const { error } = await supabase.rpc("use_invite_code", { code_input: code });
  return !error;
}

export async function createInviteCode(label: string, maxUses = 1): Promise<string | null> {
  const supabase = browserSupabase();
  if (!supabase) return null;
  const user = await getCurrentAuthUser();
  if (!user) return null;
  const code = generateCode();
  const { error } = await supabase.from("invite_codes").insert({
    code,
    label: label.trim() || null,
    max_uses: maxUses,
    created_by: user.id,
  });
  return error ? null : code;
}

export async function loadInviteCodes(): Promise<InviteCode[]> {
  const supabase = browserSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("invite_codes")
    .select("id, code, label, max_uses, use_count, expires_at, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as InviteCode[];
}

export async function deleteInviteCode(id: string): Promise<boolean> {
  const supabase = browserSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("invite_codes").delete().eq("id", id);
  return !error;
}
