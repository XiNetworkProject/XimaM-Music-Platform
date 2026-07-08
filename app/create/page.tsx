'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Film, Loader2, Sparkles, UploadCloud, Wand2 } from 'lucide-react';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';
import CreateArrivalBanner from '@/components/create/CreateArrivalBanner';
import type { CreatorIntentionId } from '@/lib/onboardingOptions';

type IntentionSuggestion = { href: string; title: string; text: string; icon: typeof Sparkles };

const INTENTION_SUGGESTIONS: Partial<Record<CreatorIntentionId, IntentionSuggestion>> = {
  create_ai: { href: '/ai-generator', title: "Créer avec l'IA", text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: Sparkles },
  publish: { href: '/upload', title: 'Publier un morceau', text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: UploadCloud },
  clips: { href: '/clips/new', title: 'Publier un Clip', text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: Film },
  remix: { href: '/create/variation', title: 'Créer une variation', text: 'Basé sur ce que tu as choisi à ton arrivée.', icon: Wand2 },
};
const INTENTION_PRIORITY: CreatorIntentionId[] = ['create_ai', 'publish', 'clips', 'remix'];

type SecondaryCard = {
  href: string;
  title: string;
  text: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
};

const SECONDARY_CARDS: SecondaryCard[] = [
  {
    href: '/upload',
    title: 'Publier un morceau',
    text: 'Partage un titre que tu as déjà créé.',
    icon: UploadCloud,
    color: '#C99B48',
    bg: 'rgba(201,155,72,0.12)',
  },
  {
    href: '/clips/new',
    title: 'Publier un Clip',
    text: 'Fais vivre un son avec une vidéo verticale.',
    icon: Film,
    color: '#D96D63',
    bg: 'rgba(217,109,99,0.10)',
  },
  {
    href: '/create/variation',
    title: 'Créer une variation',
    text: 'Transforme un morceau Synaura autorisé.',
    icon: Wand2,
    color: '#4A9EAA',
    bg: 'rgba(74,158,170,0.12)',
  },
];

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="max-w-[1120px]">
          <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#7357C6]" />
          </SynauraPanel>
        </SynauraAppShell>
      }
    >
      <CreateHubContent />
    </Suspense>
  );
}

function CreateHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [suggestion, setSuggestion] = useState<IntentionSuggestion | null>(null);
  const challengeId = searchParams.get('challengeId') || '';
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  const withChallenge = (href: string) => (challengeId ? `${href}?challengeId=${encodeURIComponent(challengeId)}` : href);

  useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    fetch(`/api/challenges/${encodeURIComponent(challengeId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (mounted && json?.challenge?.title) setChallengeTitle(json.challenge.title);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  // Si l'utilisateur arrive avec un contexte deja resolu (lien Remix/Clip existant qui
  // pointerait ici par erreur), on saute directement la bonne destination plutot que de
  // lui faire refaire un choix qu'il a deja fait.
  useEffect(() => {
    const intent = searchParams.get('intent');
    const sourceTrackId = searchParams.get('sourceTrackId') || searchParams.get('sourceTrack') || '';
    const sourceTrackType = searchParams.get('sourceTrackType') || 'track';
    if (!intent || !sourceTrackId) return;
    if (intent === 'variation') {
      router.replace(`/ai-generator?mode=remix&sourceTrackId=${encodeURIComponent(sourceTrackId)}&sourceTrackType=${encodeURIComponent(sourceTrackType)}`);
    } else if (intent === 'clip') {
      router.replace(`/clips/new?trackId=${encodeURIComponent(sourceTrackId)}&trackType=${encodeURIComponent(sourceTrackType)}`);
    }
  }, [router, searchParams]);

  // Suggestion discrete basee sur l'intention creative choisie a l'onboarding
  // (Personnaliser mes gouts). N'importe jamais les autres options du Hub.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let mounted = true;
    fetch('/api/user/preferences', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted) return;
        const intentions: string[] = Array.isArray(json?.preferences?.onboarding?.creatorIntentions)
          ? json.preferences.onboarding.creatorIntentions
          : [];
        const matched = INTENTION_PRIORITY.find((id) => intentions.includes(id));
        setSuggestion(matched ? INTENTION_SUGGESTIONS[matched] || null : null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [status]);

  return (
    <SynauraAppShell contentClassName="max-w-[1120px]">
      <SynauraTopBar searchLabel="Rechercher un son, un profil ou une playlist..." />
      <div className="space-y-4 pb-24">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-black/58 transition hover:bg-[#111111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au Scroll
        </Link>

        {challengeId ? <CreateArrivalBanner context="challenge" title={challengeTitle} /> : null}

        <div>
          <span className="inline-flex rounded-full bg-[#7357C6]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#7357C6]">
            Créer
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111111] sm:text-5xl">Qu&apos;est-ce qu&apos;on crée ?</h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-black/54">
            Choisis ton point de départ. Chaque option t&apos;amène directement là où il faut.
          </p>
        </div>

        {suggestion ? (
          <Link
            href={suggestion.href}
            className="group flex items-center gap-3 rounded-[1.2rem] border border-[#7357C6]/20 bg-[#7357C6]/[0.06] p-3.5 transition hover:bg-[#7357C6]/[0.1]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7357C6] text-white">
              <suggestion.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-[#171313]">{suggestion.title}</span>
              <span className="block text-xs font-semibold text-black/48">{suggestion.text}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#7357C6] transition group-hover:translate-x-0.5" />
          </Link>
        ) : null}

        <Link
          href={withChallenge('/ai-generator')}
          className="group block overflow-hidden rounded-[1.6rem] p-6 text-white transition sm:p-8"
          style={{ background: 'linear-gradient(135deg, #7357C6 0%, #5b3fa3 100%)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">
                <Sparkles className="h-3.5 w-3.5" />
                Studio IA
              </span>
              <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Créer avec l&apos;IA</h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-white/78">
                Imagine un morceau à partir d&apos;une idée.
              </p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/16 transition group-hover:bg-white/24">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </Link>

        <div className="grid gap-3 sm:grid-cols-3">
          {SECONDARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={withChallenge(card.href)}
                className="group rounded-[1.3rem] border border-black/[0.08] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(30,25,20,0.12)] sm:p-5"
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ backgroundColor: card.bg, color: card.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-black text-[#111111]">{card.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-black/50">{card.text}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </SynauraAppShell>
  );
}
