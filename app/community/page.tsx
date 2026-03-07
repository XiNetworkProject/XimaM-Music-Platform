'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  MessageSquare,
  HelpCircle,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  ThumbsUp,
  Reply,
  Star,
  Sparkles,
  Flame,
  Trophy,
  Lightbulb,
  Bug,
  Send,
  Search,
  Zap,
  Heart,
  MessagesSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Avatar from '@/components/Avatar';

const sectionFade = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const getCategoryMeta = (cat: string) => {
  switch (cat) {
    case 'question':
      return { icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
    case 'suggestion':
      return { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' };
    case 'bug':
      return { icon: Bug, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
    default:
      return { icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30' };
  }
};

export default function CommunityPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    resolvedQuestions: 0,
    forumPosts: 0,
    activeMembers: 0,
    implementedSuggestions: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [popularFaqs, setPopularFaqs] = useState<any[]>([]);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);

        const [statsRes, postsRes, faqRes] = await Promise.all([
          fetch('/api/community/stats'),
          fetch('/api/community/posts?limit=5&sort=recent'),
          fetch('/api/community/faq?limit=6&sort=popular'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = postsData.posts || [];
          const postsWithAuthors = await Promise.all(
            posts.map(async (post: any) => {
              try {
                const userRes = await fetch(`/api/users/by-id/${post.user_id}`);
                if (userRes.ok) {
                  const u = await userRes.json();
                  return { ...post, createdAt: post.created_at, author: { name: u.name, username: u.username, avatar: u.avatar } };
                }
              } catch {}
              return { ...post, createdAt: post.created_at, author: { name: 'Utilisateur', username: 'user' } };
            }),
          );
          setRecentPosts(postsWithAuthors);
        }

        if (faqRes.ok) {
          const faqData = await faqRes.json();
          setPopularFaqs(faqData.faqs || []);
        }
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchCommunityData();
  }, []);

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "A l'instant";
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  };

  const statCards = [
    { label: 'Membres actifs', value: stats.activeMembers, icon: Users, gradient: 'from-indigo-500 to-violet-500' },
    { label: 'Discussions', value: stats.forumPosts, icon: MessageSquare, gradient: 'from-violet-500 to-fuchsia-500' },
    { label: 'Resolues', value: stats.resolvedQuestions, icon: ThumbsUp, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Idees integrees', value: stats.implementedSuggestions, icon: Star, gradient: 'from-amber-500 to-orange-500' },
  ];

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm text-white/50">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0e] text-white overflow-hidden pb-24">
      {/* Animated background blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/[0.07] blur-[130px] animate-[synaura-blob1_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-violet-600/[0.06] blur-[130px] animate-[synaura-blob2_22s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] left-[50%] w-[35vw] h-[35vw] rounded-full bg-fuchsia-600/[0.04] blur-[130px] animate-[synaura-blob3_26s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-14">
        {/* HERO */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={0}
          variants={sectionFade}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Centre communautaire</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                  Communaute
                </span>{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Synaura
                </span>
              </h1>
              <p className="text-base md:text-lg text-white/50 leading-relaxed max-w-xl">
                Entraide, idees, discussions et suggestions. Un espace ou chaque createur
                contribue a faire evoluer la plateforme.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/community/forum"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 hover:shadow-indigo-400/30 transition-all hover:scale-[1.02] active:scale-100"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ouvrir le forum
                </Link>
                <Link
                  href="/community/faq"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white/[0.06] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  Centre d&apos;aide
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white/[0.06] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] transition-colors"
                >
                  <MessagesSquare className="w-4 h-4" />
                  Messagerie
                </Link>
              </div>
            </div>

            {session && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full lg:w-auto"
              >
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm lg:w-72">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">Votre espace</span>
                  </div>
                  <p className="text-sm text-white/70 mb-3">
                    Bienvenue,{' '}
                    <span className="font-semibold text-white">
                      {(session.user as any)?.name || 'membre'}
                    </span>
                  </p>
                  <Link
                    href="/community/forum"
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300 hover:bg-indigo-500/20 transition-colors group"
                  >
                    <span>Poser une question</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* STATS */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={1}
          variants={sectionFade}
          className="mb-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 md:p-5 hover:bg-white/[0.06] transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-white/40 mt-1">{s.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* QUICK ACCESS */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={2}
          variants={sectionFade}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg md:text-xl font-bold text-white">Acces rapide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Forum */}
            <Link
              href="/community/forum"
              className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-6 hover:bg-white/[0.06] transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold mb-1.5">Forum</h3>
                <p className="text-sm text-white/50 mb-4 leading-relaxed">
                  Posez vos questions, partagez vos idees et discutez avec la communaute.
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm text-indigo-400 font-medium group-hover:gap-2.5 transition-all">
                  <span>Acceder</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* FAQ */}
            <Link
              href="/community/faq"
              className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-6 hover:bg-white/[0.06] transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold mb-1.5">Centre d&apos;aide</h3>
                <p className="text-sm text-white/50 mb-4 leading-relaxed">
                  Trouvez les reponses aux questions frequentes en un instant.
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm text-emerald-400 font-medium group-hover:gap-2.5 transition-all">
                  <span>Consulter</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Messagerie */}
            <Link
              href="/messages"
              className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-6 hover:bg-white/[0.06] transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold mb-1.5">Messagerie</h3>
                <p className="text-sm text-white/50 mb-4 leading-relaxed">
                  Echangez directement avec les autres createurs et artistes.
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm text-violet-400 font-medium group-hover:gap-2.5 transition-all">
                  <span>Ouvrir</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </motion.section>

        {/* MAIN GRID: Recent posts + FAQ */}
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] mb-12">
          {/* Recent discussions */}
          <motion.section
            initial="hidden"
            animate="visible"
            custom={3}
            variants={sectionFade}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg md:text-xl font-bold text-white">Discussions recentes</h2>
              </div>
              <Link
                href="/community/forum"
                className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
              >
                Tout voir <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentPosts.length > 0 ? (
                recentPosts.map((post, i) => {
                  const meta = getCategoryMeta(post.category);
                  const CatIcon = meta.icon;
                  return (
                    <motion.div
                      key={post.id || i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all cursor-default group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-9 h-9 rounded-xl ${meta.bg} border flex items-center justify-center`}>
                          <CatIcon className={`w-4 h-4 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
                            {post.title}
                          </h3>
                          <p className="text-xs text-white/40 line-clamp-1 mb-2">{post.content}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/35">
                            <div className="flex items-center gap-1.5">
                              {post.author?.avatar && (
                                <Avatar src={post.author.avatar} name={post.author.name} username={post.author.username} size="xs" />
                              )}
                              <span>{post.author?.name || 'Anonyme'}</span>
                            </div>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(post.createdAt)}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes_count || 0}</span>
                            <span className="flex items-center gap-1"><Reply className="w-3 h-3" />{post.replies_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-white/30">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium mb-1">Aucune discussion</p>
                  <p className="text-xs">Soyez le premier a lancer un sujet !</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* FAQ populaires */}
          <motion.section
            initial="hidden"
            animate="visible"
            custom={4}
            variants={sectionFade}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg md:text-xl font-bold text-white">FAQ populaires</h2>
              </div>
              <Link
                href="/community/faq"
                className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
              >
                Tout voir <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {popularFaqs.length > 0 ? (
                popularFaqs.map((faq, i) => (
                  <motion.div
                    key={faq.id || i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all cursor-default"
                  >
                    <h3 className="text-sm font-medium text-white mb-1.5 line-clamp-2">{faq.question}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-white/35">
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] capitalize">{faq.category}</span>
                      {faq.helpful_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {faq.helpful_count} utile{faq.helpful_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-white/30">
                  <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aucune FAQ</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>

        {/* CTA */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={5}
          variants={sectionFade}
        >
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/15 to-fuchsia-600/20" />
            <div className="absolute inset-0 bg-[#0a0a0e]/40" />
            <div className="relative px-6 md:px-10 py-10 md:py-14 text-center border border-white/[0.06] rounded-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-white/50 mb-5">
                <Heart className="w-3 h-3 text-pink-400" />
                <span>Contribuez a Synaura</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-3">
                Rejoignez la conversation
              </h3>
              <p className="text-sm md:text-base text-white/45 mb-7 max-w-xl mx-auto leading-relaxed">
                Une idee de fonctionnalite, un retour, ou juste envie de discuter ?
                La communaute et l&apos;equipe sont la pour vous.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/community/forum"
                  className="px-6 py-3 rounded-full text-sm font-bold bg-white text-black hover:bg-white/90 transition-colors shadow-lg inline-flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Lancer un sujet
                </Link>
                <Link
                  href="/messages"
                  className="px-6 py-3 rounded-full text-sm font-medium bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] transition-colors inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Messagerie directe
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
