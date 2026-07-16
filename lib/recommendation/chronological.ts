type PublishedTrack = {
  _id?: string | null;
  createdAt?: string | null;
};

export function publishedAtMs(track: PublishedTrack) {
  const timestamp = track.createdAt ? Date.parse(track.createdAt) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortTracksNewest<T extends PublishedTrack>(tracks: readonly T[]) {
  return [...tracks].sort((left, right) => {
    const dateDifference = publishedAtMs(right) - publishedAtMs(left);
    if (dateDifference !== 0) return dateDifference;
    return String(right._id || '').localeCompare(String(left._id || ''));
  });
}
