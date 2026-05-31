'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Check,
  Heart,
  Link as LinkIcon,
  Loader2,
  Music2,
  Play,
  Search,
  Send,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import TrackCover from '@/components/TrackCover';
import { suggestTags } from '@/lib/postCategorization';

type PostCategory = 'feedback' | 'collab' | 'remix' | 'prompts' | 'weekly-top';

type UserTrack = {
  id: string;
  title: string;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
};

const CATEGORIES: Array<{ id: PostCategory; label: string; prompt: string; icon: any; tint: string }> = [
  { id: 'feedback', label: 'Avis sur mon son', prompt: 'Je voudrais un avis sur ce son : mix, refrain, structure, cover, potentiel de sortie.', icon: Heart, tint: '#ff6f61' },
  { id: 'collab', label: 'Recherche feat', prompt: 'Je cherche un feat pour ce morceau : voix, prod, topline, mix ou direction artistique.', icon: Users, tint: '#7c5cff' },
  { id: 'remix', label: 'Défi remix', prompt: 'Je lance un défi remix depuis cette source. Voici les règles, l’ambiance et ce que j’aimerais entendre.', icon: Zap, tint: '#f59e0b' },
  { id: 'prompts', label: 'Battle de prompts', prompt: 'Je partage un prompt ou une recette IA à tester, comparer et améliorer ensemble.', icon: Sparkles, tint: '#14b8a6' },
  { id: 'weekly-top', label: 'Découverte', prompt: 'Je partage une découverte qui mérite d’être écoutée cette semaine.', icon: Trophy, tint: '#38bdf8' },
];

function categoryMeta(category: string | null): typeof CATEGORIES[number] {
  return CATEGORIES.find((item) => item.id === category) || CATEGORIES[0];
}

function normalizeTrack(track: any): UserTrack | null {
  const id = String(track?.id || track?._id || '');
  if (!id) return null;
  return {
    id,
    title: String(track?.title || 'Son sans titre'),
    coverUrl: track?.coverUrl || track?.cover_url || null,
    coverVideoUrl: track?.coverVideoUrl || track?.cover_video_url || null,
    coverVideoPosterUrl: track?.coverVideoPosterUrl || track?.cover_video_poster_url || null,
    audioUrl: track?.audioUrl || track?.audio_url || null,
    duration: track?.duration || null,
  };
}

function NewCommunityPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { setQueueAndPlay } = useAudioPlayer();
  const initialCategory = categoryMeta(searchParams.get('category'));
  const initialTrackId = searchParams.get('trackId') || searchParams.get('sourceTrack') || '';
  const [category, setCategory] = useState<PostCategory>(initialCategory.id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialCategory.prompt);
  const [selectedTrack, setSelectedTrack] = useState<UserTrack | null>(null);
  const [tracks, setTracks] = useState<UserTrack[]>([]);
  const [trackSearch, setTrackSearch] = useState('');
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const meta = categoryMeta(category);
  const ActiveIcon = meta.icon;
  const tags = useMemo(() => suggestTags(title, content).slice(0, 6), [content, title]);
  const filteredTracks = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((track) => track.title.toLowerCase().includes(q));
  }, [trackSearch, tracks]);

  const playAttachedTrack = (track: UserTrack) => {
    if (!track.audioUrl) {
      notify.info('Son indisponible', "Ce son n'a pas d'audio lisible.");
      return;
    }
    setQueueAndPlay([{
      _id: track.id,
      title: track.title,
      artist: {
        _id: (session?.user as any)?.id || '',
        name: (session?.user as any)?.name || (session?.user as any)?.username || 'Artiste',
        username: (session?.user as any)?.username || '',
      },
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl || '/default-cover.svg',
      coverVideoUrl: track.coverVideoUrl || null,
      coverVideoPosterUrl: track.coverVideoPosterUrl || track.coverUrl || null,
      duration: track.duration || 0,
      likes: [],
      comments: [],
      plays: 0,
      genre: [],
    } as any], 0);
  };

  useEffect(() => {
    const loadTracks = async () => {
      if (status === 'loading' || !session?.user) return;
      setLoadingTracks(true);
      try {
        const response = await fetch('/api/users/tracks?limit=80', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        const list = (Array.isArray(payload?.tracks) ? payload.tracks : Array.isArray(payload) ? payload : [])
          .map(normalizeTrack)
          .filter(Boolean) as UserTrack[];
        setTracks(list);
        if (initialTrackId && !selectedTrack) {
          const localTrack = list.find((track) => track.id === initialTrackId);
          if (localTrack) {
            setSelectedTrack(localTrack);
          } else {
            try {
              const trackResponse = await fetch(`/api/tracks/${encodeURIComponent(initialTrackId)}`, { cache: 'no-store' });
              const trackPayload = await trackResponse.json().catch(() => ({}));
              const normalized = normalizeTrack(trackPayload);
              setSelectedTrack(normalized || { id: initialTrackId, title: searchParams.get('title') || 'Son attaché' });
            } catch {
              setSelectedTrack({ id: initialTrackId, title: searchParams.get('title') || 'Son attaché' });
            }
          }
        }
      } catch {
        notify.error('Sons', 'Impossible de charger tes sons.');
      } finally {
        setLoadingTracks(false);
      }
    };
    loadTracks();
  }, [initialTrackId, searchParams, selectedTrack, session?.user, status]);

  useEffect(() => {
    const nextMeta = categoryMeta(category);
    setContent((current) => current.trim() ? current : nextMeta.prompt);
  }, [category]);

  const submitPost = async () => {
    if (!session?.user) {
      router.push(`/auth/signup?callbackUrl=${encodeURIComponent(`/community/forum/new?category=${category}${selectedTrack ? `&trackId=${selectedTrack.id}` : ''}`)}`);
      return;
    }
    if (!title.trim() || !content.trim()) {
      notify.error('Post incomplet', 'Ajoute un titre et un texte.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          tags,
          track_id: selectedTrack?.id || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Publication impossible');
      notify.success('Community', 'Ta discussion est publiée.');
      router.push(payload?.id ? `/community/forum/${payload.id}` : `/community/forum?category=${category}`);
    } catch (error: any) {
      notify.error('Publication', error?.message || 'Impossible de publier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar searchLabel="Chercher un avis, un feat, un défi..." primaryHref="/community/forum/new?category=feedback" primaryLabel="Nouveau post" />
      <SynauraRouteNav />

      <div className="space-y-5 pb-36 sm:pb-28">
        <SynauraInkPanel className="p-4 sm:p-6 lg:p-7">
          <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/58 transition hover:bg-white/14 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour Community
          </Link>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Créer une discussion musicale</p>
              <h1 className="mt-2 max-w-3xl text-[2.5rem] font-black leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl">
                Transforme un son en retours utiles.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/54">
                Choisis une intention, attache un morceau, puis publie une demande claire pour obtenir avis, feat ou remix.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Intention active</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-[1rem] text-white" style={{ background: meta.tint }}>
                  <ActiveIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-white">{meta.label}</p>
                  <p className="text-xs font-semibold text-white/42">{selectedTrack ? selectedTrack.title : 'Aucun son attaché'}</p>
                </div>
              </div>
            </div>
          </div>
        </SynauraInkPanel>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <SynauraPanel className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {CATEGORIES.map((item) => {
                const Icon = item.icon;
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`rounded-[1.15rem] border p-3 text-left transition ${
                      active ? 'border-[#171313] bg-[#171313] text-white' : 'border-black/[0.08] bg-black/[0.035] text-[#171313] hover:bg-white'
                    }`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[0.9rem] text-white" style={{ background: item.tint }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-3 text-sm font-black">{item.label}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex : Besoin d’un avis sur mon refrain"
                className="h-12 w-full rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
              />
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
                placeholder="Décris ton attente : mix, paroles, feat, remix, contraintes..."
                className="w-full resize-none rounded-[1.25rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
              />
              <div className="flex flex-wrap gap-1.5">
                {(tags.length ? tags : ['feedback']).map((tag) => (
                  <span key={tag} className="rounded-full bg-black/[0.055] px-2.5 py-1 text-[10px] font-black text-black/42">#{tag}</span>
                ))}
              </div>
            </div>
          </SynauraPanel>

          <aside className="space-y-4">
            <SynauraPanel className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Son attaché</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#171313]">Sélectionner un de mes sons</h2>
                </div>
                {selectedTrack ? (
                  <button type="button" onClick={() => setSelectedTrack(null)} className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.055] text-black/42">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {selectedTrack ? (
                <div className="mb-3 overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-[#171313] text-white shadow-[0_16px_44px_rgba(23,19,19,0.16)]">
                  <div className="relative flex min-w-0 items-center gap-3 p-3">
                    <div className="absolute inset-0 opacity-20">
                      <TrackCover
                        src={selectedTrack.coverUrl || null}
                        videoSrc={selectedTrack.coverVideoUrl || null}
                        posterSrc={selectedTrack.coverVideoPosterUrl || selectedTrack.coverUrl || null}
                        title={selectedTrack.title}
                        className="h-full w-full scale-125 blur-xl"
                        rounded="rounded-none"
                        objectFit="cover"
                      />
                    </div>
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-white/10">
                      <TrackCover
                        src={selectedTrack.coverUrl || null}
                        videoSrc={selectedTrack.coverVideoUrl || null}
                        posterSrc={selectedTrack.coverVideoPosterUrl || selectedTrack.coverUrl || null}
                        title={selectedTrack.title}
                        className="h-full w-full"
                        rounded="rounded-none"
                        objectFit="cover"
                      />
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/44">Ce son sera visible dans le post</p>
                      <p className="mt-1 truncate text-base font-black">{selectedTrack.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-white/44">{selectedTrack.audioUrl ? 'Lisible par la communauté' : 'Audio non disponible'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => playAttachedTrack(selectedTrack)}
                      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fffaf2] text-[#171313]"
                      aria-label="Écouter le son attaché"
                    >
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/26" />
                <input
                  value={trackSearch}
                  onChange={(event) => setTrackSearch(event.target.value)}
                  placeholder="Rechercher dans mes sons..."
                  className="h-11 w-full rounded-full border border-black/[0.08] bg-white pl-10 pr-4 text-sm font-semibold outline-none placeholder:text-black/28 focus:border-[#171313]"
                />
              </div>
              <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {loadingTracks ? (
                  <div className="grid min-h-32 place-items-center text-sm font-black text-black/40">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : filteredTracks.length ? filteredTracks.map((track) => {
                  const active = selectedTrack?.id === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setSelectedTrack(track)}
                      className={`flex w-full items-center gap-3 rounded-[1rem] p-2 text-left transition ${
                        active ? 'bg-[#171313] text-white' : 'bg-black/[0.035] text-[#171313] hover:bg-black/[0.06]'
                      }`}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[0.85rem] bg-black/[0.08]">
                        <TrackCover
                          src={track.coverUrl || null}
                          videoSrc={track.coverVideoUrl || null}
                          posterSrc={track.coverVideoPosterUrl || track.coverUrl || null}
                          title={track.title}
                          className="h-full w-full"
                          rounded="rounded-none"
                          objectFit="cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{track.title}</p>
                        <p className={`text-[11px] font-semibold ${active ? 'text-white/46' : 'text-black/38'}`}>{active ? 'Attaché au post' : 'Cliquer pour attacher'}</p>
                      </div>
                      {active ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                }) : (
                  <div className="rounded-[1rem] border border-dashed border-black/[0.12] p-5 text-center">
                    <Music2 className="mx-auto h-8 w-8 text-black/22" />
                    <p className="mt-2 text-sm font-black text-black/42">Aucun son trouvé.</p>
                  </div>
                )}
              </div>
            </SynauraPanel>

            <SynauraPanel className="p-4 sm:p-5">
              <div className="flex items-center gap-2 rounded-[1rem] bg-black/[0.04] p-3 text-xs font-semibold text-black/44">
                <LinkIcon className="h-4 w-4" />
                {selectedTrack ? `Track attachée : ${selectedTrack.title}` : 'Tu peux publier sans son, mais Community devient plus vivante avec une track source.'}
              </div>
              <button
                type="button"
                onClick={submitPost}
                disabled={submitting || status === 'loading'}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-45"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {session?.user ? 'Publier dans Community' : 'Créer un compte pour poster'}
              </button>
            </SynauraPanel>
          </aside>
        </div>
      </div>
    </SynauraAppShell>
  );
}

export default function NewCommunityPostPage() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="max-w-[1180px]">
          <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-black/36" />
          </SynauraPanel>
        </SynauraAppShell>
      }
    >
      <NewCommunityPostContent />
    </Suspense>
  );
}
