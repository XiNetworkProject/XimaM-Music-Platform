'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Loader2, MessageCircle, Music2, Search, Send, Wand2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import { getCdnUrl } from '@/lib/cdn';
import TrackCover from '@/components/TrackCover';
import type { Post } from '@/components/PostCard';

interface PostComposerProps {
  onPostCreated: (post: Post) => void;
}

interface UserTrack {
  id: string;
  title: string;
  artist_name?: string;
  cover_url?: string | null;
  audio_url?: string | null;
  duration?: number;
}

type ComposerMode = 'text' | 'photo' | 'track_share';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<ComposerMode>('text');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<UserTrack | null>(null);

  const avatarUrl = (session?.user as any)?.image
    ? getCdnUrl((session?.user as any).image) || (session?.user as any).image
    : null;
  const initial =
    (session?.user as { name?: string; username?: string })?.name?.slice(0, 1) ||
    (session?.user as { username?: string })?.username?.slice(0, 1) ||
    'M';

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const loadUserTracks = useCallback(async () => {
    if (loadingTracks || userTracks.length > 0) return;
    setLoadingTracks(true);
    try {
      const res = await fetch('/api/users/tracks?limit=50');
      const data = await res.json().catch(() => null);
      const tracks = Array.isArray(data?.tracks) ? data.tracks : Array.isArray(data) ? data : [];
      setUserTracks(
        tracks.map((t: any) => ({
          id: String(t.id || t._id || ''),
          title: String(t.title || 'Titre'),
          artist_name: t.artist?.name || t.artist_name || t.creator_name || '',
          cover_url: t.cover_url || t.coverUrl || null,
          audio_url: t.audio_url || t.audioUrl || null,
          duration: t.duration,
        })).filter((t: UserTrack) => t.id)
      );
    } catch {
      notify.error('', 'Impossible de charger tes sons');
    } finally {
      setLoadingTracks(false);
    }
  }, [loadingTracks, userTracks.length]);

  const filteredTracks = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    if (!q) return userTracks;
    return userTracks.filter((track) =>
      track.title.toLowerCase().includes(q) || String(track.artist_name || '').toLowerCase().includes(q)
    );
  }, [trackSearch, userTracks]);

  const chips = useMemo(() => [
    { label: 'Son', icon: Music2, action: () => { setMode('track_share'); setImageFile(null); void loadUserTracks(); }, active: mode === 'track_share' },
    { label: 'Image', icon: ImageIcon, action: () => { setMode('photo'); setSelectedTrack(null); fileInputRef.current?.click(); }, active: mode === 'photo' },
    { label: 'Texte', icon: MessageCircle, action: () => { setMode('text'); setSelectedTrack(null); setImageFile(null); }, active: mode === 'text' },
    { label: 'Studio', icon: Wand2, href: '/ai-generator', active: false },
  ], [loadUserTracks, mode]);

  const handlePublish = useCallback(async () => {
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour publier');
      return;
    }

    const trimmed = content.trim();
    if (mode === 'text' && !trimmed) {
      notify.error('', 'Ecris quelque chose avant de publier');
      return;
    }
    if (mode === 'photo' && !imageFile) {
      notify.error('', 'Ajoute une image pour publier ce post');
      return;
    }
    if (mode === 'track_share' && !selectedTrack) {
      notify.error('', 'Choisis un son a partager');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = '';
      if (mode === 'photo' && imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadResponse = await fetch('/api/posts/upload-image', { method: 'POST', body: formData });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) throw new Error(uploadPayload?.error || 'Upload image impossible');
        imageUrl = uploadPayload?.url || '';
      }

      const body: any = {
        type: mode === 'photo' ? 'photo' : mode === 'track_share' ? 'track_share' : 'text',
        content: trimmed || undefined,
      };
      if (mode === 'photo') body.image_url = imageUrl || undefined;
      if (mode === 'track_share') body.track_id = selectedTrack?.id;

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Publication impossible');

      onPostCreated(payload as Post);
      setContent('');
      setImageFile(null);
      setSelectedTrack(null);
      setTrackSearch('');
      setMode('text');
      notify.success('Post publie', 'Il est deja dans le feed.');
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de publier');
    } finally {
      setSubmitting(false);
    }
  }, [content, imageFile, mode, onPostCreated, selectedTrack, session?.user]);

  const publishDisabled =
    submitting ||
    (mode === 'text' ? !content.trim() : mode === 'photo' ? !imageFile : !selectedTrack);

  return (
    <div className="rounded-[1.5rem] border border-black/[0.06] bg-[#fffaf2]/82 p-3 shadow-[0_16px_50px_rgba(30,25,20,0.08)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-4">
      <div className="flex gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9" />
        ) : (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171313] text-xs font-black text-[#fffaf2] sm:h-9 sm:w-9 sm:text-sm">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {session?.user ? (
            <div className="rounded-[1.15rem] bg-black/[0.055] p-2">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={mode === 'photo' ? 2 : 3}
                className="min-h-[76px] w-full resize-none rounded-[0.95rem] border border-transparent bg-white/58 px-3 py-3 text-sm font-semibold text-[#171313] outline-none placeholder:text-black/34 focus:border-black/[0.1]"
                placeholder={
                  mode === 'photo'
                    ? 'Ajoute une legende a ton image...'
                    : mode === 'track_share'
                      ? 'Ajoute un texte pour accompagner le son...'
                      : 'Partager un texte directement depuis ce profil...'
                }
              />

              {imagePreview ? (
                <div className="relative mt-2 overflow-hidden rounded-[1rem] bg-black/[0.06]">
                  <img src={imagePreview} alt="" className="max-h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setMode('text');
                    }}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"
                    aria-label="Retirer l'image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {mode === 'track_share' ? (
                <div className="mt-2 rounded-[1rem] border border-black/[0.08] bg-white/60 p-3">
                  {selectedTrack ? (
                    <div className="flex items-center gap-3 rounded-[0.95rem] bg-black/[0.04] p-2.5">
                      <TrackCover src={selectedTrack.cover_url || null} videoSrc={(selectedTrack as any).cover_video_url || (selectedTrack as any).coverVideoUrl || null} posterSrc={(selectedTrack as any).cover_video_poster_url || (selectedTrack as any).coverVideoPosterUrl || selectedTrack.cover_url || null} title={selectedTrack.title} className="h-11 w-11 shrink-0" rounded="rounded-lg" objectFit="cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#171313]">{selectedTrack.title}</p>
                        <p className="truncate text-xs font-semibold text-black/40">{selectedTrack.artist_name || 'Artiste'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTrack(null)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.055] text-black/42 transition hover:bg-black/[0.09] hover:text-black"
                        aria-label="Retirer le son"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2 rounded-[0.9rem] bg-black/[0.045] px-3 py-2">
                    <Search className="h-4 w-4 text-black/34" />
                    <input
                      value={trackSearch}
                      onChange={(event) => setTrackSearch(event.target.value)}
                      placeholder="Rechercher dans tes sons..."
                      className="h-8 w-full bg-transparent text-sm font-semibold text-[#171313] outline-none placeholder:text-black/32"
                    />
                  </div>

                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {loadingTracks ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-black/28" />
                      </div>
                    ) : filteredTracks.length > 0 ? (
                      filteredTracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => setSelectedTrack(track)}
                          className={cx(
                            'flex w-full items-center gap-3 rounded-[0.95rem] border px-3 py-2.5 text-left transition',
                            selectedTrack?.id === track.id
                              ? 'border-[#171313] bg-black/[0.08]'
                              : 'border-black/[0.06] bg-white/72 hover:border-black/[0.12] hover:bg-black/[0.04]'
                          )}
                        >
                          <TrackCover src={track.cover_url || null} videoSrc={(track as any).cover_video_url || (track as any).coverVideoUrl || null} posterSrc={(track as any).cover_video_poster_url || (track as any).coverVideoPosterUrl || track.cover_url || null} title={track.title} className="h-10 w-10 shrink-0" rounded="rounded-lg" objectFit="cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[#171313]">{track.title}</p>
                            <p className="truncate text-xs font-semibold text-black/40">{track.artist_name || 'Artiste'}</p>
                          </div>
                          {selectedTrack?.id === track.id ? <span className="text-[10px] font-black uppercase tracking-[0.12em] text-black/52">Selectionne</span> : null}
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[0.95rem] bg-black/[0.04] px-4 py-5 text-center">
                        <p className="text-sm font-semibold text-black/50">
                          {userTracks.length === 0 ? 'Tu n’as encore aucun son a partager.' : 'Aucun son ne correspond a ta recherche.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-black/35">
                  {mode === 'track_share' ? 'Choisis un de tes sons.' : 'Publie un post.'}
                </p>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishDisabled}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="flex h-12 w-full items-center rounded-[1.15rem] bg-black/[0.055] px-4 text-sm font-semibold text-black/38 transition hover:bg-black/[0.08]"
            >
              Connecte-toi pour publier et reagir...
            </Link>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (file) {
                setMode('photo');
                setSelectedTrack(null);
                setImageFile(file);
              }
              event.currentTarget.value = '';
            }}
          />

          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {chips.map((chip) => {
              const className = cx(
                'inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-black transition sm:h-9 sm:w-auto sm:text-xs',
                chip.active ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/56 hover:bg-black/[0.09]'
              );

              if ('href' in chip && chip.href) {
                return (
                  <Link key={chip.label} href={chip.href} className={className}>
                    <chip.icon className="h-3.5 w-3.5" />
                    {chip.label}
                  </Link>
                );
              }

              return (
                <button key={chip.label} type="button" onClick={chip.action} className={className}>
                  <chip.icon className="h-3.5 w-3.5" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
