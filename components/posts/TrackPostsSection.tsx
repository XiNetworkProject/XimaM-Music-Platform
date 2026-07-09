'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Send, UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import PostCard, { type Post } from '@/components/PostCard';
import PostAudioCard, { type PostAudioTrack } from '@/components/posts/PostAudioCard';
import { useAudioPlayer } from '@/app/providers';

type TrackForPost = {
  id: string;
  title: string;
  artist: string;
  artistUsername?: string;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  audioUrl: string;
  duration?: number;
};

function toPostAudioTrack(track: TrackForPost): PostAudioTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: track.artist,
    cover_url: track.coverUrl || null,
    cover_video_url: track.coverVideoUrl || null,
    cover_video_poster_url: track.coverVideoPosterUrl || null,
    audio_url: track.audioUrl,
    duration: track.duration || 0,
  };
}

export default function TrackPostsSection({ track }: { track: TrackForPost }) {
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState('');

  const audioTrack = useMemo(() => toPostAudioTrack(track), [track]);
  const activeId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const playing = activeId === track.id && audioState.isPlaying;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?track_id=${encodeURIComponent(track.id)}&limit=12`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      setPosts(Array.isArray(json?.posts) ? json.posts : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [track.id]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const play = useCallback(() => {
    playTrack({
      _id: track.id,
      title: track.title,
      artist: { _id: '', name: track.artist, username: track.artistUsername || '' },
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl || undefined,
      coverVideoUrl: track.coverVideoUrl || undefined,
      coverVideoPosterUrl: track.coverVideoPosterUrl || undefined,
      duration: track.duration || 0,
      likes: 0,
      plays: 0,
    } as any);
  }, [playTrack, track]);

  const publish = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || publishing) return;
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour publier autour de ce son');
      return;
    }
    setPublishing(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'track_share',
          track_id: track.id,
          content: trimmed,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Publication impossible');
      setPosts((current) => [payload as Post, ...current]);
      setContent('');
      notify.success('', 'Post attaché au son');
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de publier');
    } finally {
      setPublishing(false);
    }
  }, [content, publishing, session?.user, track.id]);

  const removePost = useCallback((postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }, []);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-black/[0.08] bg-[#fffaf2]/88 shadow-[0_18px_60px_rgba(30,25,20,0.10)] backdrop-blur-xl">
      <div className="border-b border-black/[0.08] bg-[linear-gradient(135deg,#fffaf2_0%,#f2ecff_52%,#e9fbfc_100%)] p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Posts attachés au son</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#111111]">L’histoire et les réactions autour de ce morceau.</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-black/52">
              Publie un contexte, un moment précis ou une raison de faire écouter ce son. La musique reste au centre.
            </p>
          </div>
          <PostAudioCard track={audioTrack} playing={playing} onPlay={play} compact />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {session?.user ? (
          <div className="mb-4 rounded-[1.35rem] border border-black/[0.08] bg-white/70 p-3">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={500}
              className="min-h-[96px] w-full resize-none rounded-[1rem] border border-black/[0.08] bg-[#F7F6F3] px-3 py-3 text-sm font-semibold text-[#111111] outline-none placeholder:text-black/32 focus:border-black/18"
              placeholder="Raconte ce que ce morceau t'évoque, un passage fort, ou pourquoi il mérite plus d'écoutes..."
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-black/36">{content.length}/500</p>
              <button
                type="button"
                onClick={() => void publish()}
                disabled={!content.trim() || publishing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#111111] px-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:opacity-45"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {publishing ? 'Publication...' : 'Publier avec ce son'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-[1.35rem] border border-[#D96D63]/20 bg-[#D96D63]/10 p-4">
            <p className="text-sm font-bold text-black/58">Connecte-toi pour publier une histoire ou une réaction attachée à ce morceau.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/auth/signup?callbackUrl=/track/${encodeURIComponent(track.id)}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#111111] px-4 text-xs font-black text-white">
                <UserPlus className="h-4 w-4" />
                Créer un compte
              </Link>
              <Link href={`/auth/signin?callbackUrl=/track/${encodeURIComponent(track.id)}`} className="inline-flex h-10 items-center rounded-full bg-white px-4 text-xs font-black text-black/58">
                Connexion
              </Link>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid min-h-[180px] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-black/24" />
          </div>
        ) : posts.length ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={removePost} onPostCreated={(created) => setPosts((current) => [created, ...current])} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-black/[0.12] bg-black/[0.02] px-5 py-10 text-center">
            <MessageCircle className="mx-auto h-9 w-9 text-black/18" />
            <p className="mt-3 text-sm font-black text-[#111111]">Aucun post attaché pour le moment.</p>
            <p className="mx-auto mt-1 max-w-md text-sm font-semibold leading-6 text-black/42">
              Le premier post peut donner une vraie vie au morceau : contexte, souvenir, passage favori, coulisses.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
