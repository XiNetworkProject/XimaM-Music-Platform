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
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '@/components/NotificationCenter';
import Link from 'next/link';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful_count: number;
  created_at: string;
}

const categories = [
  { id: 'all', label: 'Toutes', icon: HelpCircle },
  { id: 'general', label: 'General', icon: MessageSquare },
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

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/community/faq?limit=100');
        if (res.ok) {
          const data = await res.json();
          setFaqs(data.faqs || []);
        }
      } catch {
        notify.error('Erreur', 'Erreur chargement FAQ');
      } finally {
        setLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  const filteredFAQs = faqs.filter((faq) => {
    const matchCat = selectedCategory === 'all' || faq.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q) || faq.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0e] text-white overflow-hidden pb-24">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-600/[0.05] blur-[130px] animate-[synaura-blob1_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-teal-600/[0.04] blur-[130px] animate-[synaura-blob2_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-14">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/community" className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Centre d&apos;aide</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">FAQ</span>{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Synaura</span>
          </h1>
          <p className="text-sm text-white/40 mt-2 flex items-center gap-2">
            {faqs.length > 0 ? `${faqs.length} articles d'aide` : 'FAQ en construction'}
            <span className="text-white/15">|</span>
            <Link href="/community/forum" className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
              Poser sur le forum <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition-all"
          />
        </motion.div>

        {/* Categories */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1 mb-6 rounded-full bg-white/[0.04] p-0.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs whitespace-nowrap transition-all ${
                  active
                    ? 'bg-white/[0.1] text-white'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ items */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <p className="text-sm text-white/40">Chargement...</p>
            </div>
          ) : filteredFAQs.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="w-10 h-10 mx-auto text-white/15 mb-3" />
              <h3 className="text-sm font-bold mb-2">Aucun resultat</h3>
              <p className="text-xs text-white/35 mb-5">Modifiez votre recherche ou posez la question sur le forum</p>
              <Link href="/community/forum" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg">
                <MessageSquare className="w-4 h-4" />
                Poser sur le forum
              </Link>
            </div>
          ) : (
            filteredFAQs.map((faq, i) => {
              const isExpanded = expandedItems.has(faq.id);
              return (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] overflow-hidden hover:bg-white/[0.04] transition-all"
                >
                  <button onClick={() => toggleExpanded(faq.id)} className="w-full px-4 md:px-5 py-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white pr-4 leading-snug">{faq.question}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/30">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] capitalize">{faq.category}</span>
                          {faq.tags.map((tag) => (
                            <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
                              <Tag className="w-2.5 h-2.5" />#{tag}
                            </span>
                          ))}
                          {faq.helpful_count > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              {faq.helpful_count} utile{faq.helpful_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 md:px-5 pb-4 pt-2 border-t border-white/[0.06]">
                          <p className="text-xs md:text-sm text-white/55 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10">
          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold mb-1">Pas trouve votre reponse ?</h3>
                <p className="text-sm text-white/40">Contactez le support ou posez votre question sur le forum.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:contact.syn@synaura.fr"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold shadow-lg hover:bg-white/90 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Support
                </a>
                <Link
                  href="/community/forum"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] text-sm font-medium text-white/70 hover:bg-white/[0.1] transition-colors"
                >
                  Forum <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
