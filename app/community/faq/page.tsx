'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search, MessageSquare, Lightbulb, Bug, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'player' | 'upload' | 'abonnement' | 'ia' | 'technique';
  tags: string[];
}

const categories = [
  { id: 'all', label: 'Toutes', icon: HelpCircle },
  { id: 'general', label: 'Général', icon: MessageSquare },
  { id: 'player', label: 'Player', icon: Settings },
  { id: 'upload', label: 'Upload', icon: Lightbulb },
  { id: 'abonnement', label: 'Abonnements', icon: Settings },
  { id: 'ia', label: 'IA', icon: Lightbulb },
  { id: 'technique', label: 'Technique', icon: Bug },
] as const;

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Comment télécharger mes musiques ?',
    answer: 'Le téléchargement est disponible pour les abonnements Pro et Enterprise. Dans le player, cliquez sur les trois points (⋯) puis sur "Télécharger". Vous devrez accepter les conditions d\'utilisation avant le téléchargement.',
    category: 'player',
    tags: ['téléchargement', 'pro', 'enterprise']
  },
  {
    id: '2',
    question: 'Quels formats audio sont supportés ?',
    answer: 'Synaura supporte les formats MP3, WAV, FLAC et M4A. La taille maximale varie selon votre plan : Gratuit (50 MB), Starter (100 MB), Pro (200 MB), Enterprise (500 MB).',
    category: 'upload',
    tags: ['formats', 'taille', 'limites']
  },
  {
    id: '3',
    question: 'Comment fonctionne la génération de musique IA ?',
    answer: 'Notre IA utilise les modèles Suno V4.5, V4.5+ et V5. Vous pouvez générer de la musique en mode Simple (prompt basique) ou Custom (paramètres avancés). Les générations sont gratuites et illimitées pour tous les utilisateurs.',
    category: 'ia',
    tags: ['suno', 'génération', 'gratuit']
  },
  {
    id: '4',
    question: 'Puis-je changer de plan d\'abonnement ?',
    answer: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment depuis la page Abonnements. Les changements prennent effet immédiatement. En cas de downgrade, vos limites seront ajustées au prochain cycle de facturation.',
    category: 'abonnement',
    tags: ['changement', 'upgrade', 'downgrade']
  },
  {
    id: '5',
    question: 'Le player se ferme sur mobile, que faire ?',
    answer: 'Ce problème peut survenir sur iOS. Assurez-vous que l\'application est autorisée à jouer en arrière-plan dans les paramètres système. Redémarrez l\'application et vérifiez que vous utilisez la dernière version.',
    category: 'technique',
    tags: ['mobile', 'ios', 'arrière-plan']
  },
  {
    id: '6',
    question: 'Comment partager mes musiques ?',
    answer: 'Utilisez le bouton "Partager" dans le player (trois points ⋯). Cela génère un lien direct vers votre musique qui lancera automatiquement la lecture quand quelqu\'un l\'ouvre.',
    category: 'player',
    tags: ['partage', 'lien', 'lecture']
  },
  {
    id: '7',
    question: 'Mes musiques sont-elles protégées par des droits d\'auteur ?',
    answer: 'Oui, toutes les musiques uploadées passent par une vérification automatique des droits d\'auteur via AudD. Si un conflit est détecté, l\'upload sera bloqué pour protéger les créateurs.',
    category: 'upload',
    tags: ['droits', 'protection', 'audd']
  },
  {
    id: '8',
    question: 'Comment supprimer mon compte ?',
    answer: 'Contactez notre support à support@synaura.fr avec votre demande de suppression. Nous traiterons votre demande dans les 48h et supprimerons toutes vos données conformément au RGPD.',
    category: 'general',
    tags: ['compte', 'suppression', 'rgpd']
  }
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen w-full text-[var(--text)] pb-20">
      <div className="w-full p-2 sm:p-3">
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] backdrop-blur-xl max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex h-fit w-full flex-row items-center justify-between p-4 text-[var(--text)] max-md:p-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 bg-green-500/10 border border-green-500/20">
                <HelpCircle size={24} className="text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl max-md:text-lg font-bold">FAQ</h1>
                <p className="text-[var(--text-muted)] text-sm">Questions fréquemment posées</p>
              </div>
            </div>
          </div>

          {/* Recherche */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher dans la FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          {/* Catégories */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="text-sm">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liste des FAQ */}
          <div className="p-4">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune question trouvée</h3>
                <p className="text-[var(--text-muted)]">Essayez de modifier vos filtres ou votre recherche.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFAQs.map((faq) => {
                  const isExpanded = expandedItems.has(faq.id);
                  const CategoryIcon = categories.find(c => c.id === faq.category)?.icon || HelpCircle;
                  
                  return (
                    <motion.div
                      key={faq.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpanded(faq.id)}
                        className="w-full p-4 text-left hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-1.5 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 mt-0.5">
                              <CategoryIcon size={14} className="text-green-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-semibold mb-1 pr-4">
                                {faq.question}
                              </h3>
                              <div className="flex flex-wrap gap-1">
                                {faq.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-[var(--surface-3)] text-[var(--text-muted)] text-xs rounded-md"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp size={20} className="text-[var(--text-muted)]" />
                            ) : (
                              <ChevronDown size={20} className="text-[var(--text-muted)]" />
                            )}
                          </div>
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
                              <p className="text-[var(--text-muted)] leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contact support */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Vous ne trouvez pas votre réponse ?</h3>
              <p className="text-[var(--text-muted)] text-sm mb-3">
                Notre équipe support est là pour vous aider. Contactez-nous et nous vous répondrons rapidement.
              </p>
              <div className="flex gap-3">
                <a
                  href="mailto:support@synaura.fr"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all duration-200 text-sm"
                >
                  <MessageSquare size={14} />
                  Contacter le support
                </a>
                <a
                  href="/community/forum"
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] rounded-xl hover:bg-[var(--surface-4)] transition-colors text-sm"
                >
                  <MessageSquare size={14} />
                  Forum communautaire
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
