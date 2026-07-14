'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, ChevronRight, Film, Loader2, Music2, Pause, Play, Search, UploadCloud, UserRound, X } from 'lucide-react';
import { SynauraAppShell } from '@/components/synaura/SynauraShell';
import { recordClipFunnelEvent } from '@/lib/analyticsClient';
import { enqueueClientClipUpload } from '@/lib/clientClipUploadQueue';

type ClipSource = {
  _id: string;
  sourceTrackId: string;
  sourceTrackType: 'track' | 'ai_track';
  title: string;
  artist: { _id?: string; name: string; username: string; avatar?: string | null };
  audioUrl: string;
  coverUrl?: string | null;
  duration: number;
};

const FALLBACK_COVER = '/brand/2026/synaura-symbol-2026.png';
const MUSIC_CLIP_MIN_SECONDS = 15;
const MUSIC_CLIP_MAX_SECONDS = 60;
const MUSIC_CLIP_MAX_BYTES = 95 * 1024 * 1024;

function mmss(seconds = 0) {
  const safe = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function tagsFromText(value: string) {
  return value.split(/[,\s]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 8);
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Vidéo illisible'));
    };
    video.src = url;
  });
}

export default function NewMusicClipPage() {
  return (
    <Suspense fallback={<SynauraAppShell contentClassName="max-w-[1120px]"><div className="grid min-h-[520px] place-items-center rounded-lg bg-[#111111]"><Loader2 className="h-8 w-8 animate-spin text-[#7357C6]" /></div></SynauraAppShell>}>
      <NewMusicClipPageContent />
    </Suspense>
  );
}

function NewMusicClipPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const presetTrackId = searchParams.get('trackId') || '';
  const presetTrackType = searchParams.get('trackType') || '';
  const challengeId = searchParams.get('challengeId') || '';
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  const [sources, setSources] = useState<ClipSource[]>([]);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceScope, setSourceScope] = useState<'all' | 'mine'>('all');
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ClipSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [localDuration, setLocalDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [tagText, setTagText] = useState('');
  const [offset, setOffset] = useState(0);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourceError, setSourceError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewingSourceId, setPreviewingSourceId] = useState('');
  const sourceRequestRef = useRef(0);
  const presetRecordedRef = useRef(false);
  const publishingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleSources = useMemo(() => {
    const query = sourceQuery.trim().toLocaleLowerCase('fr');
    return sources
      .filter((source) => sourceScope !== 'mine' || source.artist?._id === currentUserId)
      .filter((source) => !query || `${source.title} ${source.artist?.name || ''} ${source.artist?.username || ''}`.toLocaleLowerCase('fr').includes(query))
      .sort((a, b) => Number(b.artist?._id === currentUserId) - Number(a.artist?._id === currentUserId));
  }, [currentUserId, sourceQuery, sourceScope, sources]);
  const maxOffset = Math.max(0, Math.round((selectedSource?.duration || 0) - Math.max(MUSIC_CLIP_MIN_SECONDS, localDuration || MUSIC_CLIP_MIN_SECONDS)));
  const currentStep = !file ? 1 : !selectedSource ? 2 : 3;
  const ready = Boolean(file && selectedSource && localDuration >= MUSIC_CLIP_MIN_SECONDS && localDuration <= MUSIC_CLIP_MAX_SECONDS);

  const loadSources = useCallback(async (query = '', scope: 'all' | 'mine' = 'all', signal?: AbortSignal) => {
    const requestId = ++sourceRequestRef.current;
    setLoadingSources(true);
    setSourceError('');
    try {
      const params = new URLSearchParams({ limit: query.trim() ? '50' : '36' });
      if (query.trim()) params.set('query', query.trim());
      if (scope === 'mine') params.set('scope', 'mine');
      if (presetTrackId) {
        params.set('sourceTrackId', presetTrackId);
        if (presetTrackType) params.set('sourceTrackType', presetTrackType);
      }
      const response = await fetch(`/api/music-clips/sources?${params.toString()}`, { cache: 'no-store', signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Impossible de charger les sons');
      if (requestId !== sourceRequestRef.current) return;
      const next: ClipSource[] = Array.isArray(json?.sources) ? json.sources : [];
      setSources(next);
      if (presetTrackId) {
        const preset = next.find((source) => source._id === presetTrackId || source.sourceTrackId === presetTrackId.replace(/^ai-/, ''));
        if (preset) {
          setSelectedSource((current) => current || preset);
          if (!presetRecordedRef.current) {
            presetRecordedRef.current = true;
            void recordClipFunnelEvent(preset._id, 'clip_composer_opened');
          }
        }
      }
    } catch (loadError: any) {
      if (loadError?.name !== 'AbortError' && requestId === sourceRequestRef.current) setSourceError(loadError?.message || 'Impossible de charger les sons');
    } finally {
      if (requestId === sourceRequestRef.current) setLoadingSources(false);
    }
  }, [presetTrackId, presetTrackType]);

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const current = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/clips/new';
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(current)}`);
  }, [router, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadSources('', 'all');
  }, [loadSources, status]);

  useEffect(() => {
    if (!sourcePickerOpen || status !== 'authenticated') return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadSources(sourceQuery, sourceScope, controller.signal), sourceQuery.trim() ? 320 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadSources, sourcePickerOpen, sourceQuery, sourceScope, status]);

  useEffect(() => {
    if (!file) {
      setVideoPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    fetch(`/api/challenges/${encodeURIComponent(challengeId)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => { if (mounted && json?.challenge?.title) setChallengeTitle(json.challenge.title); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [challengeId]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  async function onPickFile(nextFile: File | null) {
    setError(null);
    if (!nextFile) return;
    if (!/^video\/(mp4|webm|quicktime|x-m4v)$/i.test(nextFile.type) && !/\.(mp4|webm|mov|m4v)$/i.test(nextFile.name)) {
      setError('Choisis une vidéo lisible, idéalement MP4 H.264.');
      return;
    }
    if (nextFile.size > MUSIC_CLIP_MAX_BYTES) {
      setError('La vidéo dépasse la limite de 95 Mo.');
      return;
    }
    try {
      const duration = await getVideoDuration(nextFile);
      if (duration < MUSIC_CLIP_MIN_SECONDS || duration > MUSIC_CLIP_MAX_SECONDS) {
        setError('Un Clip doit durer entre 15 et 60 secondes.');
        return;
      }
      setFile(nextFile);
      setLocalDuration(duration);
    } catch (videoError: any) {
      setError(videoError?.message || 'Vidéo illisible');
    }
  }

  function togglePreview(source: ClipSource) {
    if (previewingSourceId === source._id && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPreviewingSourceId('');
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(source.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPreviewingSourceId('');
    audio.onerror = () => setPreviewingSourceId('');
    setPreviewingSourceId(source._id);
    void audio.play().catch(() => setPreviewingSourceId(''));
  }

  function chooseSource(source: ClipSource) {
    setSelectedSource(source);
    setOffset(0);
    setSourcePickerOpen(false);
    void recordClipFunnelEvent(source._id, 'clip_use_sound_started');
  }

  function publish() {
    if (publishingRef.current) return;
    if (!file || !selectedSource || !ready) {
      setError(!file ? 'Ajoute une vidéo.' : 'Choisis le son associé au Clip.');
      return;
    }
    publishingRef.current = true;
    setError(null);
    enqueueClientClipUpload({
      file,
      source: selectedSource,
      duration: Math.round(localDuration),
      offset,
      caption,
      tags: tagsFromText(tagText),
      challengeId: challengeId || undefined,
    });
    audioRef.current?.pause();
    router.push('/?filter=clips');
  }

  const primaryLabel = !file ? 'Ajouter la vidéo' : !selectedSource ? 'Choisir le son' : 'Publier le Clip';

  return (
    <SynauraAppShell contentClassName="max-w-[1120px]">
      <div className="pb-24">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-xs font-black text-black/60 transition hover:bg-[#111111] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Scroll
          </Link>
          {challengeId ? <span className="max-w-[60%] truncate rounded-full bg-[#C99B48]/12 px-3 py-2 text-xs font-black text-[#8c671f]">{challengeTitle || 'Challenge Synaura'}</span> : null}
        </div>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111111] text-white shadow-2xl shadow-black/10">
          <header className="flex min-h-16 items-center gap-4 border-b border-white/10 px-4 sm:px-6">
            <Film className="h-5 w-5 text-[#D96D63]" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black">Créer un Clip</h1>
              <div className="mt-2 flex max-w-56 gap-1.5">
                {[1, 2, 3].map((step) => <span key={step} className={`h-1 flex-1 rounded-full ${step <= currentStep ? 'bg-[#7357C6]' : 'bg-white/15'}`} />)}
              </div>
            </div>
            <span className="text-xs font-black text-white/40">{currentStep}/3</span>
          </header>

          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(280px,0.78fr)_minmax(360px,1.22fr)] lg:p-6">
            <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-lg border border-white/15 bg-[#1a1918]">
              <label className="relative block aspect-[3/4] cursor-pointer overflow-hidden">
                <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="sr-only" onChange={(event) => void onPickFile(event.target.files?.[0] || null)} />
                {file && videoPreviewUrl ? (
                  <>
                    <video src={videoPreviewUrl} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                    <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/70"><UploadCloud className="h-4 w-4" /></span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-16">
                      <span className="block text-[10px] font-black uppercase text-[#72bec8]">Vidéo prête</span>
                      <span className="mt-1 block truncate text-sm font-black">{file.name}</span>
                      <span className="mt-1 block text-[11px] font-bold text-white/55">{mmss(localDuration)} · {(file.size / 1024 / 1024).toFixed(1)} Mo</span>
                    </span>
                  </>
                ) : (
                  <span className="grid h-full place-items-center p-6 text-center">
                    <span>
                      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#7357C6] shadow-xl shadow-[#7357C6]/20"><UploadCloud className="h-7 w-7" /></span>
                      <span className="mt-5 block text-xl font-black">Ajouter une vidéo</span>
                      <span className="mt-2 block text-xs font-bold text-white/45">15 à 60 secondes · 95 Mo maximum</span>
                    </span>
                  </span>
                )}
              </label>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1d1c1b]">
              <button type="button" onClick={() => setSourcePickerOpen(true)} className="flex min-h-24 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#7357C6]/20">
                  {selectedSource ? <img src={selectedSource.coverUrl || FALLBACK_COVER} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-5 w-5 text-[#B8A6F0]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase text-white/40">Son</span>
                  <span className="mt-1 block truncate text-sm font-black">{selectedSource?.title || 'Choisir un son Synaura'}</span>
                  {selectedSource ? <span className="mt-1 block truncate text-xs font-bold text-white/45">{selectedSource.artist?.name || selectedSource.artist?.username}</span> : null}
                </span>
                <ChevronRight className="h-5 w-5 text-white/35" />
              </button>

              {selectedSource && maxOffset > 0 ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase text-white/40">
                    <span>Début de l'extrait</span>
                    <span className="text-xs text-white">{mmss(offset)} – {mmss(offset + localDuration)}</span>
                  </div>
                  <input type="range" min={0} max={maxOffset} value={offset} onChange={(event) => setOffset(Number(event.target.value))} className="mt-3 h-2 w-full accent-[#4A9EAA]" />
                </div>
              ) : null}

              <div className="space-y-3 border-t border-white/10 p-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/40"><span>Légende</span><span>{caption.length}/280</span></div>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={280} placeholder="Écris quelque chose sur ce Clip…" className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-[#272523] p-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#7357C6]/70" />
                <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Ajouter des tags" className="h-12 w-full rounded-lg border border-white/10 bg-[#272523] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#7357C6]/70" />
              </div>

              <div className="border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!file) fileInputRef.current?.click();
                    else if (!selectedSource) setSourcePickerOpen(true);
                    else publish();
                  }}
                  className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg text-sm font-black transition ${ready ? 'bg-[#7357C6] hover:bg-[#674bbd]' : 'bg-white/10 hover:bg-white/15'}`}
                >
                  {!file ? <UploadCloud className="h-5 w-5" /> : !selectedSource ? <Music2 className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                  {primaryLabel}
                </button>
              </div>
            </div>
          </div>
          {error ? <p className="mx-4 mb-4 rounded-lg border border-[#D96D63]/25 bg-[#D96D63]/12 px-4 py-3 text-sm font-bold text-[#ffd6d1] lg:mx-6 lg:mb-6">{error}</p> : null}
        </section>
      </div>

      {sourcePickerOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Choisir le son">
          <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg bg-[#F7F6F3] text-[#111111] shadow-2xl sm:rounded-lg">
            <div className="flex items-center gap-3 border-b border-black/[0.08] px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1"><h2 className="text-lg font-black">Choisir le son</h2><p className="mt-1 text-xs font-bold text-black/45">Tous les sons que tu peux utiliser</p></div>
              <button type="button" onClick={() => setSourcePickerOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06]" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#EEECE7] p-1">
                <button type="button" onClick={() => { setSourceScope('all'); setSourceQuery(''); }} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-xs font-black ${sourceScope === 'all' ? 'bg-[#111111] text-white' : 'text-black/55'}`}><Music2 className="h-4 w-4" />Tous les sons</button>
                <button type="button" onClick={() => { setSourceScope('mine'); setSourceQuery(''); }} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-xs font-black ${sourceScope === 'mine' ? 'bg-[#111111] text-white' : 'text-black/55'}`}><UserRound className="h-4 w-4" />Mes sons</button>
              </div>
              <label className="mt-3 flex h-12 items-center gap-2 rounded-lg border border-black/[0.10] bg-white px-3">
                <Search className="h-4 w-4 text-black/35" />
                <input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="Rechercher un titre ou un artiste" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                {sourceQuery ? <button type="button" onClick={() => setSourceQuery('')} aria-label="Effacer"><X className="h-4 w-4 text-black/35" /></button> : null}
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">
              {loadingSources ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#7357C6]" /></div> : sourceError ? (
                <button type="button" onClick={() => void loadSources(sourceQuery, sourceScope)} className="mx-auto flex min-h-36 items-center gap-2 text-sm font-black text-[#7357C6]"><Loader2 className="h-4 w-4" />Réessayer</button>
              ) : visibleSources.length ? (
                <div className="space-y-2">
                  {visibleSources.map((source) => {
                    const own = source.artist?._id === currentUserId;
                    const selected = selectedSource?._id === source._id;
                    const playing = previewingSourceId === source._id;
                    return (
                      <div key={source._id} className={`flex w-full items-center gap-2 rounded-lg border p-2 transition ${selected ? 'border-[#7357C6]/45 bg-[#7357C6]/10' : 'border-black/[0.08] bg-white hover:border-black/15'}`}>
                        <button type="button" onClick={() => chooseSource(source)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <img src={source.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2"><span className="truncate text-sm font-black">{source.title}</span>{own ? <span className="shrink-0 text-[9px] font-black text-[#7357C6]">MON SON</span> : null}</span>
                            <span className="mt-1 block truncate text-xs font-bold text-black/45">{source.artist?.name || source.artist?.username} · {mmss(source.duration)}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => togglePreview(source)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EEECE7]" aria-label={playing ? 'Pause' : 'Écouter'}>
                          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => chooseSource(source)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#7357C6] bg-[#7357C6] text-white' : 'border-black/10 text-black/35'}`} aria-label="Sélectionner">
                          {selected ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-64 place-items-center text-center"><div><Music2 className="mx-auto h-7 w-7 text-black/25" /><p className="mt-3 text-sm font-black">{sourceScope === 'mine' ? 'Aucun son public à toi' : 'Aucun son trouvé'}</p><p className="mt-1 text-xs font-bold text-black/40">{sourceScope === 'mine' ? 'Publie un morceau pour créer son Clip officiel.' : 'Essaie un autre titre ou un autre artiste.'}</p></div></div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SynauraAppShell>
  );
}
