"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsEvidence } from './AnalyticsEvidence';
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/navigation/HandoffLink";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Headphones,
  Heart,
  Info,
  Loader2,
  Music2,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { SynauraAppShell } from "@/components/synaura/SynauraShell";
import { SynauraImage } from "@/components/ui/SynauraImage";
import ExperienceMotionFrame from "@/components/ambient/ExperienceMotionFrame";
import {
  analyticsCsv,
  analyticsPeriod,
  analyticsDate,
  changePercent,
  completionRate,
  formatAnalyticsNumber as fmt,
  metricValue,
  type AnalyticsFormat,
  type AnalyticsMetric,
  type AnalyticsRange,
  type AnalyticsBreakdown,
  type CreatorAnalytics as Report,
} from "@/lib/creatorAnalytics/model";
import { useCreatorAnalytics } from "./useCreatorAnalytics";
import AnalyticsChart from "./AnalyticsChart";
import AnalyticsComparison from "./AnalyticsComparison";
import { LoyalAudience, Momentum } from "./AnalyticsInsights";
import "./creator-analytics.css";

const METRICS = [
  {
    key: "plays",
    label: "Écoutes enregistrées",
    Icon: Headphones,
    help: "Démarrages de lecture enregistrés, anonymes compris. Ce chiffre peut différer du compteur public historique.",
  },
  {
    key: "listeners",
    label: "Auditeurs identifiés",
    Icon: Users,
    help: "Comptes distincts sur toute la période. Les visiteurs anonymes ne sont pas identifiables et ne sont pas additionnés.",
  },
  {
    key: "likes",
    label: "J’aime reçus",
    Icon: Heart,
    help: "J’aime encore actifs, ajoutés pendant la période. Un J’aime retiré ne figure plus dans ce total.",
  },
  {
    key: "completion",
    label: "Jusqu’au bout",
    Icon: Check,
    help: "Part des parcours avec un départ et une fin enregistrés. Regroupement par morceau, session et jour UTC ; minimum 5 parcours. Ce n’est pas une rétention seconde par seconde.",
  },
] as const;
const LABELS: Record<string, string> = {
  discover: "Découvrir",
  search: "Recherche",
  profile: "Profils",
  studio: "Studio IA",
  library: "Bibliothèque",
  track: "Pages de morceaux",
  player: "Lecteur",
  queue: "File d’écoute",
  web: "Web",
  mobile: "Application mobile",
  ios: "iOS",
  android: "Android",
};
const TABS = [
  { key: "overview", label: "Vue d’ensemble" },
  { key: "content", label: "Contenus" },
  { key: "audience", label: "Audience" },
  { key: "compare", label: "Comparer" },
] as const;

