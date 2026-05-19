import type { FlashcardProgress, StudyTrack } from "@/lib/study-data";
import { STORAGE_KEYS, getDefaultFlashcardProgress } from "@/lib/study-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  name: string | null;
  role: "student" | "admin";
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
      "id, name, role, weekly_goal_minutes, assigned_track, assigned_track_cards, assigned_track_simulados, created_at",
    )
    .eq("id", user.id)
    .single();

  // Backward compatibility: DB may still have only `assigned_track`.
  if (isMissingTrackColumnsError(error)) {
    const legacyRes = await supabase
      .from("profiles")
      .select("id, name, role, weekly_goal_minutes, assigned_track, created_at")
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
  const { data, error } = await supabase
    .from("flashcard_progress")
    .select("card_id, ease_factor, repetitions, interval_days, next_review_at, last_quality");
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
  const [profile, progressMap, cardEvents, attempts] = await Promise.all([
    loadMyProfile(),
    loadFlashcardProgressRemoteByUser(),
    loadMyFlashcardEventsCount(),
    loadMySimuladoAttempts(),
  ]);

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
  const { count } = await supabase
    .from("flashcard_events")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function loadMySimuladoAttempts() {
  const supabase = browserSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("simulado_attempts")
    .select("id, user_id, track, started_at, ended_at, duration_sec, score_percent, created_at")
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
      "id, name, role, weekly_goal_minutes, assigned_track, assigned_track_cards, assigned_track_simulados, created_at",
    )
    .order("created_at", { ascending: false });

  if (isMissingTrackColumnsError(error)) {
    const legacyRes = await supabase
      .from("profiles")
      .select("id, name, role, weekly_goal_minutes, assigned_track, created_at")
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
    };
  }
  let [profileRes, eventsRes, progressRes, attemptsRes, answersRes] = await Promise.all([
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
      .limit(100),
    supabase
      .from("simulado_answers")
      .select("id, attempt_id, question_id, selected, correct, answered_at")
      .eq("user_id", userId)
      .order("answered_at", { ascending: false })
      .limit(500),
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
