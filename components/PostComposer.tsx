'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Music2, X, Loader2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import TrackCover from '@/components/TrackCover';
import { getCdnUrl } from '@/lib/cdn';
import type { Post } from '@/components/PostCard';

interface UserTrack {
  id: string; title: string;
  artist_name?: string; cover_url?: string;
  audio_url?: string; duration?: number;
}

interface PostComposerProps {
  onPostCreated: (post: Post) => void;
}

type Step = 'idle' | 'compose' | 'track_picker';
type Mode = 'text' | 'photo' | 'track_share';

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('idle');
  const [mode, setMode] = useState<Mode>('text');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<UserTrack | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const avatarUrl = (session?.user as any)?.image
    ? getCdnUrl((session.user as any).image) || (session.user as any).image
    : null;
  const displayName = (session?.user as any)?.username || session?.user?.name || 'Moi';

  const open = (m: Mode) => {
    setMode(m);
    setStep('compose');
    if (m === 'track_share') {
      setStep('track_picker');
      loadUserTracks();
    }
  };

  const close = () => {
    setStep('idle');
    setContent('');
    setImageUrl(null);
    setImagePreview(null);
    setSelectedTrack(null);
    setMode('text');
    setTrackSearch('');
  };

  useEffect(() => {
    if (step === 'compose') {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [step]);

  const loadUserTracks = useCallback(async () => {
    if (loadingTracks || userTracks.length > 0) return;
    setLoadingTracks(true);
    try {
      const res = await fetch('/api/users/tracks?limit=50');
      const data = await res.json();
      const tracks = Array.isArray(data?.tracks) ? data.tracks : Array.isArray(data) ? data : [];
      setUserTracks(tracks.map((t: any) => ({
        id: t._id || t.id, title: t.title,
        artist_name: t.artist?.name || t.artist_name || t.creator_name,
        cover_url: t.coverUrl || t.cover_url,
        audio_url: t.audioUrl || t.audio_url,
        duration: t.duration,
      })));
    } catch { /* ignore */ }
    finally { setLoadingTracks(false); }
  }, [loadingTracks, userTracks.length]);

  const handleImagePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify.error('', 'Seules les images sont acceptées'); return; }
    if (file.size > 5 * 1024 * 1024) { notify.error('', 'Image trop volumineuse (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/posts/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) { setImageUrl(data.url); setMode('photo'); }
      else { notify.error('', data.error || 'Erreur upload image'); setImagePreview(null); }
    } catch { notify.error('', 'Erreur réseau'); setImagePreview(null); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }, []);

  const handleTrackSelect = (track: UserTrack) => {
    setSelectedTrack(track); setMode('track_share'); setStep('compose'); setTrackSearch('');
  };

  const canSubmit = !submitting && !uploading && (
    (mode === 'text' && content.trim().length > 0) ||
    (mode === 'photo' && !!imageUrl) ||
    (mode === 'track_share' && !!selectedTrack)
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !session) return;
    setSubmitting(true);
    try {
      const body: any = { type: mode };
      if (content.trim()) body.content = content.trim();
      if (mode === 'photo') body.image_url = imageUrl;
      if (mode === 'track_share') body.track_id = selectedTrack?.id;
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { onPostCreated(data as Post); close(); notify.success('', 'Post publié !'); }
      else notify.error('', data.error || 'Erreur publication');
    } catch { notify.error('', 'Erreur réseau'); }
    finally { setSubmitting(false); }
  }, [canSubmit, mode, content, imageUrl, selectedTrack, session, onPostCreated]);

  const filteredTracks = userTracks.filter(t =>
    !trackSearch || t.title.toLowerCase().includes(trackSearch.toLowerCase())
  );

  if (!session) return null;

  return (
    <>
      {/* ── TRIGGER BAR ── */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.09] transition-all">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(displayName[0] || '?').toUpperCase()}
          </div>
        )}

        <button onClick={() => open('text')} className="flex-1 text-left text-[13px] text-white/20 hover:text-white/35 transition-colors py-1">
          Partage quelque chose…
        </button>

        {/* Type buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => open('text')}
            title="Message"
            className="p-2 rounded-xl text-white/25 hover:text-violet-300 hover:bg-violet-500/10 transition-all">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => { setStep('compose'); setMode('photo'); fileInputRef.current?.click(); }}
            title="Photo"
            className="p-2 rounded-xl text-white/25 hover:text-blue-300 hover:bg-blue-500/10 transition-all">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button onClick={() => open('track_share')}
            title="Son"
            className="p-2 rounded-xl text-white/25 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all">
            <Music2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

      {/* ── COMPOSE SHEET ── */}
      <AnimatePresence>
        {step === 'compose' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              className="fixed inset-x-0 bottom-0 z-[301] rounded-t-3xl bg-[#0e0e1a] border-t border-white/[0.07] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:w-[520px] sm:rounded-2xl sm:border"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/[0.1]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  {/* Mode pills */}
                  {(['text', 'photo', 'track_share'] as Mode[]).map(m => {
                    const labels = { text: 'Texte', photo: 'Photo', track_share: 'Son' };
                    const icons = { text: Pencil, photo: ImageIcon, track_share: Music2 };
                    const Icon = icons[m];
                    return (
                      <button key={m} onClick={() => {
                        if (m === 'track_share') { setStep('track_picker'); loadUserTracks(); }
                        else if (m === 'photo') { fileInputRef.current?.click(); }
                        else setMode(m);
                      }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                          mode === m ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/30 hover:text-white/50'
                        }`}>
                        <Icon className="w-3.5 h-3.5" />
                        {labels[m]}
                      </button>
                    );
                  })}
                </div>
                <button onClick={close} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
                      {(displayName[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    <textarea ref={textareaRef} value={content}
                      onChange={e => {
                        setContent(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder={mode === 'track_share' ? 'Dis quelque chose sur ce son…' : mode === 'photo' ? 'Ajoute une légende…' : 'Partage quelque chose…'}
                      className="w-full bg-transparent text-[15px] text-white/80 placeholder-white/20 resize-none focus:outline-none leading-relaxed min-h-[72px] max-h-48"
                      rows={3}
                    />

                    {/* Image preview */}
                    {imagePreview && (
                      <div className="relative rounded-xl overflow-hidden">
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-xl">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                        <img src={imagePreview} alt="" className="w-full max-h-56 object-cover rounded-xl" />
                        <button onClick={() => { setImageUrl(null); setImagePreview(null); setMode('text'); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Track preview */}
                    {selectedTrack && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                        <TrackCover src={selectedTrack.cover_url || null} title={selectedTrack.title}
                          className="w-10 h-10 shrink-0" rounded="rounded-lg" objectFit="cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-white/85 truncate">{selectedTrack.title}</p>
                          <p className="text-[11px] text-white/35 truncate">{selectedTrack.artist_name}</p>
                        </div>
                        <button onClick={() => { setSelectedTrack(null); setMode('text'); }}
                          className="text-white/25 hover:text-white/50 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 pb-5 pt-1 border-t border-white/[0.04]">
                <span className="text-[12px] text-white/20">
                  {content.length > 0 && `${content.length} caractères`}
                </span>
                <button onClick={handleSubmit} disabled={!canSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[14px] font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2 shadow-lg shadow-violet-500/20">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publier
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TRACK PICKER SHEET ── */}
      <AnimatePresence>
        {step === 'track_picker' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              className="fixed inset-x-0 bottom-0 z-[301] max-h-[80dvh] flex flex-col rounded-t-3xl bg-[#0e0e1a] border-t border-white/[0.07] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:w-[440px] sm:max-h-[70dvh] sm:rounded-2xl sm:border"
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/[0.1]" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-[15px] font-semibold text-white/85">Choisir un son</h3>
                <button onClick={close} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-2.5 border-b border-white/[0.04]">
                <input type="text" placeholder="Rechercher…" value={trackSearch}
                  onChange={e => setTrackSearch(e.target.value)}
                  className="w-full bg-white/[0.05] rounded-xl px-3 py-2 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all" />
              </div>
              <div className="flex-1 overflow-y-auto py-1 min-h-0">
                {loadingTracks && (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
                )}
                {!loadingTracks && filteredTracks.length === 0 && (
                  <p className="text-center py-10 text-[13px] text-white/20">
                    {userTracks.length === 0 ? 'Aucun son publié' : 'Aucun résultat'}
                  </p>
                )}
                {filteredTracks.map(track => (
                  <button key={track.id} onClick={() => handleTrackSelect(track)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left">
                    <TrackCover src={track.cover_url || null} title={track.title}
                      className="w-10 h-10 shrink-0" rounded="rounded-lg" objectFit="cover" />
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
    </>
  );
}
