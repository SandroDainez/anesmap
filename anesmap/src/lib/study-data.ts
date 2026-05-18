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

export function saveFlashcards(data: Flashcard[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.flashcards, JSON.stringify(data));
}

export function saveSimulados(data: SimuladoQuestion[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.simulados, JSON.stringify(data));
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
