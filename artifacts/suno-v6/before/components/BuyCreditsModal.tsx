'use client';

import { useMemo, useState } from 'react';
import { Check, Coins, Info, ShieldCheck, Sparkles, Wand2, X, Zap } from 'lucide-react';
import {
  CREDIT_PACKS,
  CREDITS_PER_GENERATION,
  getGenerationsFromCredits,
  packEurPerCredit,
} from '@/lib/billing/pricing';
import { UButton, UModal } from '@/components/ui/UnifiedUI';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} EUR`;
}

export default function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('populaire');
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => CREDIT_PACKS.find((p) => p.id === selectedPackId) || CREDIT_PACKS[2],
    [selectedPackId]
  );

  const selectedGenerations = getGenerationsFromCredits(selected.credits);
  const selectedVariants = selectedGenerations * 2;

  const onCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selected.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error || 'Erreur checkout');
      window.location.href = json.checkoutUrl as string;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UModal open={isOpen} onClose={onClose} zClass="z-[200]" size="full" showClose={false} className="!max-w-[860px]">
      <div className="relative overflow-hidden rounded-2xl bg-syn-surface text-syn-textPrimary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(201,155,72,0.10),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(74,158,170,0.08),transparent_32%)]" />

        <div className="relative grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="border-b border-syn-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-syn-accentGold/15 text-syn-accentGold">
                <Coins className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-syn-border bg-black/[0.03] p-2 text-syn-textSecondary transition hover:bg-black/[0.06] hover:text-syn-textPrimary"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-syn-accentGold">Studio fuel</div>
              <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.04em] sm:text-4xl">
                Credits pour creer sans casser le flow.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-syn-textSecondary">
                Chaque generation Suno debite {CREDITS_PER_GENERATION} credits et renvoie 2 variantes A/B dans le Studio.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-syn-border bg-syn-surfaceMuted p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-syn-textSecondary">Selection</div>
                <div className="mt-2 text-2xl font-black">{selected.credits.toLocaleString('fr-FR')}</div>
                <div className="text-xs text-syn-textSecondary">credits</div>
              </div>
              <div className="rounded-2xl border border-syn-accentBlue/20 bg-syn-accentBlue/[0.07] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-syn-accentBlue">Sorties</div>
                <div className="mt-2 text-2xl font-black">~{selectedVariants}</div>
                <div className="text-xs text-syn-accentBlue">variantes IA</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-syn-accentGold/20 bg-syn-accentGold/[0.07] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-syn-accentGold" />
                <p className="text-xs leading-5 text-syn-textSecondary">
                  Les previews arrivent vite, puis Synaura remplace automatiquement par le fichier final quand Suno termine.
                </p>
              </div>
            </div>
          </aside>

          <main className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-syn-textSecondary">Choisir un pack</div>
                <p className="mt-1 text-sm text-syn-textSecondary">Transparent, lisible, oriente Studio.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-syn-border bg-black/[0.03] px-3 py-2 text-xs text-syn-textSecondary">
                <Zap className="h-3.5 w-3.5 text-syn-accentGold" />
                V5.5 ready
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {CREDIT_PACKS.map((pack) => {
                const generations = getGenerationsFromCredits(pack.credits);
                const active = selectedPackId === pack.id;
                const centsPerCredit = packEurPerCredit(pack) * 100;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={[
                      'group relative overflow-hidden rounded-3xl border p-4 text-left transition',
                      active
                        ? 'border-syn-accentGold/45 bg-syn-accentGold/[0.10]'
                        : 'border-syn-border bg-black/[0.02] hover:border-black/[0.14] hover:bg-black/[0.04]',
                    ].join(' ')}
                  >
                    {active ? <div className="absolute inset-y-0 left-0 w-1 bg-syn-accentGold" /> : null}
                    <div className="flex items-center gap-4">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? 'bg-syn-accentGold text-white' : 'bg-black/[0.05] text-syn-textSecondary'}`}>
                        {active ? <Check className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black">{pack.label}</span>
                          {pack.badge ? (
                            <span className="rounded-full border border-syn-accentBlue/25 bg-syn-accentBlue/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-syn-accentBlue">
                              {pack.badge === 'meilleure_valeur' ? 'Best value' : 'Populaire'}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-syn-textSecondary">
                          {pack.credits.toLocaleString('fr-FR')} credits - ~{generations} generations - ~{generations * 2} variantes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black tabular-nums">{formatPrice(pack.priceEur)}</div>
                        <div className="text-[11px] text-syn-textSecondary">{centsPerCredit.toFixed(2)} c/credit</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-syn-border bg-black/[0.02] p-3">
                <Wand2 className="h-4 w-4 text-syn-textSecondary" />
                <div className="mt-2 text-xs font-semibold text-syn-textPrimary/80">Generation A/B</div>
                <div className="mt-1 text-[11px] leading-4 text-syn-textSecondary">Toujours 2 pistes par lancement.</div>
              </div>
              <div className="rounded-2xl border border-syn-border bg-black/[0.02] p-3">
                <Zap className="h-4 w-4 text-syn-textSecondary" />
                <div className="mt-2 text-xs font-semibold text-syn-textPrimary/80">Preview rapide</div>
                <div className="mt-1 text-[11px] leading-4 text-syn-textSecondary">Lecture des que Suno fournit le stream.</div>
              </div>
              <div className="rounded-2xl border border-syn-border bg-black/[0.02] p-3">
                <Info className="h-4 w-4 text-syn-textSecondary" />
                <div className="mt-2 text-xs font-semibold text-syn-textPrimary/80">Upgrade final</div>
                <div className="mt-1 text-[11px] leading-4 text-syn-textSecondary">L'audio final remplace la preview.</div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-syn-border bg-syn-surfaceMuted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-syn-textSecondary">Total</div>
                  <div className="text-2xl font-black">{formatPrice(selected.priceEur)}</div>
                </div>
                <UButton variant="primary" size="lg" onClick={onCheckout} disabled={loading} className="min-w-[210px] !rounded-2xl">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                      Redirection
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4" />
                      Acheter {selected.credits.toLocaleString('fr-FR')}
                    </>
                  )}
                </UButton>
              </div>
            </div>
          </main>
        </div>
      </div>
    </UModal>
  );
}
