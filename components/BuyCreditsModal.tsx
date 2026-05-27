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
      <div className="relative overflow-hidden rounded-2xl bg-[#080705] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,219,153,0.28),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(56,189,248,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/10 bg-white/[0.04] blur-sm" />

        <div className="relative grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-200 text-black shadow-[0_0_40px_rgba(253,230,138,0.25)]">
                <Coins className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/60">Studio fuel</div>
              <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.04em] sm:text-4xl">
                Credits pour creer sans casser le flow.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
                Chaque generation Suno debite {CREDITS_PER_GENERATION} credits et renvoie 2 variantes A/B dans le Studio.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">Selection</div>
                <div className="mt-2 text-2xl font-black">{selected.credits.toLocaleString('fr-FR')}</div>
                <div className="text-xs text-white/45">credits</div>
              </div>
              <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/55">Sorties</div>
                <div className="mt-2 text-2xl font-black">~{selectedVariants}</div>
                <div className="text-xs text-cyan-100/55">variantes IA</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.07] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" />
                <p className="text-xs leading-5 text-amber-50/70">
                  Les previews arrivent vite, puis Synaura remplace automatiquement par le fichier final quand Suno termine.
                </p>
              </div>
            </div>
          </aside>

          <main className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/35">Choisir un pack</div>
                <p className="mt-1 text-sm text-white/55">Transparent, lisible, oriente Studio.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/55">
                <Zap className="h-3.5 w-3.5 text-amber-100" />
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
                        ? 'border-amber-100/45 bg-amber-100/[0.10] shadow-[0_18px_60px_rgba(251,191,36,0.12)]'
                        : 'border-white/10 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    {active ? <div className="absolute inset-y-0 left-0 w-1 bg-amber-100" /> : null}
                    <div className="flex items-center gap-4">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? 'bg-amber-100 text-black' : 'bg-white/[0.06] text-white/55'}`}>
                        {active ? <Check className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black">{pack.label}</span>
                          {pack.badge ? (
                            <span className="rounded-full border border-cyan-100/20 bg-cyan-100/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80">
                              {pack.badge === 'meilleure_valeur' ? 'Best value' : 'Populaire'}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-white/45">
                          {pack.credits.toLocaleString('fr-FR')} credits - ~{generations} generations - ~{generations * 2} variantes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black tabular-nums">{formatPrice(pack.priceEur)}</div>
                        <div className="text-[11px] text-white/35">{centsPerCredit.toFixed(2)} c/credit</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <Wand2 className="h-4 w-4 text-white/60" />
                <div className="mt-2 text-xs font-semibold text-white/80">Generation A/B</div>
                <div className="mt-1 text-[11px] leading-4 text-white/40">Toujours 2 pistes par lancement.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <Zap className="h-4 w-4 text-white/60" />
                <div className="mt-2 text-xs font-semibold text-white/80">Preview rapide</div>
                <div className="mt-1 text-[11px] leading-4 text-white/40">Lecture des que Suno fournit le stream.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <Info className="h-4 w-4 text-white/60" />
                <div className="mt-2 text-xs font-semibold text-white/80">Upgrade final</div>
                <div className="mt-1 text-[11px] leading-4 text-white/40">L'audio final remplace la preview.</div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-white/45">Total</div>
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
