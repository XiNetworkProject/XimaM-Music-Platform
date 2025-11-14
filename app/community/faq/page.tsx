'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Search,
  MessageSquare,
  Lightbulb,
  Bug,
  Settings,
  Sparkles,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'player' | 'upload' | 'abonnement' | 'ia' | 'technique';
  tags: string[];
  helpful_count: number;
  created_at: string;
}

const categories = [
  { id: 'all', label: 'Toutes', icon: HelpCircle },
  { id: 'general', label: 'Général', icon: MessageSquare },
  { id: 'player', label: 'Player', icon: Settings },
  { id: 'upload', label: 'Upload', icon: Lightbulb },
  { id: 'abonnement', label: 'Abonnements', icon: Settings },
  { id: 'ia', label: 'IA', icon: Sparkles },
  { id: 'technique', label: 'Technique', icon: Bug },
] as const;

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les FAQ depuis l'API
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/community/faq?limit=100');
        if (response.ok) {
          const data = await response.json();
          setFaqs(data.faqs || []);
        } else {
          toast.error('Erreur lors du chargement des FAQ');
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des FAQ');
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="relative min-h-screen text-white pb-20">
      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 md:px-8 py-6 md:py-10">
        {/* Carte globale */}
        <div className="rounded-3xl border border-white/10 bg-transparent backdrop-blur-xl overflow-hidden">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="relative mt-1">
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/75 blur-xl opacity-70" />
                <div className="relative w-10 h-10 rounded-2xl bg-black/70 border border-white/15 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">
                  Synaura
                </p>
                <h1 className="text-xl md:text-2xl font-semibold">Centre d&apos;aide</h1>
                <p className="text-xs md:text-sm text-white/65 mt-1 max-w-xl">
                  FAQ officielle de Synaura : lecture, upload, IA, abonnements et
                  questions techniques. Commencez par une recherche ou naviguez par
                  catégorie.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-2 text-[11px] text-white/60">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {faqs.length > 0
                    ? `${faqs.length} article${faqs.length > 1 ? 's' : ''} d’aide`
                    : 'FAQ en cours de construction'}
                </span>
              </div>
              <span className="hidden md:inline">
                Pour des échanges plus détaillés, utilisez le forum communauté.
              </span>
            </div>
          </div>

          {/* RECHERCHE */}
          <div className="px-4 md:px-6 py-4 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une question (lecture, upload, IA, abonnements, bugs...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-300/70"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/60 hover:text-white"
                >
                  Effacer
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-[11px] text-white/50">
                Résultats pour : <span className="text-white/80">{searchQuery}</span>
              </p>
            )}
          </div>

          {/* CATÉGORIES */}
          <div className="px-4 md:px-6 py-3 border-b border-white/10">
            <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {categories.map((category) => {
                const Icon = category.icon;
                const active = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                      active
                        ? 'bg-emerald-500/30 text-emerald-50 border border-emerald-400/70 shadow-[0_0_18px_rgba(16,185,129,0.7)]'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENU FAQ */}
          <div className="px-4 md:px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <p className="text-sm text-white/70">
                  Chargement des questions fréquentes...
                </p>
              </div>
            ) : filteredFAQs.length === 0 ? (
              <div className="text-center py-10">
                <HelpCircle className="w-10 h-10 mx-auto text-white/30 mb-3" />
                <h3 className="text-sm font-semibold mb-1">
                  Aucune question trouvée
                </h3>
                <p className="text-xs text-white/60 mb-3">
                  Essaye de modifier tes filtres ou ta recherche.
                </p>
                <a
                  href="/community/forum"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:scale-[1.03] active:scale-100 transition-transform shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Poser la question sur le forum</span>
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFAQs.map((faq, index) => {
                  const isExpanded = expandedItems.has(faq.id);
                  const CategoryIcon =
                    categories.find((c) => c.id === faq.category)?.icon ||
                    HelpCircle;

                  return (
                    <motion.div
                      key={faq.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpanded(faq.id)}
                        className="w-full px-3.5 md:px-4 py-3 text-left hover:bg-white/8 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/25 to-blue-500/25 border border-emerald-400/60 mt-0.5">
                              <CategoryIcon className="w-3.5 h-3.5 text-emerald-100" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm md:text-[15px] font-semibold text-white pr-4">
                                  {faq.question}
                                </h3>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-white/55">
                                {faq.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/15"
                                  >
                                    <Tag className="w-2.5 h-2.5" />
                                    <span>#{tag}</span>
                                  </span>
                                ))}
                                {faq.helpful_count > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/60 text-emerald-100">
                                    {faq.helpful_count} utile
                                    {faq.helpful_count > 1 ? 's' : ''}
                                  </span>
                                )}
                                {faq.created_at && (
                                  <span className="ml-auto text-[10px] text-white/40">
                                    Maj : {formatDate(faq.created_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 mt-1">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-white/60" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-white/60" />
                            )}
                          </div>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3.5 md:px-4 pb-4 pt-2 border-t border-white/10">
                              <p className="text-xs md:text-sm text-white/75 leading-relaxed">
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

          {/* CTA SUPPORT / FORUM */}
          <div className="px-4 md:px-6 py-4 border-t border-white/10 bg-white/5">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/15 via-blue-500/15 to-purple-500/15 border border-emerald-400/40 p-4 md:p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-white mb-1">
                    Tu ne trouves toujours pas ta réponse ?
                  </h3>
                  <p className="text-xs md:text-sm text-white/70 max-w-xl">
                    Pas de stress : contacte le support ou ouvre un sujet sur le forum.
                    Ça nous aide aussi à améliorer la FAQ.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="mailto:support@synaura.fr"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs md:text-sm font-semibold shadow-lg hover:scale-[1.03] active:scale-100 transition-transform"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Contacter le support</span>
                  </a>
                  <a
                    href="/community/forum"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/25 text-xs md:text-sm text-white hover:bg-black/60 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Aller sur le forum</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
}
