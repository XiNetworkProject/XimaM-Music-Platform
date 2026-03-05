'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import Link from 'next/link';
import { Play, Pause, Heart, Clock, Music, Headphones, Share2, Code, UserPlus, Sparkles, ArrowLeft } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';

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
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4 px-4">
        <Music className="w-16 h-16 text-white/20" />
        <h1 className="text-2xl font-bold">Track introuvable</h1>
        <p className="text-white/60 text-sm text-center">Cette musique n'existe pas ou a été supprimée.</p>
        <Link href="/discover" className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold hover:brightness-110 transition-all">
          Découvrir la musique
        </Link>
      </div>
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
    navigator.clipboard.writeText(code);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2500);
  };

  const trackUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${track.id}` : `https://www.synaura.fr/track/${track.id}`;

  return (
    <div className="min-h-screen text-white">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Blurred background */}
        {track.coverUrl && (
          <div className="absolute inset-0 z-0">
            <img src={track.coverUrl} alt="" className="w-full h-full object-cover blur-[80px] scale-110 opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#0a0a0f]" />
          </div>
        )}
        <div className={`relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12 ${!track.coverUrl ? 'bg-gradient-to-b from-violet-900/20 to-transparent' : ''}`}>
          {/* Back nav */}
          <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 mb-8 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Découvrir
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-end">
            {/* Cover */}
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-xl overflow-hidden shadow-2xl shadow-black/60 flex-shrink-0 group">
              {track.coverUrl ? (
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-800/40 to-fuchsia-800/40 flex items-center justify-center">
                  <Music className="w-16 h-16 text-white/20" />
                </div>
              )}
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-violet-500 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all">
                  {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                </div>
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
              {track.isAI && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-violet-300 bg-violet-500/15 border border-violet-500/20 rounded-full px-2.5 py-0.5">
                  <Sparkles className="w-3 h-3" /> Création IA
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight break-words">{track.title}</h1>
              {track.artistUsername ? (
                <Link href={`/profile/${track.artistUsername}`} className="text-base text-white/70 hover:text-white transition-colors">
                  {track.artist}
                </Link>
              ) : (
                <p className="text-base text-white/70">{track.artist}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-white/50 justify-center sm:justify-start flex-wrap">
                {track.genre?.length > 0 && <span className="bg-white/8 rounded-full px-2.5 py-1">{track.genre[0]}</span>}
                {track.duration > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {mmss(track.duration)}</span>}
                {track.plays > 0 && <span className="flex items-center gap-1"><Headphones className="w-3 h-3" /> {fmt.format(track.plays)}</span>}
                {track.likes > 0 && <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {fmt.format(track.likes)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Player button row */}
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handlePlay}
            className="flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold shadow-lg shadow-violet-500/25 hover:brightness-110 active:scale-95 transition-all">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isPlaying ? 'Pause' : 'Écouter'}
          </button>

          <button onClick={() => setShowShare(!showShare)}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/8 hover:bg-white/14 text-sm transition-all">
            <Share2 className="w-4 h-4" /> Partager
          </button>

          <button onClick={handleCopyEmbed}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/8 hover:bg-white/14 text-sm transition-all">
            <Code className="w-4 h-4" /> {embedCopied ? 'Copié !' : 'Embed'}
          </button>
        </div>

        {/* Share panel */}
        {showShare && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <ShareButtons url={trackUrl} title={`${track.title} — ${track.artist}`} />
          </div>
        )}

        {/* HTML5 fallback player (SEO + no-JS) */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-white/40 mb-2">Lecteur audio</p>
          <audio controls preload="none" className="w-full" style={{ height: 40 }}>
            <source src={track.audioUrl} type="audio/mpeg" />
            Votre navigateur ne supporte pas le lecteur audio.
          </audio>
        </div>

        {/* CTA for non-authenticated users */}
        {!session && (
          <div className="rounded-2xl bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 border border-violet-500/20 p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold">Rejoins Synaura gratuitement</h2>
            <p className="text-sm text-white/60 max-w-md mx-auto">
              Crée ton compte pour sauvegarder tes favoris, créer de la musique avec l'IA et rejoindre la communauté.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/auth/signup"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold hover:brightness-110 transition-all">
                <UserPlus className="w-4 h-4" /> Créer un compte
              </Link>
              <Link href="/auth/signin"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 text-sm hover:bg-white/16 transition-all">
                Se connecter
              </Link>
            </div>
            <p className="text-xs text-white/40">50 crédits IA offerts à l'inscription</p>
          </div>
        )}
      </div>
    </div>
  );
}
