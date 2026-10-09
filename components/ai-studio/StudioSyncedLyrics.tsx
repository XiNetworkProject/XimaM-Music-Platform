'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import { sameStudioTrack } from '@/lib/studio/trackIdentity';
import { activeLyricLine, lyricLines, lyricSegments, validLyricWords } from '@/lib/studio/lyricAlignment';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';

type Word = { word: string; startS: number; endS: number };
export type StudioLyricPlayback = { track: GeneratedTrack | null; seconds: number; seek: (seconds: number) => void; demoWords?: Word[] };
const cache = new Map<string, Word[]>();
export default function StudioSyncedLyrics({ track, owner, playback, demo }: { track: GeneratedTrack; owner?: string; playback?: StudioLyricPlayback; demo?: boolean }) {
  const [words, setWords] = useState<Word[]>([]);
  const [status, setStatus] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [follow, setFollow] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLElement | null>(null);
  const { enabled: animate } = useLivingMotion();
  const text = track.lyrics || (track.isInstrumental ? 'Instrumental' : 'Les paroles écrites ne sont pas disponibles pour ce morceau.');
  const active = !!playback?.track && sameStudioTrack(track, playback.track);
  const segments = useMemo(() => lyricSegments(track.lyrics || '', words), [track.lyrics, words]);
  const lines = useMemo(() => lyricLines(segments), [segments]);
  const currentLine = active ? activeLyricLine(lines, playback?.seconds ?? 0) : -1;
  useEffect(() => {
    let parent = root.current?.parentElement;
    while (parent && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) parent = parent.parentElement;
    // Never move the document or background page when following a line.
    if (!parent || parent === document.body || parent === document.documentElement) return;
    scrollArea.current = parent;
    const pause = () => setFollow(false);
    parent.addEventListener('wheel', pause, { passive: true });
    parent.addEventListener('touchmove', pause, { passive: true });
    return () => { parent?.removeEventListener('wheel', pause); parent?.removeEventListener('touchmove', pause); scrollArea.current = null; };
  }, []);
  useEffect(() => {
    const area = scrollArea.current;
    const line = root.current?.querySelector<HTMLElement>(`[data-lyric-line="${currentLine}"]`);
    if (!follow || !active || currentLine < 0 || !area || !line) return;
    const outer = area.getBoundingClientRect(), inner = line.getBoundingClientRect();
    if (inner.top < outer.top + 32 || inner.bottom > outer.bottom - 32) area.scrollTo({ top: Math.max(0, area.scrollTop + inner.top - outer.top - area.clientHeight * .4), behavior: animate ? 'smooth' : 'auto' });
  }, [currentLine, follow, active, animate]);
  useEffect(() => {
    setWords([]); setStatus(''); setBusy(false);
    if (demo) { setWords(validLyricWords(playback?.demoWords)); return; }
    if (track.isInstrumental || !track.generationTaskId || !track.sunoAudioId) return;
    const key = `${owner}:${track.generationTaskId}:${track.sunoAudioId}`;
    if (cache.has(key)) { setWords(cache.get(key)!); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => { setStatus('Le chargement a pris trop de temps. Vous pouvez réessayer.'); setBusy(false); controller.abort(); }, 30_000);
    setBusy(true);
    void fetch('/api/suno/timestamped-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ taskId: track.generationTaskId, audioId: track.sunoAudioId }) }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? 'Trop de demandes rapprochées. Réessayez dans quelques minutes.' : 'Synchronisation indisponible pour le moment.');
      if (controller.signal.aborted) return;
      const aligned = validLyricWords(data.alignedWords);
      if (aligned.length) { if (cache.size >= 30) cache.delete(cache.keys().next().value!); cache.set(key, aligned); setWords(aligned); }
      else setStatus('Les paroles synchronisées ne sont pas encore disponibles.');
    }).catch(error => { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Synchronisation indisponible. Les paroles restent accessibles.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); clearTimeout(timeout); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [track.id, track.generationTaskId, track.sunoAudioId, track.isInstrumental, owner, retry, demo, playback?.demoWords]);
  return <div className="sw-synced-lyrics" ref={root}>
    {!!words.length && active && <div className="sw-lyrics-controls"><small>Touchez une ligne pour la réécouter</small><button className="us-text-button" aria-pressed={follow} onClick={() => setFollow(value => !value)}>{follow ? 'Suivi activé' : 'Reprendre le suivi'}</button></div>}
    <p className="us-lyrics" aria-label="Paroles du morceau">{words.length ? lines.map((line, index) => <span key={index} className="sw-lyric-line" data-lyric-line={index} role={active && line.start !== undefined ? 'button' : undefined} tabIndex={active && line.start !== undefined ? 0 : undefined} aria-current={currentLine === index ? 'true' : undefined} onClick={() => { if (active && line.start !== undefined) playback?.seek(line.start); }} onKeyDown={event => { if (active && line.start !== undefined && ['Enter', ' '].includes(event.key)) { event.preventDefault(); playback?.seek(line.start); } }}>{line.parts.map((part, wordIndex) => {
      const highlighted = active && part.start !== undefined && (playback?.seconds ?? 0) >= part.start && (playback?.seconds ?? 0) < (part.end ?? 0);
      return <span key={wordIndex} data-current={highlighted || undefined}>{part.text}</span>;
    })}</span>) : text}</p>
    <small>{busy ? 'Synchronisation des paroles…' : status || (words.length ? active ? 'Les paroles suivent votre écoute' : 'Paroles synchronisées · lancez ce morceau pour suivre' : '')}</small>
    {!busy && !words.length && !track.isInstrumental && !!track.generationTaskId && !!track.sunoAudioId && !demo && <button className="us-text-button" onClick={() => setRetry(value => value + 1)}>Réessayer la synchronisation</button>}
  </div>;
}
