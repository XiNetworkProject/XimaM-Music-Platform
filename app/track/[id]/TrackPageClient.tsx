'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import Link from 'next/link';
import { Play, Pause, Heart, Clock, Music, Headphones, Share2, Code, UserPlus, Sparkles, ArrowLeft, MessageSquare, Repeat2, Film, Trophy } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';
import TrackCover from '@/components/TrackCover';
import { getCdnUrl } from '@/lib/cdn';
import { canUseSoundClientSide } from '@/lib/clipPermissions';
import { recordClipFunnelEvent } from '@/lib/analyticsClient';
import TrackPostsSection from '@/components/posts/TrackPostsSection';
import TrackShareCardModal from '@/components/share/TrackShareCardModal';

interface TrackData {
  id: string;
  title: string;
  artist: string;
  artistUsername: string;
  artistAvatar: string | null;
  creatorId?: string | null;
  coverUrl: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  audioUrl: string;
  duration: number;
  genre: string[];
  plays: number;
  likes: number;
  createdAt: string;
  isAI: boolean;
  canRemixAiVariation?: boolean;
  allowClips?: boolean;
  allowAiVariation?: boolean;
  remixVisibility?: 'everyone' | 'followers' | 'disabled';
  remixAttribution?: {
    sourceTrackId: string;
    title: string;
    artist: string;
    artistUsername?: string;
    trackUrl?: string;
  } | null;
  variationsCount?: number;
  musicClipsCount?: number;
  linkedChallenge?: { id: string; title: string; status: 'upcoming' | 'active' | 'ended' } | null;
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec) % 60).padStart(2, '0')}`;
const fmt = new Intl.NumberFormat('fr-FR', { notation: 'compact' });

function ArtistAvatar({ name, username, avatar }: { name: string; username: string; avatar?: string | null }) {
  const url = avatar ? getCdnUrl(avatar) || avatar : null;
  const initial = (name || username || '?').slice(0, 1).toUpperCase();

  if (url) {
    return <img src={url} alt="" className="h-12 w-12 rounded-full object-cover shadow-[0_14px_30px_rgba(20,15,10,0.12)]" />;
  }

  return (
    <div className="grid h-12 w-12 place-items-center rounded-full bg-[#171313] text-sm font-black text-white shadow-[0_14px_30px_rgba(20,15,10,0.12)]">
      {initial}
    </div>
  );
}

export default function TrackPageClient({ track }: { track: TrackData | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { playTrack, audioState, play, pause, setShowPlayer, setIsMinimized } = useAudioPlayer();
  const [showShare, setShowShare] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);

  const currentTrack = audioState.tracks?.[audioState.currentTrackIndex];
  const isCurrentTrack = currentTrack?._id === track?.id;
  const isPlaying = isCurrentTrack && audioState.isPlaying;

  if (!track) {
    return (
      <SynauraAppShell contentClassName="max-w-[1100px]">
        <SynauraTopBar searchHref="/discover" searchLabel="Rechercher un son, un post ou un createur..." />
        <SynauraPanel className="px-6 py-14 text-center sm:px-8">
          <Music className="mx-auto h-14 w-14 text-black/16" />
          <h1 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#171313]">Track introuvable</h1>
          <p className="mt-2 text-sm font-semibold text-black/45">Cette musique n'existe pas ou a ete supprimee.</p>
          <Link href="/discover" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]">
            Découvrir la musique
          </Link>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  const handlePlay = async () => {
    if (isCurrentTrack) {
      if (audioState.isPlaying) pause(); else play();
    } else {
      const normalized = {
        _id: track.id,
        title: track.title,
        artist: {
          _id: track.artistUsername || 'unknown',
          name: track.artist,
          username: track.artistUsername || 'unknown',
          avatar: track.artistAvatar,
        },
        audioUrl: track.audioUrl,
        coverUrl: track.coverUrl,
        coverVideoUrl: track.coverVideoUrl,
        coverVideoPosterUrl: track.coverVideoPosterUrl,
        duration: track.duration,
        likes: [],
        comments: [],
        plays: track.plays,
        genre: track.genre,
        isLiked: false,
      } as any;
      await playTrack(normalized);
      try { setShowPlayer(true); setIsMinimized(false); } catch {}
    }
  };

  const handleCopyEmbed = () => {
    const code = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://www.synaura.fr'}/embed/${track.id}" width="100%" height="152" frameBorder="0" allow="autoplay; encrypted-media" style="border-radius:12px" title="${track.title}"></iframe>`;
    navigator.clipboard.writeText(code).catch(() => {});
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2500);
  };

  const trackUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${track.id}` : `https://www.synaura.fr/track/${track.id}`;
  const coverSrc = track.coverUrl || null;
  const canRemixAiVariation = Boolean(track.canRemixAiVariation && track.allowAiVariation && track.remixVisibility !== 'disabled');
  const currentUserId = (session?.user as any)?.id;
  const isOwnTrack = Boolean(currentUserId) && Boolean(track.creatorId) && String(track.creatorId) === String(currentUserId);
  const canUseSound = canUseSoundClientSide({
    isOwner: isOwnTrack,
    allowClips: Boolean(track.allowClips),
    remixVisibility: track.remixVisibility || 'disabled',
  });
  const useThisSoundHref = `/clips/new?trackId=${encodeURIComponent(track.id)}&trackType=${track.id.startsWith('ai-') ? 'ai_track' : 'track'}`;
  const openStudioWithRemix = () => {
    const params = new URLSearchParams({
      mode: 'remix',
      sourceTrackId: track.id,
      sourceTrackType: track.id.startsWith('ai-') ? 'ai_track' : 'track',
    });
    router.push(`/ai-generator?${params.toString()}`);
  };

  return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar searchHref="/discover" searchLabel="Rechercher un son, un post ou un createur..." />

      <div className="space-y-4 pb-24">
        <button
          onClick={() => router.back()}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-[#fffaf2]/88 px-4 text-sm font-black text-black/56 shadow-[0_14px_36px_rgba(30,25,20,0.08)] transition hover:bg-[#171313] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <SynauraInkPanel className="overflow-hidden">
          {coverSrc ? (
            <div className="absolute inset-0">
              <img src={coverSrc} alt="" className="h-full w-full object-cover opacity-18 blur-[18px] scale-110" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#171313]/68 via-[#171313]/82 to-[#171313]" />
            </div>
          ) : null}
          <div className="relative px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative h-40 w-40 overflow-hidden rounded-[2rem] bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:h-52 sm:w-52">
                {coverSrc ? (
                  <TrackCover
                    src={coverSrc}
                    videoSrc={track.coverVideoUrl}
                    posterSrc={track.coverVideoPosterUrl || coverSrc}
                    title={track.title}
                    className="h-full w-full"
                    rounded="rounded-none"
                    objectFit="cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-white/10">
                    <Music className="h-14 w-14 text-white/24" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {track.isAI ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
                    <Sparkles className="h-3 w-3" />
                    Creation IA
                  </span>
                ) : null}
                <h1 className="mt-3 break-words text-3xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl">
                  {track.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ArtistAvatar name={track.artist} username={track.artistUsername} avatar={track.artistAvatar} />
                  <div className="min-w-0">
                    {track.artistUsername ? (
                      <Link href={`/profile/${track.artistUsername}`} className="block truncate text-base font-black text-white hover:text-white/82">
                        {track.artist}
                      </Link>
                    ) : (
                      <p className="text-base font-black text-white">{track.artist}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/48">
                      {track.genre?.length > 0 ? <span>{track.genre[0]}</span> : null}
                      {track.duration > 0 ? <span>· {mmss(track.duration)}</span> : null}
                      {track.plays > 0 ? <span>· {fmt.format(track.plays)} ecoutes</span> : null}
                      {track.likes > 0 ? <span>· {fmt.format(track.likes)} likes</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SynauraInkPanel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_360px]">
          <SynauraPanel className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePlay}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#171313] px-6 text-sm font-black text-white transition hover:scale-[1.02] active:scale-95"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Ecouter'}
              </button>

              <button
                onClick={() => setShowShare(true)}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-black/[0.055] px-5 text-sm font-black text-black/60 transition hover:bg-black/[0.1] hover:text-black"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </button>

              <button
                onClick={handleCopyEmbed}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-black/[0.055] px-5 text-sm font-black text-black/60 transition hover:bg-black/[0.1] hover:text-black"
              >
                <Code className="h-4 w-4" />
                {embedCopied ? 'Code copie' : 'Embed'}
              </button>

              {canRemixAiVariation ? (
                <button
                  onClick={openStudioWithRemix}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#7357C6] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  <Repeat2 className="h-4 w-4" />
                  Remixer
                </button>
              ) : null}

              {canUseSound ? (
                <Link
                  href={useThisSoundHref}
                  onClick={() => void recordClipFunnelEvent(track.id, 'clip_use_sound_started')}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#4A9EAA] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  <Film className="h-4 w-4" />
                  {isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}
                </Link>
              ) : null}

              <Link
                href={`/community/forum/new?category=feedback&trackId=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title)}&source=track`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                <MessageSquare className="h-4 w-4" />
                Demander un avis
              </Link>

              <Link
                href={`/community/forum/new?category=remix&trackId=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title)}&source=track`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-black/[0.055] px-5 text-sm font-black text-black/60 transition hover:bg-black/[0.1] hover:text-black"
              >
                <Repeat2 className="h-4 w-4" />
                Défi remix
              </Link>
            </div>

            {showShare ? (
              <div className="mt-4 rounded-[1.35rem] border border-black/[0.08] bg-black/[0.03] p-4">
                <ShareButtons url={trackUrl} title={`${track.title} — ${track.artist}`} />
              </div>
            ) : null}

            {track.remixAttribution ? (
              <div className="mt-4 rounded-[1.35rem] border border-[#7357C6]/18 bg-[#7357C6]/[0.06] p-4">
                <p className="text-sm font-black text-[#171313]">Inspiré de {track.remixAttribution.title}</p>
                <p className="mt-1 text-xs font-semibold text-black/52">Création originale par @{track.remixAttribution.artistUsername || track.remixAttribution.artist}</p>
                <Link href={track.remixAttribution.trackUrl || `/track/${track.remixAttribution.sourceTrackId}`} className="mt-3 inline-flex text-xs font-black text-[#7357C6]">
                  Voir le morceau original
                </Link>
              </div>
            ) : null}

            {track.linkedChallenge ? (
              <Link
                href={`/challenges/${track.linkedChallenge.id}`}
                className="mt-4 flex items-center gap-3 rounded-[1.35rem] border border-black/[0.08] bg-[#fffaf2]/92 p-4 shadow-[0_16px_42px_rgba(30,25,20,0.08)] transition hover:-translate-y-0.5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[#171313] text-white">
                  <Trophy className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-black/42">
                    {track.linkedChallenge.status === 'active' ? 'Défi en cours' : track.linkedChallenge.status === 'upcoming' ? 'Défi à venir' : 'Défi terminé'}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-black text-[#111111]">{track.linkedChallenge.title}</span>
                </span>
              </Link>
            ) : null}

            <div className="mt-4 rounded-[1.35rem] border border-black/[0.08] bg-black/[0.03] p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-black/38">Lecteur audio</p>
              <audio controls preload="none" className="w-full" style={{ height: 40 }}>
                <source src={track.audioUrl} type="audio/mpeg" />
                Votre navigateur ne supporte pas le lecteur audio.
              </audio>
            </div>
          </SynauraPanel>

          <div className="space-y-4">
            <SynauraPanel className="p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Infos</p>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-black/58">
                <div className="flex items-center justify-between rounded-[1rem] bg-black/[0.03] px-4 py-3">
                  <span>Duree</span>
                  <span className="font-black text-[#171313]">{track.duration > 0 ? mmss(track.duration) : 'Non renseignee'}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1rem] bg-black/[0.03] px-4 py-3">
                  <span>Ecoutes</span>
                  <span className="font-black text-[#171313]">{fmt.format(track.plays || 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1rem] bg-black/[0.03] px-4 py-3">
                  <span>Likes</span>
                  <span className="font-black text-[#171313]">{fmt.format(track.likes || 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1rem] bg-black/[0.03] px-4 py-3">
                  <span>Genre</span>
                  <span className="font-black text-[#171313]">{track.genre?.[0] || 'Libre'}</span>
                </div>
                {Number(track.variationsCount || 0) > 0 ? (
                  <div className="flex items-center justify-between rounded-[1rem] bg-black/[0.03] px-4 py-3">
                    <span>Variations</span>
                    <span className="font-black text-[#171313]">{fmt.format(track.variationsCount || 0)}</span>
                  </div>
                ) : null}
                {Number(track.musicClipsCount || 0) > 0 ? (
                  <Link href={`/?filter=clips&sourceTrackId=${encodeURIComponent(track.id)}`} className="flex items-center justify-between rounded-[1rem] bg-[#4A9EAA]/10 px-4 py-3 text-[#171313] transition hover:bg-[#4A9EAA]/16">
                    <span>Clips utilisant ce son</span>
                    <span className="font-black">{fmt.format(track.musicClipsCount || 0)}</span>
                  </Link>
                ) : null}
              </div>
            </SynauraPanel>

            {!session ? (
              <SynauraPanel className="border-[#ff6f61]/18 bg-[#fff7ec] p-5 shadow-[0_22px_70px_rgba(44,33,19,0.12)] sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff6f61]">Écoute en invité</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#171313]">Crée ton compte pour garder ce son</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                  Sauvegarde tes favoris, suis l'artiste, publie tes propres sons et reçois les nouveautés.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/auth/signup?callbackUrl=/track/${track.id}`}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Creer un compte
                  </Link>
                  <Link
                    href={`/auth/signin?callbackUrl=/track/${track.id}`}
                    className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black/60 transition hover:bg-black hover:text-white"
                  >
                    Se connecter
                  </Link>
                </div>
              </SynauraPanel>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <TrackPostsSection track={track} />
          </div>
        </div>
      </div>
      {remixOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-sm" onClick={() => setRemixOpen(false)}>
          <div className="w-full max-w-lg rounded-[1.6rem] border border-black/[0.08] bg-[#F7F6F3] p-4 text-[#111111] shadow-[0_30px_100px_rgba(17,17,17,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              {coverSrc ? <img src={coverSrc} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-black/[0.06]"><Music className="h-6 w-6 text-black/35" /></div>}
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black">{track.title}</h3>
                <p className="truncate text-sm font-bold text-black/50">{track.artist}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-black text-black/72">Créer une variation IA inspirée de ce morceau</p>
            <p className="mt-2 text-xs font-semibold text-black/48">Le créateur original sera toujours crédité</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={openStudioWithRemix} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-black text-white">
                <Repeat2 className="h-4 w-4" />
                Ouvrir dans Studio
              </button>
              <button type="button" onClick={() => setRemixOpen(false)} className="h-12 rounded-full border border-black/[0.08] bg-white px-5 text-sm font-black text-black/56">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <TrackShareCardModal
        visible={showShare}
        track={{
          id: track.id,
          title: track.title,
          artist: track.artist,
          coverUrl: coverSrc,
          duration: track.duration,
        }}
        trackUrl={trackUrl}
        onClose={() => setShowShare(false)}
      />
    </SynauraAppShell>
  );
}
