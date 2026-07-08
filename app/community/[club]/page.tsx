'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock, Music2, Pause, Play, Reply, ThumbsUp, Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAudioPlayer } from '@/app/providers';
import { SynauraAppShell, SynauraPanel, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import { composeHref, getClubBySlug } from '@/lib/communityClubs';

// Un club "remix" (Remix Lab) affiche les défis Clip en cours ; "ai" (IA Lab) affiche les défis Variation IA.
const CLUB_CHALLENGE_CONTENT_TYPE: Record<string, string> = { remix: 'clip', ai: 'variation' };

type ClubChallenge = { id: string; title: string; prompt: string; accentColor: string | null };

type ClubPost = {
  id?: string;
  title?: string;
  content?: string;
  created_at?: string;
  likes_count?: number;
  replies_count?: number;
  author?: { name?: string; username?: string; avatar?: string | null };
  track?: any;
};

function formatDate(value?: string) {
  if (!value) return 'maintenant';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return 'maintenant';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function PostCard({ post, accent, isPlaying, onPlayTrack }: { post: ClubPost; accent: string; isPlaying: boolean; onPlayTrack: () => void }) {
  const track = post.track;
  const hasTrack = Boolean(track);

  return (
    <Link
      href={post.id ? `/community/forum/${post.id}` : '/community'}
      className={
        hasTrack
          ? 'group block rounded-[1.35rem] border border-black/[0.08] bg-[#fffaf2]/90 p-3.5 shadow-[0_16px_45px_rgba(30,25,20,0.07)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_60px_rgba(30,25,20,0.11)] sm:p-4'
          : 'group block rounded-[1.1rem] border border-black/[0.05] bg-black/[0.02] p-3 opacity-80 transition hover:opacity-100 hover:bg-black/[0.04]'
      }
    >
      {hasTrack ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPlayTrack();
          }}
          className="mb-3 flex w-full min-w-0 items-center gap-3 rounded-[1.05rem] border border-black/[0.06] bg-black/[0.035] p-2.5 text-left transition hover:bg-black/[0.07]"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.85rem] bg-[#171313] text-white">
            {track.coverUrl || track.cover_url ? (
              <img src={track.coverUrl || track.cover_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music2 className="m-4 h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[#171313]">{track.title || 'Son attaché'}</p>
            <p className="truncate text-[11px] font-semibold text-black/42">{track.artist_name || 'Artiste Synaura'}</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" style={{ background: accent }}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
          </span>
        </button>
      ) : null}

      <div className="flex min-w-0 gap-2.5">
        <div className="hidden shrink-0 sm:block">
          <Avatar src={post.author?.avatar} name={post.author?.name || 'Créateur'} username={post.author?.username} size={hasTrack ? 'md' : 'sm'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black/35">
              <Clock className="h-3 w-3" />
              {formatDate(post.created_at)}
            </span>
          </div>
          <h3 className={hasTrack ? 'line-clamp-1 text-base font-black tracking-[-0.03em] text-[#171313]' : 'line-clamp-1 text-sm font-bold text-black/62'}>
            {post.title || 'Discussion'}
          </h3>
          <p className={hasTrack ? 'mt-1 line-clamp-2 text-sm leading-6 text-black/48' : 'mt-1 line-clamp-1 text-xs leading-5 text-black/38'}>
            {post.content || ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-black/35">
            <span>{post.author?.name || 'Créateur Synaura'}</span>
            <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.likes_count || 0}</span>
            <span className="inline-flex items-center gap-1"><Reply className="h-3 w-3" />{post.replies_count || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ClubDetailPage() {
  const params = useParams<{ club: string }>();
  const club = getClubBySlug(typeof params?.club === 'string' ? params.club : Array.isArray(params?.club) ? params.club[0] : null);
  const { audioState, setQueueAndPlay, play, pause } = useAudioPlayer();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubChallenge, setClubChallenge] = useState<ClubChallenge | null>(null);

  useEffect(() => {
    const contentType = club ? CLUB_CHALLENGE_CONTENT_TYPE[club.slug] : null;
    if (!contentType) {
      setClubChallenge(null);
      return;
    }
    let mounted = true;
    fetch('/api/challenges?status=active', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!mounted) return;
        const match = Array.isArray(json?.challenges)
          ? json.challenges.find((c: any) => c.contentType === contentType)
          : null;
        setClubChallenge(match || null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [club]);

  useEffect(() => {
    if (!club) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetch(`/api/community/posts?category=${encodeURIComponent(club.category)}&limit=30&sort=recent`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!mounted || !json) return;
        setPosts(Array.isArray(json.posts) ? json.posts : []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [club]);

  if (!club) {
    return (
      <SynauraAppShell contentClassName="max-w-[900px]">
        <SynauraTopBar searchHref="/community" searchLabel="Chercher un Club..." />
        <SynauraRouteNav />
        <SynauraPanel className="p-10 text-center">
          <Music2 className="mx-auto h-12 w-12 text-black/16" />
          <h1 className="mt-4 text-2xl font-black text-[#171313]">Club introuvable</h1>
          <Link href="/community" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#171313] px-5 text-sm font-black text-white">
            Retour aux Clubs
          </Link>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  const currentTrackId = audioState.tracks[audioState.currentTrackIndex]?._id;

  const playPostTrack = (post: ClubPost) => {
    const t = post.track;
    if (!t) return;
    const audioUrl = t.audioUrl || t.audio_url;
    if (!audioUrl) return;
    const trackId = String(t.id || t._id);
    if (currentTrackId === trackId) {
      audioState.isPlaying ? pause() : play();
      return;
    }
    setQueueAndPlay([{
      _id: trackId,
      title: t.title || 'Son attaché',
      artist: {
        _id: t.artist_id || '',
        name: t.artist_name || 'Artiste',
        username: t.artist_username || '',
      },
      audioUrl,
      coverUrl: t.coverUrl || t.cover_url || '/default-cover.svg',
      duration: t.duration || 0,
      likes: [],
      comments: [],
      plays: t.plays || 0,
      genre: t.genre || [],
    } as any], 0);
  };

  return (
    <SynauraAppShell contentClassName="max-w-[1100px]">
      <SynauraTopBar searchHref="/community" searchLabel="Chercher un Club..." secondaryHref="/ai-generator" secondaryLabel="Studio" />
      <SynauraRouteNav />

      <div className="space-y-5 pb-24">
        <Link href="/community" className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-xs font-black text-black/56 transition hover:bg-[#171313] hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" />
          Tous les Clubs
        </Link>

        <div className="relative overflow-hidden rounded-[1.8rem] p-6 text-white sm:p-8" style={{ background: `linear-gradient(135deg, ${club.accent}, #171313 130%)` }}>
          <div className="relative">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-white/16">
              <Music2 className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{club.name}</h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/70 sm:text-base">{club.promise}</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {club.actions.map((action) =>
                action.kind === 'compose' ? (
                  <Link
                    key={action.label}
                    href={composeHref(club)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-xs font-black text-[#171313] transition hover:scale-[1.02] sm:h-11 sm:px-5 sm:text-sm"
                  >
                    {action.label}
                  </Link>
                ) : (
                  <a
                    key={action.label}
                    href="#club-posts"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/14 px-4 text-xs font-black text-white transition hover:bg-white/22 sm:h-11 sm:px-5 sm:text-sm"
                  >
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ),
              )}
            </div>
          </div>
        </div>

        {clubChallenge ? (
          <Link
            href={`/challenges/${clubChallenge.id}`}
            className="flex items-center gap-3 rounded-[1.4rem] border border-black/[0.08] bg-[#fffaf2]/92 p-4 shadow-[0_16px_42px_rgba(30,25,20,0.08)] transition hover:-translate-y-0.5"
            style={{ backgroundImage: `linear-gradient(145deg, ${clubChallenge.accentColor || club.accent}22, rgba(255,250,242,.94) 62%)` }}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[#171313] text-white">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-black/42">Défi en cours</span>
              <span className="mt-0.5 block truncate text-sm font-black text-[#111111]">{clubChallenge.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-black/40" />
          </Link>
        ) : null}

        <section id="club-posts" className="space-y-3">
          <h2 className="text-xl font-black tracking-[-0.04em] text-[#171313]">Discussions du Club</h2>
          {loading ? (
            <SynauraPanel className="grid min-h-[220px] place-items-center p-8">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
            </SynauraPanel>
          ) : posts.length ? (
            <div className="grid gap-2.5">
              {posts.map((post, index) => (
                <PostCard
                  key={post.id || index}
                  post={post}
                  accent={club.accent}
                  isPlaying={Boolean(post.track) && currentTrackId === String(post.track.id || post.track._id) && audioState.isPlaying}
                  onPlayTrack={() => playPostTrack(post)}
                />
              ))}
            </div>
          ) : (
            <SynauraPanel className="p-8 text-center">
              <Music2 className="mx-auto h-10 w-10 text-black/22" />
              <p className="mt-3 text-sm font-black text-black/52">Aucune discussion dans ce Club pour le moment.</p>
              <p className="mx-auto mt-1 max-w-sm text-xs font-semibold leading-5 text-black/36">Sois la première personne à lancer une discussion.</p>
              <Link href={composeHref(club)} className="mt-4 inline-flex h-10 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                {club.actions[0].label}
              </Link>
            </SynauraPanel>
          )}
        </section>
      </div>
    </SynauraAppShell>
  );
}
