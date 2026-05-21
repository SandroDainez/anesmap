"use client";

import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import {
  saveAssessmentSnapshot,
  loadAssessmentSnapshots,
  saveProcedureCounts,
  loadProcedureCounts,
  loadMyProfile,
} from "@/lib/user-study";

// ── Types ────────────────────────────────────────────────────────────────────

type Rating = 1 | 2 | 3 | 4 | 5;
type Tab = "competencias" | "procedimentos" | "evolucao";

type Domain = {
  id: string;
  label: string;
  sublabel: string;
  color: string;
};

type Procedure = {
  id: string;
  label: string;
  categoria: string;
  meta: number;
};

type SnapshotEntry = {
  date: string;
  ratings: Record<string, Rating>;
};

// ── Data ─────────────────────────────────────────────────────────────────────

const DOMAINS: Domain[] = [
  { id: "farmacologia", label: "Farmacologia", sublabel: "Fármacos, doses, interações", color: "#2dd4bf" },
  { id: "via_aerea", label: "Via Aérea", sublabel: "IOT, videolaringo, DSG, CICO", color: "#60a5fa" },
  { id: "anestesia_geral", label: "Anestesia Geral", sublabel: "Indução, manutenção, emergência", color: "#a78bfa" },
  { id: "anestesia_regional", label: "Regional", sublabel: "Raqui, peridural, bloqueios", color: "#f472b6" },
  { id: "hemodinamica", label: "Hemodinâmica", sublabel: "Vasopressores, volemia, transfusão", color: "#fb923c" },
  { id: "ventilacao", label: "Ventilação", sublabel: "Parâmetros, estratégias protetoras", color: "#facc15" },
  { id: "emergencias", label: "Emergências", sublabel: "PCR, anafilaxia, HM, LAST", color: "#f87171" },
  { id: "pediatria", label: "Pediatria", sublabel: "Indução inalatória, dosagens pediátricas", color: "#34d399" },
];

const PROCEDURES: Procedure[] = [
  { id: "iot_laringoscopia", label: "IOT por laringoscopia direta", categoria: "Via Aérea", meta: 50 },
  { id: "iot_video", label: "IOT por videolaringoscopia", categoria: "Via Aérea", meta: 20 },
  { id: "dsg_insercao", label: "Inserção de dispositivo supraglótico", categoria: "Via Aérea", meta: 30 },
  { id: "cricotireoidostomia", label: "Cricotireoidostomia (simulação ou real)", categoria: "Via Aérea", meta: 5 },
  { id: "raquianestesia", label: "Raquianestesia", categoria: "Regional", meta: 50 },
  { id: "peridural", label: "Anestesia peridural", categoria: "Regional", meta: 30 },
  { id: "peridural_cateter", label: "Cateter peridural", categoria: "Regional", meta: 20 },
  { id: "bloqueio_plexo", label: "Bloqueio de plexo braquial (qualquer abordagem)", categoria: "Regional", meta: 20 },
  { id: "bloqueio_us", label: "Bloqueio periférico guiado por US", categoria: "Regional", meta: 20 },
  { id: "acesso_central", label: "Acesso venoso central", categoria: "Hemodinâmica", meta: 20 },
  { id: "arteria_radial", label: "Cateter arterial radial", categoria: "Hemodinâmica", meta: 30 },
  { id: "rcpbasica", label: "RCP básica (certificação BLS)", categoria: "Emergências", meta: 1 },
  { id: "rcpavancada", label: "RCP avançada (certificação ACLS)", categoria: "Emergências", meta: 1 },
  { id: "cardioversao", label: "Cardioversão elétrica sincronizada", categoria: "Emergências", meta: 5 },
  { id: "pediatria_inducao", label: "Indução inalatória em pediatria (< 12 anos)", categoria: "Pediatria", meta: 20 },
];

const RATING_LABELS: Record<Rating, string> = {
  1: "Sem experiência prática",
  2: "Conhecimento teórico",
  3: "Execução supervisionada",
  4: "Execução com autonomia",
  5: "Referência para equipe",
};

