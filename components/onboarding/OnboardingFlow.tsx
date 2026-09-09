'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Compass, Film, Flame, Leaf, Mic2, Moon, Music2, Sparkles, UploadCloud, UserPlus, Users, Wand2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SynauraButton } from '@/components/ui/SynauraPrimitives';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import { safeEntryTarget } from '@/lib/entryRouting';
import { CREATOR_INTENTIONS, ONBOARDING_UNIVERSES, deriveTasteFromUniverses, parseOnboardingPreferences, universeIdsFromTaste, type CreatorIntentionId, type OnboardingUniverseId } from '@/lib/onboardingOptions';

const UNIVERSE_ICON: Record<OnboardingUniverseId, typeof Music2> = { pop: Music2, rap: Mic2, electro: Zap, club: Flame, night: Moon, focus: Leaf, rock: Music2, ai: Sparkles };
const INTENTION_ICON: Record<CreatorIntentionId, typeof Compass> = { discover: Compass, follow: UserPlus, create_ai: Sparkles, publish: UploadCloud, clips: Film, remix: Wand2, collab: Users };

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduced = Boolean(useReducedMotion());
  const isEdit = searchParams.get('edit') === '1';
  const target = safeEntryTarget(searchParams.get('callbackUrl'), '/live');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEdit ? 2 : 1);
  const [universes, setUniverses] = useState<OnboardingUniverseId[]>([]);
  const [intentions, setIntentions] = useState<CreatorIntentionId[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    recordEntryEvent('onboarding_start', { edit: isEdit });
    let mounted = true;
    fetch('/api/user/preferences', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Impossible de charger tes préférences.');
        return response.json();
      })
      .then((json) => {
        if (!mounted) return;
        const preferences = parseOnboardingPreferences(json?.preferences?.onboarding);
        if (isEdit) {
          setUniverses(universeIdsFromTaste(preferences.favoriteMoods, preferences.favoriteGenres));
          setIntentions(preferences.creatorIntentions);
        } else if (preferences.onboardingCompleted) router.replace(target);
      })
      .catch((caught) => { if (mounted) setError(caught instanceof Error ? caught.message : 'Chargement impossible.'); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [isEdit, router, target]);

  const save = async (empty = false) => {
    setSaving(true);
    setError('');
    const taste = empty ? { favoriteMoods: [], favoriteGenres: [] } : deriveTasteFromUniverses(universes);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding: { onboardingCompleted: true, ...taste, creatorIntentions: empty ? [] : intentions, completedAt: new Date().toISOString() } }),
      });
      if (!response.ok) throw new Error('Impossible d’enregistrer tes choix. Réessaie.');
      recordEntryEvent('onboarding_complete', { skipped: empty, universes: empty ? 0 : universes.length, intentions: empty ? 0 : intentions.length });
      setTransitioning(true);
      window.setTimeout(() => router.replace(target), reduced ? 80 : 420);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
      setSaving(false);
    }
  };

  if (!ready || transitioning) {
    return (
      <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[var(--syn-background)] px-6 text-center text-[var(--syn-text-primary)]" aria-busy="true">
        <div className="absolute h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(217,109,99,.36),rgba(115,87,198,.28)_35%,rgba(74,158,170,.16)_56%,transparent_72%)]" />
        <div className="relative"><Image src="/favicon.svg" alt="" width={80} height={80} className="mx-auto" priority /><p className="mt-5 text-sm font-black text-[var(--syn-text-secondary)]">{transitioning ? 'Ton Aura prend forme…' : 'Synaura écoute tes préférences…'}</p></div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[var(--syn-background)] px-3 py-[max(env(safe-area-inset-top),0.75rem)] text-[var(--syn-text-primary)] sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[48rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_38%_32%,rgba(217,109,99,.3),rgba(115,87,198,.2)_38%,rgba(74,158,170,.12)_58%,transparent_72%)]" />
      <div className="relative mx-auto w-full max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-4 px-1">
          <span className="flex items-center gap-2 text-sm font-black"><Image src="/favicon.svg" alt="" width={30} height={30} /> Synaura</span>
          <span className="text-xs font-black text-[var(--syn-text-secondary)]">{step === 1 ? 'Bienvenue' : step === 4 ? 'Ton univers' : `${step - 1} / 2`}</span>
        </header>
        <div className="mb-3 flex gap-1.5" aria-label="Progression de l’onboarding">{[1,2,3,4].map((value) => <span key={value} className={`h-1.5 flex-1 rounded-full ${value <= step ? 'bg-[var(--syn-accent)]' : 'bg-[var(--syn-soft-strong)]'}`} />)}</div>
        <section className="relative min-h-[min(44rem,calc(100svh-7rem))] overflow-hidden rounded-[2rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-5 shadow-[var(--syn-shadow-high)] backdrop-blur-2xl sm:p-9">
          {error ? <div role="alert" className="mb-5 rounded-[var(--syn-radius-md)] bg-[color-mix(in_srgb,var(--syn-destructive)_12%,transparent)] p-3 text-sm font-bold text-[var(--syn-destructive)]">{error}</div> : null}
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 ? <motion.div key="welcome" {...motionProps(reduced)} className="flex min-h-[34rem] flex-col items-center justify-center text-center"><span className="grid h-20 w-20 place-items-center rounded-[1.8rem] border border-[var(--syn-border)] bg-[var(--syn-soft)] shadow-[var(--syn-glow-accent)]"><Sparkles className="h-8 w-8 text-[var(--syn-accent-coral)]" /></span><p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[var(--syn-accent-blue)]">Bienvenue dans Live Synaura</p><h1 className="mt-3 max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">Qu’est-ce qui te fait vibrer&nbsp;?</h1><p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-[var(--syn-text-secondary)]">Deux choix rapides suffisent pour orienter tes recommandations et tes raccourcis. Tout restera modifiable.</p><SynauraButton className="mt-8" size="lg" variant="accent" onClick={() => setStep(2)}>Façonner mon univers <ArrowRight className="h-4 w-4" /></SynauraButton><button type="button" disabled={saving} onClick={() => void save(true)} className="syn-interactive mt-3 min-h-11 rounded-full px-4 text-xs font-black text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)]">Passer pour l’instant</button></motion.div> : null}

            {step === 2 ? <motion.div key="tastes" {...motionProps(reduced)}><StepHeading eyebrow="1 · Tes couleurs" title="Quels univers t’attirent&nbsp;?" description="Ces choix alimentent les goûts déjà utilisés par Découvrir et les recommandations." /><div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{ONBOARDING_UNIVERSES.map((option) => { const Icon = UNIVERSE_ICON[option.id]; const active = universes.includes(option.id); return <button key={option.id} type="button" aria-pressed={active} onClick={() => setUniverses((current) => current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id])} className={`syn-interactive flex min-h-28 flex-col items-center justify-center gap-2 rounded-[var(--syn-radius-lg)] border p-3 text-center ${active ? 'border-[var(--syn-accent)] bg-[color-mix(in_srgb,var(--syn-accent)_14%,transparent)]' : 'border-[var(--syn-border)] bg-[var(--syn-soft)] hover:border-[var(--syn-accent)]'}`}><span className={`grid h-10 w-10 place-items-center rounded-2xl ${active ? 'bg-[var(--syn-accent)] text-white' : 'bg-[var(--syn-surface)]'}`}><Icon className="h-5 w-5" /></span><span className="text-xs font-black leading-tight">{option.label}</span>{active ? <Check className="h-3.5 w-3.5 text-[var(--syn-accent)]" /> : null}</button>; })}</div><StepActions onBack={isEdit ? undefined : () => setStep(1)} onNext={() => setStep(3)} /></motion.div> : null}

            {step === 3 ? <motion.div key="intentions" {...motionProps(reduced)}><StepHeading eyebrow="2 · Ton mouvement" title="Qu’as-tu envie de faire ici&nbsp;?" description="Ces intentions préparent tes raccourcis. Aucune fonction ne sera cachée." /><div className="mt-7 grid gap-2.5 sm:grid-cols-2">{CREATOR_INTENTIONS.map((option) => { const Icon = INTENTION_ICON[option.id]; const active = intentions.includes(option.id); return <button key={option.id} type="button" aria-pressed={active} onClick={() => setIntentions((current) => current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id])} className={`syn-interactive flex min-h-16 items-center gap-3 rounded-[var(--syn-radius-lg)] border p-3 text-left ${active ? 'border-[var(--syn-accent)] bg-[color-mix(in_srgb,var(--syn-accent)_14%,transparent)]' : 'border-[var(--syn-border)] bg-[var(--syn-soft)] hover:border-[var(--syn-accent)]'}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${active ? 'bg-[var(--syn-accent)] text-white' : 'bg-[var(--syn-surface)]'}`}><Icon className="h-4 w-4" /></span><span className="text-sm font-black">{option.label}</span>{active ? <Check className="ml-auto h-4 w-4 text-[var(--syn-accent)]" /> : null}</button>; })}</div><StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} /></motion.div> : null}

            {step === 4 ? <motion.div key="final" {...motionProps(reduced)} className="flex min-h-[34rem] flex-col items-center justify-center text-center"><div className="relative grid h-32 w-32 place-items-center"><motion.span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_36%_28%,rgba(255,255,255,.8),rgba(217,109,99,.7)_15%,rgba(115,87,198,.72)_48%,rgba(74,158,170,.58)_70%,transparent_73%)] shadow-[var(--syn-glow-accent)]" animate={reduced ? undefined : { scale: [0.96,1.04,0.96] }} transition={{ duration: 5, repeat: Infinity }} /><Image src="/favicon.svg" alt="" width={52} height={52} className="relative" /></div><p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[var(--syn-accent-coral)]">Ton Aura est prête</p><h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Entre dans Live Synaura.</h1><p className="mt-3 max-w-lg text-sm font-semibold text-[var(--syn-text-secondary)]">{universes.length ? `${universes.length} univers` : 'Aucun univers imposé'} · {intentions.length ? `${intentions.length} envies` : 'tu exploreras librement'}</p><SynauraButton className="mt-8" variant="accent" size="lg" loading={saving} onClick={() => void save(false)}>Faire vibrer mon univers <ArrowRight className="h-4 w-4" /></SynauraButton><button type="button" onClick={() => setStep(3)} className="syn-interactive mt-3 min-h-11 rounded-full px-4 text-xs font-black text-[var(--syn-text-secondary)]"><ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Modifier mes choix</button></motion.div> : null}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function motionProps(reduced: boolean) {
  return { initial: { opacity: 0, y: reduced ? 0 : 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduced ? 0 : -8 }, transition: { duration: reduced ? 0.12 : 0.24 } };
}

function StepHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--syn-accent-coral)]">{eyebrow}</p><h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.045em] sm:text-5xl" dangerouslySetInnerHTML={{ __html: title }} /><p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-[var(--syn-text-secondary)]">{description}</p></div>;
}

function StepActions({ onBack, onNext }: { onBack?: () => void; onNext: () => void }) {
  return <div className="mt-7 flex gap-2">{onBack ? <SynauraButton type="button" variant="secondary" size="lg" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour</SynauraButton> : null}<SynauraButton type="button" variant="accent" size="lg" fullWidth onClick={onNext}>Continuer <ArrowRight className="h-4 w-4" /></SynauraButton></div>;
}
