import { createClient } from "@supabase/supabase-js";

export type StudyTrack = "ME1" | "ME2" | "ME3";

/**
 * Trimestre dentro de uma trilha.
 * T1–T4 = provas trimestrais (simulados de 30 questões / flashcards daquele período)
 * "anual" = conteúdo do ano inteiro (simulados de 50 questões / todos os cards)
 */
export type Trimestre = "T1" | "T2" | "T3" | "T4" | "anual";

export type StudyReference = {
  title: string;
  url?: string;
  year?: string;
  source?: string;
};

export type Flashcard = {
  id: string;
  me: StudyTrack;
  /** Trimestre ao qual o card pertence. Undefined = exibido em todos os filtros. */
  trimestre?: Trimestre;
  frente: string;
  verso: string;
  tags?: string[];
  especialidade?: string;
  references?: StudyReference[];
};

export type FlashcardProgress = {
  easeFactor: number;
  repetitions: number;
  intervalDays: number;
  nextReviewAt: string;
  lastQuality: number;
};

export type SimuladoQuestion = {
  id: string;
  me: StudyTrack;
  /** Trimestre: T1–T4 para simulados de 30q; "anual" para simulados de 50q. */
  trimestre?: Trimestre;
  /** Prova dentro do trimestre: A1, A2, A3 ou A4. */
  prova?: string;
  tema?: string;
  enunciado: string;
  alternativaA: string;
  alternativaB: string;
  alternativaC: string;
  alternativaD: string;
  alternativaE?: string;
  correta: "A" | "B" | "C" | "D" | "E";
  explicacao?: string;
  /** Justificativa individual por alternativa (mostrada ao responder) */
  explicacaoA?: string;
  explicacaoB?: string;
  explicacaoC?: string;
  explicacaoD?: string;
  explicacaoE?: string;
  references?: StudyReference[];
};

export type ImportHistoryEntry = {
  id: string;
  action:
    | "import_csv"
    | "import_backup"
    | "export_backup"
    | "clear_data"
    | "delete_selected";
  timestamp: string;
  flashcards: number;
  simulados: number;
  details?: string;
};

export const STORAGE_KEYS = {
  flashcards: "anesmap.flashcards",
  simulados: "anesmap.simulados",
  importHistory: "anesmap.importHistory",
  flashcardProgress: "anesmap.flashcardProgress",
} as const;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}

export function parseCsv(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = normalized.split("\n")[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(normalized, delimiter).filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  );

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeKey(header));
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = (row[index] ?? "").trim();
    });
    return obj;
  });
}

