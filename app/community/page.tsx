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
  ChevronRight,
  ThumbsUp,
  Reply,
  Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

  // Charger les données de la communauté
  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);

        // Stats
        const statsResponse = await fetch('/api/community/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Posts récents
        const postsResponse = await fetch('/api/community/posts?limit=3&sort=recent');
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          const posts = postsData.posts || [];

          const postsWithAuthors = await Promise.all(
            posts.map(async (post: any) => {
              try {
                const userResponse = await fetch(`/api/users/by-id/${post.user_id}`);
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  return {
                    ...post,
                    createdAt: post.created_at,
                    author: {
                      name: userData.name,
                      username: userData.username,
                    },
                  };
                }
              } catch (error) {
                console.error("Erreur lors de la récupération de l'utilisateur:", error);
              }

              return {
                ...post,
                createdAt: post.created_at,
                author: {
                  name: 'Utilisateur inconnu',
                  username: 'unknown',
                },
              };
            }),
          );

          setRecentPosts(postsWithAuthors);
        }

        // FAQ populaires
        const faqResponse = await fetch('/api/community/faq?limit=8&sort=popular');
        if (faqResponse.ok) {
          const faqData = await faqResponse.json();
          setPopularFaqs(faqData.faqs || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données de la communauté');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'question':
        return <HelpCircle size={16} className="text-blue-400" />;
      case 'suggestion':
        return <TrendingUp size={16} className="text-yellow-400" />;
      case 'bug':
        return <MessageSquare size={16} className="text-red-400" />;
      default:
        return <MessageSquare size={16} className="text-purple-400" />;
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen text-white flex items-center justify-center">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-sm text-white/70">Chargement de la communauté Synaura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white pb-20">
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-6 md:py-10">
        {/* HERO */}
        <section className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-violet-500/80 blur-xl opacity-70" />
                <div className="relative w-11 h-11 rounded-2xl bg-black/70 border border-white/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-300" />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">
                  Synaura
                </p>
                <h1 className="text-2xl md:text-3xl font-semibold">
                  Communauté Synaura
                </h1>
                <p className="text-sm text-white/65 max-w-xl mt-1">
                  Entraide, questions, idées de fonctionnalités et discussions autour
                  de la plateforme. Ici, tout le monde peut contribuer à faire évoluer Synaura.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Forum d&apos;entraide
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                FAQ & support
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                Suggestions & roadmap
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/community/forum"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(129,140,248,0.9)] hover:scale-[1.02] active:scale-100 transition-transform"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Accéder au forum</span>
              </Link>
              <Link
                href="/community/faq"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Consulter la FAQ</span>
              </Link>
            </div>
          </div>

          {/* Petit résumé stats / user */}
          <div className="w-full md:w-72">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                  En un coup d&apos;œil
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Actif</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-[11px] text-white/60">Questions résolues</p>
                  <p className="text-lg font-semibold">
                    {stats.resolvedQuestions}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-white/60">Membres actifs</p>
                  <p className="text-lg font-semibold">
                    {stats.activeMembers}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-white/60">Posts forum</p>
                  <p className="text-lg font-semibold">
                    {stats.forumPosts}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-white/60">Idées appliquées</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    {stats.implementedSuggestions}
                    <Star className="w-3 h-3 text-yellow-300" />
                  </p>
                </div>
              </div>
              {session && (
                <p className="text-[11px] text-white/60">
                  Bienvenue,{' '}
                  <span className="font-medium text-white">
                    {(session.user as any)?.name ||
                      (session.user as any)?.username ||
                      'membre'}
                  </span>
                  . Merci de faire partie de la communauté.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Accès rapide + stats détaillées */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] mb-8">
          {/* Accès rapide */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/90">
              Accès rapide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Forum */}
              <Link
                href="/community/forum"
                className="group bg-gradient-to-r from-blue-500/15 via-purple-500/10 to-transparent border border-blue-500/35 rounded-2xl p-5 hover:from-blue-500/30 hover:via-purple-500/20 hover:to-transparent transition-all duration-200 backdrop-blur-md"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">
                      Forum Communauté
                    </h3>
                    <p className="text-xs text-white/70 mb-3">
                      Posez vos questions, partagez vos idées et discutez avec les
                      autres créateurs.
                    </p>
                    <div className="flex items-center text-blue-300 text-xs font-medium group-hover:text-blue-200">
                      <span>Accéder au forum</span>
                      <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* FAQ */}
              <Link
                href="/community/faq"
                className="group bg-gradient-to-r from-emerald-500/15 via-blue-500/10 to-transparent border border-emerald-500/35 rounded-2xl p-5 hover:from-emerald-500/30 hover:via-blue-500/20 hover:to-transparent transition-all duration-200 backdrop-blur-md"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">
                      FAQ & aide rapide
                    </h3>
                    <p className="text-xs text-white/70 mb-3">
                      Trouvez immédiatement les réponses aux questions les plus fréquentes.
                    </p>
                    <div className="flex items-center text-emerald-300 text-xs font-medium group-hover:text-emerald-200">
                      <span>Consulter la FAQ</span>
                      <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Stats détaillées */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white/90">
              Communauté en chiffres
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-md"
              >
                <HelpCircle className="mx-auto mb-2 text-emerald-300" />
                <div className="text-xl font-bold">{stats.resolvedQuestions}</div>
                <div className="text-[11px] text-white/65">
                  Questions résolues
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-md"
              >
                <MessageSquare className="mx-auto mb-2 text-blue-300" />
                <div className="text-xl font-bold">{stats.forumPosts}</div>
                <div className="text-[11px] text-white/65">Posts du forum</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-md"
              >
                <Users className="mx-auto mb-2 text-purple-300" />
                <div className="text-xl font-bold">{stats.activeMembers}</div>
                <div className="text-[11px] text-white/65">
                  Membres actifs
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-md"
              >
                <TrendingUp className="mx-auto mb-2 text-orange-300" />
                <div className="text-xl font-bold">
                  {stats.implementedSuggestions}
                </div>
                <div className="text-[11px] text-white/65">
                  Suggestions implémentées
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Discussions récentes + FAQ populaire */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] mb-10">
          {/* Discussions récentes */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm md:text-base font-semibold">
                  Discussions récentes
                </h2>
                <p className="text-xs text-white/60">
                  Un aperçu des derniers sujets de la communauté
                </p>
              </div>
              <Link
                href="/community/forum"
                className="flex items-center gap-1 text-xs md:text-sm text-blue-300 hover:text-blue-200 font-medium"
              >
                <span>Voir tout</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {recentPosts.length > 0 ? (
                recentPosts.map((post, index) => (
                  <motion.div
                    key={post.id || post._id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="group bg-black/20 border border-white/8 rounded-xl p-3.5 hover:bg-white/5 hover:border-white/20 transition-colors cursor-default"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-white/70">
                            {getCategoryIcon(post.category)}
                            <span className="capitalize">{post.category}</span>
                          </span>
                          {post.is_resolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-[11px] text-emerald-200">
                              <ThumbsUp size={12} />
                              <span>Résolu</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold mb-1 text-white group-hover:text-blue-300 line-clamp-2">
                          {post.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/55">
                          <span>par {post.author.name}</span>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatDate(post.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-[11px] text-white/60">
                        <div className="flex items-center gap-1">
                          <ThumbsUp size={13} />
                          <span>{post.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Reply size={13} />
                          <span>{post.replies_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-white/55">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Aucune discussion récente pour le moment.
                  </p>
                  <p className="text-xs mt-1">
                    Soyez le premier à lancer un sujet dans le forum !
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FAQ populaire */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm md:text-base font-semibold">
                  Questions populaires
                </h2>
                <p className="text-xs text-white/60">
                  Les réponses les plus consultées par la communauté
                </p>
              </div>
              <Link
                href="/community/faq"
                className="flex items-center gap-1 text-xs md:text-sm text-emerald-300 hover:text-emerald-200 font-medium"
              >
                <span>Voir toutes les FAQ</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {popularFaqs.length > 0 ? (
                popularFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="bg-black/20 border border-white/8 rounded-xl p-3.5 hover:bg-white/5 hover:border-white/20 transition-colors cursor-default"
                  >
                    <h3 className="text-sm font-medium mb-1.5 text-white hover:text-emerald-300 line-clamp-2">
                      {faq.question}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 capitalize">
                        {faq.category}
                      </span>
                      {faq.helpful_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                          {faq.helpful_count} utile
                          {faq.helpful_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-white/55">
                  <HelpCircle size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Aucune FAQ populaire pour le moment.
                  </p>
                  <p className="text-xs mt-1">
                    Les questions fréquentes apparaîtront ici automatiquement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section>
          <div className="bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-cyan-400/15 border border-violet-400/40 rounded-2xl p-6 md:p-7 text-center backdrop-blur-md">
            <h3 className="text-lg font-semibold mb-2">
              Rejoignez la conversation
            </h3>
            <p className="text-sm text-white/70 mb-4 max-w-2xl mx-auto">
              Une idée de fonctionnalité, un bug à signaler, ou une simple question ?
              La communauté Synaura et l&apos;équipe sont là pour vous répondre.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/community/forum"
                className="px-6 py-2.5 bg-white text-black rounded-full text-sm font-semibold hover:scale-[1.03] active:scale-100 shadow-lg transition-transform inline-flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Poser une question</span>
              </Link>
              <Link
                href="/community/faq"
                className="px-6 py-2.5 bg-black/30 border border-white/20 text-white rounded-full text-sm font-medium hover:bg-black/50 transition-colors inline-flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Consulter la FAQ</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