const RATING_COLORS: Record<Rating, string> = {
  1: "text-rose",
  2: "text-amber",
  3: "text-yellow-400",
  4: "text-teal",
  5: "text-purple",
};

const STORAGE_KEY = "anesmap.avaliacao.v2";
const PROCEDURES_KEY = "anesmap.procedimentos.v1";
const HISTORY_KEY = "anesmap.avaliacao.history.v1";

// ── Radar SVG ─────────────────────────────────────────────────────────────────

function RadarChart({ ratings, domains }: { ratings: Record<string, Rating>; domains: Domain[] }) {
  const svgW = 320;
  const svgH = 300;
  const cx = 160;
  const cy = 150;
  const maxR = 95;
  const n = domains.length;

  const angleStep = (2 * Math.PI) / n;
  const getPoint = (i: number, r: number) => {
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridLevels = [1, 2, 3, 4, 5];

  const dataPoints = domains.map((d, i) => {
    const val = (ratings[d.id] ?? 1) as Rating;
    return getPoint(i, (val / 5) * maxR);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto w-full max-w-sm">
      {/* Grid circles */}
      {gridLevels.map((level) => {
        const r = (level / 5) * maxR;
        const points = Array.from({ length: n }, (_, i) => getPoint(i, r));
        const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
        return (
          <path
            key={level}
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* Spokes */}
      {domains.map((_, i) => {
        const outer = getPoint(i, maxR);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(45,212,191,0.15)" stroke="#2dd4bf" strokeWidth="1.5" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={domains[i].color} />
      ))}

      {/* Labels */}
      {domains.map((d, i) => {
        const labelR = maxR + 28;
        const p = getPoint(i, labelR);
        const shortLabel = d.label
          .replace("Anestesia ", "Anest. ")
          .replace("Hemodinâmica", "Hemod.");
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.6)"
          >
            {shortLabel}
          </text>
        );
      })}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AvaliacaoPage() {
  const [tab, setTab] = useState<Tab>("competencias");
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [procedureCounts, setProcedureCounts] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<SnapshotEntry[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [userMe, setUserMe] = useState<string | null>(null);

  useEffect(() => {
    // 1) Load from localStorage immediately for fast display
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRatings(JSON.parse(raw));
      const rawP = localStorage.getItem(PROCEDURES_KEY);
      if (rawP) setProcedureCounts(JSON.parse(rawP));
      const rawH = localStorage.getItem(HISTORY_KEY);
      if (rawH) setHistory(JSON.parse(rawH));
    } catch {}

    // 2) Then load from Supabase (source of truth) and override local
    void (async () => {
      const [remoteSnapshots, remoteProcedures, profile] = await Promise.all([
        loadAssessmentSnapshots(),
        loadProcedureCounts(),
        loadMyProfile(),
      ]);

      // Store user's ME for tagging snapshots
      if (profile) {
        const me = profile.assigned_track_simulados ?? profile.assigned_track ?? null;
        if (me && me !== "ALL") setUserMe(me);
      }

      if (remoteSnapshots.length > 0) {
        // Build history from remote snapshots
        const remoteHistory = remoteSnapshots.map((s) => ({
          date: new Date(s.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "2-digit",
          }),
          ratings: s.ratings as Record<string, Rating>,
        }));
        setHistory(remoteHistory);
        // Set current ratings to the most recent snapshot
        setRatings(remoteSnapshots[0].ratings as Record<string, Rating>);
      } else {
        // Supabase vazio — migrar automaticamente dados do localStorage
        try {
          const localRaw = localStorage.getItem(STORAGE_KEY);
          const localHistRaw = localStorage.getItem(HISTORY_KEY);
          const localHistory: SnapshotEntry[] = localHistRaw ? JSON.parse(localHistRaw) : [];
          const baseRatings: Record<string, Rating> = localRaw ? JSON.parse(localRaw) : {};

          if (localHistory.length > 0) {
            // Upload cada snapshot do histórico local (do mais antigo para o mais recente)
            const toUpload = [...localHistory].reverse();
            for (const snap of toUpload) {
              await saveAssessmentSnapshot(snap.ratings as Record<string, Rating>, profile?.assigned_track_simulados ?? profile?.assigned_track ?? undefined);
            }
          } else if (Object.keys(baseRatings).length > 0) {
            // Sem histórico mas tem ratings atuais
            await saveAssessmentSnapshot(baseRatings, profile?.assigned_track_simulados ?? profile?.assigned_track ?? undefined);
          }
        } catch {
          // Falha silenciosa — dados locais continuam disponíveis
        }
      }

      if (remoteProcedures) {
        setProcedureCounts(remoteProcedures);
      } else {
        // Migrar contagem de procedimentos do localStorage
        try {
          const localProcRaw = localStorage.getItem(PROCEDURES_KEY);
          if (localProcRaw) {
            const localCounts = JSON.parse(localProcRaw) as Record<string, number>;
            if (Object.keys(localCounts).length > 0) {
              await saveProcedureCounts(localCounts);
            }
          }
        } catch {
          // Falha silenciosa
        }
      }
    })();
  }, []);

  function setRating(id: string, val: Rating) {
    setRatings((prev) => ({ ...prev, [id]: val }));
  }

  function setProcedureCount(id: string, val: number) {
    const next = { ...procedureCounts, [id]: Math.max(0, val) };
    setProcedureCounts(next);
    localStorage.setItem(PROCEDURES_KEY, JSON.stringify(next));
    void saveProcedureCounts(next);
  }

  function saveSnapshot() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
    const entry: SnapshotEntry = {
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }),
      ratings: { ...ratings },
    };
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setSavedAt(entry.date);
    // Save to Supabase with ME tag (fire-and-forget)
    void saveAssessmentSnapshot(ratings, userMe ?? undefined);
  }

  const avgRating = useMemo(() => {
    const vals = DOMAINS.map((d) => ratings[d.id] ?? 1);
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [ratings]);

  const categories = useMemo(
    () => [...new Set(PROCEDURES.map((p) => p.categoria))],
    [],
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 06"
        title="Autoavaliação"
        description="Avalie suas competências, registre procedimentos e acompanhe sua evolução."
      />

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "competencias", label: "Competências" },
          { id: "procedimentos", label: "Procedimentos" },
          { id: "evolucao", label: "Evolução" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl border py-2 text-xs font-medium transition ${
              tab === t.id
                ? "border-purple/40 bg-purple/15 text-purple"
                : "border-border bg-background/35 text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── COMPETÊNCIAS ── */}
      {tab === "competencias" && (
        <>
          <AppCard>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs uppercase tracking-wider text-purple">Radar de competências</p>
              <span className="rounded-lg border border-purple/30 bg-purple/10 px-2 py-0.5 text-xs text-purple font-medium">
                Média: {avgRating}/5
              </span>
            </div>
            <RadarChart ratings={ratings} domains={DOMAINS} />
          </AppCard>

          <AppCard>
            <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1">Escala de proficiência</p>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {([1, 2, 3, 4, 5] as Rating[]).map((r) => (
                <div key={r} className="flex items-center gap-2 text-xs text-muted">
                  <span className={`font-bold ${RATING_COLORS[r]}`}>{r}</span>
                  <span>{RATING_LABELS[r]}</span>
                </div>
              ))}
            </div>
          </AppCard>

          <section className="space-y-3">
            {DOMAINS.map((domain) => {
              const current = (ratings[domain.id] ?? 1) as Rating;
              return (
                <AppCard key={domain.id}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{domain.label}</p>
                      <p className="text-xs text-muted">{domain.sublabel}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold"
                      style={{ borderColor: `${domain.color}40`, color: domain.color, backgroundColor: `${domain.color}15` }}
                    >
                      {current}/5
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([1, 2, 3, 4, 5] as Rating[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRating(domain.id, r)}
                        title={RATING_LABELS[r]}
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          current === r
                            ? "border-transparent text-background"
                            : "border-border bg-background/35 text-muted hover:text-foreground"
                        }`}
                        style={current === r ? { backgroundColor: domain.color } : {}}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted text-center">{RATING_LABELS[current]}</p>
                </AppCard>
              );
            })}
          </section>

          <button
            type="button"
            onClick={saveSnapshot}
            className="w-full rounded-xl border border-purple/30 bg-purple/15 py-3 text-sm font-medium text-purple transition hover:opacity-90"
          >
            Salvar avaliação{savedAt ? ` · última: ${savedAt}` : ""}
          </button>
        </>
      )}

      {/* ── PROCEDIMENTOS ── */}
      {tab === "procedimentos" && (
        <>
          <AppCard>
            <p className="text-xs text-muted">
              Registre quantas vezes realizou cada procedimento. Os dados ficam salvos no seu dispositivo
              e ajudam a acompanhar sua evolução prática ao longo da residência.
            </p>
          </AppCard>

          {categories.map((cat) => (
            <div key={cat}>
              <p className="mb-2 px-1 font-mono text-xs uppercase tracking-wider text-muted">{cat}</p>
              <div className="space-y-2">
                {PROCEDURES.filter((p) => p.categoria === cat).map((proc) => {
                  const count = procedureCounts[proc.id] ?? 0;
                  const pct = Math.min(100, Math.round((count / proc.meta) * 100));
                  const barColor = pct >= 100 ? "bg-teal" : pct >= 50 ? "bg-blue" : "bg-amber";
                  return (
                    <AppCard key={proc.id}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-foreground leading-tight">{proc.label}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setProcedureCount(proc.id, count - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-sm text-muted hover:text-foreground"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-foreground">{count}</span>
                          <button
                            type="button"
                            onClick={() => setProcedureCount(proc.id, count + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-teal/30 bg-teal/10 text-sm text-teal hover:opacity-80"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-background/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${pct >= 100 ? "text-teal" : "text-muted"}`}>
                          {count}/{proc.meta}
                          {pct >= 100 ? " ✓" : ""}
                        </span>
                      </div>
                    </AppCard>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── EVOLUÇÃO ── */}
      {tab === "evolucao" && (
        <>
          {history.length === 0 ? (
            <AppCard>
              <p className="text-sm text-muted text-center py-4">
                Nenhuma avaliação salva ainda.{"\n"}Avalie suas competências e clique em "Salvar avaliação".
              </p>
            </AppCard>
          ) : (
            <>
              <AppCard>
                <p className="font-mono text-xs uppercase tracking-wider text-purple mb-3">
                  Histórico de avaliações
                </p>
                <div className="space-y-3">
                  {history.map((snap, idx) => {
                    const avg = (
                      DOMAINS.map((d) => snap.ratings[d.id] ?? 1).reduce((a, b) => a + b, 0) / DOMAINS.length
                    ).toFixed(1);
                    return (
                      <div key={idx} className="rounded-xl border border-border bg-background/35 px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-foreground">{snap.date}</p>
                          <span className="text-xs text-purple font-bold">Média: {avg}/5</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {DOMAINS.map((d) => {
                            const val = snap.ratings[d.id] ?? 1;
                            return (
                              <div key={d.id} className="text-center">
                                <p className="text-[9px] text-muted truncate">{d.label}</p>
                                <p
                                  className="text-xs font-bold"
                                  style={{ color: d.color }}
                                >
                                  {val}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AppCard>

              {history.length >= 2 && (
                <AppCard>
                  <p className="font-mono text-xs uppercase tracking-wider text-teal mb-3">
                    Progresso desde o início
                  </p>
                  <div className="space-y-2">
                    {DOMAINS.map((d) => {
                      const first = history[history.length - 1].ratings[d.id] ?? 1;
                      const latest = history[0].ratings[d.id] ?? 1;
                      const diff = latest - first;
                      return (
                        <div key={d.id} className="flex items-center gap-3">
                          <p className="w-28 text-xs text-muted truncate">{d.label}</p>
                          <div className="flex-1 h-1.5 rounded-full bg-background/40 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(latest / 5) * 100}%`, backgroundColor: d.color }}
                            />
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <span style={{ color: d.color }} className="font-bold">{latest}/5</span>
                            {diff > 0 && <span className="text-teal">+{diff}</span>}
                            {diff < 0 && <span className="text-rose">{diff}</span>}
                            {diff === 0 && <span className="text-muted">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AppCard>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
