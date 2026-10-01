export type AnalyticsRange = "7d" | "28d" | "90d" | "custom";
export type AnalyticsFormat = "all" | "track" | "ai";
export type AnalyticsMetric = "plays" | "listeners" | "likes" | "completion";
export type AnalyticsPeriod = {
  start: string;
  end: string;
  previousStart: string;
  days: number;
  now: string;
  range: AnalyticsRange;
};
export type AnalyticsTotals = {
  plays: number;
  listeners: number;
  likes: number;
  sessions: number;
  completed: number;
  completedMs: number;
  anonymousPlays: number;
  p25: number;
  p50: number;
  p75: number;
};
export type AnalyticsPoint = AnalyticsTotals & { date: string };
export type AnalyticsTrack = AnalyticsTotals & {
  id: string;
  title: string;
  cover: string | null;
  kind: "track" | "ai";
  createdAt: string;
  previousPlays: number;
};
export type AnalyticsPost = {
  id: string;
  content: string;
  image: string | null;
  createdAt: string;
  likes: number;
  comments: number;
  type: string;
};
export type AnalyticsClip = {
  id: string;
  title: string;
  cover: string | null;
  likes: number;
  comments: number;
  createdAt: string;
  visibility: string;
};
export type AnalyticsBreakdown = { label: string; count: number };
export type CreatorAnalytics = {
  period: AnalyticsPeriod;
  generatedAt: string;
  selectedTrack: string | null;
  format: AnalyticsFormat;
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  daily: AnalyticsPoint[];
  previousDaily: AnalyticsPoint[];
  tracks: AnalyticsTrack[];
  trackCount: number;
  catalogueCount: number;
  sources: AnalyticsBreakdown[];
  countries: AnalyticsBreakdown[];
  platforms: AnalyticsBreakdown[];
  hours: Array<{ day: number; hour: number; count: number }>;
  recent: Array<{ hour: string; count: number }>;
  followers: number;
  gainedFollowers: number;
  audience: {
    returning: number;
    notSeenPreviously: number;
    multipleDays: number;
    singleDay: number;
    previousListeners: number;
  };
  posts: AnalyticsPost[];
  postCount: number;
  postSummary: { published: number; likes: number; comments: number };
  clips: AnalyticsClip[];
  clipCount: number;
  evidence?: {
    exposure: Array<{ source: string; displays: number; identifiedPairs: number; followedByPlay: number }>;
    actions: { shares: number; playlistAdds: number };
    retention: { plays: number; buckets: Array<{ bucket: number; plays: number }> };
    social: Array<{ type: string; date: string; displays: number }>;
  };
};
export const DAY_MS = 86400000;
export function analyticsPeriod(
  params: URLSearchParams,
  clock = new Date()
): AnalyticsPeriod {
  const today = Date.UTC(
    clock.getUTCFullYear(),
    clock.getUTCMonth(),
    clock.getUTCDate()
  );
  const range = params.get("range") || "28d";
  if (!["7d", "28d", "90d", "custom"].includes(range))
    throw new Error("Période invalide");
  let end = today,
    start = today - Number(range.replace("d", "")) * DAY_MS;
  if (range === "custom") {
    const date = (value: string | null) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new Error("Date invalide");
      const time = Date.parse(`${value}T00:00:00.000Z`);
      if (
        !Number.isFinite(time) ||
        new Date(time).toISOString().slice(0, 10) !== value
      )
        throw new Error("Date invalide");
      return time;
    };
    start = date(params.get("from"));
    end = date(params.get("to")) + DAY_MS;
  }
  const days = (end - start) / DAY_MS;
  if (days < 1 || days > 90 || end > today)
    throw new Error("Choisis 1 à 90 jours complets, au plus tard hier");
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    previousStart: new Date(start - days * DAY_MS).toISOString(),
    days,
    now: clock.toISOString(),
    range: range as AnalyticsRange,
  };
}
export function completionRate(
  totals: Pick<AnalyticsTotals, "sessions" | "completed">
): number | null {
  return totals.sessions >= 5
    ? Math.min(100, (totals.completed / totals.sessions) * 100)
    : null;
}
export function metricValue(
  totals: AnalyticsTotals,
  metric: AnalyticsMetric
): number | null {
  return metric === "completion" ? completionRate(totals) : totals[metric];
}
export function changePercent(
  current: number,
  previous: number
): number | null {
  return previous > 0
    ? ((current - previous) / previous) * 100
    : current === 0
    ? 0
    : null;
}
export function formatAnalyticsNumber(value: number | null, percent = false) {
  if (value === null || !Number.isFinite(value)) return "—";
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: percent ? 1 : 0,
    }).format(value) + (percent ? " %" : "")
  );
}
export function analyticsDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Untrusted titles can otherwise execute formulas when opened in a spreadsheet.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function analyticsCsv(
  data: CreatorAnalytics,
  section: "daily" | "tracks" | "posts" | "clips"
) {
  const rows: unknown[][] =
    section === "daily"
      ? [
          [
            "Date UTC",
            "Démarrages enregistrés",
            "Comptes uniques du jour",
            "J’aime actifs reçus",
            "Sessions mesurables",
            "Sessions terminées",
          ],
          ...data.daily.map((p) => [
            p.date,
            p.plays,
            p.listeners,
            p.likes,
            p.sessions,
            p.completed,
          ]),
        ]
      : section === "posts"
      ? [
          [
            "Publication",
            "Publié le",
            "Début UTC",
            "Fin exclusive UTC",
            "J’aime actifs reçus",
            "Commentaires présents reçus",
          ],
          ...data.posts.map((p) => [
            p.content,
            p.createdAt,
            data.period.start,
            data.period.end,
            p.likes,
            p.comments,
          ]),
        ]
      : section === "clips"
      ? [
          [
            "Clip",
            "Publié le",
            "État",
            "Instantané",
            "J’aime cumulés hors période",
            "Commentaires cumulés hors période",
          ],
          ...data.clips.map((c) => [
            c.title,
            c.createdAt,
            c.visibility,
            data.generatedAt,
            c.likes,
            c.comments,
          ]),
        ]
      : [
          [
            "Titre",
            "Type",
            "Début UTC",
            "Fin exclusive UTC",
            "Démarrages enregistrés",
            "Comptes uniques",
            "J’aime actifs reçus",
            "Sessions mesurables",
            "Sessions terminées",
          ],
          ...data.tracks.map((t) => [
            t.title,
            t.kind,
            data.period.start,
            data.period.end,
            t.plays,
            t.listeners,
            t.likes,
            t.sessions,
            t.completed,
          ]),
        ];
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
