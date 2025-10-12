'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { CREDIT_PACKS, getGenerationsFromCredits } from '@/lib/credits';
import { useState } from 'react';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('plus');
  const [loading, setLoading] = useState(false);

  const selected = CREDIT_PACKS.find(p => p.id === selectedPackId) || CREDIT_PACKS[1];

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
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-[92vw] max-w-[520px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-xl font-serif">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                Acheter des crédits
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Packs */}
            <div className="p-4 grid gap-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">1 génération = 12 crédits</p>
              {CREDIT_PACKS.map((pack) => {
                const gens = getGenerationsFromCredits(pack.displayedCredits);
                const active = selectedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      active ? 'border-white bg-white/5' : 'border-[var(--border)] hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{pack.displayedCredits.toLocaleString()} crédits {pack.bonusCredits > 0 && (
                          <span className="ml-2 text-xs text-green-400">(+{pack.bonusCredits} bonus)</span>
                        )}</div>
                        <div className="text-xs text-[var(--text-muted)]">≈ {gens} générations</div>
                      </div>
                      <div className="text-white font-bold">€{pack.priceEur.toFixed(2)}</div>
                    </div>
                    {pack.badge && (
                      <div className="mt-2 text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/20 text-white/80">
                        {pack.badge === 'populaire' ? 'Le plus populaire' : 'Meilleure valeur'}
                      </div>
                    )}
                  </button>
                );
              })}

              <button
                onClick={onCheckout}
                disabled={loading}
                className="mt-1 h-12 rounded-xl bg-white text-black font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Redirection…' : 'Continuer'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


