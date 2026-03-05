'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Coins, Check, Zap, Info } from 'lucide-react';
import {
  CREDIT_PACKS,
  CREDITS_PER_GENERATION,
  getGenerationsFromCredits,
  packEurPerCredit,
} from '@/lib/billing/pricing';
import { useState } from 'react';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('populaire');
  const [loading, setLoading] = useState(false);

  const selected = CREDIT_PACKS.find(p => p.id === selectedPackId) || CREDIT_PACKS[2];

  const onCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selected.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error || 'Erreur');
      window.location.href = json.checkoutUrl as string;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-[92vw] max-w-[520px] rounded-3xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,.8)] overflow-hidden"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white/90">Acheter des crédits</h2>
                  <p className="text-[11px] text-white/35">1 génération = {CREDITS_PER_GENERATION} crédits</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Packs */}
            <div className="p-5 space-y-3">
              {CREDIT_PACKS.map((pack) => {
                const gens = getGenerationsFromCredits(pack.credits);
                const eurPerCredit = packEurPerCredit(pack);
                const active = selectedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={[
                      'relative w-full text-left rounded-2xl border p-4 transition-all duration-200',
                      active
                        ? 'border-transparent bg-gradient-to-r from-indigo-500/15 to-violet-500/15 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.3)]'
                        : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white/90">{pack.credits.toLocaleString()} crédits</span>
                          {pack.badge && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              pack.badge === 'populaire'
                                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/20'
                                : 'bg-violet-400/15 text-violet-300 border border-violet-400/20'
                            }`}>
                              {pack.badge === 'populaire' ? 'Populaire' : 'Meilleure valeur'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/35">
                          <span className="inline-flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            ≈ {gens} générations
                          </span>
                          <span>{(eurPerCredit * 100).toFixed(2)}¢/crédit</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white/90 tabular-nums">{pack.priceEur.toFixed(2)}€</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          active
                            ? 'border-indigo-400 bg-indigo-400'
                            : 'border-white/20 bg-transparent'
                        }`}>
                          {active && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                    {active && (
                      <div className="absolute -top-px -left-px -right-px -bottom-px rounded-2xl pointer-events-none bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/10 -z-10" />
                    )}
                  </button>
                );
              })}

              <div className="flex items-start gap-2 px-1 py-2 text-[11px] text-white/30">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Les abonnés Starter ou Pro bénéficient d&apos;un meilleur tarif par crédit avec leurs crédits mensuels inclus.</span>
              </div>

              <button
                onClick={onCheckout}
                disabled={loading}
                className="mt-2 w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirection…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Acheter {selected.credits.toLocaleString()} crédits — {selected.priceEur.toFixed(2)}€
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
