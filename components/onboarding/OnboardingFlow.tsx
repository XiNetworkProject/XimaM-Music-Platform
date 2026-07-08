'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Film,
  Flame,
  Leaf,
  Mic2,
  Moon,
  Music2,
  Sparkles,
  UploadCloud,
  UserPlus,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import {
  CREATOR_INTENTIONS,
  ONBOARDING_UNIVERSES,
  deriveTasteFromUniverses,
  parseOnboardingPreferences,
  universeIdsFromTaste,
  type CreatorIntentionId,
  type OnboardingUniverseId,
} from '@/lib/onboardingOptions';

const UNIVERSE_ICON: Record<OnboardingUniverseId, typeof Music2> = {
  pop: Music2,
  rap: Mic2,
  electro: Zap,
  club: Flame,
  night: Moon,
  focus: Leaf,
  rock: Music2,
  ai: Sparkles,
};

const INTENTION_ICON: Record<CreatorIntentionId, typeof Compass> = {
  discover: Compass,
  follow: UserPlus,
  create_ai: Sparkles,
  publish: UploadCloud,
  clips: Film,
  remix: Wand2,
  collab: Users,
};

// Autorise uniquement un chemin interne sûr : un seul slash de tête, jamais de
// slash/backslash suivi immédiatement d'un autre (protocole-relatif) ni de
// backslash (certains navigateurs le normalisent en "//" avant résolution).
function safeTarget(value: string | null) {
  if (!value) return null;
  if (!/^\/(?!\/|\\)/.test(value)) return null;
  if (value.includes('\\')) return null;
  return value;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get('edit') === '1';
  const target = safeTarget(searchParams.get('callbackUrl')) || '/for-you';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEdit ? 2 : 1);
  const [universes, setUniverses] = useState<OnboardingUniverseId[]>([]);
  const [intentions, setIntentions] = useState<CreatorIntentionId[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/user/preferences', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted) return;
        const prefs = parseOnboardingPreferences(json?.preferences?.onboarding);
        if (isEdit) {
          setUniverses(universeIdsFromTaste(prefs.favoriteMoods, prefs.favoriteGenres));
          setIntentions(prefs.creatorIntentions);
        } else if (prefs.onboardingCompleted) {
          router.replace(target);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUniverse = (id: OnboardingUniverseId) => {
    setUniverses((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleIntention = (id: CreatorIntentionId) => {
    setIntentions((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const finish = async () => {
    setSaving(true);
    const { favoriteMoods, favoriteGenres } = deriveTasteFromUniverses(universes);
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding: {
            onboardingCompleted: true,
            favoriteMoods,
            favoriteGenres,
            creatorIntentions: intentions,
            completedAt: new Date().toISOString(),
          },
        }),
      });
    } catch {}
    router.replace(target);
  };

  const skipEverything = () => {
    setSaving(true);
    fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding: {
          onboardingCompleted: true,
          favoriteMoods: [],
          favoriteGenres: [],
          creatorIntentions: [],
          completedAt: new Date().toISOString(),
        },
      }),
    })
      .catch(() => {})
      .finally(() => router.replace(target));
  };

  const universeLabels = universes
    .map((id) => ONBOARDING_UNIVERSES.find((o) => o.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const intentionLabels = intentions
    .map((id) => CREATOR_INTENTIONS.find((c) => c.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F6F3]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/15 border-t-[#7357C6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] px-4 py-10 text-[#111111] sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((value) => (
            <span
              key={value}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: value === step ? 28 : 10,
                background: value <= step ? '#7357C6' : 'rgba(17,17,17,0.12)',
              }}
            />
          ))}
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_24px_80px_rgba(30,25,20,0.10)] sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7357C6]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#4A9EAA]/10 blur-3xl" />

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#7357C6]/10 text-[#7357C6]">
                  <Sparkles className="h-7 w-7" />
                </span>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Entre dans ton univers musical.</h1>
                <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-black/55">
                  Choisis ce que tu veux écouter, créer et faire évoluer sur Synaura.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#171313] px-7 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
                >
                  Personnaliser mon expérience
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={skipEverything}
                  disabled={saving}
                  className="mt-4 block w-full text-center text-xs font-black text-black/40 transition hover:text-black/70 disabled:opacity-50"
                >
                  Passer pour l&apos;instant
                </button>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative">
                <StepHeader
                  onBack={isEdit ? undefined : () => setStep(1)}
                  eyebrow="Étape 1 sur 2"
                  title="Tes univers"
                  subtitle="Choisis un ou plusieurs univers. Ça reste modifiable à tout moment."
                />
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ONBOARDING_UNIVERSES.map((option) => {
                    const Icon = UNIVERSE_ICON[option.id];
                    const active = universes.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleUniverse(option.id)}
                        className="flex flex-col items-center gap-2 rounded-[1.4rem] border p-4 text-center transition"
                        style={{
                          borderColor: active ? '#7357C6' : 'rgba(17,17,17,0.08)',
                          background: active ? 'rgba(115,87,198,0.08)' : '#fff',
                        }}
                      >
                        <span
                          className="grid h-10 w-10 place-items-center rounded-2xl"
                          style={{ background: active ? '#7357C6' : 'rgba(17,17,17,0.06)', color: active ? '#fff' : '#111' }}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-black leading-tight">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-xs font-semibold text-black/40">
                  Choisis au moins un univers pour un Pour toi plus précis (facultatif).
                </p>
                <StepFooter onContinue={() => setStep(3)} onSkip={() => setStep(3)} continueLabel="Continuer" />
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative">
                <StepHeader
                  onBack={() => setStep(2)}
                  eyebrow="Étape 2 sur 2"
                  title="Ce que tu veux faire"
                  subtitle="Ça personnalise tes raccourcis. Rien n'est jamais caché définitivement."
                />
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {CREATOR_INTENTIONS.map((option) => {
                    const Icon = INTENTION_ICON[option.id];
                    const active = intentions.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleIntention(option.id)}
                        className="flex items-center gap-3 rounded-[1.2rem] border p-3.5 text-left transition"
                        style={{
                          borderColor: active ? '#7357C6' : 'rgba(17,17,17,0.08)',
                          background: active ? 'rgba(115,87,198,0.08)' : '#fff',
                        }}
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                          style={{ background: active ? '#7357C6' : 'rgba(17,17,17,0.06)', color: active ? '#fff' : '#111' }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-bold leading-snug">{option.label}</span>
                        {active ? <Check className="ml-auto h-4 w-4 shrink-0 text-[#7357C6]" /> : null}
                      </button>
                    );
                  })}
                </div>
                <StepFooter onContinue={() => setStep(4)} onSkip={() => setStep(4)} continueLabel="Continuer" />
              </motion.div>
            ) : null}

            {step === 4 ? (
              <motion.div key="step4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative">
                <StepHeader onBack={() => setStep(3)} eyebrow="Résumé" title="C'est prêt" subtitle="Tu peux modifier ces choix à tout moment depuis ton profil." />
                <div className="mt-6 space-y-3">
                  <div className="rounded-[1.2rem] border border-black/[0.08] bg-black/[0.02] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/40">Tes univers</p>
                    <p className="mt-1.5 text-sm font-bold text-[#171313]">
                      {universeLabels.length ? universeLabels.join(', ') : "Tu n'as choisi aucun univers pour l'instant."}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-black/[0.08] bg-black/[0.02] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/40">Tu veux surtout</p>
                    <p className="mt-1.5 text-sm font-bold text-[#171313]">
                      {intentionLabels.length ? intentionLabels.join(', ') : "Tu n'as encore rien précisé."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-7 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black disabled:opacity-60"
                >
                  {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ouvrir Pour toi'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  onBack,
  eyebrow,
  title,
  subtitle,
}: {
  onBack?: () => void;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/[0.05] px-3.5 text-xs font-black text-black/50 transition hover:bg-black hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </button>
      ) : null}
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7357C6]">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-black/50">{subtitle}</p>
    </div>
  );
}

function StepFooter({
  onContinue,
  onSkip,
  continueLabel,
}: {
  onContinue: () => void;
  onSkip: () => void;
  continueLabel: string;
}) {
  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={onContinue}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-7 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
      >
        {continueLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSkip} className="mt-3 block w-full text-center text-xs font-black text-black/40 transition hover:text-black/70">
        Passer cette étape
      </button>
    </div>
  );
}
