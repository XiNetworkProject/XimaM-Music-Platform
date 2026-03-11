'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  MessageSquare,
  Plus,
  Search,
  ThumbsUp,
  Reply,
  Clock,
  HelpCircle,
  Bug,
  Lightbulb,
  Wand2,
  Filter,
  Tag,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '@/components/NotificationCenter';
import { categorizePost, suggestTags } from '@/lib/postCategorization';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import { UModal, UModalBody, UModalTitle } from '@/components/ui/UnifiedUI';

interface Post {
  id: string;
  title: string;
  content: string;
  author: { name: string; username: string; avatar?: string; id?: string };
  category: 'question' | 'suggestion' | 'bug' | 'general';
  tags: string[];
  likes: number;
  replies: number;
  createdAt: string;
  isLiked?: boolean;
}

const categories = [
  { id: 'all', label: 'Tous', icon: MessageSquare, color: 'indigo' },
  { id: 'question', label: 'Questions', icon: HelpCircle, color: 'blue' },
  { id: 'suggestion', label: 'Suggestions', icon: Lightbulb, color: 'amber' },
  { id: 'bug', label: 'Bugs', icon: Bug, color: 'red' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'violet' },
] as const;

const getCategoryStyle = (cat: string) => {
  switch (cat) {
    case 'question': return { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', iconBg: 'from-blue-500 to-cyan-500' };
    case 'suggestion': return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', iconBg: 'from-amber-500 to-orange-500' };
    case 'bug': return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', iconBg: 'from-red-500 to-pink-500' };
    default: return { bg: 'bg-violet-500/10 border-violet-500/20', text: 'text-violet-400', iconBg: 'from-violet-500 to-indigo-500' };
  }
};

export default function CommunityForumPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: any[] }>({});
  const [newComment, setNewComment] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'question' as 'question' | 'suggestion' | 'bug' | 'general',
    tags: [] as string[],
  });
  const [autoCategorizeEnabled, setAutoCategorizeEnabled] = useState(true);

  useEffect(() => {
    if (!autoCategorizeEnabled) return;
    const t = setTimeout(() => {
      if (newPost.title.trim() || newPost.content.trim()) {
        setNewPost((prev) => ({
          ...prev,
          category: categorizePost(prev.title, prev.content),
          tags: suggestTags(prev.title, prev.content),
        }));
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [newPost.title, newPost.content, autoCategorizeEnabled]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);

        const res = await fetch(`/api/community/posts?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        const postsWithAuthors = await Promise.all(
          (data.posts || []).map(async (post: any) => {
            try {
              const uRes = await fetch(`/api/users/by-id/${post.user_id}`);
              if (uRes.ok) {
                const u = await uRes.json();
                let isLiked = false;
                if (session?.user?.id) {
                  try {
                    const likesRes = await fetch(`/api/community/posts/likes?post_id=${post.id}`);
                    if (likesRes.ok) {
                      const likes = await likesRes.json();
                      isLiked = likes.some((l: any) => l.user_id === session.user.id);
                    }
                  } catch {}
                }
                return { ...post, createdAt: post.created_at, isLiked, likes: Number(post.likes_count) || 0, replies: Number(post.replies_count) || 0, author: { id: u.id, name: u.name, username: u.username, avatar: u.avatar } };
              }
            } catch {}
            return { ...post, createdAt: post.created_at, likes: Number(post.likes_count) || 0, replies: Number(post.replies_count) || 0, author: { name: 'Utilisateur', username: 'user' } };
          }),
        );
        setPosts(postsWithAuthors);
      } catch {
        notify.error('Erreur', 'Erreur chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [selectedCategory, searchQuery, session?.user?.id]);

  const filteredPosts = posts.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleLike = async (postId: string) => {
    if (!session?.user) { notify.error('Erreur', 'Connexion requise'); return; }
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    try {
      if (post.isLiked) {
        const res = await fetch(`/api/community/posts/likes?post_id=${postId}`, { method: 'DELETE' });
        if (res.ok) setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: false, likes: p.likes - 1 } : p));
      } else {
        const res = await fetch('/api/community/posts/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId }) });
        if (res.ok || (await res.json()).error === 'Post deja like') {
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: true, likes: p.likes + 1 } : p));
        }
      }
    } catch { notify.error('Erreur', 'Erreur'); }
  };

  const handleToggleComments = async (postId: string) => {
    if (showComments === postId) { setShowComments(null); return; }
    setShowComments(postId);
    if (!comments[postId]) {
      try {
        const res = await fetch(`/api/community/posts/replies?post_id=${postId}`);
        if (res.ok) {
          const data = await res.json();
          setComments((prev) => ({ ...prev, [postId]: data }));
        }
      } catch {}
    }
  };

  const handleSubmitComment = async (postId: string) => {
    if (!session?.user) { notify.error('Erreur', 'Connexion requise'); return; }
    if (!newComment.trim()) { notify.error('Erreur', 'Commentaire requis'); return; }
    try {
      const res = await fetch('/api/community/posts/replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, content: newComment.trim() }) });
      if (!res.ok) throw new Error();
      const reply = await res.json();
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), reply] }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, replies: p.replies + 1 } : p));
      setNewComment('');
      notify.success('OK', 'Commentaire ajoute');
    } catch { notify.error('Erreur', 'Erreur'); }
  };

  const handleSubmitPost = async () => {
    if (!session?.user) { notify.error('Erreur', 'Connexion requise'); return; }
    if (!newPost.title.trim() || !newPost.content.trim()) { notify.error('Erreur', 'Titre et contenu requis'); return; }
    try {
      const res = await fetch('/api/community/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPost) });
      if (!res.ok) throw new Error((await res.json()).error);
      const post = await res.json();
      setPosts((prev) => [{ ...post, createdAt: post.created_at, likes: 0, replies: 0, author: { id: session.user.id, name: (session.user as any).name || 'Utilisateur', username: (session.user as any).username || 'user', avatar: (session.user as any).avatar || (session.user as any).image } }, ...prev]);
      setNewPost({ title: '', content: '', category: 'question', tags: [] });
      setShowNewPost(false);
      notify.success('OK', 'Post publie');
    } catch (e: any) { notify.error('Erreur', e.message || 'Erreur'); }
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0e] text-white overflow-hidden pb-24">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/[0.07] blur-[130px] animate-[synaura-blob1_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-violet-600/[0.06] blur-[130px] animate-[synaura-blob2_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-14">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/community" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Forum</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">Forum communaute</h1>
              <p className="text-sm text-white/40">Posez vos questions, partagez vos idees</p>
            </div>
            {session?.user && (
              <button
                onClick={() => setShowNewPost(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all hover:scale-[1.02] active:scale-100"
              >
                <Plus className="w-4 h-4" />
                Nouveau post
              </button>
            )}
          </div>
        </motion.div>

        {/* Info bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-300/70 mb-6">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <p>Restez respectueux et constructif. Pour les bugs critiques, utilisez la categorie Bug.</p>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Rechercher un post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                      : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <p className="text-sm text-white/40">Chargement...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-10 h-10 mx-auto text-white/15 mb-3" />
              <h3 className="text-sm font-bold mb-1">Aucun post</h3>
              <p className="text-xs text-white/35">Ajustez vos filtres ou lancez une discussion</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const style = getCategoryStyle(post.category);
              const CatIcon = categories.find((c) => c.id === post.category)?.icon || MessageSquare;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 md:p-5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${style.iconBg} flex items-center justify-center shadow-lg`}>
                      <CatIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-semibold text-white mb-1 line-clamp-2">{post.title}</h3>
                      <p className="text-xs text-white/40 mb-2 line-clamp-2">{post.content}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/30">
                        <div className="flex items-center gap-1.5">
                          {post.author?.avatar && <Avatar src={post.author.avatar.replace('/upload/', '/upload/f_auto,q_auto/')} name={post.author.name} username={post.author.username} size="xs" />}
                          <span>{post.author.name}</span>
                        </div>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/35">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                        post.isLiked
                          ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
                          : 'bg-white/[0.03] text-white/35 border border-white/[0.06] hover:bg-pink-500/10 hover:text-pink-300 hover:border-pink-500/20'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{post.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                        showComments === post.id
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                          : 'bg-white/[0.03] text-white/35 border border-white/[0.06] hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/20'
                      }`}
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{post.replies || 0} reponses</span>
                    </button>
                  </div>

                  {showComments === post.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                      {session?.user && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Votre commentaire..."
                            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-indigo-500/40"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitComment(post.id); } }}
                          />
                          <button onClick={() => handleSubmitComment(post.id)} className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20">
                            Envoyer
                          </button>
                        </div>
                      )}
                      <div className="space-y-2">
                        {comments[post.id]?.length ? (
                          comments[post.id].map((c: any) => (
                            <div key={c.id} className="flex gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <Avatar src={c.profiles?.avatar?.replace('/upload/', '/upload/f_auto,q_auto/') || null} name={c.profiles?.name} username={c.profiles?.username} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium text-white">{c.profiles?.name || 'Utilisateur'}</span>
                                  <span className="text-[10px] text-white/25">{formatDate(c.created_at)}</span>
                                </div>
                                <p className="text-xs text-white/50">{c.content}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-[11px] text-white/25 py-3">Aucun commentaire</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* New post modal */}
      <UModal open={showNewPost} onClose={() => setShowNewPost(false)} size="full">
        <UModalBody>
          <div className="mb-5">
            <UModalTitle>Nouveau post</UModalTitle>
            <p className="text-xs text-white/35 mt-0.5">Decrivez clairement votre question ou idee</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">Titre</label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                placeholder="Titre..."
                className="w-full h-10 px-3.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">Categorie</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost((p) => ({ ...p, category: e.target.value as any }))}
                  className="w-full h-10 px-3.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] appearance-none transition"
                >
                  <option value="question">Question</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-white/40 mb-1.5">
                  <Tag className="w-3 h-3" /> Tags sugeres
                </label>
                <div className="min-h-[42px] rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 flex flex-wrap gap-1.5">
                  {newPost.tags.length > 0 ? (
                    newPost.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-[11px] text-indigo-300">#{tag}</span>
                    ))
                  ) : (
                    <span className="text-[11px] text-white/20">Auto-detection...</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">Contenu</label>
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                placeholder="Decrivez votre question ou idee..."
                rows={5}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] resize-none transition"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!newPost.title.trim() && !newPost.content.trim()) { notify.error('Erreur', 'Saisissez du contenu'); return; }
                  setNewPost((p) => ({ ...p, category: categorizePost(p.title, p.content), tags: suggestTags(p.title, p.content) }));
                  notify.success('OK', 'Categorise');
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Categoriser
              </button>
              <label className="inline-flex items-center gap-2 text-[11px] text-white/35">
                <input type="checkbox" checked={autoCategorizeEnabled} onChange={(e) => setAutoCategorizeEnabled(e.target.checked)} className="rounded border-white/20 bg-white/[0.04]" />
                Auto
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowNewPost(false)}
              className="flex-1 inline-flex items-center justify-center rounded-full h-9 px-4 text-sm font-medium bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitPost}
              className="flex-1 inline-flex items-center justify-center rounded-full h-9 px-4 text-sm font-semibold bg-white text-black hover:bg-white/90 transition"
            >
              Publier
            </button>
          </div>
        </UModalBody>
      </UModal>
    </div>
  );
}
