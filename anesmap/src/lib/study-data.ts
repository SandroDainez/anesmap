import { createClient } from "@supabase/supabase-js";

export type StudyTrack = "ME1" | "ME2" | "ME3";

export type Flashcard = {
  id: string;
  me: StudyTrack;
  frente: string;
  verso: string;
  tags?: string[];
  especialidade?: string;
};

export type SimuladoQuestion = {
  id: string;
  me: StudyTrack;
  tema?: string;
  enunciado: string;
  alternativaA: string;
  alternativaB: string;
  alternativaC: string;
  alternativaD: string;
  correta: "A" | "B" | "C" | "D";
  explicacao?: string;
};

export type ImportHistoryEntry = {
  id: string;
  action: "import_csv" | "import_backup" | "export_backup" | "clear_data";
  timestamp: string;
  flashcards: number;
  simulados: number;
  details?: string;
};

export const STORAGE_KEYS = {
  flashcards: "anesmap.flashcards",
  simulados: "anesmap.simulados",
  importHistory: "anesmap.importHistory",
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

  return allRows;
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

export async function loadFlashcardsRemote(): Promise<Flashcard[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("flashcards")
    .select("id, me, frente, verso, tags, especialidade")
    .order("id", { ascending: true });

  if (error || !data) return null;
  return data as Flashcard[];
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

  const { data, error } = await supabase
    .from("simulados")
    .select(
      "id, me, tema, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, correta, explicacao",
    )
    .order("id", { ascending: true });

  if (error || !data) return null;

  return data.map((item) => ({
    id: item.id,
    me: item.me as StudyTrack,
    tema: item.tema ?? undefined,
    enunciado: item.enunciado,
    alternativaA: item.alternativa_a,
    alternativaB: item.alternativa_b,
    alternativaC: item.alternativa_c,
    alternativaD: item.alternativa_d,
    correta: item.correta as "A" | "B" | "C" | "D",
    explicacao: item.explicacao ?? undefined,
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

  const { error } = await supabase.from("flashcards").upsert(data, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
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
    tema: item.tema ?? null,
    enunciado: item.enunciado,
    alternativa_a: item.alternativaA,
    alternativa_b: item.alternativaB,
    alternativa_c: item.alternativaC,
    alternativa_d: item.alternativaD,
    correta: item.correta,
    explicacao: item.explicacao ?? null,
  }));

  const { error } = await supabase.from("simulados").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
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
  if (normalized.includes("correta") || normalized.includes("gabarito")) return "correta";

  return normalized;
}
