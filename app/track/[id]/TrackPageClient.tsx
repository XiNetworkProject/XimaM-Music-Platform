'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import Link from 'next/link';
import { Play, Pause, Heart, Clock, Music, Headphones, Share2, Code, UserPlus, Sparkles, ArrowLeft, MessageSquare, Repeat2 } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';
import { getCdnUrl } from '@/lib/cdn';

interface TrackData {
  id: string;
  title: string;
  artist: string;
  artistUsername: string;
  artistAvatar: string | null;
  coverUrl: string | null;
  audioUrl: string;
  duration: number;
  genre: string[];
  plays: number;
  likes: number;
  createdAt: string;
  isAI: boolean;
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
                  <img src={coverSrc} alt={track.title} className="h-full w-full object-cover" />
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
                onClick={() => setShowShare(!showShare)}
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
        </div>
      </div>
    </SynauraAppShell>
  );
}
