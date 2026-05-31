'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Clock, MessageSquare, Music2, Play, Repeat2, Reply, Send, Sparkles, ThumbsUp, Users, Zap } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';

type PostDetail = {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  likes_count?: number;
  replies_count?: number;
  views_count?: number;
  created_at?: string;
  track_id?: string | null;
  track?: any;
  profiles?: { id?: string; name?: string; username?: string; avatar?: string | null };
};

type ReplyItem = {
  id: string;
  content: string;
  created_at?: string;
  profiles?: { id?: string; name?: string; username?: string; avatar?: string | null };
};

const CATEGORY_META: Record<string, { label: string; tint: string; icon: any }> = {
  feedback: { label: 'Avis sur mon son', tint: '#ff6f61', icon: Music2 },
  collab: { label: 'Recherche feat', tint: '#7c5cff', icon: Users },
  remix: { label: 'Défi remix', tint: '#f59e0b', icon: Zap },
  prompts: { label: 'Battle de prompts', tint: '#14b8a6', icon: Sparkles },
  'weekly-top': { label: 'Top sons', tint: '#38bdf8', icon: Music2 },
  question: { label: 'Question', tint: '#7c5cff', icon: MessageSquare },
  suggestion: { label: 'Suggestion', tint: '#14b8a6', icon: Sparkles },
  bug: { label: 'Support', tint: '#ef4444', icon: MessageSquare },
  general: { label: 'Discussion', tint: '#171313', icon: MessageSquare },
};

function metaFor(category?: string) {
  return CATEGORY_META[String(category || 'general')] || CATEGORY_META.general;
}

