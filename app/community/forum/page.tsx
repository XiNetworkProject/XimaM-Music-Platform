'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Clock,
  Heart,
  Link as LinkIcon,
  MessageSquare,
  Mic2,
  Music2,
  PlusCircle,
  Reply,
  Search,
  Sparkles,
  ThumbsUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { notify } from '@/components/NotificationCenter';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import { categorizePost, suggestTags } from '@/lib/postCategorization';

type CommunityCategory = 'all' | 'feedback' | 'collab' | 'remix' | 'prompts' | 'weekly-top';
type PostCategory = Exclude<CommunityCategory, 'all'>;

type Post = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  likes_count?: number;
  replies_count?: number;
  created_at?: string;
  track_id?: string | null;
  user_id?: string;
  author?: { id?: string; name?: string; username?: string; avatar?: string | null };
};

const CATEGORIES: Array<{
  id: CommunityCategory;
  label: string;
  desc: string;
  icon: any;
  tint: string;
  prompt: string;
}> = [
  { id: 'all', label: 'Tout', desc: 'Toutes les discussions musicales', icon: MessageSquare, tint: '#171313', prompt: '' },
  { id: 'feedback', label: 'Avis sur mon son', desc: 'Mix, hook, cover, potentiel de sortie', icon: Heart, tint: '#ff6f61', prompt: 'Je cherche un retour précis sur mon son : mix, structure, refrain, cover ou potentiel de sortie.' },
  { id: 'collab', label: 'Recherche feat', desc: 'Voix, beatmakers, topliners, producteurs', icon: Users, tint: '#7c5cff', prompt: 'Je cherche un feat ou une collaboration pour terminer une idée.' },
  { id: 'remix', label: 'Défi remix', desc: 'Lance une source ou réponds à un challenge', icon: Zap, tint: '#f59e0b', prompt: 'Je lance un défi remix : voici l’intention, les contraintes et le son de départ.' },
  { id: 'prompts', label: 'Battle de prompts', desc: 'Compare des recettes IA et directions créatives', icon: Sparkles, tint: '#14b8a6', prompt: 'Je propose un prompt ou une recette IA à tester et améliorer ensemble.' },
  { id: 'weekly-top', label: 'Top sons', desc: 'Découvertes qui méritent d’entrer dans les mixes', icon: Trophy, tint: '#38bdf8', prompt: 'Je partage une découverte qui mérite d’être écoutée cette semaine.' },
];

function categoryMeta(category?: string) {
  return CATEGORIES.find((item) => item.id === category) || CATEGORIES[0];
}

