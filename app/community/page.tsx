'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, HelpCircle, Users, TrendingUp, Star, Clock, ArrowRight, ChevronRight, ThumbsUp, Reply } from 'lucide-react';
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
        
        // Charger les statistiques
        const statsResponse = await fetch('/api/community/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Charger les posts récents
        const postsResponse = await fetch('/api/community/posts?limit=3&sort=recent');
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          const posts = postsData.posts || [];
          
          // Récupérer les informations utilisateur pour chaque post
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
                    }
                  };
                }
              } catch (error) {
                console.error('Erreur lors de la récupération de l\'utilisateur:', error);
              }
              
              return {
                ...post,
                createdAt: post.created_at,
                author: {
                  name: 'Utilisateur inconnu',
                  username: 'unknown',
                }
              };
            })
          );
          
          setRecentPosts(postsWithAuthors);
        }

        // Charger les FAQ populaires
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
    
    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'question': return <HelpCircle size={16} className="text-blue-400" />;
      case 'suggestion': return <TrendingUp size={16} className="text-yellow-400" />;
      case 'bug': return <MessageSquare size={16} className="text-red-400" />;
      default: return <MessageSquare size={16} className="text-purple-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-[var(--text)] pb-20">
      <div className="w-full p-2 sm:p-3">
        <div className="flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-white/[0.02] backdrop-blur-xl max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex h-fit w-full flex-row items-center justify-between p-4 text-[var(--text)] max-md:p-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 bg-purple-500/10 border border-purple-500/20">
                <Users size={24} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl max-md:text-lg font-bold">Communauté Synaura</h1>
                <p className="text-[var(--text-muted)] text-sm">Entraide, questions et suggestions</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Communauté en chiffres</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center"
              >
                <HelpCircle size={24} className="mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-[var(--text)]">{stats.resolvedQuestions}</div>
                <div className="text-sm text-[var(--text-muted)]">Questions résolues</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center"
              >
                <MessageSquare size={24} className="mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold text-[var(--text)]">{stats.forumPosts}</div>
                <div className="text-sm text-[var(--text-muted)]">Posts du forum</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center"
              >
                <Users size={24} className="mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-[var(--text)]">{stats.activeMembers}</div>
                <div className="text-sm text-[var(--text-muted)]">Membres actifs</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center"
              >
                <TrendingUp size={24} className="mx-auto mb-2 text-orange-400" />
                <div className="text-2xl font-bold text-[var(--text)]">{stats.implementedSuggestions}</div>
                <div className="text-sm text-[var(--text-muted)]">Suggestions implémentées</div>
              </motion.div>
            </div>
          </div>

          {/* Navigation rapide */}
          <div className="p-4 border-t border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">Accès rapide</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Forum */}
              <Link
                href="/community/forum"
                className="group bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                    <MessageSquare size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Forum Communauté</h3>
                    <p className="text-[var(--text-muted)] text-sm mb-3">
                      Posez vos questions, partagez vos idées et discutez avec la communauté
                    </p>
                    <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300">
                      <span>Accéder au forum</span>
                      <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* FAQ */}
              <Link
                href="/community/faq"
                className="group bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-6 hover:from-green-500/20 hover:to-blue-500/20 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-500">
                    <HelpCircle size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">FAQ</h3>
                    <p className="text-[var(--text-muted)] text-sm mb-3">
                      Trouvez rapidement les réponses aux questions les plus fréquentes
                    </p>
                    <div className="flex items-center text-green-400 text-sm font-medium group-hover:text-green-300">
                      <span>Consulter la FAQ</span>
                      <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Posts récents */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Discussions récentes</h2>
              <Link
                href="/community/forum"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                <span>Voir tout</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentPosts.length > 0 ? (
                recentPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 hover:text-blue-400 cursor-pointer">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(post.category)}
                            <span className="capitalize">{post.category}</span>
                          </div>
                          <span>par {post.author.name}</span>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatDate(post.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <div className="flex items-center gap-1">
                          <ThumbsUp size={14} />
                          <span>{post.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Reply size={14} />
                          <span>{post.replies_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Aucune discussion récente pour le moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* FAQ populaire */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Questions populaires</h2>
              <Link
                href="/community/faq"
                className="flex items-center gap-1 text-green-400 hover:text-green-300 text-sm font-medium"
              >
                <span>Voir toutes les FAQ</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popularFaqs.length > 0 ? (
                popularFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
                  >
                    <h3 className="font-medium mb-2 hover:text-green-400">
                      {faq.question}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="px-2 py-1 bg-[var(--surface-3)] rounded-lg capitalize">
                        {faq.category}
                      </span>
                      {faq.helpful_count > 0 && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg">
                          {faq.helpful_count} utile{faq.helpful_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-[var(--text-muted)]">
                  <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Aucune FAQ populaire pour le moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Call to action */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Rejoignez la conversation</h3>
              <p className="text-[var(--text-muted)] mb-4">
                Vous avez une question ou une suggestion ? La communauté Synaura est là pour vous aider !
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/community/forum"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  Poser une question
                </Link>
                <Link
                  href="/community/faq"
                  className="px-6 py-2 bg-[var(--surface-3)] text-[var(--text)] rounded-xl hover:bg-[var(--surface-4)] transition-colors"
                >
                  Consulter la FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}