function formatDate(value?: string) {
  if (!value) return 'maintenant';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (!Number.isFinite(hours) || hours < 1) return "à l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function CommunityPostDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const { setQueueAndPlay } = useAudioPlayer();
  const postId = String(params?.id || '');
  const [post, setPost] = useState<PostDetail | null>(null);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [usefulReplies, setUsefulReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadPost = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('post');
        const data = await response.json();
        setPost(data.post);
        setReplies(Array.isArray(data.replies) ? data.replies : []);
      } catch {
        notify.error('Communauté', 'Discussion introuvable.');
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [postId]);

  const submitReply = async () => {
    if (!session?.user) {
      notify.error('Connexion requise', 'Connecte-toi pour répondre.');
      return;
    }
    if (!reply.trim()) {
      notify.error('Réponse vide', 'Ajoute un message.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/posts/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content: reply.trim() }),
      });
      if (!response.ok) throw new Error('reply');
      const created = await response.json();
      setReplies((current) => [...current, created]);
      setReply('');
      notify.success('Réponse publiée', 'Ton retour a été ajouté.');
    } catch {
      notify.error('Réponse', 'Impossible de publier la réponse.');
    } finally {
      setSubmitting(false);
    }
  };

  const meta = metaFor(post?.category);
  const Icon = meta.icon;

  return (
    <SynauraAppShell contentClassName="max-w-[980px]">
      <SynauraTopBar searchLabel="Chercher dans Community..." primaryHref="/community/forum/new?category=feedback" primaryLabel="Demander un avis" />
      <SynauraRouteNav />

      <div className="space-y-5 pb-28">
        <SynauraInkPanel className="p-5 sm:p-7">
          <Link href="/community/forum" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/58 transition hover:bg-white/14 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au forum
          </Link>
          {loading ? (
            <div className="mt-8 h-40 animate-pulse rounded-[1.4rem] bg-white/10" />
          ) : post ? (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black text-white" style={{ background: meta.tint }}>
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/50">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(post.created_at)}
                </span>
                {post.track_id ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/50">
                    <Music2 className="h-3.5 w-3.5" />
                    son attaché
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl">{post.title}</h1>
              <div className="mt-5 flex items-center gap-3">
                <Avatar src={post.profiles?.avatar || undefined} name={post.profiles?.name || 'Créateur'} username={post.profiles?.username} size="md" />
                <div>
                  <p className="text-sm font-black text-white">{post.profiles?.name || 'Créateur Synaura'}</p>
                  <p className="text-xs font-semibold text-white/38">@{post.profiles?.username || 'synaura'}</p>
                </div>
              </div>
            </>
          ) : null}
        </SynauraInkPanel>

        {post ? (
          <>
            <SynauraPanel className="p-5 sm:p-6">
              <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-black/62">{post.content}</p>
              {post.tags?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {post.tags.slice(0, 8).map((tag) => (
                    <span key={tag} className="rounded-full bg-black/[0.055] px-3 py-1 text-[11px] font-black text-black/42">#{tag}</span>
                  ))}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-black/36">
                <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{post.likes_count || 0} likes</span>
                <span className="inline-flex items-center gap-1"><Reply className="h-3.5 w-3.5" />{replies.length} réponses</span>
                <span>{post.views_count || 0} vues</span>
              </div>
            </SynauraPanel>

            {post.track ? (
              <SynauraPanel className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-full overflow-hidden rounded-[1.25rem] bg-black/[0.06] sm:h-24 sm:w-24 sm:shrink-0">
                    {post.track.coverUrl || post.track.cover_url ? (
                      <img src={post.track.coverUrl || post.track.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center">
                        <Music2 className="h-8 w-8 text-black/24" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Son attaché</p>
                    <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-[#171313]">{post.track.title || 'Source Community'}</h2>
                    <p className="mt-1 truncate text-sm font-semibold text-black/42">{post.track.artist_name || 'Artiste Synaura'}</p>
                    <div className="mt-3 flex h-8 items-end gap-1">
                      {[0.35, 0.76, 0.48, 0.9, 0.58, 0.72, 0.42, 0.65].map((height, index) => (
                        <span key={index} className="w-1.5 rounded-full bg-[#171313]/30" style={{ height: `${height * 100}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.track.audioUrl || post.track.audio_url ? (
                      <button
                        type="button"
                        onClick={() => {
                          const audioUrl = post.track.audioUrl || post.track.audio_url;
                          setQueueAndPlay([{
                            _id: String(post.track.id || post.track._id),
                            title: post.track.title || 'Son attaché',
                            artist: {
                              _id: post.track.artist_id || '',
                              name: post.track.artist_name || 'Artiste',
                              username: post.track.artist_username || '',
                            },
                            audioUrl,
                            coverUrl: post.track.coverUrl || post.track.cover_url || '/default-cover.svg',
                            duration: post.track.duration || 0,
                            likes: [],
                            comments: [],
                            plays: post.track.plays || 0,
                            genre: post.track.genre || [],
                          } as any], 0);
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Écouter
                      </button>
                    ) : null}
                    {post.category === 'remix' ? (
                      <Link
                        href={`/ai-generator?mode=remix&sourceTrack=${encodeURIComponent(String(post.track.id || post.track._id))}&title=${encodeURIComponent(String(post.track.title || ''))}&style=${encodeURIComponent(String(post.track.style || ''))}`}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-black/[0.055] px-4 text-xs font-black text-black/60 transition hover:bg-black hover:text-white"
                      >
                        <Repeat2 className="h-3.5 w-3.5" />
                        Remixer dans le Studio
                      </Link>
                    ) : null}
                  </div>
                </div>
              </SynauraPanel>
            ) : null}

            <SynauraPanel className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/36">Retours</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Réponses de la communauté</h2>
                </div>
                <span className="rounded-full bg-black/[0.055] px-3 py-1 text-xs font-black text-black/40">{replies.length}</span>
              </div>

              <div className="space-y-3">
                {replies.length ? replies.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] bg-black/[0.035] p-3.5">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar src={item.profiles?.avatar || undefined} name={item.profiles?.name || 'Créateur'} username={item.profiles?.username} size="sm" />
                      <div>
                        <p className="text-sm font-black text-[#171313]">{item.profiles?.name || 'Créateur'}</p>
                        <p className="text-[11px] font-semibold text-black/34">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-black/58">{item.content}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setUsefulReplies((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                        notify.success('Retour utile', 'Merci, ce signal aidera à classer les meilleurs avis.');
                      }}
                      className={`mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black transition ${
                        usefulReplies.has(item.id) ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/46 hover:bg-black/[0.09]'
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Retour utile
                    </button>
                  </div>
                )) : (
                  <div className="rounded-[1.25rem] border border-dashed border-black/[0.12] p-6 text-center">
                    <MessageSquare className="mx-auto h-9 w-9 text-black/22" />
                    <p className="mt-3 text-sm font-black text-black/46">Aucune réponse pour le moment.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[1.25rem] bg-black/[0.035] p-3">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={4}
                  placeholder="Ajoute un retour utile, une idée d’arrangement, une piste de feat..."
                  className="w-full resize-none rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={submitReply}
                    disabled={submitting}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white transition hover:scale-[1.02] disabled:opacity-45"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? 'Envoi...' : 'Répondre'}
                  </button>
                </div>
              </div>
            </SynauraPanel>
          </>
        ) : null}
      </div>
    </SynauraAppShell>
  );
}
