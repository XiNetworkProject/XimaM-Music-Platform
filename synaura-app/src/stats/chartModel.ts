type TrackPoint = { date: string; plays: number; likes: number; uniques: number; retention: number | null; dataQuality?: string };
type PostPoint = { date: string; likes: number; posts: number; comments: number };
type Metric = 'plays' | 'likes' | 'uniques' | 'retention' | 'posts' | 'comments';
export const validStatsMetrics = (view: string): Metric[] => view === 'posts' ? ['posts', 'likes', 'comments'] : view === 'tracks' ? ['plays', 'likes', 'uniques', 'retention'] : ['plays', 'likes', 'uniques', 'retention', 'posts', 'comments'];
export function metricValue(metric: Metric, track?: TrackPoint, post?: PostPoint): number | null {
  if (metric === 'retention') return track?.dataQuality === 'insufficient' ? null : track?.retention ?? null;
  if (metric === 'likes') return track || post ? Number(track?.likes || 0) + Number(post?.likes || 0) : null;
  if (metric === 'posts') return post?.posts ?? null;
  if (metric === 'comments') return post?.comments ?? null;
  return metric === 'uniques' ? track?.uniques ?? null : track?.plays ?? null;
}
export function buildStatsTrend(tracks: TrackPoint[], posts: PostPoint[], comparison: TrackPoint[], view: string, metric: Metric) {
  const trackMap = new Map(tracks.map(point => [point.date, point]));
  const postMap = new Map(posts.map(point => [point.date, point]));
  const compareMap = new Map(comparison.map(point => [point.date, point]));
  const dates = [...new Set(view === 'posts' ? posts.map(point => point.date) : view === 'tracks' ? tracks.map(point => point.date) : [...tracks.map(point => point.date), ...posts.map(point => point.date)])].sort();
  const points = dates.map(date => ({ date, value: metricValue(metric, view === 'posts' ? undefined : trackMap.get(date), view === 'tracks' ? undefined : postMap.get(date)) }));
  const compareValues = view === 'posts' || metric === 'posts' || metric === 'comments' ? [] : dates.map(date => metricValue(metric, compareMap.get(date)));
  return { points, values: points.map(point => point.value), compareValues };
}
export function chartMaximum(...series: Array<Array<number | null>>) {
  return Math.max(1, ...series.flat().filter((value): value is number => value !== null && Number.isFinite(value)).map(value => Math.max(0, value)));
}
/** One scale for every line; null values break the path instead of inventing zero. */
export function linePath(values: Array<number | null>, width: number, height: number, max = chartMaximum(values)) {
  let drawing = false;
  return values.map((value, index) => {
    if (value === null || !Number.isFinite(value)) { drawing = false; return ''; }
    const x = index * width / Math.max(1, values.length - 1);
    const y = height - 18 - Math.min(max, Math.max(0, value)) / Math.max(1, max) * (height - 36);
    const command = drawing ? 'L' : 'M'; drawing = true;
    return command + ' ' + x.toFixed(1) + ' ' + y.toFixed(1);
  }).filter(Boolean).join(' ');
}
