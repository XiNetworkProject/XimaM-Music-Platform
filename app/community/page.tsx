'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Clock,
  Flame,
  Headphones,
  Heart,
  HelpCircle,
  MessageSquare,
  Mic2,
  Music2,
  PlusCircle,
  Reply,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { notify } from '@/components/NotificationCenter';
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
    href: '/community/forum?category=feedback',
    icon: Heart,
    tint: '#ff6f61',
    cta: 'Demander un avis',
  },
  {
    label: 'Recherche feat',
    desc: 'Trouve une voix, un beatmaker, un topliner ou un artiste pour terminer une idÃ©e.',
    href: '/community/forum?category=collab',
    icon: Users,
    tint: '#7c5cff',
    cta: 'Trouver un feat',
  },
  {
    label: 'DÃ©fi remix',
    desc: 'Lance un challenge depuis un son, partage une source et compare les versions.',
    href: '/community/forum?category=remix',
    icon: Zap,
    tint: '#f59e0b',
    cta: 'Lancer un dÃ©fi',
  },
  {
    label: 'Battle de prompts',
    desc: 'Teste des prompts IA, compare les rendus et garde les meilleures recettes crÃ©atives.',
    href: '/community/forum?category=prompts',
    icon: Sparkles,
    tint: '#14b8a6',
    cta: 'Poster un prompt',
  },
  {
    label: 'Top sons de la semaine',
    desc: 'Signale les dÃ©couvertes qui mÃ©ritent dâ€™entrer dans les mixes et les tendances.',
    href: '/community/forum?category=weekly-top',
    icon: Trophy,
    tint: '#38bdf8',
    cta: 'Partager un son',
  },
];

const weeklyLoops = [
  { label: 'Feedback Friday', desc: 'Un crÃ©neau clair pour obtenir des retours utiles.', icon: MessageSquare },
  { label: 'Open feat', desc: 'Les artistes disponibles pour collaborations cette semaine.', icon: Mic2 },
  { label: 'Prompt battle', desc: 'MÃªme intention, prompts diffÃ©rents, meilleurs rÃ©sultats.', icon: Sparkles },
];

const supportLinks = [
  { label: 'FAQ & aide', desc: 'Comptes, crÃ©dits, publication, bugs.', href: '/community/faq', icon: HelpCircle },
  { label: 'Messagerie', desc: 'Continuer une collaboration en privÃ©.', href: '/messages', icon: Send },
  { label: 'Studio IA', desc: 'CrÃ©er une base pour un dÃ©fi ou un remix.', href: '/ai-generator', icon: Sparkles },
];

