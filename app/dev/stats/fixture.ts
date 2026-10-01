import {
  analyticsPeriod,
  DAY_MS,
  type AnalyticsTotals,
  type CreatorAnalytics,
  type AnalyticsPoint,
  type AnalyticsTrack,
  type AnalyticsFormat,
} from "@/lib/creatorAnalytics/model";

// Development presentation only. Never imported by /stats or a production API.
export function demoAnalytics(
  query: string,
  empty = false,
  clock = new Date()
): CreatorAnalytics {
  const params = new URLSearchParams(query),
    period = analyticsPeriod(params, clock),
    format = (params.get("format") || "all") as AnalyticsFormat,
    selectedTrack = params.get("track");
  const names = [
    "Après minuit",
    "Tout ce qui nous traverse",
    "Satellites",
    "La ville respire",
    "À l’horizon",
    "Échos bleus",
    "Un autre matin",
    "Dans tes écouteurs",
    "Dernière lumière",
    "Sans gravité",
    "Les passagers",
    "Côté soleil",
    "Nébuleuse",
    "Nos nuits électriques",
  ];
  const tracks: AnalyticsTrack[] = empty
    ? []
    : names.map((title, i) => ({
        id: `demo-${i}`,
        title,
        kind: i % 3 === 2 ? "ai" : "track",
        cover:
          i % 2
            ? "/brand/2026/vinyl-groove.png"
            : "/brand/2026/wave-community.png",
        createdAt: new Date(
          Date.parse(period.start) - (i + 1) * DAY_MS
        ).toISOString(),
        plays: 0,
        previousPlays: 0,
        likes: 0,
        listeners: 0,
        sessions: 0,
        completed: 0,
        completedMs: 0,
        anonymousPlays: 0,
        p25: 0,
        p50: 0,
        p75: 0,
      }));
  const chosen = tracks.filter(
    (t) =>
      (format === "all" || format === t.kind) &&
      (!selectedTrack || selectedTrack === t.id)
  );
  const zero = (): AnalyticsTotals => ({
    plays: 0,
    listeners: 0,
    likes: 0,
    sessions: 0,
    completed: 0,
    completedMs: 0,
    anonymousPlays: 0,
    p25: 0,
    p50: 0,
    p75: 0,
  });
  const series = (previous: boolean, selection = chosen): AnalyticsPoint[] =>
    Array.from({ length: period.days }, (_, i) => {
      const start = Date.parse(previous ? period.previousStart : period.start);
      const point = {
        ...zero(),
        date: new Date(start + i * DAY_MS).toISOString().slice(0, 10),
      };
      selection.forEach((t) => {
        const index = tracks.indexOf(t);
        const plays = Math.round(
          (120 / (index + 1)) *
            (previous ? (index % 4 === 1 ? 1.25 : 0.68) : 1) *
            (1 +
              Math.sin(i * (0.35 + index * 0.07) + index) * 0.3 +
              (i / period.days) * 0.7 +
              (i === period.days - 5 - (index % 4) ? 0.8 : 0))
        );
        const sessions = Math.floor(plays * 0.75),
          completed = Math.floor(
            sessions * (0.53 + Math.sin(i * 0.4 + index) * 0.08)
          );
        const counts = {
          ...zero(),
          plays,
          listeners: Math.floor(plays * 0.6),
          likes: Math.floor(plays * 0.07),
          sessions,
          completed,
          completedMs: completed * 165000,
          anonymousPlays: Math.floor(plays * 0.25),
          p25: Math.floor(sessions * 0.91),
          p50: Math.floor(sessions * 0.81),
          p75: Math.floor(sessions * 0.72),
        };
        for (const key of Object.keys(counts) as Array<keyof AnalyticsTotals>)
          point[key] += counts[key];
      });
      return point;
    });
  const daily = series(false),
    previousDaily = series(true);
  const sum = (points: AnalyticsPoint[]): AnalyticsTotals => {
    const totals = zero();
    for (const p of points)
      for (const key of Object.keys(totals) as Array<keyof AnalyticsTotals>)
        totals[key] += p[key];
    totals.listeners = Math.floor(totals.plays * 0.21);
    return totals;
  };
  const current = sum(daily),
    previous = sum(previousDaily);
  chosen.forEach((t) => {
    Object.assign(t, sum(series(false, [t])), {
      previousPlays: sum(series(true, [t])).plays,
    });
  });
  // Synthetic overlap, stable between a row and its drill-down. Never real data.
  if (chosen.length > 1) {
    current.listeners = Math.floor(chosen.reduce((n,t)=>n+t.listeners,0)*.75);
    previous.listeners = Math.floor(chosen.reduce((n,t)=>n+sum(series(true,[t])).listeners,0)*.75);
  }
  const breakdown = (labels: string[], ratios: number[]) => {
    let count = 0;
    return labels
      .map((label, i) => {
        const n =
          i === labels.length - 1
            ? current.plays - count
            : Math.floor(current.plays * ratios[i]);
        count += n;
        return { label, count: n };
      })
      .filter((r) => r.count > 0);
  };
  return {
    period,
    generatedAt: period.now,
    selectedTrack,
    format,
    current,
    previous,
    daily,
    previousDaily,
    tracks: [...chosen].sort((a,b)=>b.plays-a.plays||a.id.localeCompare(b.id)),
    trackCount: chosen.length,
    catalogueCount: tracks.length,
    sources: breakdown(
      ["Live", "discover", "profile", "search", "Autre / non renseigné"],
      [0.52, 0.23, 0.12, 0.08, 0.05]
    ),
    countries: breakdown(
      ["FR", "BE", "CA", "CH", "Non renseigné"],
      [0.53, 0.15, 0.12, 0.07, 0.13]
    ),
    platforms: breakdown(
      ["web", "mobile", "Non renseignée"],
      [0.48, 0.46, 0.06]
    ),
    hours: empty
      ? []
      : Array.from({ length: 168 }, (_, i) => ({
          day: Math.floor(i / 24),
          hour: i % 24,
          count: Math.round(
            (current.plays / 500) *
              (1 + Math.sin((i % 24) * 0.2)) *
              (i % 24 > 16 ? 3 : 1)
          ),
        })),
    recent: Array.from({ length: 48 }, (_, i) => ({
      hour: new Date(
        Math.floor(Date.parse(period.now) / 3600000) * 3600000 -
          (47 - i) * 3600000
      ).toISOString(),
      count: empty
        ? 0
        : Math.round(chosen.length * (5 + Math.sin(i * 0.5) * 3 + i / 14)),
    })),
    followers: empty ? 0 : 1842,
    gainedFollowers: empty ? 0 : 126,
    audience: {
      returning: Math.min(
        previous.listeners,
        Math.floor(current.listeners * 0.37)
      ),
      notSeenPreviously:
        current.listeners -
        Math.min(previous.listeners, Math.floor(current.listeners * 0.37)),
      multipleDays: period.days < 2 ? 0 : Math.floor(current.listeners * 0.42),
      singleDay:
        current.listeners -
        (period.days < 2 ? 0 : Math.floor(current.listeners * 0.42)),
      previousListeners: previous.listeners,
    },
    postCount: empty ? 0 : 3,
    postSummary: {
      published: empty ? 0 : 3,
      likes: empty ? 0 : 276,
      comments: empty ? 0 : 48,
    },
    posts: empty
      ? []
      : [
          "Le nouveau morceau est là. Votre passage préféré ?",
          "Quelques notes avant que la ville se réveille.",
          "Merci pour toutes ces écoutes 💜",
        ].map((content, i) => ({
          id: `demo-post-${i}`,
          content,
          image: i === 0 ? "/brand/2026/wave-community.png" : null,
          type: "text",
          createdAt: daily[Math.min(i + 2, daily.length - 1)].date,
          likes: [140, 83, 53][i],
          comments: [26, 15, 7][i],
        })),
    clips: empty
      ? []
      : [
          {
            id: "demo-clip",
            title: "Après minuit · dans les coulisses",
            cover: "/brand/2026/vinyl-groove.png",
            createdAt: period.start,
            visibility: "published",
            likes: 318,
            comments: 24,
          },
        ],
    clipCount: empty ? 0 : 1,
    evidence: {
      exposure: empty ? [] : [{source:'Live',displays:Math.round(current.plays*2),identifiedPairs:current.listeners,followedByPlay:Math.round(current.listeners*.6)},{source:'Découvrir',displays:Math.round(current.plays*.8),identifiedPairs:Math.round(current.listeners*.4),followedByPlay:Math.round(current.listeners*.16)}],
      actions:{shares:empty?0:23,playlistAdds:empty?0:41},
      retention:{plays:empty?0:120,buckets:Array.from({length:20},(_,i)=>({bucket:i,plays:empty?0:Math.round(120*(.94-i*.025))}))},
      social:empty?[]:daily.flatMap((d,i)=>[{type:'post',date:d.date,displays:40+i*2},{type:'clip',date:d.date,displays:24+i*3}]),
    },
  };
}
