export type AlignedLyricWord = { word: string; startS: number; endS: number };
export function validLyricWords(value: unknown): AlignedLyricWord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((word): word is AlignedLyricWord => !!word && typeof word.word === 'string' && !!word.word.trim()
    && Number.isFinite(word.startS) && Number.isFinite(word.endS) && word.startS >= 0 && word.endS > word.startS)
    .sort((a, b) => a.startS - b.startS);
}
const letters = new RegExp('[^\\p{L}\\p{N}]', 'gu');
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(letters, '');
/** Keep original line breaks/section headings; timing decorates the text, never duplicates it. */
export function lyricSegments(text: string, aligned: AlignedLyricWord[]) {
  if (!text.trim()) return aligned.map(word => ({ text: word.word + (/\s$/.test(word.word) ? '' : ' '), start: word.startS, end: word.endS }));
  const timing = aligned.flatMap(word => word.word.split(/\s+/).filter(Boolean).map(token => ({ token: normalize(token), start: word.startS, end: word.endS })));
  let cursor = 0;
  return (text.match(/\[[^\]]*\]|[^\s]+|\s+/g) || []).map(part => {
    const token = normalize(part);
    if (!token || part.startsWith('[')) return { text: part };
    const offset = timing.slice(cursor, cursor + 8).findIndex(word => word.token === token);
    if (offset < 0) return { text: part };
    const match = timing[cursor + offset]; cursor += offset + 1;
    return { text: part, start: match.start, end: match.end };
  });
}

/** Newlines remain in the original text; line timing only enables seeking/following. */
export function lyricLines(parts: ReturnType<typeof lyricSegments>) {
  const lines: { parts: typeof parts; start?: number }[] = [{ parts: [] }];
  for (const part of parts) {
    const chunks = part.text.split(/(\n)/);
    for (const text of chunks) {
      if (!text) continue;
      const line = lines[lines.length - 1];
      line.parts.push({ ...part, text });
      if (part.start !== undefined && line.start === undefined) line.start = part.start;
      if (text === '\n') lines.push({ parts: [] });
    }
  }
  return lines;
}

export function activeLyricLine(lines: ReturnType<typeof lyricLines>, seconds: number) {
  return lines.findIndex(line => line.parts.some(part => part.start !== undefined && seconds >= part.start && seconds < (part.end ?? 0)));
}