export function parseHtmlTables(text: string): Record<string, string>[] {
  if (typeof window === "undefined") {
    return [];
  }

  const parser = new DOMParser();
  const primaryDoc = parser.parseFromString(text, "text/html");
  const primaryTables = Array.from(primaryDoc.querySelectorAll("table"));
  const doc =
    primaryTables.length > 0
      ? primaryDoc
      : parser.parseFromString(decodeHtmlEntities(text), "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  const allRows: Record<string, string>[] = [];

  if (tables.length === 0) {
    const preBlocks = Array.from(doc.querySelectorAll("pre")).map(
      (node) => node.textContent ?? "",
    );
    for (const preContent of preBlocks) {
      const maybeHtml = decodeHtmlEntities(preContent);
      const preDoc = parser.parseFromString(maybeHtml, "text/html");
      const preTables = Array.from(preDoc.querySelectorAll("table"));
      if (preTables.length > 0) {
        preTables.forEach((table) => {
          extractRowsFromTable(table, allRows);
        });
        return allRows;
      }
    }
  }

  tables.forEach((table) => {
    extractRowsFromTable(table, allRows);
  });

  if (allRows.length === 0) {
    const fallbackRows = extractRowsFromRawHtml(text);
    if (fallbackRows.length > 0) {
      return fallbackRows;
    }
  }

  return allRows;
}

export function parseSimuladoHtml(text: string): Record<string, string>[] {
  if (typeof window === "undefined") return parseSimuladoRawHtml(text);

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const questions = Array.from(doc.querySelectorAll(".questao, .question, .q"));
  if (questions.length === 0) return parseSimuladoRawHtml(text);

  const answerMap = new Map<string, { correta: string; explicacao: string }>();

  const comments = Array.from(doc.querySelectorAll(".comentario"));
  const explanationByQuestion = new Map<string, string>();
  comments.forEach((comment) => {
    const cq = comment.querySelector(".cq")?.textContent ?? "";
    const paragraph = (comment.querySelector("p")?.textContent ?? "").trim();
    const qMatch = cq.match(/(\d+)/);
    if (!qMatch) return;
    explanationByQuestion.set(qMatch[1], paragraph);
  });

  const gabaritoItems = Array.from(doc.querySelectorAll(".gab-item"));
  gabaritoItems.forEach((item) => {
    const header = item.querySelector(".gab-header")?.textContent ?? "";
    const resposta = item.querySelector(".gab-resposta")?.textContent ?? "";
    const justificativa = item.querySelector(".gab-just")?.textContent ?? "";
    const numberMatch = header.match(/(\d+)/);
    const letterMatch = resposta.match(/\b([A-E])\b/i);
    if (!numberMatch || !letterMatch) return;
    answerMap.set(numberMatch[1], {
      correta: letterMatch[1].toUpperCase(),
      explicacao: justificativa.trim() || (explanationByQuestion.get(numberMatch[1]) ?? ""),
    });
  });

  const gabaritoGridItems = Array.from(doc.querySelectorAll(".gabarito-item"));
  gabaritoGridItems.forEach((item) => {
    const qn =
      item.querySelector(".qn")?.textContent ??
      item.querySelector(".resposta")?.textContent ??
      "";
    const ans =
      item.querySelector(".ans")?.textContent ??
      item.querySelector(".resposta")?.textContent ??
      "";
    const numberMatch = qn.match(/(\d+)/);
    const letterMatch = ans.match(/\b([A-E])\b/i);
    if (!numberMatch || !letterMatch) return;
    const respostaText = (item.textContent ?? "").trim();
    const explicacao = stripTags(
      respostaText.replace(/^\s*\d+\s*-\s*[A-E]\s*/i, "").replace(/^resposta\s*:\s*[A-E]\s*/i, ""),
    );
    answerMap.set(numberMatch[1], {
      correta: letterMatch[1].toUpperCase(),
      explicacao: explicacao || (explanationByQuestion.get(numberMatch[1]) ?? ""),
    });
  });

  const rows: Record<string, string>[] = [];
  questions.forEach((question, index) => {
    const numText =
      question.querySelector(".questao-num")?.textContent ??
      question.querySelector(".question-number")?.textContent ??
      question.querySelector("p strong")?.textContent ??
      "";
    const numMatch = numText.match(/(\d+)/);
    const questionNumber = numMatch?.[1] ?? String(index + 1);

    const cenario =
      (question.querySelector(".cenario")?.textContent ??
        question.querySelector(".question-text .cc")?.textContent ??
        question.querySelector(".caso-clinico")?.textContent ??
        question.querySelector(".tag")?.textContent ??
        "")
        .trim()
        .replace(/^CC:\s*/i, "");
    const questionTextNode = question.querySelector(".question-text");
    const cleanedQuestionText = (() => {
      if (!questionTextNode) return "";
      const clone = questionTextNode.cloneNode(true) as Element;
      clone.querySelector(".cc")?.remove();
      return (clone.textContent ?? "").trim();
    })();
    const containerQuestionText = (() => {
      const clone = question.cloneNode(true) as Element;
      clone
        .querySelectorAll(
          ".alternativas, .alternatives, ul, .gabarito, .g, .questao-num, .question-number",
        )
        .forEach((node) => node.remove());
      const heading = clone.querySelector("p strong");
      if (heading && /quest[aã]o/i.test(heading.textContent ?? "")) {
        heading.parentElement?.remove();
      }
      return (clone.textContent ?? "").trim();
    })();
    const enunciado = (
      question.querySelector(".enunciado")?.textContent ||
      question.querySelector(".e")?.textContent ||
      cleanedQuestionText ||
      containerQuestionText
    )
      .trim()
      .replace(/^q\s*\d+\s*[.:]\s*/i, "")
      .replace(/\s+/g, " ");
    const title = cenario ? `${cenario}\n\n${enunciado}` : enunciado;

    const alternatives = Array.from(
      question.querySelectorAll(
        ".alternativas > div, .alternativas > li, .alternativas p, .alternatives > li, .alternatives p, ul > li",
      ),
    )
      .map((node) => (node.textContent ?? "").trim())
      .filter(Boolean);

    const altMap = new Map<string, string>();
    alternatives.forEach((alt) => {
      const match = alt.match(/^([A-E])[\)\.\-:–—]\s*([\s\S]*)$/i);
      if (!match) return;
      altMap.set(match[1].toUpperCase(), match[2].trim());
    });

    if (
      (!altMap.get("A") || !altMap.get("B") || !altMap.get("C") || !altMap.get("D")) &&
      alternatives.length >= 4
    ) {
      const ordered = alternatives
        .map((alt) => alt.replace(/^[A-E][\)\.\-:–—]\s*/i, "").trim())
        .filter(Boolean);
      if (ordered.length >= 4) {
        if (!altMap.get("A")) altMap.set("A", ordered[0]);
        if (!altMap.get("B")) altMap.set("B", ordered[1]);
        if (!altMap.get("C")) altMap.set("C", ordered[2]);
        if (!altMap.get("D")) altMap.set("D", ordered[3]);
        if (!altMap.get("E") && ordered[4]) altMap.set("E", ordered[4]);
      }
    }

    if (!title || !altMap.get("A") || !altMap.get("B") || !altMap.get("C")) {
      return;
    }

    const inlineGabaritoText =
      question.querySelector(".gabarito")?.textContent ??
      question.querySelector(".g")?.textContent ??
      "";
    const inlineLetter = inlineGabaritoText.match(/\b([A-E])\b/i)?.[1]?.toUpperCase();
    const gabarito = answerMap.get(questionNumber);
    const corretaOriginal = (inlineLetter ?? gabarito?.correta ?? "A").toUpperCase();

    const alternativaD = altMap.get("D") ?? "";
    const alternativaE = altMap.get("E") ?? "";
    const correta = ["A", "B", "C", "D", "E"].includes(corretaOriginal) ? corretaOriginal : "A";
    const explicacao =
      gabarito?.explicacao ??
      stripTags(inlineGabaritoText.replace(/^\s*gabarito\s*:\s*[A-E]\s*/i, ""));

    if (!alternativaD) return;

    // Extract per-alternative justifications from interactive HTML format (.alt divs)
    const explicacaoDiv = question.querySelector(".explicacao");
    const perAltExplicacoes: Record<string, string> = {};
    if (explicacaoDiv) {
      const altDivs = Array.from(explicacaoDiv.querySelectorAll(".alt"));
      altDivs.forEach((div) => {
        const strong = div.querySelector("strong");
        const letter = strong?.textContent?.match(/^([A-E])/i)?.[1]?.toUpperCase();
        if (!letter) return;
        const fullText = (div.textContent ?? "").trim();
        const labelText = (strong?.textContent ?? "").trim();
        const explanation = fullText.slice(labelText.length).replace(/^\s*:\s*/, "").trim();
        if (explanation) perAltExplicacoes[letter] = explanation;
      });
    }

    rows.push({
      id: `simulado-html-${questionNumber}`,
      enunciado: title,
      alternativaa: altMap.get("A") ?? "",
      alternativab: altMap.get("B") ?? "",
      alternativac: altMap.get("C") ?? "",
      alternativad: alternativaD,
      alternativae: alternativaE,
      correta,
      explicacao,
      explicacaoa: perAltExplicacoes["A"] ?? "",
      explicacaob: perAltExplicacoes["B"] ?? "",
      explicacaoc: perAltExplicacoes["C"] ?? "",
      explicacaod: perAltExplicacoes["D"] ?? "",
      explicacaoe: perAltExplicacoes["E"] ?? "",
    });
  });

  if (rows.length === 0) {
    return parseSimuladoRawHtml(text);
  }

  return rows;
}

