"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  addImportHistoryEntry,
  clearStudyDataRemote,
  deleteFlashcardsRemoteByIds,
  deleteSimuladosRemoteByIds,
  Flashcard,
  isSupabaseConfigured,
  loadImportHistory,
  SimuladoQuestion,
  loadFlashcards,
  loadFlashcardsRemote,
  loadSimulados,
  loadSimuladosRemote,
  mergeById,
  normalizeKey,
  parseCsv,
  parseHtmlTables,
  resolveTrack,
  saveFlashcards,
  saveFlashcardsRemote,
  saveSimulados,
  saveSimuladosRemote,
} from "@/lib/study-data";

type ImportReport = {
  importedFlashcards: number;
  importedSimulados: number;
  ignoredRows: number;
  filesProcessed: number;
};

type BackupPayload = {
  exportedAt?: string;
  flashcards?: Flashcard[];
  simulados?: SimuladoQuestion[];
};

type HistoryFilter = "all" | "imports" | "backups" | "clear";
const HISTORY_PAGE_SIZE = 5;

export default function ImportarPage() {
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [isSyncingRemote, setIsSyncingRemote] = useState(false);
  const [manageKind, setManageKind] = useState<"flashcards" | "simulados">("flashcards");
  const [manageQuery, setManageQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentTotals = useMemo(
    () => ({
      flashcards: loadFlashcards().length,
      simulados: loadSimulados().length,
    }),
    [report, dataVersion],
  );
  const history = useMemo(() => loadImportHistory(), [dataVersion]);
  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return history.filter((entry) => {
      if (!matchesFilter(entry.action, historyFilter)) return false;
      if (!query) return true;

      const actionLabel = formatAction(entry.action).toLowerCase();
      const details = (entry.details ?? "").toLowerCase();
      const timestamp = new Date(entry.timestamp).toLocaleString("pt-BR").toLowerCase();
      return (
        actionLabel.includes(query) ||
        details.includes(query) ||
        timestamp.includes(query)
      );
    });
  }, [history, historyFilter, historyQuery]);
  const visibleHistory = useMemo(
    () => filteredHistory.slice(0, visibleHistoryCount),
    [filteredHistory, visibleHistoryCount],
  );
  const manageableItems = useMemo(() => {
    if (manageKind === "flashcards") {
      return loadFlashcards().map((item) => ({
        id: item.id,
        title: item.frente,
        subtitle: item.verso,
      }));
    }

    return loadSimulados().map((item) => ({
      id: item.id,
      title: item.enunciado,
      subtitle: `${item.alternativaA} | ${item.alternativaB}`,
    }));
  }, [manageKind, dataVersion]);
  const filteredManageItems = useMemo(() => {
    const query = manageQuery.trim().toLowerCase();
    if (!query) return manageableItems;
    return manageableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query),
    );
  }, [manageQuery, manageableItems]);

  useEffect(() => {
    setVisibleHistoryCount(HISTORY_PAGE_SIZE);
  }, [historyFilter, historyQuery, dataVersion]);

  useEffect(() => {
    setSelectedIds([]);
  }, [manageKind, dataVersion]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    void (async () => {
      setIsSyncingRemote(true);
      try {
        const [remoteFlashcards, remoteSimulados] = await Promise.all([
          loadFlashcardsRemote(),
          loadSimuladosRemote(),
        ]);

        if (remoteFlashcards) {
          saveFlashcards(remoteFlashcards);
        }
        if (remoteSimulados) {
          saveSimulados(remoteSimulados);
        }
        if (remoteFlashcards || remoteSimulados) {
          setDataVersion((value) => value + 1);
        }
      } finally {
        setIsSyncingRemote(false);
      }
    })();
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const incomingFlashcards: Flashcard[] = [];
      const incomingSimulados: SimuladoQuestion[] = [];
      let ignoredRows = 0;

      for (const file of Array.from(files)) {
        const fileText = await file.text();
        const htmlRows = parseHtmlTables(fileText);
        const csvRows = parseCsv(fileText);
        const rows = htmlRows.length > 0 ? htmlRows : csvRows;
        const normalizedFileName = normalizeKey(file.name);

        rows.forEach((row, index) => {
          const rowNumber = index + 2;

          const track = resolveTrack(row.me, file.name);
          const rowId = `${normalizedFileName}-${rowNumber}`;

          const frente = row.frente ?? row.pergunta ?? row.front ?? "";
          const verso = row.verso ?? row.resposta ?? row.back ?? "";
          const enunciado = row.enunciado ?? row.stem ?? row.questao ?? "";
          const altA = row.alternativaa ?? row.a ?? "";
          const altB = row.alternativab ?? row.b ?? "";
          const altC = row.alternativac ?? row.c ?? "";
          const altD = row.alternativad ?? row.d ?? "";
          const corretaRaw = (row.correta ?? row.gabarito ?? "").toUpperCase();

          const looksLikeFlashcard = frente.length > 0 && verso.length > 0;
          const looksLikeQuestion =
            enunciado.length > 0 &&
            altA.length > 0 &&
            altB.length > 0 &&
            altC.length > 0 &&
            altD.length > 0 &&
            ["A", "B", "C", "D"].includes(corretaRaw);

          if (looksLikeFlashcard) {
            incomingFlashcards.push({
              id: `fc-${rowId}`,
              me: track,
              frente: frente.trim(),
              verso: verso.trim(),
              tags: (row.tags ?? "")
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              especialidade: (row.especialidade ?? "").trim() || undefined,
            });
            return;
          }

          if (looksLikeQuestion) {
            incomingSimulados.push({
              id: `sim-${rowId}`,
              me: track,
              tema: (row.tema ?? "").trim() || undefined,
              enunciado: enunciado.trim(),
              alternativaA: altA.trim(),
              alternativaB: altB.trim(),
              alternativaC: altC.trim(),
              alternativaD: altD.trim(),
              correta: corretaRaw as "A" | "B" | "C" | "D",
              explicacao: (row.explicacao ?? "").trim() || undefined,
            });
            return;
          }

          ignoredRows += 1;
        });
      }

      const uniqueIncomingFlashcards = dedupeById(incomingFlashcards);
      const uniqueIncomingSimulados = dedupeById(incomingSimulados);

      const mergedFlashcards = mergeById(loadFlashcards(), uniqueIncomingFlashcards);
      const mergedSimulados = mergeById(loadSimulados(), uniqueIncomingSimulados);

      let localSaveError = false;
      try {
        saveFlashcards(mergedFlashcards);
        saveSimulados(mergedSimulados);
      } catch {
        localSaveError = true;
      }
      let remoteSyncError = false;
      let remoteSyncErrorMessage = "";

      if (isSupabaseConfigured()) {
        setIsSyncingRemote(true);
        try {
          await saveFlashcardsRemote(uniqueIncomingFlashcards);
          await saveSimuladosRemote(uniqueIncomingSimulados);
        } catch (err: unknown) {
          remoteSyncError = true;
          remoteSyncErrorMessage =
            err instanceof Error ? err.message : "erro remoto desconhecido";
        } finally {
          setIsSyncingRemote(false);
        }
      }

      setReport({
        importedFlashcards: uniqueIncomingFlashcards.length,
        importedSimulados: uniqueIncomingSimulados.length,
        ignoredRows,
        filesProcessed: files.length,
      });
      addImportHistoryEntry({
        action: "import_csv",
        flashcards: uniqueIncomingFlashcards.length,
        simulados: uniqueIncomingSimulados.length,
        details: `${files.length} arquivo(s), ${ignoredRows} linha(s) ignorada(s)`,
      });
      setDataVersion((value) => value + 1);

      if (uniqueIncomingFlashcards.length === 0 && uniqueIncomingSimulados.length === 0) {
        setError(
          "Nenhum registro reconhecido. Tente exportar do Drive como Página da Web (.html) ou CSV e importe novamente.",
        );
      } else if (localSaveError && !remoteSyncError) {
        setError(
          "Importação concluída no Supabase, mas sem cache local no navegador (limite de armazenamento).",
        );
      } else if (remoteSyncError) {
        setError(
          `Importação local concluída, mas houve falha ao sincronizar com Supabase: ${remoteSyncErrorMessage}.`,
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "erro inesperado durante leitura dos arquivos";
      setError(`Falha ao importar arquivos: ${message}.`);
    } finally {
      setIsImporting(false);
    }
  }

  function handleClearData() {
    const hasData = currentTotals.flashcards > 0 || currentTotals.simulados > 0;
    if (!hasData) {
      setError("Não há dados para limpar.");
      return;
    }

    const shouldClear = window.confirm(
      "Tem certeza que deseja remover todos os cards e simulados importados?",
    );

    if (!shouldClear) {
      return;
    }

    const safetyText = window.prompt(
      'Para confirmar a exclusão total, digite exatamente: APAGAR',
    );

    if (safetyText !== "APAGAR") {
      setError("Limpeza cancelada: texto de confirmação não corresponde.");
      return;
    }

    void (async () => {
      try {
        try {
          saveFlashcards([]);
          saveSimulados([]);
        } catch {
          // Keep remote clear flow even when local storage is full/unavailable.
        }
        if (isSupabaseConfigured()) {
          setIsSyncingRemote(true);
          await clearStudyDataRemote();
          setIsSyncingRemote(false);
        }
        setReport(null);
        setError(null);
        addImportHistoryEntry({
          action: "clear_data",
          flashcards: 0,
          simulados: 0,
          details: "Base local limpa manualmente",
        });
        setDataVersion((value) => value + 1);
      } catch {
        setError("Falha ao limpar dados remotos do Supabase.");
        setIsSyncingRemote(false);
      }
    })();
  }

  function handleExportBackup() {
    const flashcards = loadFlashcards();
    const simulados = loadSimulados();
    const payload = {
      exportedAt: new Date().toISOString(),
      flashcards,
      simulados,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anesmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    addImportHistoryEntry({
      action: "export_backup",
      flashcards: flashcards.length,
      simulados: simulados.length,
      details: "Backup JSON exportado",
    });
    setDataVersion((value) => value + 1);
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) {
      setError("Selecione ao menos um item para excluir.");
      return;
    }

    const confirmDelete = window.confirm(
      `Excluir ${selectedIds.length} item(ns) selecionado(s)?`,
    );
    if (!confirmDelete) return;

    try {
      if (manageKind === "flashcards") {
        const next = loadFlashcards().filter((item) => !selectedIds.includes(item.id));
        saveFlashcards(next);
        if (isSupabaseConfigured()) {
          setIsSyncingRemote(true);
          await deleteFlashcardsRemoteByIds(selectedIds);
          setIsSyncingRemote(false);
        }
        addImportHistoryEntry({
          action: "delete_selected",
          flashcards: selectedIds.length,
          simulados: 0,
          details: "Exclusão seletiva de cards",
        });
      } else {
        const next = loadSimulados().filter((item) => !selectedIds.includes(item.id));
        saveSimulados(next);
        if (isSupabaseConfigured()) {
          setIsSyncingRemote(true);
          await deleteSimuladosRemoteByIds(selectedIds);
          setIsSyncingRemote(false);
        }
        addImportHistoryEntry({
          action: "delete_selected",
          flashcards: 0,
          simulados: selectedIds.length,
          details: "Exclusão seletiva de simulados",
        });
      }

      setSelectedIds([]);
      setError(null);
      setDataVersion((value) => value + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      setError(`Falha ao excluir itens selecionados: ${message}.`);
      setIsSyncingRemote(false);
    }
  }

  async function handleImportBackup(file: File | null) {
    if (!file) return;

    setError(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;

      if (!Array.isArray(parsed.flashcards) || !Array.isArray(parsed.simulados)) {
        setError("Backup inválido: estrutura JSON não reconhecida.");
        return;
      }

      const shouldReplace = window.confirm(
        "Deseja substituir os dados atuais pelo conteúdo do backup?",
      );

      if (!shouldReplace) {
        return;
      }

      saveFlashcards(parsed.flashcards);
      saveSimulados(parsed.simulados);
      if (isSupabaseConfigured()) {
        setIsSyncingRemote(true);
        try {
          await clearStudyDataRemote();
          await saveFlashcardsRemote(parsed.flashcards);
          await saveSimuladosRemote(parsed.simulados);
        } finally {
          setIsSyncingRemote(false);
        }
      }
      setReport({
        importedFlashcards: parsed.flashcards.length,
        importedSimulados: parsed.simulados.length,
        ignoredRows: 0,
        filesProcessed: 1,
      });
      addImportHistoryEntry({
        action: "import_backup",
        flashcards: parsed.flashcards.length,
        simulados: parsed.simulados.length,
        details: file.name,
      });
      setDataVersion((value) => value + 1);
    } catch {
      setError("Falha ao importar backup JSON. Verifique o arquivo.");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Admin"
        title="Importar cards e simulados"
        description="Selecione múltiplos CSVs exportados do Google Drive para compor o banco do app."
      />

      <AppCard className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="teal">Cards</StatusBadge>
          <StatusBadge tone="blue">Simulados</StatusBadge>
          <StatusBadge tone="purple">Importação em lote</StatusBadge>
        </div>

        <label
          htmlFor="csv-files"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/35 px-4 py-8 text-center"
        >
          <span className="text-sm font-medium text-foreground">
            Clique para selecionar arquivos CSV ou HTML
          </span>
          <span className="text-xs text-muted">
            Você pode enviar tudo de uma vez (ME1/ME2/ME3), incluindo tabelas HTML.
          </span>
        </label>
        <input
          id="csv-files"
          type="file"
          accept=".csv,text/csv,.html,.htm,text/html,.txt,text/plain"
          multiple
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-background/35 px-3 py-3">
            <p className="text-xs text-muted">Cards atuais</p>
            <p className="text-lg font-semibold text-teal">{currentTotals.flashcards}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/35 px-3 py-3">
            <p className="text-xs text-muted">Simulados atuais</p>
            <p className="text-lg font-semibold text-blue">{currentTotals.simulados}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue transition hover:opacity-90"
          >
            Exportar backup JSON
          </button>
          <button
            type="button"
            onClick={handleClearData}
            title="Ação irreversível: exige confirmação dupla"
            className="rounded-xl border border-rose/30 bg-rose/15 px-3 py-2 text-sm font-medium text-rose transition hover:opacity-90"
          >
            Limpar base importada
          </button>
        </div>
        <p className="text-xs text-muted">
          Segurança: limpar base agora exige confirmação dupla e digitar
          <span className="px-1 font-mono text-foreground">APAGAR</span>.
        </p>

        <label
          htmlFor="json-backup"
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-purple/30 bg-purple/15 px-3 py-3 text-center"
        >
          <span className="text-sm font-medium text-purple">Importar backup JSON</span>
          <span className="text-xs text-muted">
            Restaura cards e simulados exportados anteriormente.
          </span>
        </label>
        <input
          id="json-backup"
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(event) => handleImportBackup(event.target.files?.[0] ?? null)}
        />

        {isImporting ? (
          <p className="text-sm text-muted">Importando arquivos...</p>
        ) : null}
        {isSyncingRemote ? (
          <p className="text-sm text-muted">Sincronizando com Supabase...</p>
        ) : null}
        {error ? <p className="text-sm text-rose">{error}</p> : null}
      </AppCard>

      {report ? (
        <AppCard className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-teal">
            Resultado da importação
          </p>
          <p className="text-sm text-muted">
            Arquivos processados: <span className="text-foreground">{report.filesProcessed}</span>
          </p>
          <p className="text-sm text-muted">
            Cards importados: <span className="text-teal">{report.importedFlashcards}</span>
          </p>
          <p className="text-sm text-muted">
            Simulados importados: <span className="text-blue">{report.importedSimulados}</span>
          </p>
          <p className="text-sm text-muted">
            Linhas ignoradas: <span className="text-amber">{report.ignoredRows}</span>
          </p>
        </AppCard>
      ) : null}

      <AppCard className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-amber">
          Gerenciar conteúdo
        </p>
        <div className="grid grid-cols-2 gap-2">
          <StatusBadge
            as="button"
            tone="teal"
            className={
              manageKind === "flashcards" ? "ring-1 ring-teal/40" : "opacity-70"
            }
            onClick={() => setManageKind("flashcards")}
          >
            Cards
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="blue"
            className={
              manageKind === "simulados" ? "ring-1 ring-blue/40" : "opacity-70"
            }
            onClick={() => setManageKind("simulados")}
          >
            Simulados
          </StatusBadge>
        </div>

        <input
          type="text"
          value={manageQuery}
          onChange={(event) => setManageQuery(event.target.value)}
          placeholder="Buscar itens para excluir..."
          className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-amber/40 focus:outline-none"
        />

        <div className="max-h-72 space-y-2 overflow-auto pr-1">
          {filteredManageItems.slice(0, 80).map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background/35 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setSelectedIds((prev) =>
                      event.target.checked
                        ? [...prev, item.id]
                        : prev.filter((id) => id !== item.id),
                    )
                  }
                  className="mt-1"
                />
                <span className="text-xs text-muted">
                  <span className="block text-sm text-foreground">{item.title}</span>
                  {item.subtitle}
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleDeleteSelected}
          className="w-full rounded-xl border border-rose/30 bg-rose/15 px-3 py-2 text-sm font-medium text-rose transition hover:opacity-90"
        >
          Excluir selecionados ({selectedIds.length})
        </button>
      </AppCard>

      <AppCard className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-purple">
          Histórico recente
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatusBadge
            as="button"
            tone="purple"
            className={historyFilter === "all" ? "ring-1 ring-purple/40" : "opacity-70"}
            onClick={() => setHistoryFilter("all")}
          >
            Todos
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="teal"
            className={
              historyFilter === "imports" ? "ring-1 ring-teal/40" : "opacity-70"
            }
            onClick={() => setHistoryFilter("imports")}
          >
            Importações
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="blue"
            className={
              historyFilter === "backups" ? "ring-1 ring-blue/40" : "opacity-70"
            }
            onClick={() => setHistoryFilter("backups")}
          >
            Backups
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="rose"
            className={historyFilter === "clear" ? "ring-1 ring-rose/40" : "opacity-70"}
            onClick={() => setHistoryFilter("clear")}
          >
            Limpeza
          </StatusBadge>
        </div>

        <input
          type="text"
          value={historyQuery}
          onChange={(event) => setHistoryQuery(event.target.value)}
          placeholder="Buscar no histórico (arquivo, ação, data...)"
          className="w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
        />

        {filteredHistory.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum resultado encontrado para os filtros selecionados.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleHistory.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-border bg-background/35 px-3 py-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {formatAction(entry.action)}
                </p>
                <p className="text-xs text-muted">
                  {new Date(entry.timestamp).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Cards: <span className="text-teal">{entry.flashcards}</span> ·
                  Simulados: <span className="text-blue">{entry.simulados}</span>
                </p>
                {entry.details ? (
                  <p className="mt-1 text-xs text-muted">{entry.details}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {filteredHistory.length > visibleHistoryCount ? (
          <button
            type="button"
            onClick={() =>
              setVisibleHistoryCount((count) => count + HISTORY_PAGE_SIZE)
            }
            className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground transition hover:bg-background/55"
          >
            Carregar mais
          </button>
        ) : null}
      </AppCard>
    </main>
  );
}

function formatAction(
  action:
    | "import_csv"
    | "import_backup"
    | "export_backup"
    | "clear_data"
    | "delete_selected",
) {
  if (action === "import_csv") return "Importação CSV";
  if (action === "import_backup") return "Restauração de backup";
  if (action === "export_backup") return "Exportação de backup";
  if (action === "delete_selected") return "Exclusão seletiva";
  return "Limpeza de base";
}

function matchesFilter(
  action:
    | "import_csv"
    | "import_backup"
    | "export_backup"
    | "clear_data"
    | "delete_selected",
  filter: HistoryFilter,
) {
  if (filter === "all") return true;
  if (filter === "imports") {
    return (
      action === "import_csv" || action === "import_backup" || action === "delete_selected"
    );
  }
  if (filter === "backups") return action === "export_backup" || action === "import_backup";
  return action === "clear_data";
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values());
}
