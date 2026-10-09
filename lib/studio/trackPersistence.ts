/** Provider callbacks may repeat and arrive after an artist has edited a track. */
export function readTrackLinks(value: unknown): Record<string, any> {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function mergeProviderTrack(next: Record<string, any>, existing?: Record<string, any>) {
  if (!existing) return next;
  const links = readTrackLinks(existing.source_links);
  const mergedLinks = { ...links };
  for (const [key, value] of Object.entries(readTrackLinks(next.source_links))) {
    if (value != null && !key.startsWith('artist_') && !(key.startsWith('library_') && Object.prototype.hasOwnProperty.call(links, key))) mergedLinks[key] = value;
  }
  const patch: Record<string, any> = { ...next, source_links: JSON.stringify(mergedLinks) };
  for (const key of ['audio_url', 'stream_audio_url', 'image_url', 'duration', 'prompt', 'title', 'style', 'lyrics']) {
    patch[key] = next[key] || existing[key];
  }
  if (!next.tags?.length) patch.tags = existing.tags || [];
  if (links.artist_title_edited_at) patch.title = existing.title;
  if (links.artist_cover_edited_at) patch.image_url = existing.image_url;
  // Never change identity, publication, favorites or attribution during enrichment.
  delete patch.generation_id;
  delete patch.suno_id;
  return patch;
}

/** Caller holds the generation row lock for this entire operation. No external I/O here. */
export async function persistPreparedTracks(database: any, generationId: string, prepared: Record<string, any>[]) {
  const { data, error } = await database.from('ai_tracks').select('*').eq('generation_id', generationId).order('created_at', { ascending: true });
  if (error) throw new Error('Impossible de vérifier les pistes déjà enregistrées');
  const existing = new Map<string, Record<string, any>>();
  for (const row of data || []) if (row.suno_id && !existing.has(row.suno_id)) existing.set(row.suno_id, row);
  // Also collapse repeated IDs within one callback, without collapsing two real versions.
  for (const next of Array.from(new Map(prepared.map(row => [row.suno_id, row])).values())) {
    const previous = existing.get(next.suno_id);
    const query = previous
      ? database.from('ai_tracks').update(mergeProviderTrack(next, previous)).eq('id', previous.id)
      : database.from('ai_tracks').insert(next);
    const result = await query;
    if (result.error) throw new Error('Impossible de sauvegarder les pistes');
  }
}
