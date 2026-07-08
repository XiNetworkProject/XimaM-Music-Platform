'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, Film, Loader2, Music2, Play, UploadCloud, X } from 'lucide-react';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';
import CreateArrivalBanner from '@/components/create/CreateArrivalBanner';
import { recordClipFunnelEvent } from '@/lib/analyticsClient';

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

const CLIP_FOLDER = 'ximam/music-clips';
const FALLBACK_COVER = '/brand/2026/synaura-symbol-2026.png';
const MUSIC_CLIP_MIN_SECONDS = 15;
const MUSIC_CLIP_MAX_SECONDS = 60;
const MUSIC_CLIP_MAX_BYTES = 200 * 1024 * 1024;

function mmss(seconds = 0) {
  const safe = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function tagsFromText(value: string) {
  return value.split(/[,\s]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 8);
}

function cloudinaryVideoPosterUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;
  const withTransform = videoUrl.replace('/video/upload/', '/video/upload/so_0,w_720,h_1280,c_fill,f_jpg/');
  return withTransform.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '.jpg$2');
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
      reject(new Error('Video illisible'));
    };
    video.src = url;
  });
}

async function uploadClipVideo(file: File) {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const signatureRes = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp, publicId, resourceType: 'video', folder: CLIP_FOLDER }),
  });
  const signature = await signatureRes.json();
  if (!signatureRes.ok) throw new Error(signature?.error || 'Signature Cloudinary impossible');
  const form = new FormData();
  form.append('file', file);
  form.append('folder', CLIP_FOLDER);
  form.append('public_id', publicId);
  form.append('resource_type', 'video');
  form.append('timestamp', String(timestamp));
  form.append('api_key', signature.apiKey);
  form.append('signature', signature.signature);
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`, { method: 'POST', body: form });
  const json = await uploadRes.json().catch(() => null);
  if (!uploadRes.ok || !json?.secure_url) throw new Error(json?.error?.message || 'Upload video impossible');
  return {
    videoUrl: String(json.secure_url),
    videoPublicId: String(json.public_id || publicId),
    posterUrl: cloudinaryVideoPosterUrl(String(json.secure_url)),
    duration: Number(json.duration || 0),
    bytes: Number(json.bytes || file.size || 0),
  };
}

export default function NewMusicClipPage() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="max-w-[1120px]">
          <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#7357C6]" />
          </SynauraPanel>
        </SynauraAppShell>
      }
    >
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
  const [step, setStep] = useState(1);
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  const [sources, setSources] = useState<ClipSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [isPreset, setIsPreset] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [localDuration, setLocalDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [tagText, setTagText] = useState('');
  const [offset, setOffset] = useState(0);
  const [loadingSources, setLoadingSources] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSource = useMemo(() => sources.find((source) => source._id === selectedSourceId) || null, [selectedSourceId, sources]);
  const maxOffset = Math.max(0, Math.round((selectedSource?.duration || 0) - MUSIC_CLIP_MIN_SECONDS));

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const current = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/clips/new';
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(current)}`);
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let mounted = true;
    const params = new URLSearchParams({ limit: '80' });
    if (presetTrackId) {
      params.set('sourceTrackId', presetTrackId);
      if (presetTrackType) params.set('sourceTrackType', presetTrackType);
    }
    fetch(`/api/music-clips/sources?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!mounted) return;
        if (!ok) throw new Error(json?.error || 'Connexion requise');
        const nextSources = Array.isArray(json?.sources) ? json.sources : [];
        setSources(nextSources);
        const presetResolved = Boolean(presetTrackId) && nextSources[0]?._id === presetTrackId;
        if (presetResolved) {
          setSelectedSourceId(nextSources[0]._id);
          setIsPreset(true);
          void recordClipFunnelEvent(presetTrackId, 'clip_composer_opened');
        } else if (nextSources[0]?._id) {
          setSelectedSourceId(nextSources[0]._id);
        }
      })
      .catch((e) => mounted && setError(e?.message || 'Impossible de charger les morceaux autorises'))
      .finally(() => mounted && setLoadingSources(false));
    return () => {
      mounted = false;
    };
  }, [status, presetTrackId, presetTrackType]);

  useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    fetch(`/api/challenges/${encodeURIComponent(challengeId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (mounted && json?.challenge?.title) setChallengeTitle(json.challenge.title);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  async function onPickFile(nextFile: File | null) {
    setError(null);
    setFile(null);
    setLocalDuration(0);
    if (!nextFile) return;
    if (!/^video\/(mp4|webm|quicktime|x-m4v)$/i.test(nextFile.type) && !/\.(mp4|webm|mov|m4v)$/i.test(nextFile.name)) {
      setError('Choisis une video lisible, idealement MP4 H.264.');
      return;
    }
    if (nextFile.size > MUSIC_CLIP_MAX_BYTES) {
      setError('La video depasse la limite de 200 Mo du MVP.');
      return;
    }
    try {
      const duration = await getVideoDuration(nextFile);
      if (duration < MUSIC_CLIP_MIN_SECONDS || duration > MUSIC_CLIP_MAX_SECONDS) {
        setError('Un clip doit durer entre 15 et 60 secondes.');
        return;
      }
      setFile(nextFile);
      setLocalDuration(duration);
      setStep(isPreset && selectedSourceId ? 3 : 2);
    } catch (e: any) {
      setError(e?.message || 'Video illisible');
    }
  }

  async function publish() {
    if (!file || !selectedSource) {
      setError('Ajoute une video et choisis un morceau.');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const upload = await uploadClipVideo(file);
      const draftRes = await fetch('/api/music-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTrackId: selectedSource.sourceTrackId, sourceTrackType: selectedSource.sourceTrackType }),
      });
      const draftJson = await draftRes.json();
      if (!draftRes.ok) throw new Error(draftJson?.error || 'Brouillon impossible');
      void recordClipFunnelEvent(selectedSource._id, 'clip_draft_created');
      const clipId = draftJson?.clip?.id;
      const publishRes = await fetch(`/api/music-clips/${clipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: upload.videoUrl,
          videoPublicId: upload.videoPublicId,
          posterUrl: upload.posterUrl,
          videoBytes: upload.bytes,
          videoDurationSeconds: upload.duration || localDuration,
          caption,
          tags: tagsFromText(tagText),
          sourceTrackOffsetSeconds: offset,
          sourceTrackDurationSeconds: Math.round(localDuration),
          visibility: 'published',
        }),
      });
      const publishJson = await publishRes.json();
      if (!publishRes.ok) throw new Error(publishJson?.error || 'Publication impossible');
      void recordClipFunnelEvent(selectedSource._id, 'clip_published');
      if (challengeId && clipId) {
        fetch(`/api/challenges/${encodeURIComponent(challengeId)}/participate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: 'clip', contentId: clipId }),
        }).catch(() => {});
      }
      router.push('/?filter=clips');
    } catch (e: any) {
      setError(e?.message || 'Impossible de publier le clip');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1120px]">
      <SynauraTopBar primaryHref="/upload" primaryLabel="Publier" secondaryHref="/ai-generator" secondaryLabel="Studio" />
      <div className="space-y-4 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-black/58 transition hover:bg-[#111111] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au Scroll
          </Link>
          <CreateArrivalBanner
            context={challengeId ? 'challenge' : 'clip'}
            title={challengeId ? challengeTitle : (isPreset ? selectedSource?.title : null)}
          />
        </div>

        <SynauraPanel className="p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <span className="inline-flex rounded-full bg-[#7357C6]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#7357C6]">
                Clips musicaux
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111111] sm:text-5xl">Publier un clip</h1>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-black/54">
                Une video verticale reliee a un morceau Synaura autorise. Le son Synaura reste la source principale.
              </p>
              <div className="mt-5 grid gap-2">
                {['Importer la video', 'Choisir un morceau Synaura', 'Ajouter legende, tags et publier'].map((label, index) => (
                  <div key={label} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-black ${step >= index + 1 ? 'border-[#7357C6]/20 bg-[#7357C6]/8 text-[#111111]' : 'border-black/[0.08] bg-white text-black/38'}`}>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs shadow-sm">{step > index + 1 ? <Check className="h-4 w-4 text-[#4A9EAA]" /> : index + 1}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-black/[0.08] bg-white p-4">
              {step === 1 ? (
                <div className="space-y-3">
                  {isPreset && selectedSource ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#7357C6]/20 bg-[#7357C6]/8 p-3">
                      <img src={selectedSource.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-full bg-[#7357C6]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#7357C6]">
                          Son sélectionné
                        </span>
                        <p className="mt-1 truncate text-sm font-black">{selectedSource.title}</p>
                        <p className="truncate text-xs font-bold text-black/46">{selectedSource.artist?.name || 'Artiste Synaura'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#7357C6] underline-offset-2 hover:underline"
                      >
                        Changer de son
                      </button>
                    </div>
                  ) : null}
                  <label className="grid min-h-[360px] cursor-pointer place-items-center rounded-[1.1rem] border border-dashed border-black/16 bg-[#F7F6F3] p-6 text-center transition hover:border-[#7357C6]/45">
                    <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="sr-only" onChange={(event) => void onPickFile(event.target.files?.[0] || null)} />
                    <span>
                      <UploadCloud className="mx-auto h-12 w-12 text-[#7357C6]" />
                      <span className="mt-4 block text-xl font-black text-[#111111]">Importer une video</span>
                      <span className="mt-2 block text-sm font-semibold text-black/48">Vertical 9:16 recommande, 15-60 secondes, 200 Mo maximum.</span>
                    </span>
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4A9EAA]">Etape 2</p>
                      <h2 className="text-xl font-black">Choisir le morceau</h2>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06]"><X className="h-4 w-4" /></button>
                  </div>
                  {loadingSources ? (
                    <div className="grid min-h-[260px] place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div>
                  ) : sources.length ? (
                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {sources.map((source) => {
                        const isOwnTrack = Boolean(currentUserId) && source.artist?._id === currentUserId;
                        return (
                          <button key={source._id} type="button" onClick={() => setSelectedSourceId(source._id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedSourceId === source._id ? 'border-[#7357C6]/40 bg-[#7357C6]/10' : 'border-black/[0.08] bg-[#F7F6F3] hover:bg-black/[0.04]'}`}>
                            <img src={source.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black">{source.title}</span>
                              <span className="mt-1 block truncate text-xs font-bold text-black/46">{source.artist?.name || 'Artiste Synaura'} · extrait {mmss(Math.min(localDuration || 30, MUSIC_CLIP_MAX_SECONDS))}</span>
                              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-[#7357C6]">{isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}</span>
                            </span>
                            <Music2 className="h-4 w-4 shrink-0 text-[#7357C6]" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#F7F6F3] p-6 text-center text-sm font-semibold text-black/48">
                      Aucun morceau autorise aux clips pour le moment.
                    </div>
                  )}
                  <button type="button" disabled={!selectedSource} onClick={() => setStep(3)} className="h-12 w-full rounded-full bg-[#111111] text-sm font-black text-white disabled:opacity-45">Continuer</button>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl bg-[#F7F6F3] p-3">
                    <img src={selectedSource?.coverUrl || FALLBACK_COVER} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{selectedSource?.title}</p>
                      <p className="truncate text-xs font-bold text-black/46">{selectedSource?.artist?.name || 'Artiste Synaura'} · {mmss(offset)} a {mmss(offset + Math.round(localDuration || 30))}</p>
                    </div>
                    <Play className="h-4 w-4 text-[#4A9EAA]" />
                  </div>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-black/42">Debut de l'extrait</span>
                    <input type="range" min={0} max={maxOffset} value={offset} onChange={(event) => setOffset(Number(event.target.value))} className="mt-2 h-2 w-full accent-[#7357C6]" />
                  </label>
                  <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={280} placeholder="Legende" className="min-h-28 w-full rounded-2xl border border-black/[0.08] bg-[#F7F6F3] p-3 text-sm font-semibold outline-none focus:border-[#7357C6]/45" />
                  <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Tags separes par espaces ou virgules" className="h-12 w-full rounded-2xl border border-black/[0.08] bg-[#F7F6F3] px-3 text-sm font-semibold outline-none focus:border-[#7357C6]/45" />
                  <button type="button" disabled={publishing} onClick={() => void publish()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111111] text-sm font-black text-white disabled:opacity-55">
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                    Publier le clip
                  </button>
                </div>
              ) : null}
              {error ? <p className="mt-4 rounded-2xl bg-[#D96D63]/10 px-4 py-3 text-sm font-bold text-[#9b352e]">{error}</p> : null}
            </div>
          </div>
        </SynauraPanel>
      </div>
    </SynauraAppShell>
  );
}
