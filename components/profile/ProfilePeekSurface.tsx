'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, BadgeCheck, Headphones, Loader2, Music2, Play, Radio, UserPlus } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import { SynauraOverlayDescription, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import type { ContextSurfaceRendererProps } from '@/components/context-surfaces/ContextSurfaceController';
import { useProfilePeekData, useSharedFollowState } from '@/lib/profilePeekClient';
import TrackActionButton from '@/components/actions/TrackActionButton';

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

function durationLabel(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse p-5 pt-16 sm:p-6 sm:pt-16" aria-label="Chargement du profil">
      <div className="flex items-center gap-4"><div className="h-20 w-20 rounded-full bg-[var(--syn-soft-strong)]" /><div className="flex-1 space-y-3"><div className="h-5 w-3/5 rounded bg-[var(--syn-soft-strong)]" /><div className="h-3 w-2/5 rounded bg-[var(--syn-soft)]" /></div></div>
      <div className="mt-6 h-16 rounded-[var(--syn-radius-lg)] bg-[var(--syn-soft)]" />
      <div className="mt-6 space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 rounded-[var(--syn-radius-md)] bg-[var(--syn-soft)]" />)}</div>
    </div>
  );
}

export default function ProfilePeekSurface({ entry, closeSurface }: ContextSurfaceRendererProps) {
  const username = entry.entityId || '';
  const state = useProfilePeekData(username);
  const router = useRouter();
  const { data: session } = useSession();
  const { playTrack } = useAudioPlayer();
  const navigationPendingRef = useRef(false);
  const initialFocusRef = useRef<HTMLElement>(null);
  const profile = state.status === 'loaded' ? state.data : null;
  const isOwnProfile = Boolean(profile?.id && session?.user?.id && String(profile.id) === String(session.user.id));
  const follow = useSharedFollowState(username, Boolean(session?.user?.id && !isOwnProfile));

  useEffect(() => {
    if (state.status === 'loading') return;
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [state.status]);

  const openFullProfile = useCallback(() => {
    if (!username || navigationPendingRef.current) return;
    navigationPendingRef.current = true;
    const href = `/profile/${encodeURIComponent(username)}`;
    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.removeEventListener('popstate', navigate);
      router.push(href, { scroll: false });
    };
    window.addEventListener('popstate', navigate, { once: true });
    closeSurface();
    window.setTimeout(navigate, 350);
  }, [closeSurface, router, username]);

  if (state.status === 'loading') return <ProfileSkeleton />;

  if (state.status !== 'loaded') {
    const missing = state.status === 'missing';
    return (
      <section ref={initialFocusRef} data-context-surface-initial-focus tabIndex={-1} className="flex min-h-[22rem] flex-col justify-center p-6 pt-16 outline-none">
        <SynauraOverlayTitle>{missing ? 'Profil introuvable' : 'Profil indisponible'}</SynauraOverlayTitle>
        <SynauraOverlayDescription className="mt-2">{state.error}</SynauraOverlayDescription>
        {!missing ? <button type="button" onClick={openFullProfile} className="syn-interactive syn-touch-target mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--syn-contrast-bg)] px-5 text-sm font-black text-[var(--syn-contrast-text)]">Ouvrir le profil complet <ArrowRight className="h-4 w-4" /></button> : null}
      </section>
    );
  }

  if (!profile) return null;

  const following = follow.isFollowing ?? profile.isFollowing;
  const followerCount = follow.followerCount ?? profile.followerCount;

  return (
    <div className="flex h-[82dvh] flex-col md:h-full" data-profile-peek-state="loaded" data-profile-peek-cache={state.cache}>
      <div className="context-surface-scroll flex-1 overflow-y-auto overscroll-contain p-5 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-14 sm:p-6 sm:pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pt-16 md:pb-6">
        <header ref={initialFocusRef} data-context-surface-initial-focus tabIndex={-1} className="outline-none">
          <div className="flex items-start gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(145deg,var(--syn-accent),var(--syn-accent-blue))] text-2xl font-black text-white shadow-[var(--syn-shadow-medium)]">
              {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : profile.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--syn-accent)]">Aperçu créateur</p>
              <div className="mt-1 flex items-center gap-1.5">
                <SynauraOverlayTitle className="truncate">{profile.displayName}</SynauraOverlayTitle>
                {profile.isVerified ? <BadgeCheck className="h-5 w-5 shrink-0 text-[var(--syn-accent-blue)]" aria-label="Profil vérifié" /> : null}
              </div>
              <SynauraOverlayDescription className="mt-0.5 truncate">@{profile.username}</SynauraOverlayDescription>
              {profile.role ? <span className="mt-2 inline-flex rounded-full bg-[var(--syn-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--syn-text-secondary)]">{profile.role}</span> : null}
            </div>
          </div>
          {profile.bio ? <p className="mt-5 line-clamp-3 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">{profile.bio}</p> : null}
        </header>

        <div className="mt-5 flex items-center gap-2">
          {!isOwnProfile ? (
            <button
              type="button"
              disabled={follow.mutating}
              aria-pressed={following}
              aria-label={following ? `Ne plus suivre ${profile.displayName}` : `Suivre ${profile.displayName}`}
              onClick={() => {
                if (!session?.user?.id) {
                  router.push(`/auth/signup?callbackUrl=${encodeURIComponent(`/profile/${profile.username}`)}`);
                  return;
                }
                follow.toggle().catch((error: any) => notify.error('Suivi impossible', error?.message || 'Réessaie dans un instant.'));
              }}
              className={`syn-interactive min-h-11 flex-1 rounded-full px-5 text-sm font-black ${following ? 'bg-[var(--syn-soft-strong)] text-[var(--syn-text-primary)]' : 'bg-[var(--syn-accent)] text-white'} disabled:opacity-60`}
            >
              {follow.mutating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : following ? 'Abonné' : <span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4" /> Suivre</span>}
            </button>
          ) : null}
          <button type="button" data-profile-peek-full-profile="desktop" onClick={openFullProfile} className="syn-interactive hidden min-h-11 flex-1 rounded-full border border-[var(--syn-border)] px-4 text-sm font-black text-[var(--syn-text-primary)] md:flex md:items-center md:justify-center">Profil complet</button>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-2 border-y border-[var(--syn-border)] py-4 text-center">
          <div><dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--syn-text-secondary)]">Followers</dt><dd className="mt-1 text-lg font-black text-[var(--syn-text-primary)]">{compact.format(followerCount)}</dd></div>
          <div><dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--syn-text-secondary)]">Titres</dt><dd className="mt-1 text-lg font-black text-[var(--syn-text-primary)]">{compact.format(profile.tracksCount)}</dd></div>
          <div><dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--syn-text-secondary)]">Écoutes</dt><dd className="mt-1 text-lg font-black text-[var(--syn-text-primary)]">{compact.format(profile.totalPlays)}</dd></div>
        </dl>

        <section className="mt-6" aria-labelledby="profile-peek-tracks">
          <div className="flex items-center gap-3">
            <h3 id="profile-peek-tracks" className="flex items-center gap-2 text-sm font-black text-[var(--syn-text-primary)]"><Radio className="h-4 w-4 text-[var(--syn-accent-coral)]" /> Morceaux récents</h3>
          </div>
          {profile.tracks.length ? (
            <div className="mt-3 divide-y divide-[var(--syn-border)] border-y border-[var(--syn-border)]">
              {profile.tracks.map((track) => (
                <div key={track.id} className="flex min-h-[72px] items-center gap-3 py-2.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--syn-radius-md)] bg-[var(--syn-soft)]">
                    {track.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-5 w-5 text-[var(--syn-text-secondary)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--syn-text-primary)]">{track.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-[var(--syn-text-secondary)]"><Headphones className="h-3 w-3" /> {compact.format(track.plays)}{durationLabel(track.duration) ? ` · ${durationLabel(track.duration)}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Écouter ${track.title}`}
                    onClick={() => playTrack({ _id: track.id, title: track.title, artist: { _id: profile.id, name: profile.displayName, username: profile.username, avatar: profile.avatar }, audioUrl: track.audioUrl, coverUrl: track.coverUrl, duration: track.duration, likes: 0, comments: 0, plays: track.plays } as any)}
                    className="syn-interactive grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]"
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </button>
                  <TrackActionButton track={{ ...track, artist: { _id: profile.id, name: profile.displayName, username: profile.username } }} origin={entry.origin} />
                </div>
              ))}
            </div>
          ) : <p className="mt-3 rounded-[var(--syn-radius-lg)] bg-[var(--syn-soft)] p-4 text-sm font-semibold text-[var(--syn-text-secondary)]">Aucun morceau public récent.</p>}
        </section>
      </div>

      <footer className="absolute inset-x-0 bottom-0 border-t border-[var(--syn-border)] bg-[var(--syn-elevated-surface)]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <button type="button" data-profile-peek-full-profile="mobile" onClick={openFullProfile} className="syn-interactive syn-touch-target flex w-full items-center justify-center gap-2 rounded-full bg-[var(--syn-contrast-bg)] px-5 text-sm font-black text-[var(--syn-contrast-text)]">Ouvrir le profil complet <ArrowRight className="h-4 w-4" /></button>
      </footer>
    </div>
  );
}