export function loadFlashcards(): Flashcard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.flashcards);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as Flashcard[];
  } catch {
    return [];
  }
}

export function loadFlashcardProgress(): Record<string, FlashcardProgress> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.flashcardProgress);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<string, FlashcardProgress>;
  } catch {
    return {};
  }
}

export function saveFlashcardProgress(data: Record<string, FlashcardProgress>) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.flashcardProgress, JSON.stringify(data));
}

export function getDefaultFlashcardProgress(now = new Date()): FlashcardProgress {
  return {
    easeFactor: 2.5,
    repetitions: 0,
    intervalDays: 0,
    nextReviewAt: now.toISOString(),
    lastQuality: 0,
  };
}

export function applySm2(
  progress: FlashcardProgress,
  quality: number,
  now = new Date(),
): FlashcardProgress {
  const boundedQuality = Math.min(5, Math.max(0, quality));

  // Fixed review intervals:
  // Difícil (quality ≤ 2) → 1 dia
  // Médio   (quality 3-4) → 3 dias
  // Fácil   (quality 5)   → 7 dias
  let nextIntervalDays: number;
  if (boundedQuality <= 2) {
    nextIntervalDays = 1;
  } else if (boundedQuality <= 4) {
    nextIntervalDays = 3;
  } else {
    nextIntervalDays = 7;
  }

  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + nextIntervalDays);

  return {
    easeFactor: progress.easeFactor,
    repetitions: progress.repetitions + 1,
    intervalDays: nextIntervalDays,
    nextReviewAt: nextReviewAt.toISOString(),
    lastQuality: boundedQuality,
  };
}

