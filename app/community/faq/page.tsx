'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ChevronUp, HelpCircle, MessageSquare, Search, Sparkles } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  helpful_count?: number;
};

const CATEGORIES = [
  { id: 'all', label: 'Toutes' },
  { id: 'player', label: 'Player' },
  { id: 'upload', label: 'Publication' },
  { id: 'ia', label: 'Studio IA' },
  { id: 'abonnement', label: 'Abonnements' },
  { id: 'technique', label: 'Technique' },
  { id: 'general', label: 'Général' },
];

export default function CommunityFAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadFaq = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/community/faq?limit=100', { cache: 'no-store' });
        if (!response.ok) throw new Error('faq');
        const data = await response.json();
        setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
      } catch {
        notify.error('FAQ', 'Impossible de charger l’aide.');
      } finally {
        setLoading(false);
      }
    };
    loadFaq();
  }, []);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = category === 'all' || faq.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q) || (faq.tags || []).some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <SynauraAppShell contentClassName="max-w-[1080px]">
      <SynauraTopBar
        searchLabel="Chercher dans l’aide..."
        secondaryHref="/community/forum"
        secondaryLabel="Forum"
        primaryHref="/community/forum/new?category=feedback"
        primaryLabel="Demander un avis"
      />

      <div className="space-y-5 pb-28">
        <SynauraInkPanel className="p-5 sm:p-7">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:items-end">
            <div>
              <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/58 transition hover:bg-white/14 hover:text-white">
                ← Hub communauté
              </Link>
              <h1 className="mt-5 text-5xl font-black leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl">Besoin d’aide ?</h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/54 sm:text-base">
                La FAQ reste disponible, mais Community est d’abord un espace musical. Pour un avis, un feat ou un remix, passe par le forum.
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-[#fffaf2] p-4 text-[#171313]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-black/36">Chemin recommandé</p>
              <div className="mt-3 grid gap-2">
                <Link href="/community/forum/new?category=feedback" className="rounded-[1rem] bg-black/[0.045] p-3 text-sm font-black transition hover:bg-black/[0.07]">
                  Demander un avis sur mon son
                </Link>
                <Link href="/community/forum/new?category=remix" className="rounded-[1rem] bg-black/[0.045] p-3 text-sm font-black transition hover:bg-black/[0.07]">
                  Lancer un défi remix
                </Link>
              </div>
            </div>
          </div>
        </SynauraInkPanel>

        <SynauraPanel className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/36">Support secondaire</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">Articles utiles</h2>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/26" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une question..."
                className="h-11 w-full rounded-full border border-black/[0.08] bg-white pl-10 pr-4 text-sm font-semibold outline-none placeholder:text-black/28 focus:border-[#171313]"
              />
            </div>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 synaura-no-scrollbar">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${category === item.id ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/46 hover:bg-black/[0.08] hover:text-black'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid min-h-[260px] place-items-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
                <p className="mt-3 text-sm font-black text-black/42">Chargement de l’aide...</p>
              </div>
            </div>
          ) : filteredFaqs.length ? (
            <div className="grid gap-2.5">
              {filteredFaqs.map((faq) => {
                const isOpen = expanded.has(faq.id);
                return (
                  <div key={faq.id} className="overflow-hidden rounded-[1.25rem] border border-black/[0.07] bg-black/[0.025]">
                    <button type="button" onClick={() => toggle(faq.id)} className="flex w-full items-start justify-between gap-4 p-4 text-left">
                      <div>
                        <p className="text-sm font-black text-[#171313]">{faq.question}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-black/[0.055] px-2 py-0.5 text-[10px] font-black text-black/38">{faq.category}</span>
                          {(faq.tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-black/[0.035] px-2 py-0.5 text-[10px] font-bold text-black/30">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-black/34" /> : <ChevronDown className="h-4 w-4 shrink-0 text-black/34" />}
                    </button>
                    {isOpen ? (
                      <div className="border-t border-black/[0.06] px-4 pb-4 pt-3">
                        <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-black/56">{faq.answer}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-black/[0.12] p-8 text-center">
              <HelpCircle className="mx-auto h-10 w-10 text-black/22" />
              <p className="mt-3 text-sm font-black text-black/48">Aucun article trouvé.</p>
              <Link href="/community/forum" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                <MessageSquare className="h-4 w-4" />
                Poser sur le forum
              </Link>
            </div>
          )}
        </SynauraPanel>

        <SynauraInkPanel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Pas une question support ?</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Fais avancer ton morceau avec la communauté.</h2>
            </div>
            <Link href="/community/forum/new?category=feedback" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
              <Sparkles className="h-4 w-4" />
              Demander un avis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </SynauraInkPanel>
      </div>
    </SynauraAppShell>
  );
}
