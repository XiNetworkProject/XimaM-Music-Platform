'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Clock,
  Disc3,
  Flame,
  Headphones,
  Heart,
  HelpCircle,
  MessageSquare,
  Mic2,
  Music2,
  Play,
  PlusCircle,
  Reply,
  Send,
  Sparkles,
  ThumbsUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import {
  SynauraAnnouncementStrip,
  SynauraAppShell,
  SynauraInkPanel,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';

type CommunityStats = {
  resolvedQuestions: number;
  forumPosts: number;
  activeMembers: number;
  implementedSuggestions: number;
};

type CommunityPost = {
  id?: string;
  title?: string;
  content?: string;
  category?: string;
  createdAt?: string;
  created_at?: string;
  likes_count?: number;
  replies_count?: number;
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
  track?: any;
};

type CommunityFaq = {
  id?: string;
  question?: string;
  category?: string;
  helpful_count?: number;
};

const musicIntents = [
  {
    label: 'Avis sur mon son',
    desc: 'Publie un morceau, demande un retour sur le mix, le hook, la cover ou le potentiel de sortie.',
    href: '/community/forum/new?category=feedback',
    icon: Heart,
    tint: '#ff6f61',
    cta: 'Demander un avis',
  },
  {
    label: 'Recherche feat',
    desc: 'Trouve une voix, un beatmaker, un topliner ou un artiste pour terminer une idée.',
    href: '/community/forum/new?category=collab',
    icon: Users,
    tint: '#7c5cff',
    cta: 'Trouver un feat',
  },
  {
    label: 'Défi remix',
    desc: 'Lance un challenge depuis un son, partage une source et compare les versions.',
    href: '/community/forum/new?category=remix',
    icon: Zap,
    tint: '#f59e0b',
    cta: 'Lancer un défi',
  },
  {
    label: 'Battle de prompts',
    desc: 'Teste des prompts IA, compare les rendus et garde les meilleures recettes créatives.',
    href: '/community/forum/new?category=prompts',
    icon: Sparkles,
    tint: '#14b8a6',
    cta: 'Poster un prompt',
  },
  {
    label: 'Top sons de la semaine',
    desc: 'Signale les découvertes qui méritent d’entrer dans les mixes et les tendances.',
    href: '/community/forum/new?category=weekly-top',
    icon: Trophy,
    tint: '#38bdf8',
    cta: 'Partager un son',
  },
];

const weeklyLoops = [
  { label: 'Feedback Friday', desc: 'sons en attente d’avis', href: '/community/forum?category=feedback', cta: 'Participer', count: 12, status: 'ouvert', icon: MessageSquare },
  { label: 'Open feat', desc: 'artistes cherchent une voix', href: '/community/forum?category=collab', cta: 'Voir les demandes', count: 4, status: 'live', icon: Mic2 },
  { label: 'Prompt battle', desc: 'prompts en compétition', href: '/community/forum?category=prompts', cta: 'Entrer', count: 3, status: 'battle', icon: Sparkles },
];

const quickPostActions = [
  { label: 'Je veux un avis', href: '/community/forum/new?category=feedback', icon: Heart, tint: '#ff6f61' },
  { label: 'Je cherche un feat', href: '/community/forum/new?category=collab', icon: Users, tint: '#7c5cff' },
  { label: 'Je lance un remix', href: '/community/forum/new?category=remix', icon: Zap, tint: '#f59e0b' },
  { label: 'Je partage une découverte', href: '/community/forum/new?category=weekly-top', icon: Trophy, tint: '#38bdf8' },
];

const recentFilters = [
  { id: 'all', label: 'Tous' },
  { id: 'feedback', label: 'Avis' },
  { id: 'collab', label: 'Feat' },
  { id: 'remix', label: 'Remix' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'weekly-top', label: 'Top sons' },
];

const supportLinks = [
  { label: 'FAQ & aide', desc: 'Comptes, crédits, publication, bugs.', href: '/community/faq', icon: HelpCircle },
  { label: 'Messagerie', desc: 'Continuer une collaboration en privé.', href: '/messages', icon: Send },
  { label: 'Studio IA', desc: 'Créer une base pour un défi ou un remix.', href: '/ai-generator', icon: Sparkles },
];

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

function categoryLabel(category?: string) {
  const value = String(category || '').toLowerCase();
  if (value.includes('feedback') || value.includes('question')) return 'Avis sur mon son';
  if (value.includes('collab') || value.includes('feat')) return 'Recherche feat';
  if (value.includes('remix')) return 'Défi remix';
  if (value.includes('prompt')) return 'Battle de prompts';
  if (value.includes('weekly') || value.includes('top')) return 'Top sons';
  if (value.includes('bug')) return 'Support';
  return 'Discussion';
}

function categoryTint(category?: string) {
  const label = categoryLabel(category);
  return musicIntents.find((item) => item.label === label)?.tint || '#7c5cff';
}

function MiniWaveform({ tint, active = false }: { tint: string; active?: boolean }) {
  return (
    <div className="flex h-8 items-end gap-1">
      {[0.35, 0.7, 0.48, 0.9, 0.55, 0.78, 0.42].map((height, index) => (
        <span
          key={`${tint}-${index}`}
          className={`w-1.5 rounded-full transition-all duration-300 ${active ? 'animate-pulse' : ''}`}
          style={{
            height: `${height * 100}%`,
            background: tint,
            opacity: 0.28 + index * 0.08,
            animationDelay: `${index * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function IntentMusicVisual({ tint, index }: { tint: string; index: number }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-black/[0.06] bg-white/70 p-3">
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[1rem] text-white shadow-[0_12px_28px_rgba(30,25,20,0.14)]" style={{ background: `linear-gradient(135deg, ${tint}, #171313)` }}>
          <Disc3 className="h-5 w-5" />
          <span className="absolute inset-2 rounded-full border border-white/20" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="rounded-full bg-black/[0.045] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-black/36">
              {index % 2 === 0 ? 'son attaché' : 'session live'}
            </span>
            <Music2 className="h-3.5 w-3.5 text-black/24" />
          </div>
          <MiniWaveform tint={tint} />
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const { setQueueAndPlay } = useAudioPlayer();
  const [loading, setLoading] = useState(true);
  const [recentFilter, setRecentFilter] = useState('all');
  const [stats, setStats] = useState<CommunityStats>({
    resolvedQuestions: 0,
    forumPosts: 0,
    activeMembers: 0,
    implementedSuggestions: 0,
  });
  const [recentPosts, setRecentPosts] = useState<CommunityPost[]>([]);
  const [popularFaqs, setPopularFaqs] = useState<CommunityFaq[]>([]);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        const [statsRes, postsRes, faqRes] = await Promise.all([
          fetch('/api/community/stats', { cache: 'no-store' }),
          fetch('/api/community/posts?limit=6&sort=recent', { cache: 'no-store' }),
          fetch('/api/community/faq?limit=4&sort=popular', { cache: 'no-store' }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = Array.isArray(postsData?.posts) ? postsData.posts : [];
          setRecentPosts(
            posts.map((post: any) => ({
              ...post,
              createdAt: post.created_at,
              author: post.author || {
                name: post.profiles?.name || 'Créateur Synaura',
                username: post.profiles?.username || 'synaura',
                avatar: post.profiles?.avatar,
              },
            })),
          );
        }

        if (faqRes.ok) {
          const faqData = await faqRes.json();
          setPopularFaqs(Array.isArray(faqData?.faqs) ? faqData.faqs : []);
        }
      } catch {
        notify.error('Communauté', 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, []);

  const statCards = useMemo(
    () => [
      { label: 'sons en avis', value: stats.forumPosts, icon: Music2 },
      { label: 'défis remix', value: stats.implementedSuggestions, icon: Zap },
      { label: 'feats ouverts', value: stats.activeMembers, icon: Users },
      { label: 'retours utiles', value: stats.resolvedQuestions, icon: ThumbsUp },
    ],
    [stats],
  );
  const filteredRecentPosts = useMemo(
    () => recentFilter === 'all' ? recentPosts : recentPosts.filter((post) => String(post.category || '') === recentFilter),
    [recentFilter, recentPosts],
  );
  const remixChallenges = useMemo(
    () => recentPosts.filter((post) => String(post.category || '') === 'remix').slice(0, 3),
    [recentPosts],
  );
  const featRequests = useMemo(
    () => recentPosts.filter((post) => String(post.category || '') === 'collab').slice(0, 3),
    [recentPosts],
  );

  if (loading) {
    return (
      <SynauraAppShell>
        <SynauraTopBar searchHref="/community" searchLabel="Chercher un défi, un feat, un retour..." />
        <SynauraRouteNav />
        <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
            <p className="mt-4 text-sm font-black text-black/42">Chargement de la communauté musicale...</p>
          </div>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1240px]">
      <SynauraTopBar
        searchHref="/community"
        searchLabel="Chercher un défi, un feat, un retour..."
        secondaryHref="/ai-generator"
        secondaryLabel="Créer"
        primaryHref="/community/forum/new?category=feedback"
        primaryLabel="Poster mon son"
      />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />

      <div className="space-y-5 pb-36 sm:pb-28">
        <SynauraInkPanel className="p-3 sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_420px] lg:items-stretch">
            <div className="flex min-h-[250px] flex-col justify-between rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 sm:min-h-[360px] sm:rounded-[1.6rem] sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
                  <Music2 className="h-3.5 w-3.5 text-[#ffcf9f]" />
                  Communauté musicale
                </div>
                <h1 className="mt-5 max-w-3xl text-[2.25rem] font-black leading-[0.92] tracking-[-0.06em] text-white min-[380px]:text-[2.55rem] sm:text-6xl">
                  Fais décoller ton son.
                </h1>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/54 sm:text-base">
                  Poste ton morceau, reçois des avis, trouve un feat, lance un remix ou découvre les créations de la communauté.
                </p>
              </div>

              <div className="mt-7 grid gap-2 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:gap-2.5">
                <Link href="/community/forum/new?category=feedback" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313] transition hover:scale-[1.02] sm:h-11 sm:px-5 sm:text-sm">
                  <PlusCircle className="h-4 w-4" />
                  Demander un avis
                </Link>
                <Link href="/community/forum/new?category=remix" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/72 transition hover:bg-white/14 hover:text-white sm:h-11 sm:px-5 sm:text-sm">
                  <Zap className="h-4 w-4" />
                  Lancer un défi remix
                </Link>
                <Link href="/community/forum/new?category=collab" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/72 transition hover:bg-white/14 hover:text-white sm:h-11 sm:px-5 sm:text-sm">
                  <Users className="h-4 w-4" />
                  Trouver un feat
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.55rem] bg-[#fffaf2] p-4 text-[#171313]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/36">Boucles recommandées</p>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Créateur', 'Crée ou publie', 'Demande un avis', 'Améliore ou remixe'],
                    ['Auditeur', 'Découvre un son', 'Donne un retour utile', 'Suis ou remixe l’artiste'],
                  ].map(([profile, first, second, third]) => (
                    <div key={profile} className="rounded-[1.2rem] bg-black/[0.045] p-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-black/36">{profile}</p>
                      <div className="mt-2 grid gap-1.5 text-sm font-black text-[#171313]">
                        {[first, second, third].map((step, index) => (
                          <div key={step} className="flex items-center gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#171313] text-[10px] text-white">{index + 1}</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {statCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-white/8 p-3">
                      <Icon className="h-4 w-4 text-white/46" />
                      <p className="mt-3 text-2xl font-black text-white">{item.value}</p>
                      <p className="text-[11px] font-bold text-white/38">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SynauraInkPanel>

        <SynauraPanel className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Commence ici</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Qu’est-ce que tu veux poster ?</h2>
              <p className="mt-1 text-sm font-semibold text-black/42">
                {session?.user ? 'Poste avec ton profil, une intention claire et un son attaché.' : 'Crée un compte pour poster avec une track source et recevoir des retours.'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
              {quickPostActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-[1.15rem] bg-black/[0.04] p-3 transition hover:bg-white hover:shadow-[0_14px_34px_rgba(30,25,20,0.08)]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.95rem] text-white" style={{ background: item.tint }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-black text-[#171313]">{item.label}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-black/24 transition group-hover:translate-x-0.5 group-hover:text-black" />
                  </Link>
                );
              })}
            </div>
          </div>
        </SynauraPanel>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Avec ton son</p>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#171313]">Que veux-tu faire avec ton son ?</h2>
            </div>
            <Link href="/discover" className="hidden rounded-full bg-black/[0.055] px-4 py-2 text-xs font-black text-black/52 transition hover:bg-black hover:text-white sm:inline-flex">
              Découvrir des sons
            </Link>
          </div>

          <div className="synaura-no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-5">
            {musicIntents.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative min-h-[205px] w-[min(78vw,300px)] shrink-0 snap-start overflow-hidden rounded-[1.35rem] border border-black/[0.08] bg-[#fffaf2]/88 p-3.5 shadow-[0_18px_50px_rgba(30,25,20,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(30,25,20,0.14)] md:w-auto md:rounded-[1.6rem] md:p-4 xl:min-h-[270px]"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-18 blur-2xl" style={{ background: item.tint }} />
                  <div className="relative flex h-full flex-col justify-between">
                    <div>
                      <div className="grid h-12 w-12 place-items-center rounded-[1.05rem] text-white shadow-[0_14px_34px_rgba(30,25,20,0.16)] transition duration-300 group-hover:scale-105" style={{ background: item.tint }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-[#171313]">{item.label}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-black/48">{item.desc}</p>
                      <IntentMusicVisual tint={item.tint} index={musicIntents.indexOf(item)} />
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-black/45 transition group-hover:text-[#171313]">
                      {item.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <SynauraPanel className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Remix</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Défis remix actifs</h2>
              </div>
              <Link href="/community/forum/new?category=remix" className="shrink-0 rounded-full bg-[#171313] px-4 py-2 text-xs font-black text-white">Lancer</Link>
            </div>
            {remixChallenges.length ? (
              <div className="grid gap-3">
                {remixChallenges.map((post) => {
                  const track = post.track;
                  return (
                    <Link key={post.id} href={`/community/forum/${post.id}`} className="group flex gap-3 rounded-[1.25rem] bg-black/[0.035] p-3 transition hover:bg-white hover:shadow-[0_14px_36px_rgba(30,25,20,0.08)]">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-black/[0.06]">
                        {track?.coverUrl || track?.cover_url ? <img src={track.coverUrl || track.cover_url} alt="" className="h-full w-full object-cover" /> : <Zap className="m-5 h-6 w-6 text-black/24" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-black text-[#171313]">{post.title || 'Défi remix'}</p>
                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-black/42">{track?.title || 'Source à écouter'} · {post.replies_count || 0} participant(s)</p>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-black/45 group-hover:text-[#171313]">Participer <ArrowRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-black/[0.12] p-6 text-center">
                <p className="text-sm font-black text-black/48">Aucun défi remix actif.</p>
                <p className="mt-1 text-xs font-semibold text-black/36">Lance le premier défi depuis un de tes sons.</p>
              </div>
            )}
          </SynauraPanel>

          <SynauraPanel className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Collab</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Artistes qui cherchent un feat</h2>
              </div>
              <Link href="/community/forum/new?category=collab" className="shrink-0 rounded-full bg-black/[0.055] px-4 py-2 text-xs font-black text-black/52">Poster</Link>
            </div>
            {featRequests.length ? (
              <div className="grid gap-3">
                {featRequests.map((post) => (
                  <Link key={post.id} href={`/community/forum/${post.id}`} className="group flex items-center gap-3 rounded-[1.25rem] bg-black/[0.035] p-3 transition hover:bg-white hover:shadow-[0_14px_36px_rgba(30,25,20,0.08)]">
                    <Avatar src={post.author?.avatar} name={post.author?.name || 'Artiste'} username={post.author?.username} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-black text-[#171313]">{post.author?.name || 'Artiste Synaura'}</p>
                      <p className="line-clamp-1 text-xs font-semibold text-black/42">{post.title || 'Recherche collaboration'}</p>
                    </div>
                    <span className="rounded-full bg-[#171313] px-3 py-1.5 text-xs font-black text-white">Contacter</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-black/[0.12] p-6 text-center">
                <p className="text-sm font-black text-black/48">Aucune demande de feat ouverte.</p>
                <p className="mt-1 text-xs font-semibold text-black/36">Publie une demande claire : voix, prod, topline ou mix.</p>
              </div>
            )}
          </SynauraPanel>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_380px]">
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Avis en cours</p>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#171313]">Discussions qui peuvent faire avancer un son</h2>
              </div>
              <div className="synaura-no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
                {recentFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setRecentFilter(filter.id)}
                    className={`h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${
                      recentFilter === filter.id ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/48 hover:bg-black/[0.09]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredRecentPosts.length ? (
              <div className="grid gap-3">
                {filteredRecentPosts.map((post, index) => {
                  const tint = categoryTint(post.category);
                  const track = post.track;
                  return (
                    <Link
                      key={post.id || index}
                      href={post.id ? `/community/forum/${post.id}` : '/community/forum'}
                      className="group rounded-[1.45rem] border border-black/[0.08] bg-[#fffaf2]/88 p-3.5 shadow-[0_16px_45px_rgba(30,25,20,0.07)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_60px_rgba(30,25,20,0.11)]"
                    >
                      <div className="flex gap-3">
                        <div className="hidden shrink-0 sm:block">
                          <Avatar src={post.author?.avatar} name={post.author?.name || 'Créateur'} username={post.author?.username} size="md" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white" style={{ background: tint }}>
                              {categoryLabel(post.category)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black/35">
                              <Clock className="h-3 w-3" />
                              {formatDate(post.createdAt || post.created_at)}
                            </span>
                          </div>
                          <h3 className="line-clamp-1 text-base font-black tracking-[-0.03em] text-[#171313] transition group-hover:text-black">
                            {post.title || 'Discussion musicale'}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-black/48">
                            {post.content || 'Un créateur cherche un retour ou une collaboration.'}
                          </p>
                          {track ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                const t = track;
                                const audioUrl = t.audioUrl || t.audio_url;
                                if (!audioUrl) return;
                                setQueueAndPlay([{
                                  _id: String(t.id || t._id),
                                  title: t.title || 'Son attaché',
                                  artist: {
                                    _id: t.artist_id || t.creator_id || '',
                                    name: t.artist_name || t.artist?.name || 'Artiste',
                                    username: t.artist_username || t.artist?.username || '',
                                  },
                                  audioUrl,
                                  coverUrl: t.coverUrl || t.cover_url || '/default-cover.svg',
                                  duration: t.duration || 0,
                                  likes: [],
                                  comments: [],
                                  plays: t.plays || 0,
                                  genre: t.genre || [],
                                } as any], 0);
                              }}
                              className="mt-3 flex w-full max-w-md items-center gap-3 rounded-[1.15rem] border border-black/[0.06] bg-black/[0.035] p-2.5 text-left transition hover:bg-black/[0.07]"
                            >
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.95rem] bg-[#171313] text-white">
                                {track.coverUrl || track.cover_url ? (
                                  <img src={track.coverUrl || track.cover_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Music2 className="m-4 h-4 w-4" />
                                )}
                                <span className="absolute inset-0 grid place-items-center bg-black/18">
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-[#171313]">{track.title || 'Son attaché'}</p>
                                <MiniWaveform tint={tint} />
                              </div>
                              <span className="hidden rounded-full bg-[#171313] px-3 py-1.5 text-[10px] font-black text-white sm:inline-flex">Écouter</span>
                            </button>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-black/35">
                            <span>{post.author?.name || 'Créateur Synaura'}</span>
                            <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.likes_count || 0}</span>
                            <span className="inline-flex items-center gap-1"><Reply className="h-3 w-3" />{post.replies_count || 0}</span>
                            <span className="rounded-full bg-black/[0.045] px-2 py-1 text-black/42">Répondre</span>
                            <span className="rounded-full bg-black/[0.045] px-2 py-1 text-black/42">Utile</span>
                            {String(post.category || '') === 'remix' && track ? (
                              <span className="rounded-full bg-[#171313] px-2 py-1 text-white">Remix</span>
                            ) : null}
                          </div>
                        </div>
                        <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-black/24 transition group-hover:translate-x-0.5 group-hover:text-black" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <SynauraPanel className="p-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1.1rem] bg-black/[0.045] text-black/30">
                  <Music2 className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-black text-black/58">Aucun son ne cherche d’avis pour le moment.</p>
                <p className="mx-auto mt-1 max-w-sm text-xs font-semibold leading-5 text-black/38">Lance le premier sujet avec un morceau, une intention claire ou une idée de remix.</p>
                <Link href="/community/forum/new?category=feedback" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                  Demander un avis
                </Link>
              </SynauraPanel>
            )}
          </section>

          <aside className="space-y-4">
            <SynauraPanel className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Rituels</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#171313]">Rituels de la semaine</h2>
                </div>
                <Flame className="h-5 w-5 text-[#ff6f61]" />
              </div>
              <div className="mt-4 grid gap-2">
                {weeklyLoops.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} href={item.href} className="group block rounded-[1.2rem] bg-black/[0.04] p-3 transition hover:bg-black/[0.07]">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171313] text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-black text-[#171313]">{item.label}</p>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-black/42">{item.status}</span>
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-black/45">{item.count} {item.desc}</p>
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-black text-black/45 group-hover:text-[#171313]">
                            {item.cta}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SynauraPanel>

            <SynauraInkPanel className="p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Depuis l’écoute</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">Un son peut devenir une discussion.</h2>
              <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-white/8 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-[0.95rem] bg-[#fffaf2] text-[#171313]">
                    <Disc3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white">Track → discussion</p>
                    <MiniWaveform tint="#ffcf9f" active />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/48">
                Écoute un titre, partage-le dans le feed, demande un avis ou lance un remix. La communauté devient la suite naturelle de l’écoute.
              </p>
              <div className="mt-4 grid gap-2">
                <Link href="/discover" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313]">
                  <Headphones className="h-4 w-4" />
                  Trouver un son
                </Link>
                <Link href="/ai-generator" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/68 transition hover:bg-white/14 hover:text-white">
                  <Sparkles className="h-4 w-4" />
                  Créer une réponse
                </Link>
              </div>
            </SynauraInkPanel>

            <SynauraPanel className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-black/34" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Besoin d’aide ?</p>
              </div>
              <div className="mt-4 grid gap-2">
                {supportLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-[1.15rem] bg-black/[0.04] p-3 transition hover:bg-black/[0.07]">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black/54 shadow-[0_8px_18px_rgba(30,25,20,0.08)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#171313]">{item.label}</p>
                        <p className="truncate text-xs text-black/42">{item.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SynauraPanel>

            {popularFaqs.length ? (
              <SynauraPanel className="p-4 sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Aide rapide</p>
                <div className="mt-3 grid gap-2">
                  {popularFaqs.slice(0, 3).map((faq, index) => (
                    <Link key={faq.id || index} href="/community/faq" className="rounded-[1rem] bg-black/[0.035] p-3 transition hover:bg-black/[0.06]">
                      <p className="line-clamp-2 text-sm font-black text-[#171313]">{faq.question || 'Question fréquente'}</p>
                      <p className="mt-1 text-[11px] font-bold text-black/35">
                        {faq.helpful_count || 0} utile{(faq.helpful_count || 0) > 1 ? 's' : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </SynauraPanel>
            ) : null}
          </aside>
        </div>
        <SynauraInkPanel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Test public</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Prêt à tester ton morceau ?</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/50">Poste-le et reçois des avis avant la sortie.</p>
            </div>
            <Link href="/community/forum/new?category=feedback" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
              <PlusCircle className="h-4 w-4" />
              Demander un avis sur mon son
            </Link>
          </div>
        </SynauraInkPanel>
      </div>
    </SynauraAppShell>
  );
}