function formatDate(value?: string) {
  if (!value) return 'maintenant';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return 'maintenant';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Ã  l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function categoryLabel(category?: string) {
  const value = String(category || '').toLowerCase();
  if (value.includes('feedback') || value.includes('question')) return 'Avis sur mon son';
  if (value.includes('collab') || value.includes('feat')) return 'Recherche feat';
  if (value.includes('remix')) return 'DÃ©fi remix';
  if (value.includes('prompt')) return 'Battle de prompts';
  if (value.includes('weekly') || value.includes('top')) return 'Top sons';
  if (value.includes('bug')) return 'Support';
  return 'Discussion';
}

function categoryTint(category?: string) {
  const label = categoryLabel(category);
  return musicIntents.find((item) => item.label === label)?.tint || '#7c5cff';
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
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
          const postsWithAuthors = await Promise.all(
            posts.map(async (post: any) => {
              try {
                const userRes = await fetch(`/api/users/by-id/${post.user_id}`);
                if (userRes.ok) {
                  const user = await userRes.json();
                  return {
                    ...post,
                    createdAt: post.created_at,
                    author: { name: user.name, username: user.username, avatar: user.avatar },
                  };
                }
              } catch {}
              return { ...post, createdAt: post.created_at, author: { name: 'CrÃ©ateur Synaura', username: 'synaura' } };
            }),
          );
          setRecentPosts(postsWithAuthors);
        }

        if (faqRes.ok) {
          const faqData = await faqRes.json();
          setPopularFaqs(Array.isArray(faqData?.faqs) ? faqData.faqs : []);
        }
      } catch {
        notify.error('CommunautÃ©', 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, []);

  const statCards = useMemo(
    () => [
      { label: 'crÃ©ateurs actifs', value: stats.activeMembers, icon: Users },
      { label: 'sujets musicaux', value: stats.forumPosts, icon: MessageSquare },
      { label: 'retours utiles', value: stats.resolvedQuestions, icon: ThumbsUp },
      { label: 'idÃ©es remix', value: stats.implementedSuggestions, icon: Sparkles },
    ],
    [stats],
  );

  if (loading) {
    return (
      <SynauraAppShell>
        <SynauraTopBar searchHref="/community" searchLabel="Chercher un dÃ©fi, un feat, un retour..." />
        <SynauraRouteNav />
        <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
            <p className="mt-4 text-sm font-black text-black/42">Chargement de la communautÃ© musicale...</p>
          </div>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1240px]">
      <SynauraTopBar
        searchHref="/community"
        searchLabel="Chercher un dÃ©fi, un feat, un retour..."
        secondaryHref="/ai-generator"
        secondaryLabel="CrÃ©er"
        primaryHref="/community/forum?category=feedback"
        primaryLabel="Poster mon son"
      />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />

      <div className="space-y-5 pb-28">
        <SynauraInkPanel className="p-4 sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_420px] lg:items-stretch">
            <div className="flex min-h-[360px] flex-col justify-between rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
                  <Music2 className="h-3.5 w-3.5 text-[#ffcf9f]" />
                  CommunautÃ© musicale
                </div>
                <h1 className="mt-5 max-w-3xl text-[2.7rem] font-black leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl">
                  Trouve ton public avant de sortir ton son.
                </h1>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/54 sm:text-base">
                  Synaura Community nâ€™est plus un forum gÃ©nÃ©raliste. Câ€™est lâ€™endroit oÃ¹ un crÃ©ateur fait Ã©couter,
                  obtient des avis, trouve un feat, lance un remix et transforme une idÃ©e en sortie.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/community/forum?category=feedback" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
                  <PlusCircle className="h-4 w-4" />
                  Poster mon son
                </Link>
                <Link href="/community/forum?category=collab" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-black text-white/72 transition hover:bg-white/14 hover:text-white">
                  <Users className="h-4 w-4" />
                  Trouver un feat
                </Link>
                <Link href="/ai-generator" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-black text-white/72 transition hover:bg-white/14 hover:text-white">
                  <Sparkles className="h-4 w-4" />
                  CrÃ©er pour un dÃ©fi
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.55rem] bg-[#fffaf2] p-4 text-[#171313]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/36">Boucle recommandÃ©e</p>
                <div className="mt-4 grid gap-3">
                  {[
                    ['1', 'Ã‰coute un son', 'Depuis Home, Discover ou le player global.'],
                    ['2', 'Demande un retour', 'Lie la discussion Ã  une intention musicale claire.'],
                    ['3', 'CrÃ©e ou remixe', 'Retourne au Studio avec un angle dÃ©jÃ  validÃ©.'],
                  ].map(([step, title, desc]) => (
                    <div key={step} className="flex gap-3 rounded-[1.2rem] bg-black/[0.045] p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171313] text-xs font-black text-white">{step}</span>
                      <div>
                        <p className="text-sm font-black">{title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-black/45">{desc}</p>
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

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">EntrÃ©es principales</p>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#171313]">Choisis ce que tu veux faire avec ta musique</h2>
            </div>
            <Link href="/discover" className="hidden rounded-full bg-black/[0.055] px-4 py-2 text-xs font-black text-black/52 transition hover:bg-black hover:text-white sm:inline-flex">
              DÃ©couvrir des sons
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {musicIntents.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative min-h-[230px] overflow-hidden rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/88 p-4 shadow-[0_18px_50px_rgba(30,25,20,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(30,25,20,0.14)]"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-18 blur-2xl" style={{ background: item.tint }} />
                  <div className="relative flex h-full flex-col justify-between">
                    <div>
                      <div className="grid h-12 w-12 place-items-center rounded-[1.05rem] text-white shadow-[0_14px_34px_rgba(30,25,20,0.16)]" style={{ background: item.tint }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-[#171313]">{item.label}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-black/48">{item.desc}</p>
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_380px]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Live musical</p>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#171313]">Discussions qui peuvent faire avancer un son</h2>
              </div>
              <Link href="/community/forum" className="shrink-0 rounded-full bg-[#171313] px-4 py-2 text-xs font-black text-white transition hover:scale-[1.02]">
                Tout voir
              </Link>
            </div>

            {recentPosts.length ? (
              <div className="grid gap-3">
                {recentPosts.map((post, index) => {
                  const tint = categoryTint(post.category);
                  return (
                    <Link
                      key={post.id || index}
                      href={post.id ? `/community/forum/${post.id}` : '/community/forum'}
                      className="group rounded-[1.45rem] border border-black/[0.08] bg-[#fffaf2]/88 p-3.5 shadow-[0_16px_45px_rgba(30,25,20,0.07)] transition hover:bg-white hover:shadow-[0_20px_60px_rgba(30,25,20,0.11)]"
                    >
                      <div className="flex gap-3">
                        <div className="hidden shrink-0 sm:block">
                          <Avatar src={post.author?.avatar} name={post.author?.name || 'CrÃ©ateur'} username={post.author?.username} size="md" />
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
                            {post.content || 'Un crÃ©ateur cherche un retour ou une collaboration.'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-black/35">
                            <span>{post.author?.name || 'CrÃ©ateur Synaura'}</span>
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
              <SynauraPanel className="p-8 text-center">
                <MessageSquare className="mx-auto h-9 w-9 text-black/22" />
                <p className="mt-3 text-sm font-black text-black/48">Aucune discussion pour le moment.</p>
                <Link href="/community/forum?category=feedback" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                  Lancer le premier sujet
                </Link>
              </SynauraPanel>
            )}
          </section>

          <aside className="space-y-4">
            <SynauraPanel className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Rendez-vous</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#171313]">Boucles hebdo</h2>
                </div>
                <Flame className="h-5 w-5 text-[#ff6f61]" />
              </div>
              <div className="mt-4 grid gap-2">
                {weeklyLoops.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[1.2rem] bg-black/[0.04] p-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171313] text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#171313]">{item.label}</p>
                          <p className="mt-0.5 text-xs leading-5 text-black/45">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SynauraPanel>

            <SynauraInkPanel className="p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Depuis le player</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">Un son peut devenir une discussion.</h2>
              <p className="mt-3 text-sm leading-6 text-white/48">
                Ã‰coute un titre, partage-le dans le feed, demande un avis ou lance un remix. La communautÃ© devient la suite naturelle de lâ€™Ã©coute.
              </p>
              <div className="mt-4 grid gap-2">
                <Link href="/discover" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313]">
                  <Headphones className="h-4 w-4" />
                  Trouver un son
                </Link>
                <Link href="/ai-generator" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-black text-white/68 transition hover:bg-white/14 hover:text-white">
                  <Sparkles className="h-4 w-4" />
                  CrÃ©er une rÃ©ponse
                </Link>
              </div>
            </SynauraInkPanel>

            <SynauraPanel className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-black/34" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Support sÃ©parÃ©</p>
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">FAQ utile</p>
                <div className="mt-3 grid gap-2">
                  {popularFaqs.slice(0, 3).map((faq, index) => (
                    <Link key={faq.id || index} href="/community/faq" className="rounded-[1rem] bg-black/[0.035] p-3 transition hover:bg-black/[0.06]">
                      <p className="line-clamp-2 text-sm font-black text-[#171313]">{faq.question || 'Question frÃ©quente'}</p>
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
      </div>
    </SynauraAppShell>
  );
}