import { csvCell, type AnalyticsTrack, type CreatorAnalytics } from "./model";

export function movingTracks(
  tracks: AnalyticsTrack[],
  direction: "up" | "down"
) {
  return tracks
    .filter((t) =>
      direction === "up" ? t.plays > t.previousPlays : t.plays < t.previousPlays
    )
    .sort(
      (a, b) =>
        (direction === "up" ? 1 : -1) *
          (b.plays - b.previousPlays - (a.plays - a.previousPlays)) ||
        a.id.localeCompare(b.id)
    );
}

export function catalogueSignals(report: CreatorAnalytics) {
  const top = [...report.tracks].sort((a, b) => b.plays - a.plays).slice(0, 3);
  return {
    topThreeShare: report.current.plays
      ? (top.reduce((n, t) => n + t.plays, 0) / report.current.plays) * 100
      : null,
    activeDays: report.daily.filter((d) => d.plays > 0).length,
    averageDaily: report.current.plays / report.period.days,
    unrecognisedShare: report.current.plays
      ? (report.current.anonymousPlays / report.current.plays) * 100
      : null,
  };
}

export function comparisonQuery(query: string, track: string) {
  const params = new URLSearchParams(query);
  params.set("track", track);
  params.set("format", "all");
  return params.toString();
}

export function comparisonCsv(
  a: CreatorAnalytics,
  b: CreatorAnalytics,
  titleA: string,
  titleB: string
) {
  if (a.period.start !== b.period.start || a.period.end !== b.period.end)
    throw new Error("Périodes différentes");
  const byDate = new Map(b.daily.map((p) => [p.date, p]));
  const rows: unknown[][] = [
    [
      "Date UTC",
      "Morceau A",
      "Écoutes A",
      "Auditeurs identifiés A",
      "J’aime A",
      "Morceau B",
      "Écoutes B",
      "Auditeurs identifiés B",
      "J’aime B",
    ],
    ...a.daily.map((p) => {
      const other = byDate.get(p.date);
      return [
        p.date,
        titleA,
        p.plays,
        p.listeners,
        p.likes,
        titleB,
        other?.plays ?? "",
        other?.listeners ?? "",
        other?.likes ?? "",
      ];
    }),
  ];
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