export async function loadFlashcardsRemote(): Promise<Flashcard[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Pagination: fetch all pages (default Supabase limit is 1000)
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, me, trimestre, frente, verso, tags, especialidade")
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return null;
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return (allData as Flashcard[]).map((item) => ({
    ...item,
    references: parseReferenceBlock(item.verso),
  }));
}

export function loadSimulados(): SimuladoQuestion[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.simulados);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as SimuladoQuestion[];
  } catch {
    return [];
  }
}

export async function loadSimuladosRemote(): Promise<SimuladoQuestion[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Pagination: fetch all pages
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from("simulados")
      .select(
        "id, me, trimestre, prova, tema, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, correta, explicacao, explicacao_a, explicacao_b, explicacao_c, explicacao_d, explicacao_e",
      )
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return null;
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return allData.map((item: any) => ({
    id: item.id,
    me: item.me as StudyTrack,
    trimestre: (item.trimestre ?? undefined) as Trimestre | undefined,
    prova: item.prova ?? undefined,
    tema: item.tema ?? undefined,
    enunciado: item.enunciado,
    alternativaA: item.alternativa_a,
    alternativaB: item.alternativa_b,
    alternativaC: item.alternativa_c,
    alternativaD: item.alternativa_d,
    alternativaE: item.alternativa_e ?? undefined,
    correta: item.correta as "A" | "B" | "C" | "D" | "E",
    explicacao: item.explicacao ?? undefined,
    explicacaoA: item.explicacao_a ?? undefined,
    explicacaoB: item.explicacao_b ?? undefined,
    explicacaoC: item.explicacao_c ?? undefined,
    explicacaoD: item.explicacao_d ?? undefined,
    explicacaoE: item.explicacao_e ?? undefined,
    references: parseReferenceBlock(item.explicacao ?? ""),
  }));
}

export function saveFlashcards(data: Flashcard[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.flashcards, JSON.stringify(data));
}