function Delta({
  current,
  previous,
  percentagePoints = false,
}: {
  current: number | null;
  previous: number | null;
  percentagePoints?: boolean;
}) {
  if (current === null || previous === null)
    return <span className="analytics-delta">Pas assez de données</span>;
  const difference = percentagePoints
    ? current - previous
    : changePercent(current, previous);
  if (difference === null)
    return <span className="analytics-delta">Aucune base de comparaison</span>;
  const Icon = difference < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span
      className="analytics-delta"
      data-direction={
        difference === 0 ? "flat" : difference > 0 ? "up" : "down"
      }
    >
      <Icon size={13} />
      {difference > 0 ? "+" : ""}
      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
        difference
      )}
      {percentagePoints ? " pts" : " %"}
      <span> vs période précédente</span>
    </span>
  );
}
function Breakdown({
  title,
  rows,
  note,
}: {
  title: string;
  rows: AnalyticsBreakdown[];
  note: string;
}) {
  const total = rows.reduce((n, row) => n + row.count, 0);
  return (
    <section className="analytics-panel analytics-breakdown">
      <h2>{title}</h2>
      <p>{note}</p>
      {rows.length ? (
        rows.slice(0, 8).map((row) => (
          <div className="analytics-breakdown-row" key={row.label}>
            <div>
              <span>{LABELS[row.label] || row.label}</span>
              <strong>
                {fmt(row.count)}
                <small>
                  {fmt(total ? (row.count / total) * 100 : 0, true)}
                </small>
              </strong>
            </div>
            <div className="analytics-meter">
              <i
                style={{ width: `${total ? (row.count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))
      ) : (
        <div className="analytics-empty-inline">
          Aucune donnée renseignée sur cette période.
        </div>
      )}
    </section>
  );
}
function Heatmap({ report }: { report: Report }) {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const [active, setActive] = useState<string | null>(null);
  const maximum = Math.max(1, ...report.hours.map((row) => row.count));
  const read = (day: number, hour: number) =>
    report.hours.find((row) => row.day === day && row.hour === hour)?.count ||
    0;
  return (
    <section className="analytics-panel">
      <h2>Les moments où ça écoute</h2>
      <p>Écoutes enregistrées · heures UTC, pas le fuseau de l’auditeur.</p>
      <div className="analytics-heatmap">
        <div className="analytics-heatmap-labels">
          <span />
          {[0, 6, 12, 18].map((hour) => (
            <span key={hour}>{hour} h</span>
          ))}
        </div>
        {days.map((day, d) => (
          <div className="analytics-heatmap-row" key={day}>
            <span>{day}</span>
            <div>
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`${day} ${h} h UTC : ${read(d, h)} écoutes`}
                  onFocus={() =>
                    setActive(`${day} ${h} h : ${fmt(read(d, h))} écoutes`)
                  }
                  onPointerEnter={() =>
                    setActive(`${day} ${h} h : ${fmt(read(d, h))} écoutes`)
                  }
                  onClick={() =>
                    setActive(`${day} ${h} h : ${fmt(read(d, h))} écoutes`)
                  }
                  style={{
                    background: `color-mix(in srgb, var(--analytics-accent) ${
                      read(d, h) ? 18 + (read(d, h) / maximum) * 82 : 0
                    }%, var(--syn-soft))`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="analytics-heatmap-foot">
        <span aria-live="polite">
          {active || "Survole ou sélectionne un créneau"}
        </span>
        <span>
          Moins <i /> Plus
        </span>
      </div>
    </section>
  );
}
function Journey({ report }: { report: Report }) {
  const s = report.current;
  const steps = [
    ["Départ", s.sessions],
    ["25 %", s.p25],
    ["50 %", s.p50],
    ["75 %", s.p75],
    ["Fin", s.completed],
  ] as const;
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-heading">
        <div>
          <h2>Jusqu’où va l’écoute ?</h2>
          <p>{fmt(s.sessions)} parcours mesurables</p>
        </div>
        <Headphones size={19} />
      </div>
      {s.sessions < 5 ? (
        <div className="analytics-empty-inline">
          Pas assez de données. Au moins 5 parcours avec un départ enregistré
          sont nécessaires.
        </div>
      ) : (
        <div className="analytics-journey">
          {steps.map(([label, count]) => (
            <div key={label}>
              <strong>{fmt((count / s.sessions) * 100, true)}</strong>
              <div>
                <i
                  style={{
                    height: `${Math.min(100, (count / s.sessions) * 100)}%`,
                  }}
                />
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
      <p className="analytics-footnote">
        Parcours regroupés par morceau, session et jour. Plusieurs écoutes dans
        la même session peuvent être regroupées ; les événements manquants
        limitent la précision.
      </p>
    </section>
  );
}

export default function CreatorAnalytics({
  demoFactory,
}: {
  demoFactory?: (query: string) => Report;
}) {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const [range, setRange] = useState<AnalyticsRange>("28d");
  const [format, setFormat] = useState<AnalyticsFormat>("all");
  const [track, setTrack] = useState(params.get("track") || "");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [draftDates, setDraftDates] = useState({ from: "", to: "" });
  const [customOpen, setCustomOpen] = useState(false);
  const [customError, setCustomError] = useState("");
  const [tab, setTab] = useState<
    "overview" | "content" | "audience" | "compare"
  >("overview");
  const [metric, setMetric] = useState<AnalyticsMetric>("plays");
  const [compare, setCompare] = useState(true);
  const [compareIds, setCompareIds] = useState<[string, string]>(["", ""]);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<
    "plays" | "likes" | "listeners" | "completion"
  >("plays");
  const [contentTab, setContentTab] = useState<"music" | "posts" | "clips">(
    "music"
  );
  const [page, setPage] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const owner = session?.user?.id || null;
  const query = useMemo(
    () =>
      new URLSearchParams({
        range,
        format,
        ...(track ? { track } : {}),
        ...(range === "custom" ? dates : {}),
      }).toString(),
    [range, format, track, dates]
  );
  const demo = useMemo(() => demoFactory?.(query), [demoFactory, query]);
  const {
    data: report,
    error,
    loading,
  } = useCreatorAnalytics(owner, query, refresh, demo);
  useEffect(() => {
    setPage(0);
  }, [search, sort, format, track, range, contentTab]);
  useEffect(() => {
    setExportMessage("");
  }, [query, owner]);
  const visible = useMemo(
    () =>
      report?.tracks
        .filter((t) =>
          t.title
            .toLocaleLowerCase("fr")
            .includes(search.toLocaleLowerCase("fr"))
        )
        .sort(
          (a, b) =>
            (metricValue(b, sort) ?? -1) - (metricValue(a, sort) ?? -1) ||
            a.id.localeCompare(b.id)
        ) || [],
    [report, search, sort]
  );
  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / 10) - 1)
  );
  const chosen = report?.tracks.find(
    (t) => t.id === track || (t.kind === "ai" && t.id === `ai-${track}`)
  );
  const chooseTrack = (id: string) => {
    setTrack(id);
    setFormat("all");
    setTab("overview");
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };
  const exportCsv = (kind: "daily" | "tracks") => {
    if (!report) return;
    const section =
      tab === "content" && contentTab !== "music" ? contentTab : kind;
    const url = URL.createObjectURL(
      new Blob([analyticsCsv(report, section)], {
        type: "text/csv;charset=utf-8;",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `synaura-${
      demoFactory ? "demo-" : ""
    }${section}-${report.period.start.slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportMessage("Export CSV téléchargé.");
  };
  const rangeLabel = report
    ? `${analyticsDate(report.period.start)} — ${analyticsDate(
        new Date(Date.parse(report.period.end) - 86400000).toISOString()
      )}`
    : "Jours complets · UTC";
  const recent = report?.recent.reduce((sum, p) => sum + p.count, 0) || 0;
  const maximumRecent = Math.max(
    1,
    ...(report?.recent.map((p) => p.count) || [])
  );
  const best = report?.tracks[0];
  const dailyBest = report?.daily.reduce(
    (a, b) => (b.plays > a.plays ? b : a),
    report.daily[0]
  );
  const unavailable =
    !demoFactory &&
    (status === "unauthenticated" || (status === "authenticated" && !owner));
  return (
    <SynauraAppShell className="analytics-shell">
      <ExperienceMotionFrame className="analytics-workspace">
        {demoFactory && (
          <div className="analytics-demo-banner">
            <Info size={15} />
            <span>
              Aperçu interactif · données de démonstration, pas tes statistiques
              réelles.
            </span>
          </div>
        )}
        <header className="analytics-header">
          <div>
            <span className="analytics-eyebrow">
              <BarChart3 size={14} /> ESPACE CRÉATEUR
            </span>
            <h1>
              Ça <span>résonne.</span>
            </h1>
            <p>Ton univers, vu de l’autre côté du casque.</p>
          </div>
          <div className="analytics-header-actions">
            <button
              type="button"
              aria-label="Actualiser les statistiques"
              title="Actualiser les statistiques"
              disabled={loading || unavailable}
              onClick={() => setRefresh((v) => v + 1)}
            >
              <RefreshCw
                size={17}
                className={loading ? "analytics-spinning" : ""}
              />
            </button>
            <button
              type="button"
              aria-label="Exporter les statistiques en CSV"
              disabled={!report || tab === "compare"}
              title={
                tab === "compare"
                  ? "Utilise l’export dédié dans la comparaison"
                  : "Exporter les statistiques"
              }
              onClick={() =>
                exportCsv(
                  tab === "content" && contentTab === "music"
                    ? "tracks"
                    : "daily"
                )
              }
            >
              <Download size={16} />
              <span>Exporter</span>
            </button>
          </div>
        </header>
        <div className="analytics-toolbar">
          <div
            className="analytics-tabs"
            role="group"
            aria-label="Vue des statistiques"
          >
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={tab === item.key}
                onClick={() => {
                  setTab(item.key);
                  if (item.key === "compare") setTrack("");
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="analytics-period">
            <CalendarDays size={15} />
            <label>
              <span className="sr-only">Période analysée</span>
              <select
                value={customOpen ? "custom" : range}
                onChange={(e) => {
                  if (e.target.value === "custom") setCustomOpen(true);
                  else {
                    setRange(e.target.value as AnalyticsRange);
                    setCustomOpen(false);
                  }
                }}
              >
                <option value="7d">7 derniers jours</option>
                <option value="28d">28 derniers jours</option>
                <option value="90d">90 derniers jours</option>
                <option value="custom">Personnalisée</option>
              </select>
            </label>
            <small>{rangeLabel}</small>
          </div>
        </div>
        {customOpen && (
          <form
            className="analytics-custom-range"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const nextDates = {
                from: String(form.get("from") || ""),
                to: String(form.get("to") || ""),
              };
              try {
                analyticsPeriod(
                  new URLSearchParams({ range: "custom", ...nextDates })
                );
              } catch {
                setCustomError("Choisis de 1 à 90 jours, au plus tard hier.");
                return;
              }
              setDates(nextDates);
              setDraftDates(nextDates);
              setRange("custom");
              setCustomOpen(false);
              setCustomError("");
            }}
          >
            <label>
              Du
              <input
                type="date"
                name="from"
                required
                value={draftDates.from}
                onChange={(e) =>
                  setDraftDates((previous) => ({
                    ...previous,
                    from: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              Au
              <input
                type="date"
                name="to"
                required
                value={draftDates.to}
                onChange={(e) =>
                  setDraftDates((previous) => ({
                    ...previous,
                    to: e.target.value,
                  }))
                }
              />
            </label>
            <button type="submit">Appliquer</button>
            <button
              type="button"
              onClick={() => {
                setCustomOpen(false);
                setCustomError("");
              }}
            >
              Annuler
            </button>
            {customError && <p role="alert">{customError}</p>}
          </form>
        )}
        <div className="analytics-context">
          <div>
            {track ? (
              <button
                type="button"
                className="analytics-selection"
                onClick={() => setTrack("")}
              >
                <X size={14} />
                {chosen?.title || "Morceau sélectionné"}
              </button>
            ) : (
              <label>
                <span className="sr-only">Format musical</span>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as AnalyticsFormat)}
                >
                  <option value="all">Tous les sons</option>
                  <option value="track">Sons originaux</option>
                  <option value="ai">Créations IA</option>
                </select>
              </label>
            )}
            <span>
              {report
                ? `${fmt(report.trackCount)} morceau${
                    report.trackCount > 1 ? "x" : ""
                  }`
                : "Statistiques personnelles"}
            </span>
          </div>
          <span className="analytics-update">
            {report
              ? `Actualisé à ${new Date(report.generatedAt).toLocaleTimeString(
                  "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                )}`
              : "Données privées"}
          </span>
        </div>
        {unavailable ? (
          <section className="analytics-state">
            <Users size={34} />
            <h2>
              {status === "unauthenticated"
                ? "Ton audience commence ici."
                : "Ta session doit être renouvelée."}
            </h2>
            <p>Connecte-toi pour retrouver les performances de tes contenus.</p>
            <Link href="/auth/signin?callbackUrl=%2Fstats">
              Se connecter <ArrowRight size={16} />
            </Link>
          </section>
        ) : error ? (
          <section className="analytics-state" role="alert">
            <BarChart3 size={34} />
            <h2>Les chiffres font une pause.</h2>
            <p>{error}</p>
            <p>Aucune donnée indisponible n’est remplacée par un zéro.</p>
            <button type="button" onClick={() => setRefresh((v) => v + 1)}>
              Réessayer <RefreshCw size={16} />
            </button>
            {track && (
              <button type="button" onClick={() => setTrack("")}>
                Revenir à tous les sons
              </button>
            )}
          </section>
        ) : !report ? (
          <div
            className="analytics-skeleton"
            role="status"
            aria-label="Chargement des statistiques"
          >
            <div />
            <div />
            <div />
            <div />
            <section>
              <Loader2 size={24} />
              <span>On rassemble tes chiffres…</span>
            </section>
          </div>
        ) : (
          <>
            {report.catalogueCount === 0 && (
              <div className="analytics-empty-banner">
                <Music2 size={20} />
                <div>
                  <strong>Chaque parcours commence par un premier son.</strong>
                  <span>
                    Les statistiques apparaîtront après tes premières écoutes
                    enregistrées.
                  </span>
                </div>
                <Link href="/create">
                  Créer <ArrowRight size={16} />
                </Link>
              </div>
            )}
            {(tab === "overview" || tab === "audience") && (
              <div
                className="analytics-kpis"
                role="group"
                aria-label="Métrique du graphique"
              >
                {METRICS.map(({ key, label, Icon, help }) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={metric === key}
                    onClick={() => {
                      setMetric(key);
                      setTab("overview");
                    }}
                    className="analytics-kpi"
                  >
                    <span>
                      <Icon size={16} />
                      {label}
                      <Info
                        size={13}
                        className="analytics-kpi-info"
                        aria-label={help}
                      />
                    </span>
                    <strong>
                      {fmt(
                        metricValue(report.current, key),
                        key === "completion"
                      )}
                    </strong>
                    <Delta
                      current={metricValue(report.current, key)}
                      previous={metricValue(report.previous, key)}
                      percentagePoints={key === "completion"}
                    />
                  </button>
                ))}
              </div>
            )}
            {tab === "overview" && (
              <>
                <div className="analytics-main-grid">
                  <section className="analytics-panel analytics-evolution">
                    <div className="analytics-panel-heading">
                      <div>
                        <span className="analytics-eyebrow">LE MOUVEMENT</span>
                        <h2>{METRICS.find((m) => m.key === metric)?.label}</h2>
                      </div>
                      <label className="analytics-compare-toggle">
                        <input
                          type="checkbox"
                          checked={compare}
                          onChange={(e) => setCompare(e.target.checked)}
                        />
                        Comparer
                      </label>
                    </div>
                    <p className="analytics-metric-help">
                      {METRICS.find((m) => m.key === metric)?.help}
                    </p>
                    <AnalyticsChart
                      current={report.daily}
                      previous={report.previousDaily}
                      metric={metric}
                      compare={compare}
                    />
                  </section>
                  <section className="analytics-panel analytics-recent">
                    <div className="analytics-panel-heading">
                      <h2>Les dernières 48 h</h2>
                      <span className="analytics-status-dot" />
                    </div>
                    <p>Instantané à l’actualisation · hors filtre de dates</p>
                    <strong className="analytics-recent-total">
                      {fmt(recent)}
                    </strong>
                    <span>écoutes enregistrées</span>
                    <div
                      className="analytics-hour-bars"
                      role="img"
                      aria-label={`${fmt(
                        recent
                      )} écoutes enregistrées sur les 48 dernières heures`}
                    >
                      {report.recent.map((row) => (
                        <i
                          key={row.hour}
                          title={`${new Date(row.hour).toLocaleString("fr-FR", {
                            timeZone: "UTC",
                          })} UTC : ${fmt(row.count)}`}
                          style={{
                            height: `${
                              row.count
                                ? Math.max(3, (row.count / maximumRecent) * 100)
                                : 1
                            }%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="analytics-recent-axis">
                      <span>−48 h</span>
                      <span>Maintenant</span>
                    </div>
                    <div className="analytics-recent-bottom">
                      <span>Abonnés au compte</span>
                      <strong>{fmt(report.followers)}</strong>
                      <small>
                        {fmt(report.gainedFollowers)} nouveaux abonnements
                        encore actifs sur la période
                      </small>
                    </div>
                  </section>
                </div>
                <div className="analytics-insights">
                  <div>
                    <span className="analytics-insight-number">01</span>
                    <div>
                      <small>SON LE PLUS ÉCOUTÉ</small>
                      <strong>
                        {best && best.plays > 0
                          ? best.title
                          : "Ton prochain repère"}
                      </strong>
                      <span>
                        {best && best.plays > 0
                          ? `${fmt(best.plays)} écoutes sur la période`
                          : "Les premières écoutes feront apparaître tes tendances."}
                      </span>
                    </div>
                    {best && best.plays > 0 && (
                      <button
                        type="button"
                        aria-label={`Analyser ${best.title}`}
                        onClick={() => chooseTrack(best.id)}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="analytics-insight-number">02</span>
                    <div>
                      <small>JOUR LE PLUS ACTIF</small>
                      <strong>
                        {dailyBest && dailyBest.plays > 0
                          ? analyticsDate(dailyBest.date)
                          : "Pas encore de pic"}
                      </strong>
                      <span>
                        {dailyBest && dailyBest.plays > 0
                          ? `${fmt(dailyBest.plays)} démarrages enregistrés`
                          : "Aucun conseil automatique basé sur des données absentes."}
                      </span>
                    </div>
                  </div>
                </div>
                <Momentum report={report} onSelect={chooseTrack} />
                <AnalyticsEvidence report={report} />
                <div className="analytics-secondary-grid">
                  <Journey report={report} />
                  <Breakdown
                    title="D’où viennent les écoutes ?"
                    rows={report.sources}
                    note="Origine renseignée au démarrage de lecture."
                  />
                </div>
                <section className="analytics-panel analytics-top">
                  <div className="analytics-panel-heading">
                    <div>
                      <h2>Les sons qui résonnent</h2>
                      <p>
                        Performances sur la période, pas les cumuls historiques.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("content");
                        setContentTab("music");
                      }}
                    >
                      Tout voir <ArrowRight size={15} />
                    </button>
                  </div>
                  {report.tracks.length ? (
                    report.tracks.slice(0, 5).map((t, i) => (
                      <button
                        type="button"
                        key={t.id}
                        className="analytics-track-row"
                        onClick={() => chooseTrack(t.id)}
                      >
                        <span className="analytics-rank">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <SynauraImage
                          src={t.cover || "/default-cover.svg"}
                          alt=""
                          className="analytics-cover"
                        />
                        <span className="analytics-track-name">
                          <strong>{t.title}</strong>
                          <small>
                            {t.kind === "ai" ? "Création IA" : "Son original"} ·{" "}
                            {analyticsDate(t.createdAt)}
                          </small>
                        </span>
                        <span className="analytics-track-value">
                          <strong>{fmt(t.plays)}</strong>
                          <small>écoutes</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))
                  ) : (
                    <p className="analytics-empty-inline">
                      Aucun morceau dans cette sélection.
                    </p>
                  )}
                </section>
              </>
            )}
            {tab === "compare" && (
              <AnalyticsComparison
                report={report}
                owner={owner}
                query={query}
                refresh={refresh}
                selected={compareIds}
                onSelect={setCompareIds}
                demoFactory={demoFactory}
              />
            )}
            {tab === "content" && (
              <><AnalyticsEvidence report={report} social /><section className="analytics-panel analytics-content-panel">
                <div className="analytics-content-tools">
                  <div role="group" aria-label="Type de contenu">
                    {[
                      ["music", "Sons"],
                      ["posts", "Posts"],
                      ["clips", "Clips"],
                    ].map(([key, label]) => (
                      <button
                        type="button"
                        key={key}
                        aria-pressed={contentTab === key}
                        onClick={() => setContentTab(key as typeof contentTab)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {contentTab === "music" && (
                    <>
                      <label className="analytics-search">
                        <Search size={16} />
                        <input
                          type="search"
                          aria-label="Chercher dans les sons"
                          placeholder="Retrouver un son…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      <label>
                        <span className="sr-only">Trier les sons</span>
                        <select
                          value={sort}
                          onChange={(e) =>
                            setSort(e.target.value as typeof sort)
                          }
                        >
                          <option value="plays">Plus écoutés</option>
                          <option value="listeners">Plus d’auditeurs</option>
                          <option value="likes">Plus aimés</option>
                          <option value="completion">
                            Plus souvent terminés
                          </option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
                {contentTab === "music" ? (
                  <>
                    <p className="analytics-content-note">
                      {fmt(visible.length)} résultats dans les{" "}
                      {fmt(report.tracks.length)} sons chargés
                      {report.trackCount > report.tracks.length
                        ? " · sélection limitée aux 500 premiers par écoutes"
                        : ""}
                      . Clique sur un titre pour l’analyser.
                    </p>
                    <div
                      className="analytics-table-scroll"
                      role="region"
                      aria-label="Performances des morceaux"
                      tabIndex={0}
                    >
                      <table className="analytics-content-table">
                        <thead>
                          <tr>
                            <th scope="col">Morceau</th>
                            <th scope="col">Écoutes</th>
                            <th scope="col">Évolution</th>
                            <th scope="col">Auditeurs identifiés</th>
                            <th scope="col">J’aime</th>
                            <th scope="col">Jusqu’au bout</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible
                            .slice(safePage * 10, safePage * 10 + 10)
                            .map((t) => (
                              <tr key={t.id}>
                                <th scope="row">
                                  <button
                                    type="button"
                                    onClick={() => chooseTrack(t.id)}
                                  >
                                    <SynauraImage
                                      src={t.cover || "/default-cover.svg"}
                                      alt=""
                                      className="analytics-cover"
                                    />
                                    <span>
                                      <strong>{t.title}</strong>
                                      <small>
                                        {t.kind === "ai" ? "IA" : "Original"} ·{" "}
                                        {analyticsDate(t.createdAt)}
                                      </small>
                                    </span>
                                  </button>
                                </th>
                                <td>{fmt(t.plays)}</td>
                                <td>
                                  <Delta
                                    current={t.plays}
                                    previous={t.previousPlays}
                                  />
                                </td>
                                <td>{fmt(t.listeners)}</td>
                                <td>{fmt(t.likes)}</td>
                                <td>{fmt(completionRate(t), true)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!visible.length && (
                      <p className="analytics-empty-inline">
                        Aucun son ne correspond à cette sélection.
                      </p>
                    )}
                    <div className="analytics-pagination">
                      <button type="button" onClick={() => exportCsv("tracks")}>
                        <Download size={15} />
                        Exporter les sons chargés
                      </button>
                      <div>
                        <button
                          type="button"
                          aria-label="Page précédente"
                          disabled={safePage === 0}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <span>
                          {safePage + 1} /{" "}
                          {Math.max(1, Math.ceil(visible.length / 10))}
                        </span>
                        <button
                          type="button"
                          aria-label="Page suivante"
                          disabled={(safePage + 1) * 10 >= visible.length}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : contentTab === "posts" ? (
                  <>
                    <p className="analytics-content-note">
                      Tous les posts du compte · interactions encore présentes,
                      reçues pendant la période. Les filtres musicaux ne
                      s’appliquent pas.
                    </p>
                    <div className="analytics-social-summary">
                      <div>
                        <strong>{fmt(report.postSummary.published)}</strong>
                        <span>posts publiés sur la période</span>
                      </div>
                      <div>
                        <strong>{fmt(report.postSummary.likes)}</strong>
                        <span>J’aime reçus</span>
                      </div>
                      <div>
                        <strong>{fmt(report.postSummary.comments)}</strong>
                        <span>commentaires reçus</span>
                      </div>
                    </div>
                    {report.posts.map((p) => (
                      <Link
                        href={`/posts/${p.id}`}
                        onClick={
                          demoFactory
                            ? (event) => event.preventDefault()
                            : undefined
                        }
                        aria-disabled={demoFactory ? true : undefined}
                        key={p.id}
                        className="analytics-track-row"
                      >
                        {p.image ? (
                          <SynauraImage
                            src={p.image}
                            alt=""
                            className="analytics-cover"
                          />
                        ) : (
                          <span className="analytics-post-icon">
                            <BarChart3 size={20} />
                          </span>
                        )}
                        <span className="analytics-track-name">
                          <strong>
                            {p.content || "Publication sans texte"}
                          </strong>
                          <small>{analyticsDate(p.createdAt)}</small>
                        </span>
                        <span className="analytics-track-value">
                          <strong>{fmt(p.likes)} ♡</strong>
                          <small>{fmt(p.comments)} commentaires</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                    {!report.posts.length && (
                      <p className="analytics-empty-inline">
                        Aucun post publié.
                      </p>
                    )}
                    {report.postCount > 100 && (
                      <p>
                        Les 100 posts ayant reçu le plus d’interactions sont
                        affichés.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="analytics-content-note">
                      Tous les clips du compte ·{" "}
                      <strong>cumuls actuels, hors période sélectionnée</strong>
                      . L’historique des vues et de rétention des clips n’est
                      pas disponible ; aucune estimation n’est ajoutée.
                    </p>
                    {report.clips.map((c) => (
                      <div key={c.id} className="analytics-track-row">
                        <SynauraImage
                          src={c.cover || "/default-cover.svg"}
                          alt=""
                          className="analytics-cover"
                        />
                        <span className="analytics-track-name">
                          <strong>{c.title || "Clip sans légende"}</strong>
                          <small>
                            {c.visibility === "published"
                              ? "Publié"
                              : c.visibility === "draft"
                              ? "Brouillon"
                              : "Masqué"}{" "}
                            · {analyticsDate(c.createdAt)}
                          </small>
                        </span>
                        <span className="analytics-track-value">
                          <strong>{fmt(c.likes)} ♡</strong>
                          <small>{fmt(c.comments)} commentaires</small>
                        </span>
                      </div>
                    ))}
                    {!report.clips.length && (
                      <p className="analytics-empty-inline">
                        Aucun clip pour le moment.
                      </p>
                    )}
                    {report.clipCount > 100 && (
                      <p>Les 100 clips les plus récents sont affichés.</p>
                    )}
                  </>
                )}
              </section></>
            )}
            {tab === "audience" && (
              <>
                <LoyalAudience report={report} />
                <div className="analytics-audience-note">
                  <Users size={22} />
                  <div>
                    <h2>Des personnes, pas des additions.</h2>
                    <p>
                      {fmt(report.current.listeners)} comptes distincts sur la
                      période. {fmt(report.current.anonymousPlays)} démarrages
                      anonymes ne permettent pas d’identifier des auditeurs
                      uniques.
                    </p>
                  </div>
                </div>
                <div className="analytics-secondary-grid">
                  <Heatmap report={report} />
                  <Breakdown
                    title="Les plateformes d’écoute"
                    rows={report.platforms}
                    note="Plateforme déclarée dans les événements ; ce n’est pas le modèle de l’appareil."
                  />
                </div>
                <div className="analytics-secondary-grid">
                  <Breakdown
                    title="Les pays renseignés"
                    rows={report.countries}
                    note="Métadonnées d’écoute disponibles, non vérifiées. Les pays inconnus restent visibles."
                  />
                  <Journey report={report} />
                </div>
              </>
            )}
            {chosen && (
              <div className="analytics-detail-link">
                <Link
                  href={`/track/${encodeURIComponent(chosen.id)}`}
                  onClick={
                    demoFactory ? (event) => event.preventDefault() : undefined
                  }
                  aria-disabled={demoFactory ? true : undefined}
                >
                  Ouvrir le morceau <ArrowUpRight size={16} />
                </Link>
                <button type="button" onClick={() => setTrack("")}>
                  Revenir à tous les sons
                </button>
              </div>
            )}
            <details className="analytics-method">
              <summary>
                <Info size={15} />
                Comprendre les chiffres
              </summary>
              <p>
                Les périodes couvrent des jours complets en UTC et sont
                comparées à la même durée précédente. Les écoutes reposent sur
                les événements de démarrage, pas sur les compteurs publics
                cumulés. Des événements absents peuvent réduire les totaux.
              </p>
              <p>
                Les auditeurs identifiés sont dédupliqués sur toute la période ;
                les uniques journaliers ne doivent pas être additionnés. Les
                J’aime et commentaires supprimés ne sont plus comptés. Les
                abonnements sont ceux encore actifs, pas une croissance nette
                historique.
              </p>
              <p>
                « Jusqu’au bout » décrit des parcours regroupés par morceau,
                session et jour, avec au moins cinq parcours. Ce n’est ni un
                taux de rétention exact par écoute ni une mesure de temps passé.
                Aucune donnée démographique, revenu, impression ou vue de clip
                n’est inventé.
              </p>
            </details>
          </>
        )}
        <p className="sr-only" role="status">
          {exportMessage}
        </p>
        <footer className="analytics-footer">
          <span>SYNAURA ANALYTICS</span>
          <span>Les chiffres éclairent. Toi, tu crées.</span>
        </footer>
      </ExperienceMotionFrame>
    </SynauraAppShell>
  );
}
