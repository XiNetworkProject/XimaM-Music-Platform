'use client';
import { SynauraImage } from '@/components/ui/SynauraImage';

import React from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import type { MoodConfig } from '@/lib/discoverMoods';
import type { DiscoverTrackLite } from './DiscoverPlayButton';

export type DiscoverArtistCardLite = {
  _id: string;
  username: string;
  name: string;
  avatar?: string | null;
  style?: string | null;
  track: DiscoverTrackLite | null;
};

export function MoodCard({
  mood,
  covers,
  onOpen,
  highlighted = false,
}: {
  mood: MoodConfig;
  covers: string[];
  onOpen: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="v2-mood-card experience-mood-card group"
      data-mood={mood.id}
      data-highlighted={highlighted}
      aria-label={`Explorer l’ambiance ${mood.label} : ${mood.promise}`}
      style={{
        boxShadow: highlighted ? 'inset 0 0 0 1px var(--v2-accent)' : undefined,
      }}
    >
      {highlighted ? (
        <span className="v2-mood-personal absolute left-4 top-4 z-10 inline-flex items-center rounded-[8px] bg-[var(--v2-accent-fill)] px-2.5 py-1 text-[10px] font-semibold uppercase text-white">
          Pour toi
        </span>
      ) : null}
      {covers.length ? (
        <div className="v2-mood-covers absolute inset-0 grid grid-cols-2" aria-hidden="true">
          {covers.slice(0, 4).map((cover, index) => (
            <SynauraImage key={`${cover}-${index}`} src={cover} alt="" className="h-full w-full object-cover" />
          ))}
        </div>
      ) : null}
      <div className="v2-mood-shade absolute inset-0" aria-hidden="true" />
      <div className="v2-mood-copy relative">
        <h3 className="text-xl font-black leading-tight text-white sm:text-2xl">{mood.label}</h3>
        <p className="mt-1.5 max-w-[90%] text-xs font-semibold leading-5 text-white/72 sm:text-sm">{mood.promise}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-white/85">
          Entrer
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

export function ArtistDiscoverCard({ artist }: { artist: DiscoverArtistCardLite }) {
  const { playTrack, pause, play, audioState } = useAudioPlayer();
  const currentId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isCurrentTrack = Boolean(artist.track) && currentId === artist.track?._id;
  const isPlayingThis = isCurrentTrack && audioState.isPlaying;
  const openProfilePeek = useProfilePeek('discover');

  return (
<div className="v2-artist-discover">
      <button
        type="button"
        data-context-surface-trigger-key={`discover-profile-${artist._id}`}
        onClick={(event) => openProfilePeek(artist.username, event.currentTarget)}
        className="chambre-discover-portrait-trigger flex min-h-14 w-full items-center gap-3 text-left"
        aria-label={`Aperçu du profil de ${artist.name}`}
      >
        {artist.avatar ? (
          <SynauraImage fallbackSrc="/default-avatar.png" src={artist.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--v2-selected)] text-lg font-semibold text-[var(--v2-accent)]">
            {(artist.name || artist.username || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--syn-text-primary)]">{artist.name}</p>
          {artist.style ? <p className="truncate text-xs font-bold text-[var(--syn-text-secondary)]">{artist.style}</p> : null}
        </div>
        <span className="chambre-discover-portrait-peek" aria-hidden="true">Aperçu <ArrowRight size={14} /></span>
      </button>

      {artist.track ? (
        <button
          type="button"
          onClick={() => {
            if (!artist.track?.audioUrl) return;
            if (isCurrentTrack) {
              audioState.isPlaying ? pause() : play();
            } else {
              playTrack(artist.track as any);
            }
          }}
          aria-label={`${isPlayingThis ? 'Mettre en pause' : 'Écouter'} ${artist.track.title}`}
          className="chambre-discover-artist-listen mt-3 flex w-full items-center gap-2.5 rounded-[10px] bg-[var(--syn-soft)] p-2 text-left transition hover:bg-[var(--syn-soft-strong)]"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] bg-[var(--syn-surface-muted)]">
            {artist.track.coverUrl ? <SynauraImage src={artist.track.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[var(--syn-text-primary)]">{artist.track.title}</p>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]">
            {isPlayingThis ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3 fill-current" />}
          </span>
        </button>
      ) : null}

      <button
        type="button"
        data-context-surface-trigger-key={`discover-profile-cta-${artist._id}`}
        onClick={(event) => openProfilePeek(artist.username, event.currentTarget)}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] bg-[var(--syn-soft)] text-xs font-black text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)]"
      >
        Découvrir son univers
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