export async function saveFlashcardsRemote(data: Flashcard[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload = data.map((item) => ({
    id: item.id,
    me: item.me,
    trimestre: item.trimestre ?? null,
    frente: item.frente,
    verso: item.verso,
    tags: item.tags ?? [],
    especialidade: item.especialidade ?? null,
  }));

  const chunkSize = 200;
  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await supabase.from("flashcards").upsert(chunk, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export function saveSimulados(data: SimuladoQuestion[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.simulados, JSON.stringify(data));
}

export async function saveSimuladosRemote(data: SimuladoQuestion[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload = data.map((item) => ({
    id: item.id,
    me: item.me,
    trimestre: item.trimestre ?? null,
    prova: item.prova ?? null,
    tema: item.tema ?? null,
    enunciado: item.enunciado,
    alternativa_a: item.alternativaA,
    alternativa_b: item.alternativaB,
    alternativa_c: item.alternativaC,
    alternativa_d: item.alternativaD,
    alternativa_e: item.alternativaE ?? null,
    correta: item.correta,
    explicacao: item.explicacao ?? null,
    explicacao_a: item.explicacaoA ?? null,
    explicacao_b: item.explicacaoB ?? null,
    explicacao_c: item.explicacaoC ?? null,
    explicacao_d: item.explicacaoD ?? null,
    explicacao_e: item.explicacaoE ?? null,
  }));

  const chunkSize = 200;
  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await supabase.from("simulados").upsert(chunk, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function clearStudyDataRemote() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error: flashcardsError } = await supabase
    .from("flashcards")
    .delete()
    .not("id", "is", null);
  if (flashcardsError) {
    throw new Error(flashcardsError.message);
  }

  const { error: simuladosError } = await supabase
    .from("simulados")
    .delete()
    .not("id", "is", null);
  if (simuladosError) {
    throw new Error(simuladosError.message);
  }
}

export async function updateFlashcardRemote(
  id: string,
  patch: Partial<Pick<Flashcard, "frente" | "verso" | "tags" | "especialidade">>,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("flashcards").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateSimuladoRemote(
  id: string,
  patch: Partial<Pick<SimuladoQuestion, "tema" | "enunciado" | "alternativaA" | "alternativaB" | "alternativaC" | "alternativaD" | "correta" | "explicacao">>,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const dbPatch: Record<string, unknown> = {};
  if (patch.tema !== undefined) dbPatch.tema = patch.tema;
  if (patch.enunciado !== undefined) dbPatch.enunciado = patch.enunciado;
  if (patch.alternativaA !== undefined) dbPatch.alternativa_a = patch.alternativaA;
  if (patch.alternativaB !== undefined) dbPatch.alternativa_b = patch.alternativaB;
  if (patch.alternativaC !== undefined) dbPatch.alternativa_c = patch.alternativaC;
  if (patch.alternativaD !== undefined) dbPatch.alternativa_d = patch.alternativaD;
  if (patch.correta !== undefined) dbPatch.correta = patch.correta;
  if (patch.explicacao !== undefined) dbPatch.explicacao = patch.explicacao;
  const { error } = await supabase.from("simulados").update(dbPatch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFlashcardsRemoteByIds(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const chunkSize = 200;
  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const { error } = await supabase.from("flashcards").delete().in("id", chunk);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function deleteSimuladosRemoteByIds(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const chunkSize = 200;
  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const { error } = await supabase.from("simulados").delete().in("id", chunk);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export function loadImportHistory(): ImportHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.importHistory);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as ImportHistoryEntry[];
  } catch {
    return [];
  }
}

export function saveImportHistory(data: ImportHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.importHistory, JSON.stringify(data));
}

export function addImportHistoryEntry(
  entry: Omit<ImportHistoryEntry, "id" | "timestamp">,
) {
  const current = loadImportHistory();
  const nextEntry: ImportHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const updated = [nextEntry, ...current].slice(0, 20);
  saveImportHistory(updated);
}

export function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function resolveTrack(value: string | undefined, fallbackText: string): StudyTrack {
  const fromValue = (value ?? "").toUpperCase();
  if (fromValue === "ME1" || fromValue === "ME2" || fromValue === "ME3") {
    return fromValue;
  }

  const match = fallbackText.match(/me[\s_-]?([123])/i);
  if (match?.[1] === "1") return "ME1";
  if (match?.[1] === "2") return "ME2";
  if (match?.[1] === "3") return "ME3";
  return "ME1";
}

export function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map<string, T>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export function suggestStudyReferences(text: string) {
  const normalized = normalizeKey(text);
  const refs = new Set<string>();

  // Core references used throughout anesthesiology training.
  refs.add("Miller's Anesthesia, 9th ed. (Elsevier)");
  refs.add("Cangiani et al. - Tratado de Anestesiologia SAESP/SBA");

  if (
    hasAny(normalized, [
      "cushing",
      "feocromocitoma",
      "tiro",
      "diabetes",
      "adrenal",
      "endocr",
      "metformina",
    ])
  ) {
    refs.add("Miller's Anesthesia, 9th ed. - Endocrine disease and anesthesia");
    refs.add("Barash Clinical Anesthesia, 9th ed. - Endocrine disorders");
  }

  if (
    hasAny(normalized, [
      "trauma",
      "hemorrag",
      "transfus",
      "choque",
      "dano",
      "hipotensao",
      "parkland",
      "queim",
    ])
  ) {
    refs.add("ATLS Student Course Manual, 10th ed.");
    refs.add("Miller's Anesthesia, 9th ed. - Trauma and critical care anesthesia");
  }

  if (hasAny(normalized, ["sepse", "septic", "vasopress", "norepinefrina", "noradrenalina"])) {
    refs.add("Surviving Sepsis Campaign Guidelines 2021");
  }

  if (hasAny(normalized, ["viaaerea", "intub", "dificil", "mils", "laring"])) {
    refs.add("2022 ASA Practice Guidelines for Management of the Difficult Airway");
  }

  if (
    hasAny(normalized, [
      "cardio",
      "valva",
      "cec",
      "aorta",
      "carot",
      "marcapasso",
      "cdi",
      "endocard",
    ])
  ) {
    refs.add("Kaplan's Cardiac Anesthesia, 8th ed.");
    refs.add("AHA/ACC perioperative cardiovascular evaluation guideline");
  }

  if (hasAny(normalized, ["neuro", "tce", "pic", "ppc", "craniotomia", "vasoespasmo"])) {
    refs.add("Cottrell and Patel's Neuroanesthesia, 7th ed.");
  }

  if (hasAny(normalized, ["obst", "gestante", "cesar", "eclampsia", "preclampsia"])) {
    refs.add("Chestnut's Obstetric Anesthesia: Principles and Practice, 7th ed.");
  }

  if (hasAny(normalized, ["pedi", "neonat", "crianca", "fontan", "tetralogia"])) {
    refs.add("A Practice of Anesthesia for Infants and Children, 7th ed.");
  }

  if (hasAny(normalized, ["dor", "paliat", "opioid", "metadona", "fibromialgia", "nvpo"])) {
    refs.add("IASP Textbook of Pain, 6th ed.");
    refs.add("SBA - Diretrizes de Dor e Cuidados Paliativos");
  }

  return Array.from(refs).slice(0, 4);
}

export function parseReferenceBlock(text: string): StudyReference[] {
  const raw = text ?? "";
  const line = raw.match(/(?:refer[eê]ncias?|fontes?|bibliografia)\s*:\s*([\s\S]*)$/i)?.[1];
  if (!line) return [];
  const parts = line
    .split(/;|\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.map((entry) => parseReferenceEntry(entry)).filter((ref) => ref.title.length > 0);
}

export function parseStructuredReferences(row: Record<string, string>): StudyReference[] {
  const refs: StudyReference[] = [];
  const title = (row.referenciatitulo ?? row.reftitulo ?? "").trim();
  const url = (row.referenciaurl ?? row.refurl ?? "").trim();
  const year = (row.referenciaano ?? row.refano ?? "").trim();
  const source = (row.referenciafonte ?? row.reffonte ?? "").trim();

  if (title) {
    refs.push({
      title,
      url: url || undefined,
      year: year || undefined,
      source: source || undefined,
    });
  }

  const inlineRefs = parseReferenceBlock(
    (row.referencias ?? row.bibliografia ?? row.fontes ?? "").trim(),
  );
  if (inlineRefs.length > 0) {
    refs.push(...inlineRefs);
  }

  return dedupeReferences(refs);
}

export function formatReferencesForDisplay(references: StudyReference[]) {
  if (references.length === 0) return "";
  return references
    .map((ref) => {
      const parts = [ref.title];
      if (ref.year) parts.push(ref.year);
      if (ref.source) parts.push(ref.source);
      if (ref.url) parts.push(ref.url);
      return parts.filter(Boolean).join(" - ");
    })
    .join("; ");
}

function dedupeReferences(references: StudyReference[]) {
  const map = new Map<string, StudyReference>();
  references.forEach((ref) => {
    const key = normalizeKey(`${ref.title}|${ref.url ?? ""}|${ref.year ?? ""}|${ref.source ?? ""}`);
    if (!key) return;
    map.set(key, ref);
  });
  return Array.from(map.values());
}

function parseReferenceEntry(entry: string): StudyReference {
  const urlMatch = entry.match(/https?:\/\/\S+/i)?.[0];
  const yearMatch = entry.match(/\b(19|20)\d{2}\b/);
  const titleOnly = entry
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s*-\s*$/g, "")
    .trim();
  return {
    title: titleOnly || entry.trim(),
    url: urlMatch,
    year: yearMatch?.[0],
  };
}

function hasAny(normalizedText: string, tokens: string[]) {
  return tokens.some((token) => normalizedText.includes(normalizeKey(token)));
}

function detectDelimiter(line: string) {
  const commas = (line.match(/,/g) ?? []).length;
  const semicolons = (line.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function decodeHtmlEntities(value: string) {
  if (typeof window === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function extractRowsFromTable(table: Element, target: Record<string, string>[]) {
  const rawRows = Array.from(table.querySelectorAll("tr")).map((row) => {
    const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
      (cell.textContent ?? "").trim(),
    );
    return cells;
  });

  const rows = rawRows.filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length === 0) return;

  const hasExplicitHeader = rows[0].some((_, index) =>
    table.querySelector(`tr:first-child th:nth-child(${index + 1})`),
  );

  const firstRow = rows[0];
  const inferredHeader =
    !hasExplicitHeader &&
    firstRow.some((cell) =>
      /frente|verso|pergunta|resposta|enunciado|alternativa/i.test(cell),
    );

  if (hasExplicitHeader || inferredHeader) {
    const headers = rows[0].map((header) => canonicalHeaderKey(header));
    rows.slice(1).forEach((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = (row[index] ?? "").trim();
      });
      target.push(obj);
    });
    return;
  }

  rows.forEach((row, index) => {
    if (row.length < 2) return;

    const firstCellIsIndex = /^\d+$/.test((row[0] ?? "").trim());
    const frente = firstCellIsIndex ? row[1] ?? "" : row[0] ?? "";
    const verso = firstCellIsIndex ? row[2] ?? "" : row[1] ?? "";

    if (!frente || !verso) return;

    target.push({
      id: `html-row-${index + 1}`,
      frente,
      verso,
    });
  });
}

function canonicalHeaderKey(header: string) {
  const normalized = normalizeKey(header);

  if (
    normalized.includes("frente") ||
    normalized.includes("pergunta") ||
    normalized.includes("front")
  ) {
    return "frente";
  }

  if (
    normalized.includes("verso") ||
    normalized.includes("resposta") ||
    normalized.includes("back")
  ) {
    return "verso";
  }

  if (
    normalized.includes("enunciado") ||
    normalized.includes("questao") ||
    normalized.includes("stem")
  ) {
    return "enunciado";
  }

  if (normalized.includes("alternativaa") || normalized === "a") return "alternativaa";
  if (normalized.includes("alternativab") || normalized === "b") return "alternativab";
  if (normalized.includes("alternativac") || normalized === "c") return "alternativac";
  if (normalized.includes("alternativad") || normalized === "d") return "alternativad";
  if (normalized.includes("alternativae") || normalized === "e") return "alternativae";
  if (normalized.includes("correta") || normalized.includes("gabarito")) return "correta";
  if (normalized === "trimestre" || normalized.includes("trimestre") || normalized === "quarter") return "trimestre";
  if (normalized.includes("explicacaoa") || normalized === "explicacaoa") return "explicacaoa";
  if (normalized.includes("explicacaob") || normalized === "explicacaob") return "explicacaob";
  if (normalized.includes("explicacaoc") || normalized === "explicacaoc") return "explicacaoc";
  if (normalized.includes("explicacaod") || normalized === "explicacaod") return "explicacaod";
  if (normalized.includes("explicacaoe") || normalized === "explicacaoe") return "explicacaoe";
  if (normalized.includes("referenciatitulo") || normalized === "reftitulo") {
    return "referenciatitulo";
  }
  if (normalized.includes("referenciaurl") || normalized === "refurl") return "referenciaurl";
  if (normalized.includes("referenciaano") || normalized === "refano") return "referenciaano";
  if (normalized.includes("referenciafonte") || normalized === "reffonte") {
    return "referenciafonte";
  }
  if (normalized.includes("referencias") || normalized.includes("bibliografia")) {
    return "referencias";
  }

  return normalized;
}

function parseSimuladoRawHtml(text: string): Record<string, string>[] {
  const decoded = decodeHtmlEntities(text);
  const answerMap = new Map<string, { correta: string; explicacao: string }>();

  const gabRegex =
    /<div class="gab-header">[\s\S]*?(\d+)[\s\S]*?<\/div>[\s\S]*?<div class="gab-resposta">[\s\S]*?\b([A-E])\b[\s\S]*?<\/div>[\s\S]*?<div class="gab-just">([\s\S]*?)<\/div>/gi;
  let gabMatch: RegExpExecArray | null = null;
  while ((gabMatch = gabRegex.exec(decoded)) !== null) {
    answerMap.set(gabMatch[1], {
      correta: gabMatch[2].toUpperCase(),
      explicacao: stripTags(gabMatch[3]),
    });
  }

  const parts = decoded.split(/<div class="questao">/i).slice(1);
  const rows: Record<string, string>[] = [];

  parts.forEach((part, index) => {
    const numberMatch = part.match(/<div class="questao-num">[\s\S]*?(\d+)[\s\S]*?<\/div>/i);
    const questionNumber = numberMatch?.[1] ?? String(index + 1);

    const cenario = stripTags(part.match(/<div class="cenario">([\s\S]*?)<\/div>/i)?.[1] ?? "");
    const enunciado = stripTags(
      part.match(/<div class="enunciado">([\s\S]*?)<\/div>/i)?.[1] ?? "",
    );
    const combined = cenario ? `${cenario}\n\n${enunciado}` : enunciado;

    if (!combined) return;

    const altMap = new Map<string, string>();
    const altRegex = /<div>\s*([A-E])\)\s*([\s\S]*?)<\/div>/gi;
    let altMatch: RegExpExecArray | null = null;
    while ((altMatch = altRegex.exec(part)) !== null) {
      altMap.set(altMatch[1].toUpperCase(), stripTags(altMatch[2]));
    }

    if (!altMap.get("A") || !altMap.get("B") || !altMap.get("C")) return;

    const gabarito = answerMap.get(questionNumber);
    const corretaOriginal = (gabarito?.correta ?? "A").toUpperCase();
    const alternativaDOriginal = altMap.get("D") ?? "";
    const alternativaEOriginal = altMap.get("E") ?? "";
    let alternativaD = alternativaDOriginal;
    let correta = corretaOriginal;
    let explicacao = gabarito?.explicacao ?? "";

    if (!alternativaD && alternativaEOriginal) {
      alternativaD = alternativaEOriginal;
      if (correta === "E") correta = "D";
      explicacao = [explicacao, "Correta original no arquivo: E."]
        .filter(Boolean)
        .join(" ");
    } else if (alternativaD && alternativaEOriginal) {
      alternativaD = `${alternativaDOriginal} || E) ${alternativaEOriginal}`;
      if (correta === "E") correta = "D";
      explicacao = [explicacao, "Alternativa E preservada junto da D para compatibilidade."]
        .filter(Boolean)
        .join(" ");
    } else if (!["A", "B", "C", "D"].includes(correta)) {
      correta = "A";
    }

    if (!alternativaD) return;

    rows.push({
      id: `simulado-raw-${questionNumber}`,
      enunciado: combined,
      alternativaa: altMap.get("A") ?? "",
      alternativab: altMap.get("B") ?? "",
      alternativac: altMap.get("C") ?? "",
      alternativad: alternativaD,
      correta,
      explicacao,
    });
  });

  return rows;
}

function stripTags(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractRowsFromRawHtml(html: string): Record<string, string>[] {
  const normalized = decodeHtmlEntities(html)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const trMatches = normalized.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows: Record<string, string>[] = [];

  for (const tr of trMatches) {
    if (/<th[\s\S]*?>/i.test(tr)) continue;

    const tdMatches = tr.match(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi) ?? [];
    if (tdMatches.length < 2) continue;

    const cells = tdMatches
      .map((cell) =>
        decodeHtmlEntities(
          cell
            .replace(/<td[\s\S]*?>/i, "")
            .replace(/<\/td>/i, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        ),
      )
      .filter((cell) => cell.length > 0);

    if (cells.length < 2) continue;

    const firstCellIsIndex = /^\d+$/.test(cells[0] ?? "");
    const frente = firstCellIsIndex ? cells[1] ?? "" : cells[0] ?? "";
    const verso = firstCellIsIndex ? cells[2] ?? "" : cells[1] ?? "";

    if (!frente || !verso) continue;

    rows.push({
      id: `raw-html-row-${rows.length + 1}`,
      frente,
      verso,
    });
  }

  return rows;
}
