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
  parseSimuladoHtml,
  resolveTrack,
  saveFlashcards,
  saveFlashcardsRemote,
  saveSimulados,
  saveSimuladosRemote,
  suggestStudyReferences,
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
type ImportMode = "all" | "flashcards" | "simulados";
const HISTORY_PAGE_SIZE = 5;
type ParserDebugItem = {
  fileName: string;
  htmlRows: number;
  simuladoRows: number;
  csvRows: number;
  chosenRows: number;
  expectedQuestions: number | null;
};

type IncompleteSimuladoGroup = {
  sourceKey: string;
  itemCount: number;
  expectedQuestions: number;
};

type DuplicateSimuladoGroup = {
  groupKey: string;
  preview: string;
  ids: string[];
};

type DuplicateFlashcardGroup = {
  groupKey: string;
  preview: string;
  ids: string[];
};

export default function ImportarPage() {
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [isSyncingRemote, setIsSyncingRemote] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("all");
  const [manageKind, setManageKind] = useState<"flashcards" | "simulados">("flashcards");
  const [manageQuery, setManageQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [parserDebug, setParserDebug] = useState<ParserDebugItem[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedIncompleteGroups, setSelectedIncompleteGroups] = useState<string[]>([]);
  const [selectedDuplicateGroups, setSelectedDuplicateGroups] = useState<string[]>([]);
  const [selectedDuplicateCardGroups, setSelectedDuplicateCardGroups] = useState<string[]>([]);

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
  const incompleteSimuladoGroups = useMemo(() => {
    const grouped = new Map<string, number>();
    loadSimulados().forEach((item) => {
      const sourceKey = extractSimuladoSourceKey(item.id);
      if (!sourceKey) return;
      grouped.set(sourceKey, (grouped.get(sourceKey) ?? 0) + 1);
    });

    const groups: IncompleteSimuladoGroup[] = [];
    grouped.forEach((itemCount, sourceKey) => {
      const expectedQuestions = inferExpectedQuestionCount(sourceKey);
      if (!expectedQuestions) return;
      if (itemCount < expectedQuestions) {
        groups.push({ sourceKey, itemCount, expectedQuestions });
      }
    });

    return groups.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  }, [dataVersion, report]);
  const duplicateSimuladoGroups = useMemo(() => {
    const grouped = new Map<string, { ids: string[]; preview: string }>();
    loadSimulados().forEach((item) => {
      const groupKey = buildSimuladoDuplicateKey(item);
      const preview = item.enunciado.trim().replace(/\s+/g, " ").slice(0, 130);
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.ids.push(item.id);
      } else {
        grouped.set(groupKey, { ids: [item.id], preview });
      }
    });

    const duplicates: DuplicateSimuladoGroup[] = [];
    grouped.forEach((value, groupKey) => {
      if (value.ids.length < 2) return;
      duplicates.push({
        groupKey,
        preview: value.preview,
        ids: value.ids,
      });
    });

    return duplicates.sort((a, b) => b.ids.length - a.ids.length);
  }, [dataVersion, report]);
  const duplicateFlashcardGroups = useMemo(() => {
    const grouped = new Map<string, { ids: string[]; preview: string }>();
    loadFlashcards().forEach((item) => {
      const groupKey = buildFlashcardDuplicateKey(item);
      const preview = item.frente.trim().replace(/\s+/g, " ").slice(0, 130);
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.ids.push(item.id);
      } else {
        grouped.set(groupKey, { ids: [item.id], preview });
      }
    });

    const duplicates: DuplicateFlashcardGroup[] = [];
    grouped.forEach((value, groupKey) => {
      if (value.ids.length < 2) return;
      duplicates.push({
        groupKey,
        preview: value.preview,
        ids: value.ids,
      });
    });

    return duplicates.sort((a, b) => b.ids.length - a.ids.length);
  }, [dataVersion, report]);

  useEffect(() => {
    setVisibleHistoryCount(HISTORY_PAGE_SIZE);
  }, [historyFilter, historyQuery, dataVersion]);

  useEffect(() => {
    setSelectedIds([]);
  }, [manageKind, dataVersion]);
  useEffect(() => {
    setSelectedIncompleteGroups([]);
    setSelectedDuplicateGroups([]);
    setSelectedDuplicateCardGroups([]);
  }, [dataVersion]);

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
    setImportWarnings([]);

    try {
      const detectedFlashcards: Flashcard[] = [];
      const detectedSimulados: SimuladoQuestion[] = [];
      let ignoredRows = 0;
      const debugItems: ParserDebugItem[] = [];
      const warnings: string[] = [];

      for (const file of Array.from(files)) {
        const fileText = await file.text();
        const simuladoRows = parseSimuladoHtml(fileText);
        const htmlRows = parseHtmlTables(fileText);
        const csvRows = parseCsv(fileText);
        const expectedQuestions = inferExpectedQuestionCount(file.name);
        const rows =
          simuladoRows.length > 0
            ? simuladoRows
            : htmlRows.length > 0
              ? htmlRows
              : csvRows;
        debugItems.push({
          fileName: file.name,
          simuladoRows: simuladoRows.length,
          htmlRows: htmlRows.length,
          csvRows: csvRows.length,
          chosenRows: rows.length,
          expectedQuestions,
        });
        if (expectedQuestions) {
          if (simuladoRows.length === 0 && csvRows.length >= expectedQuestions) {
            warnings.push(
              `${file.name}: esperado ${expectedQuestions}, mas parser de simulado detectou 0 (arquivo pode estar em formato não padronizado).`,
            );
          } else if (simuladoRows.length > 0 && simuladoRows.length < expectedQuestions) {
            warnings.push(
              `${file.name}: esperado ${expectedQuestions}, detectado ${simuladoRows.length} no parser de simulado (arquivo possivelmente incompleto).`,
            );
          }
        }
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
            const normalizedFront = normalizeQuestionLabel(frente.trim());
            const normalizedBack = normalizeAnswerReferenceBlock(verso.trim());
            detectedFlashcards.push({
              id: `fc-${rowId}`,
              me: track,
              frente: normalizedFront,
              verso: normalizedBack,
              tags: (row.tags ?? "")
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              especialidade: (row.especialidade ?? "").trim() || undefined,
            });
            return;
          }

          if (looksLikeQuestion) {
            const normalizedStem = normalizeQuestionLabel(enunciado.trim());
            detectedSimulados.push({
              id: `sim-${rowId}`,
              me: track,
              tema: (row.tema ?? "").trim() || undefined,
              enunciado: normalizedStem,
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

      let incomingFlashcards = detectedFlashcards;
      let incomingSimulados = detectedSimulados;
      let modeFallbackNotice: string | null = null;

      if (importMode === "flashcards") {
        incomingSimulados = [];
        if (incomingFlashcards.length === 0 && detectedSimulados.length > 0) {
          incomingSimulados = detectedSimulados;
          modeFallbackNotice =
            "Modo Cards estava ativo, mas só simulados foram detectados. Importação automática de simulados aplicada.";
        }
      } else if (importMode === "simulados") {
        incomingFlashcards = [];
        if (incomingSimulados.length === 0 && detectedFlashcards.length > 0) {
          incomingFlashcards = detectedFlashcards;
          modeFallbackNotice =
            "Modo Simulados estava ativo, mas só cards foram detectados. Importação automática de cards aplicada.";
        }
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
      setParserDebug(debugItems);
      setImportWarnings(warnings);
      addImportHistoryEntry({
        action: "import_csv",
        flashcards: uniqueIncomingFlashcards.length,
        simulados: uniqueIncomingSimulados.length,
        details: `${files.length} arquivo(s), modo ${formatImportMode(importMode)}, ${ignoredRows} linha(s) ignorada(s)`,
      });
      setDataVersion((value) => value + 1);

      if (uniqueIncomingFlashcards.length === 0 && uniqueIncomingSimulados.length === 0) {
        const modeHint =
          importMode === "flashcards"
            ? "Modo atual é Somente cards. Para simulados, selecione o botão Simulados ou Importação em lote."
            : importMode === "simulados"
              ? "Modo atual é Somente simulados. Para cards, selecione o botão Cards ou Importação em lote."
              : "Tente exportar do Drive como Página da Web (.html) ou CSV e importe novamente.";
        setError(`Nenhum registro reconhecido. ${modeHint}`);
      } else if (localSaveError && !remoteSyncError) {
        setError(
          "Importação concluída no Supabase, mas sem cache local no navegador (limite de armazenamento).",
        );
      } else if (remoteSyncError) {
        setError(
          `Importação local concluída, mas houve falha ao sincronizar com Supabase: ${remoteSyncErrorMessage}.`,
        );
      } else if (modeFallbackNotice) {
        setError(modeFallbackNotice);
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

  async function handleDeleteIncompleteSimulados() {
    if (selectedIncompleteGroups.length === 0) {
      setError("Selecione ao menos um grupo de simulados incompletos para excluir.");
      return;
    }

    const allSimulados = loadSimulados();
    const idsToDelete = allSimulados
      .filter((item) => {
        const sourceKey = extractSimuladoSourceKey(item.id);
        return sourceKey ? selectedIncompleteGroups.includes(sourceKey) : false;
      })
      .map((item) => item.id);

    if (idsToDelete.length === 0) {
      setError("Nenhum simulado incompleto encontrado para os grupos selecionados.");
      return;
    }

    const confirmDelete = window.confirm(
      `Excluir ${idsToDelete.length} simulado(s) incompleto(s) dos grupos selecionados?`,
    );
    if (!confirmDelete) return;

    try {
      const next = allSimulados.filter((item) => !idsToDelete.includes(item.id));
      saveSimulados(next);
      if (isSupabaseConfigured()) {
        setIsSyncingRemote(true);
        await deleteSimuladosRemoteByIds(idsToDelete);
        setIsSyncingRemote(false);
      }
      addImportHistoryEntry({
        action: "delete_selected",
        flashcards: 0,
        simulados: idsToDelete.length,
        details: "Exclusão de simulados incompletos por grupo",
      });
      setSelectedIncompleteGroups([]);
      setError(null);
      setDataVersion((value) => value + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      setError(`Falha ao excluir simulados incompletos: ${message}.`);
      setIsSyncingRemote(false);
    }
  }

  async function handleDeleteDuplicateSimulados() {
    if (selectedDuplicateGroups.length === 0) {
      setError("Selecione ao menos um grupo de perguntas repetidas para excluir.");
      return;
    }

    const selectedGroups = duplicateSimuladoGroups.filter((group) =>
      selectedDuplicateGroups.includes(group.groupKey),
    );

    const idsToDelete: string[] = [];
    selectedGroups.forEach((group) => {
      const sortedIds = [...group.ids].sort((a, b) => a.localeCompare(b));
      idsToDelete.push(...sortedIds.slice(1));
    });

    if (idsToDelete.length === 0) {
      setError("Nenhum item duplicado elegível para exclusão foi encontrado.");
      return;
    }

    const confirmDelete = window.confirm(
      `Excluir ${idsToDelete.length} item(ns) repetido(s)? Será mantido 1 por grupo.`,
    );
    if (!confirmDelete) return;

    try {
      const next = loadSimulados().filter((item) => !idsToDelete.includes(item.id));
      saveSimulados(next);
      if (isSupabaseConfigured()) {
        setIsSyncingRemote(true);
        await deleteSimuladosRemoteByIds(idsToDelete);
        setIsSyncingRemote(false);
      }
      addImportHistoryEntry({
        action: "delete_selected",
        flashcards: 0,
        simulados: idsToDelete.length,
        details: "Exclusão de perguntas repetidas (mantendo 1 por grupo)",
      });
      setSelectedDuplicateGroups([]);
      setError(null);
      setDataVersion((value) => value + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      setError(`Falha ao excluir perguntas repetidas: ${message}.`);
      setIsSyncingRemote(false);
    }
  }

  async function handleDeleteDuplicateFlashcards() {
    if (selectedDuplicateCardGroups.length === 0) {
      setError("Selecione ao menos um grupo de cards repetidos para excluir.");
      return;
    }

    const selectedGroups = duplicateFlashcardGroups.filter((group) =>
      selectedDuplicateCardGroups.includes(group.groupKey),
    );

    const idsToDelete: string[] = [];
    selectedGroups.forEach((group) => {
      const sortedIds = [...group.ids].sort((a, b) => a.localeCompare(b));
      idsToDelete.push(...sortedIds.slice(1));
    });

    if (idsToDelete.length === 0) {
      setError("Nenhum card duplicado elegível para exclusão foi encontrado.");
      return;
    }

    const confirmDelete = window.confirm(
      `Excluir ${idsToDelete.length} card(s) repetido(s)? Será mantido 1 por grupo.`,
    );
    if (!confirmDelete) return;

    try {
      const next = loadFlashcards().filter((item) => !idsToDelete.includes(item.id));
      saveFlashcards(next);
      if (isSupabaseConfigured()) {
        setIsSyncingRemote(true);
        await deleteFlashcardsRemoteByIds(idsToDelete);
        setIsSyncingRemote(false);
      }
      addImportHistoryEntry({
        action: "delete_selected",
        flashcards: idsToDelete.length,
        simulados: 0,
        details: "Exclusão de cards repetidos (mantendo 1 por grupo)",
      });
      setSelectedDuplicateCardGroups([]);
      setError(null);
      setDataVersion((value) => value + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      setError(`Falha ao excluir cards repetidos: ${message}.`);
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
          <StatusBadge
            as="button"
            tone="teal"
            className={importMode === "flashcards" ? "ring-1 ring-teal/40" : "opacity-70"}
            onClick={() => setImportMode("flashcards")}
          >
            Cards
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="blue"
            className={importMode === "simulados" ? "ring-1 ring-blue/40" : "opacity-70"}
            onClick={() => setImportMode("simulados")}
          >
            Simulados
          </StatusBadge>
          <StatusBadge
            as="button"
            tone="purple"
            className={importMode === "all" ? "ring-1 ring-purple/40" : "opacity-70"}
            onClick={() => setImportMode("all")}
          >
            Importação em lote
          </StatusBadge>
        </div>

        <label
          htmlFor="csv-files"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/35 px-4 py-8 text-center"
        >
          <span className="text-sm font-medium text-foreground">
            Clique para selecionar arquivos CSV ou HTML
          </span>
          <span className="text-xs text-muted">
            Modo atual:{" "}
            <span className="font-medium text-foreground">{formatImportMode(importMode)}</span>{" "}
            (ME1/ME2/ME3, incluindo tabelas HTML).
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
        {importWarnings.length > 0 ? (
          <div className="space-y-1 rounded-xl border border-amber/25 bg-amber/10 p-3 text-xs text-amber">
            <p className="font-medium">Avisos de consistência</p>
            {importWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
      </AppCard>

      {parserDebug.length > 0 ? (
        <AppCard className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-amber">
            Diagnóstico de parser
          </p>
          <div className="space-y-2">
            {parserDebug.map((item) => (
              <div
                key={item.fileName}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-xs text-muted"
              >
                <p className="text-sm text-foreground">{item.fileName}</p>
                <p>
                  simulado: <span className="text-blue">{item.simuladoRows}</span> · html:{" "}
                  <span className="text-teal">{item.htmlRows}</span> · csv:{" "}
                  <span className="text-purple">{item.csvRows}</span> · usado:{" "}
                  <span className="text-foreground">{item.chosenRows}</span>
                  {item.expectedQuestions ? (
                    <>
                      {" "}
                      · esperado: <span className="text-amber">{item.expectedQuestions}</span>
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </AppCard>
      ) : null}

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
        <p className="font-mono text-xs uppercase tracking-wider text-rose">
          Simulados incompletos
        </p>
        <p className="text-xs text-muted">
          Exclua apenas grupos incompletos sem afetar os simulados completos.
        </p>
        {incompleteSimuladoGroups.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum grupo incompleto detectado (com base no esperado por arquivo 30/50).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedIncompleteGroups(
                    incompleteSimuladoGroups.map((group) => group.sourceKey),
                  )
                }
                className="rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue transition hover:opacity-90"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedIncompleteGroups([])}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-background/55"
              >
                Limpar seleção
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {incompleteSimuladoGroups.map((group) => {
                const checked = selectedIncompleteGroups.includes(group.sourceKey);
                return (
                  <label
                    key={group.sourceKey}
                    className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background/35 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setSelectedIncompleteGroups((prev) =>
                          event.target.checked
                            ? [...prev, group.sourceKey]
                            : prev.filter((key) => key !== group.sourceKey),
                        )
                      }
                      className="mt-1"
                    />
                    <span className="text-xs text-muted">
                      <span className="block text-sm text-foreground">{group.sourceKey}</span>
                      detectado {group.itemCount} / esperado {group.expectedQuestions}
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleDeleteIncompleteSimulados}
              className="w-full rounded-xl border border-rose/30 bg-rose/15 px-3 py-2 text-sm font-medium text-rose transition hover:opacity-90"
            >
              Excluir incompletos selecionados ({selectedIncompleteGroups.length})
            </button>
          </>
        )}
      </AppCard>

      <AppCard className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-teal">
          Cards repetidos
        </p>
        <p className="text-xs text-muted">
          Identifica duplicados por conteúdo (frente + verso) e remove os repetidos, mantendo 1
          registro por grupo.
        </p>
        {duplicateFlashcardGroups.length === 0 ? (
          <p className="text-sm text-muted">Nenhum grupo de cards repetidos detectado.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedDuplicateCardGroups(
                    duplicateFlashcardGroups.map((group) => group.groupKey),
                  )
                }
                className="rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue transition hover:opacity-90"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuplicateCardGroups([])}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-background/55"
              >
                Limpar seleção
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {duplicateFlashcardGroups.map((group) => {
                const checked = selectedDuplicateCardGroups.includes(group.groupKey);
                return (
                  <label
                    key={group.groupKey}
                    className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background/35 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setSelectedDuplicateCardGroups((prev) =>
                          event.target.checked
                            ? [...prev, group.groupKey]
                            : prev.filter((key) => key !== group.groupKey),
                        )
                      }
                      className="mt-1"
                    />
                    <span className="text-xs text-muted">
                      <span className="block text-sm text-foreground">{group.preview}</span>
                      repetições: {group.ids.length} (serão removidos {group.ids.length - 1})
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleDeleteDuplicateFlashcards}
              className="w-full rounded-xl border border-teal/30 bg-teal/15 px-3 py-2 text-sm font-medium text-teal transition hover:opacity-90"
            >
              Excluir cards repetidos selecionados ({selectedDuplicateCardGroups.length})
            </button>
          </>
        )}
      </AppCard>

      <AppCard className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-purple">
          Simulados com perguntas repetidas
        </p>
        <p className="text-xs text-muted">
          Identifica duplicados por conteúdo (enunciado + alternativas + gabarito) e remove os
          repetidos, mantendo 1 registro por grupo.
        </p>
        {duplicateSimuladoGroups.length === 0 ? (
          <p className="text-sm text-muted">Nenhum grupo de perguntas repetidas detectado.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedDuplicateGroups(
                    duplicateSimuladoGroups.map((group) => group.groupKey),
                  )
                }
                className="rounded-xl border border-blue/30 bg-blue/15 px-3 py-2 text-sm font-medium text-blue transition hover:opacity-90"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuplicateGroups([])}
                className="rounded-xl border border-border bg-background/35 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-background/55"
              >
                Limpar seleção
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {duplicateSimuladoGroups.map((group) => {
                const checked = selectedDuplicateGroups.includes(group.groupKey);
                return (
                  <label
                    key={group.groupKey}
                    className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background/35 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setSelectedDuplicateGroups((prev) =>
                          event.target.checked
                            ? [...prev, group.groupKey]
                            : prev.filter((key) => key !== group.groupKey),
                        )
                      }
                      className="mt-1"
                    />
                    <span className="text-xs text-muted">
                      <span className="block text-sm text-foreground">{group.preview}</span>
                      repetições: {group.ids.length} (serão removidos {group.ids.length - 1})
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleDeleteDuplicateSimulados}
              className="w-full rounded-xl border border-purple/30 bg-purple/15 px-3 py-2 text-sm font-medium text-purple transition hover:opacity-90"
            >
              Excluir repetidos selecionados ({selectedDuplicateGroups.length})
            </button>
          </>
        )}
      </AppCard>

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

function formatImportMode(mode: "all" | "flashcards" | "simulados") {
  if (mode === "all") return "Importação em lote";
  if (mode === "flashcards") return "Somente cards";
  return "Somente simulados";
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values());
}

function inferExpectedQuestionCount(fileName: string) {
  const normalized = normalizeKey(fileName);
  if (normalized.includes("50quest")) return 50;
  if (normalized.includes("30q") || normalized.includes("30quest")) return 30;
  if (normalized.includes("provaa") || normalized.includes("provab")) return 30;
  return null;
}

function extractSimuladoSourceKey(id: string) {
  if (!id.startsWith("sim-")) return null;
  const withoutPrefix = id.slice(4);
  return withoutPrefix.replace(/-\d+$/, "");
}

function normalizeQuestionLabel(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:#\s*)?(?:q(?:uest[aã]o)?\s*)?(\d{1,3})[\)\.\-:–—\s]*(.*)$/i);
  if (!match) return trimmed;
  const suffix = (match[2] ?? "").trim();
  if (!suffix) return trimmed;
  return `${match[1]}) ${suffix}`;
}

function normalizeAnswerReferenceBlock(value: string) {
  if (!value) return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  const refMatch = normalized.match(/(?:refer[eê]ncias?|fontes?|bibliografia)\s*:\s*([\s\S]*)$/i);
  if (refMatch?.[1]?.trim()) {
    const answerOnly = normalized.replace(
      /(?:refer[eê]ncias?|fontes?|bibliografia)\s*:[\s\S]*$/i,
      "",
    );
    return `Resposta: ${answerOnly.trim()}\nReferências: ${refMatch[1].trim()}`;
  }
  const suggestions = suggestStudyReferences(normalized);
  if (suggestions.length > 0) {
    return `Resposta: ${normalized}\nReferências: ${suggestions.join("; ")}`;
  }
  return `Resposta: ${normalized}\nReferências: Não informada no material importado.`;
}

function buildSimuladoDuplicateKey(item: SimuladoQuestion) {
  const parts = [
    normalizeForDuplicate(item.enunciado),
    normalizeForDuplicate(item.alternativaA),
    normalizeForDuplicate(item.alternativaB),
    normalizeForDuplicate(item.alternativaC),
    normalizeForDuplicate(item.alternativaD),
    normalizeForDuplicate(item.correta),
  ];
  return parts.join("||");
}

function buildFlashcardDuplicateKey(item: Flashcard) {
  const parts = [
    normalizeForDuplicate(item.frente),
    normalizeForDuplicate(item.verso),
    normalizeForDuplicate(item.especialidade ?? ""),
  ];
  return parts.join("||");
}

function normalizeForDuplicate(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