function formatDate(value?: string) {
  if (!value) return 'maintenant';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return 'maintenant';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function CommunityForumContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') || 'all') as CommunityCategory;
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory>(CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : 'all');
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(Boolean(searchParams.get('category')));
  const [submitting, setSubmitting] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: categoryMeta(initialCategory).prompt,
    category: (initialCategory === 'all' ? 'feedback' : initialCategory) as PostCategory,
    track_id: '',
    tags: [] as string[],
  });

  const currentIntent = categoryMeta(selectedCategory);

  useEffect(() => {
    const controller = new AbortController();
    const loadPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '30', sort: 'recent' });
        if (selectedCategory !== 'all') params.set('category', selectedCategory);
        if (query.trim()) params.set('search', query.trim());
        const response = await fetch(`/api/community/posts?${params.toString()}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('posts');
        const data = await response.json();
        const hydrated = await Promise.all(
          (Array.isArray(data.posts) ? data.posts : []).map(async (post: Post) => {
            try {
              if (!post.user_id) return post;
              const userRes = await fetch(`/api/users/by-id/${post.user_id}`, { signal: controller.signal });
              if (!userRes.ok) return post;
              const user = await userRes.json();
              return { ...post, author: { id: user.id, name: user.name, username: user.username, avatar: user.avatar } };
            } catch {
              return post;
            }
          }),
        );
        setPosts(hydrated);
      } catch (error: any) {
        if (error?.name !== 'AbortError') notify.error('Communauté', 'Impossible de charger les discussions.');
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
    return () => controller.abort();
  }, [selectedCategory, query]);

  const activeRemixChallenges = useMemo(() => posts.filter((post) => post.category === 'remix').slice(0, 3), [posts]);

  const prefillComposer = (category: CommunityCategory) => {
    const meta = categoryMeta(category);
    setSelectedCategory(category);
    setNewPost((current) => ({
      ...current,
      category: (category === 'all' ? 'feedback' : category) as PostCategory,
      content: current.content.trim() ? current.content : meta.prompt,
      tags: suggestTags(current.title, meta.prompt),
    }));
    setComposerOpen(true);
  };

  const submitPost = async () => {
    if (!session?.user) {
      notify.error('Connexion requise', 'Connecte-toi pour publier dans la communauté.');
      return;
    }
    if (!newPost.title.trim() || !newPost.content.trim()) {
      notify.error('Post incomplet', 'Ajoute un titre et un contenu.');
      return;
    }
    setSubmitting(true);
    try {
      const category = newPost.category || categorizePost(newPost.title, newPost.content);
      const tags = newPost.tags.length ? newPost.tags : suggestTags(newPost.title, newPost.content);
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          category,
          tags,
          track_id: newPost.track_id.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Erreur publication');
      setPosts((current) => [{
        ...payload,
        author: {
          id: session.user.id,
          name: (session.user as any).name || (session.user as any).username || 'Créateur',
          username: (session.user as any).username || 'synaura',
          avatar: (session.user as any).avatar || (session.user as any).image,
        },
      }, ...current]);
      setNewPost({ title: '', content: categoryMeta(category as CommunityCategory).prompt, category: category as PostCategory, track_id: '', tags: [] });
      setComposerOpen(false);
      notify.success('Publié', 'Ta discussion est en ligne.');
    } catch (error: any) {
      notify.error('Publication', error?.message || 'Impossible de publier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SynauraAppShell contentClassName="max-w-[1240px]">
      <SynauraTopBar
        searchLabel="Chercher un avis, un feat, un défi..."
        secondaryHref="/ai-generator"
        secondaryLabel="Studio"
        primaryHref="/community/forum/new?category=feedback"
        primaryLabel="Demander un avis"
      />
      <SynauraRouteNav />

      <div className="space-y-5 pb-36 sm:pb-28">
        <SynauraInkPanel className="p-3.5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
            <div>
              <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/58 transition hover:bg-white/14 hover:text-white">
                ← Hub communauté
              </Link>
              <h1 className="mt-5 max-w-3xl text-[2.3rem] font-black leading-[0.92] tracking-[-0.06em] text-white min-[380px]:text-[2.7rem] sm:text-6xl">
                Discussions musicales récentes.
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/54 sm:text-base">
                Demande un avis sur ton son, trouve un feat, lance un défi remix ou compare des prompts IA. Ici, chaque discussion doit aider une création à avancer.
              </p>
              <div className="mt-6 grid gap-2 min-[420px]:flex min-[420px]:flex-wrap">
                <Link href="/community/forum/new?category=feedback" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313] transition hover:scale-[1.02] sm:h-11 sm:px-5 sm:text-sm">
                  <PlusCircle className="h-4 w-4" />
                  Demander un avis
                </Link>
                <Link href="/community/forum/new?category=remix" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/72 transition hover:bg-white/14 hover:text-white sm:h-11 sm:px-5 sm:text-sm">
                  <Zap className="h-4 w-4" />
                  Créer un défi remix
                </Link>
                <Link href="/community/forum/new?category=collab" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/72 transition hover:bg-white/14 hover:text-white sm:h-11 sm:px-5 sm:text-sm">
                  <Mic2 className="h-4 w-4" />
                  Trouver un feat
                </Link>
              </div>
            </div>

            <div className="rounded-[1.45rem] bg-[#fffaf2] p-4 text-[#171313]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-black/36">Défis remix actifs</p>
              <div className="mt-3 grid gap-2">
                {activeRemixChallenges.length ? activeRemixChallenges.map((post) => (
                  <Link key={post.id} href={`/community/forum/${post.id}`} className="rounded-[1rem] bg-black/[0.045] p-3 transition hover:bg-black/[0.07]">
                    <p className="line-clamp-1 text-sm font-black">{post.title}</p>
                    <p className="mt-1 text-xs text-black/42">{post.replies_count || 0} réponses</p>
                  </Link>
                )) : (
                  <div className="rounded-[1rem] border border-dashed border-black/[0.12] p-4 text-center">
                    <p className="text-sm font-black text-black/48">Aucun défi actif.</p>
                    <button onClick={() => prefillComposer('remix')} className="mt-3 inline-flex h-9 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                      Créer un défi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SynauraInkPanel>

        <section className="synaura-no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-6">
          {CATEGORIES.map((item) => {
            const Icon = item.icon;
            const active = selectedCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCategory(item.id)}
                className={`min-h-[116px] w-[min(68vw,250px)] shrink-0 snap-start rounded-[1.2rem] border p-3.5 text-left transition hover:-translate-y-0.5 md:w-auto md:rounded-[1.35rem] md:p-4 ${
                  active ? 'border-[#171313] bg-[#171313] text-white shadow-[0_18px_45px_rgba(23,19,19,0.18)]' : 'border-black/[0.08] bg-[#fffaf2]/88 text-[#171313] shadow-[0_14px_40px_rgba(30,25,20,0.08)]'
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-[0.95rem] text-white" style={{ background: item.tint }}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-black">{item.label}</p>
                <p className={`mt-1 line-clamp-2 text-xs leading-5 ${active ? 'text-white/52' : 'text-black/44'}`}>{item.desc}</p>
              </button>
            );
          })}
        </section>

        {composerOpen ? (
          <SynauraPanel className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/36">Publier dans Community</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Quel retour veux-tu obtenir ?</h2>
              </div>
              <button onClick={() => setComposerOpen(false)} className="rounded-full bg-black/[0.055] px-4 py-2 text-xs font-black text-black/48 transition hover:bg-black hover:text-white">
                Fermer
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_230px]">
              <div className="space-y-3">
                <input
                  value={newPost.title}
                  onChange={(event) => setNewPost((current) => ({ ...current, title: event.target.value, tags: suggestTags(event.target.value, current.content) }))}
                  placeholder="Ex : Besoin d’un avis sur mon refrain"
                  className="h-12 w-full rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
                />
                <textarea
                  value={newPost.content}
                  onChange={(event) => setNewPost((current) => ({ ...current, content: event.target.value, tags: suggestTags(current.title, event.target.value) }))}
                  placeholder="Décris ton son, ce que tu veux améliorer, et le type de retour attendu."
                  rows={6}
                  className="w-full resize-none rounded-[1.2rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={newPost.track_id}
                    onChange={(event) => setNewPost((current) => ({ ...current, track_id: event.target.value }))}
                    placeholder="ID du son attaché (optionnel)"
                    className="h-11 rounded-full border border-black/[0.08] bg-white px-4 text-xs font-bold text-[#171313] outline-none placeholder:text-black/28 focus:border-[#171313]"
                  />
                  <div className="flex items-center gap-2 rounded-full bg-black/[0.04] px-4 text-xs font-semibold text-black/42">
                    <LinkIcon className="h-3.5 w-3.5" />
                    L’attachement sera utilisé si l’API/DB le supporte.
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-[1.2rem] bg-black/[0.035] p-3">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-black/36">Catégorie</span>
                  <select
                    value={newPost.category}
                    onChange={(event) => setNewPost((current) => ({ ...current, category: event.target.value as PostCategory }))}
                    className="h-11 w-full rounded-full border border-black/[0.08] bg-white px-3 text-xs font-black text-[#171313] outline-none"
                  >
                    {CATEGORIES.filter((item) => item.id !== 'all').map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-black/36">Tags suggérés</p>
                  <div className="flex min-h-11 flex-wrap gap-1.5 rounded-[1rem] bg-white p-2">
                    {(newPost.tags.length ? newPost.tags : ['feedback']).slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-full bg-black/[0.06] px-2 py-1 text-[10px] font-black text-black/46">#{tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submitPost}
                  disabled={submitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-45"
                >
                  {submitting ? 'Publication...' : 'Publier la discussion'}
                </button>
              </div>
            </div>
          </SynauraPanel>
        ) : null}

        <SynauraPanel className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/36">{currentIntent.label}</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Posts qui peuvent faire avancer un son</h2>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/26" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Chercher un post..."
                className="h-11 w-full rounded-full border border-black/[0.08] bg-white pl-10 pr-4 text-sm font-semibold outline-none placeholder:text-black/28 focus:border-[#171313]"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-[280px] place-items-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
                <p className="mt-3 text-sm font-black text-black/42">Chargement des discussions...</p>
              </div>
            </div>
          ) : posts.length ? (
            <div className="grid gap-3">
              {posts.map((post) => {
                const meta = categoryMeta(post.category);
                const Icon = meta.icon;
                return (
                  <Link key={post.id} href={`/community/forum/${post.id}`} className="group rounded-[1.35rem] border border-black/[0.07] bg-black/[0.025] p-3.5 transition hover:bg-white hover:shadow-[0_18px_50px_rgba(30,25,20,0.10)]">
                    <div className="flex gap-3">
                      <div className="hidden shrink-0 sm:block">
                        <Avatar src={post.author?.avatar || undefined} name={post.author?.name || 'Créateur'} username={post.author?.username} size="md" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white" style={{ background: meta.tint }}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black/35"><Clock className="h-3 w-3" />{formatDate(post.created_at)}</span>
                        </div>
                        <h3 className="line-clamp-1 text-base font-black tracking-[-0.03em] text-[#171313]">{post.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-black/48">{post.content}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-black/35">
                          <span>{post.author?.name || 'Créateur Synaura'}</span>
                          {post.track_id ? <span className="inline-flex items-center gap-1"><Music2 className="h-3 w-3" />son attaché</span> : null}
                          <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.likes_count || 0}</span>
                          <span className="inline-flex items-center gap-1"><Reply className="h-3 w-3" />{post.replies_count || 0}</span>
                        </div>
                      </div>
                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-black/24 transition group-hover:translate-x-0.5 group-hover:text-black" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-black/[0.12] p-8 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-black/22" />
              <p className="mt-3 text-sm font-black text-black/48">Aucune discussion dans cette catégorie.</p>
              <button onClick={() => prefillComposer(selectedCategory === 'all' ? 'feedback' : selectedCategory)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                <PlusCircle className="h-4 w-4" />
                Lancer le premier sujet
              </button>
            </div>
          )}
        </SynauraPanel>
      </div>
    </SynauraAppShell>
  );
}

export default function CommunityForumPage() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="max-w-[1240px]">
          <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
              <p className="mt-4 text-sm font-black text-black/42">Chargement du forum musical...</p>
            </div>
          </SynauraPanel>
        </SynauraAppShell>
      }
    >
      <CommunityForumContent />
    </Suspense>
  );
}
