'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, HelpCircle, Users, TrendingUp, Star, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CommunityPage() {
  const { data: session } = useSession();

  const stats = [
    { label: 'Questions résolues', value: '1,234', icon: HelpCircle, color: 'text-green-400' },
    { label: 'Posts du forum', value: '567', icon: MessageSquare, color: 'text-blue-400' },
    { label: 'Membres actifs', value: '2,890', icon: Users, color: 'text-purple-400' },
    { label: 'Suggestions implémentées', value: '89', icon: TrendingUp, color: 'text-orange-400' },
  ];

  const recentPosts = [
    {
      id: '1',
      title: 'Comment télécharger mes musiques ?',
      category: 'question',
      author: 'Marie Dubois',
      replies: 5,
      likes: 12,
      time: '2h',
    },
    {
      id: '2',
      title: 'Suggestion : Mode sombre pour le player',
      category: 'suggestion',
      author: 'Alex Martin',
      replies: 8,
      likes: 28,
      time: '4h',
    },
    {
      id: '3',
      title: 'Bug : Player qui se ferme sur mobile',
      category: 'bug',
      author: 'Sophie Chen',
      replies: 3,
      likes: 15,
      time: '6h',
    },
  ];

  const popularFAQs = [
    {
      id: '1',
      question: 'Comment télécharger mes musiques ?',
      category: 'player',
    },
    {
      id: '2',
      question: 'Quels formats audio sont supportés ?',
      category: 'upload',
    },
    {
      id: '3',
      question: 'Comment fonctionne la génération de musique IA ?',
      category: 'ia',
    },
    {
      id: '4',
      question: 'Puis-je changer de plan d\'abonnement ?',
      category: 'abonnement',
    },
  ];

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
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center"
                  >
                    <Icon size={24} className={`mx-auto mb-2 ${stat.color}`} />
                    <div className="text-2xl font-bold text-[var(--text)]">{stat.value}</div>
                    <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
                  </motion.div>
                );
              })}
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
              {recentPosts.map((post, index) => (
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
                        <span className="capitalize">{post.category}</span>
                        <span>par {post.author}</span>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>il y a {post.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                      <div className="flex items-center gap-1">
                        <Star size={14} />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        <span>{post.replies}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
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
              {popularFAQs.map((faq, index) => (
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
                  </div>
                </motion.div>
              ))}
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