'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Music2, X, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import TrackCover from '@/components/TrackCover';
import { getCdnUrl } from '@/lib/cdn';
import type { Post } from '@/components/PostCard';

interface UserTrack {
  id: string;
  title: string;
  artist_name?: string;
  cover_url?: string;
  audio_url?: string;
  duration?: number;
}

interface PostComposerProps {
  onPostCreated: (post: Post) => void;
  compact?: boolean;
}

type Mode = 'text' | 'photo' | 'track_share';

export default function PostComposer({ onPostCreated, compact = false }: PostComposerProps) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(!compact);
  const [mode, setMode] = useState<Mode>('text');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<UserTrack | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const avatarUrl = (session?.user as any)?.image
    ? getCdnUrl((session.user as any).image) || (session.user as any).image
    : null;
  const username = (session?.user as any)?.username || session?.user?.name || '';

  const loadUserTracks = useCallback(async () => {
    if (!session || loadingTracks || userTracks.length > 0) return;
    setLoadingTracks(true);
    try {
      const res = await fetch('/api/users/tracks?limit=50');
      const data = await res.json();
      const tracks = Array.isArray(data?.tracks) ? data.tracks : Array.isArray(data) ? data : [];
      setUserTracks(tracks.map((t: any) => ({
        id: t._id || t.id,
        title: t.title,
        artist_name: t.artist?.name || t.artist_name || t.creator_name,
        cover_url: t.coverUrl || t.cover_url,
        audio_url: t.audioUrl || t.audio_url,
        duration: t.duration,
      })));
    } catch {
      // ignore
    } finally {
      setLoadingTracks(false);
    }
  }, [session, loadingTracks, userTracks.length]);

  const handleImagePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify.error('', 'Seules les images sont acceptées');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error('', 'Image trop volumineuse (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/posts/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
        setMode('photo');
      } else {
        notify.error('', data.error || 'Erreur upload image');
        setImagePreview(null);
      }
    } catch {
      notify.error('', 'Erreur réseau');
      setImagePreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const clearImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (mode === 'photo') setMode('text');
  };

  const handleTrackSelect = (track: UserTrack) => {
    setSelectedTrack(track);
    setMode('track_share');
    setShowTrackPicker(false);
  };

  const clearTrack = () => {
    setSelectedTrack(null);
    if (mode === 'track_share') setMode('text');
  };

  const canSubmit = () => {
    if (submitting || uploading) return false;
    if (mode === 'text') return content.trim().length > 0;
    if (mode === 'photo') return !!imageUrl;
    if (mode === 'track_share') return !!selectedTrack;
    return false;
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit() || !session) return;

    setSubmitting(true);
    try {
      const body: any = { type: mode };
      if (content.trim()) body.content = content.trim();
      if (mode === 'photo') body.image_url = imageUrl;
      if (mode === 'track_share') body.track_id = selectedTrack?.id;

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        onPostCreated(data as Post);
        setContent('');
        setImageUrl(null);
        setImagePreview(null);
        setSelectedTrack(null);
        setMode('text');
        if (compact) setExpanded(false);
        notify.success('', 'Post publié !');
      } else {
        notify.error('', data.error || 'Erreur publication');
      }
    } catch {
      notify.error('', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }, [mode, content, imageUrl, selectedTrack, session, compact, onPostCreated]);

  const filteredTracks = userTracks.filter(t =>
    !trackSearch || t.title.toLowerCase().includes(trackSearch.toLowerCase())
  );

  if (!session) return null;

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all text-left"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {(username || '?')[0].toUpperCase()}
          </div>
        )}
        <span className="text-[14px] text-white/25 flex-1">Partage quelque chose…</span>
        <Plus className="w-4 h-4 text-white/20 shrink-0" />
      </button>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
              {(username || '?')[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder={
                mode === 'track_share' ? 'Dis quelque chose sur ce son…'
                : mode === 'photo' ? 'Ajoute une légende…'
                : 'Partage quelque chose avec ta communauté…'
              }
              className="w-full bg-transparent text-[14px] text-white/80 placeholder-white/20 resize-none focus:outline-none leading-relaxed min-h-[52px] max-h-48"
              rows={2}
            />

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mt-3 rounded-xl overflow-hidden">
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                <img src={imagePreview} alt="" className="w-full max-h-64 object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Track preview */}
            {selectedTrack && (
              <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <TrackCover
                  src={selectedTrack.cover_url || null}
                  title={selectedTrack.title}
                  className="w-10 h-10 shrink-0"
                  rounded="rounded-lg"
                  objectFit="cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white/80 truncate">{selectedTrack.title}</p>
                  <p className="text-[11px] text-white/35 truncate">{selectedTrack.artist_name}</p>
                </div>
                <button onClick={clearTrack} className="shrink-0 text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pb-3 border-t border-white/[0.04] pt-3">
        <div className="flex items-center gap-1">
          {/* Photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all disabled:opacity-30"
            title="Ajouter une photo"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />

          {/* Track */}
          <button
            onClick={() => {
              setShowTrackPicker(true);
              loadUserTracks();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            title="Partager un son"
          >
            <Music2 className="w-4 h-4" />
            <span className="hidden sm:inline">Son</span>
          </button>

          {compact && (
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-white/20 hover:text-white/40 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="px-4 py-1.5 rounded-xl bg-violet-500 text-white text-[13px] font-semibold hover:bg-violet-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Publier
        </button>
      </div>

      {/* Track picker modal */}
      <AnimatePresence>
        {showTrackPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTrackPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed inset-x-4 bottom-4 z-[301] max-h-[70dvh] flex flex-col rounded-2xl bg-[#0e0e18] border border-white/[0.08] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-[15px] font-semibold text-white/90">Choisir un son</h3>
                <button
                  onClick={() => setShowTrackPicker(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 py-2 border-b border-white/[0.04]">
                <input
                  type="text"
                  placeholder="Rechercher un son…"
                  value={trackSearch}
                  onChange={e => setTrackSearch(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-white/[0.2] transition-colors"
                />
              </div>

              <div className="flex-1 overflow-y-auto py-2 min-h-0">
                {loadingTracks && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                  </div>
                )}
                {!loadingTracks && filteredTracks.length === 0 && (
                  <div className="text-center py-8 text-[13px] text-white/25">
                    {userTracks.length === 0 ? 'Aucun son publié' : 'Aucun résultat'}
                  </div>
                )}
                {filteredTracks.map(track => (
                  <button
                    key={track.id}
                    onClick={() => handleTrackSelect(track)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <TrackCover
                      src={track.cover_url || null}
                      title={track.title}
                      className="w-10 h-10 shrink-0"
                      rounded="rounded-lg"
                      objectFit="cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white/80 truncate">{track.title}</p>
                      <p className="text-[11px] text-white/35 truncate">{track.artist_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
