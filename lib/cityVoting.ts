type BattleTrack = {
  _id: string;
  pulse?: number | null;
  createdAt?: string | null;
};

export function countCityVotes(rows: Array<{ track_id?: unknown }> = []) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const trackId = String(row?.track_id || '');
    if (trackId) counts[trackId] = (counts[trackId] || 0) + 1;
  }
  return counts;
}

export function selectCityBattleWinner<T extends BattleTrack>(tracks: readonly T[], voteCounts: Record<string, number>) {
  const highestVoteCount = tracks.reduce((highest, track) => Math.max(highest, Number(voteCounts[track._id] || 0)), 0);
  if (highestVoteCount <= 0) return null;

  return [...tracks].sort((left, right) => {
    const voteDifference = Number(voteCounts[right._id] || 0) - Number(voteCounts[left._id] || 0);
    if (voteDifference !== 0) return voteDifference;
    const pulseDifference = Number(right.pulse || 0) - Number(left.pulse || 0);
    if (pulseDifference !== 0) return pulseDifference;
    const dateDifference = Date.parse(right.createdAt || '') - Date.parse(left.createdAt || '');
    if (Number.isFinite(dateDifference) && dateDifference !== 0) return dateDifference;
    return right._id.localeCompare(left._id);
  })[0] || null;
}
