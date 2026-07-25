'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowRight,
  Film,
  Loader2,
  MessageCircle,
  PenSquare,
  Repeat2,
  Sparkles,
  UploadCloud,
  Users,
  Wand2,
} from 'lucide-react';
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
    href: '/posts?compose=true',
    title: 'Créer un post',
    text: 'Partage un texte, une image ou un son.',
    icon: PenSquare,
    color: '#7357C6',
    bg: 'rgba(115,87,198,0.12)',
  },
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

const COMMUNITY_ACTIONS: SecondaryCard[] = [
  {
    href: '/community?compose=true&category=feedback',
    title: 'Demander un avis',
    text: 'Obtiens des retours utiles.',
    icon: MessageCircle,
    color: '#D96D63',
    bg: 'rgba(217,109,99,0.10)',
  },
  {
    href: '/community?compose=true&category=collab',
    title: 'Chercher une collab',
    text: 'Trouve une voix, un beatmaker ou un feat.',
    icon: Users,
    color: '#7357C6',
    bg: 'rgba(115,87,198,0.12)',
  },
  {
    href: '/community?compose=true&category=remix',
    title: 'Lancer un défi remix',
    text: 'Propose une source à transformer.',
    icon: Repeat2,
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
  const withChallenge = (href: string) => {
    if (!challengeId) return href;
    const [pathname, query = ''] = href.split('?');
    const nextParams = new URLSearchParams(query);
    nextParams.set('challengeId', challengeId);
    return `${pathname}?${nextParams.toString()}`;
  };

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
    <SynauraAppShell contentClassName="max-w-[920px]">
      <SynauraTopBar searchLabel="Rechercher un son, un profil ou une playlist..." />
      <main className="space-y-4 pb-6">
        <header className="flex items-start gap-3 px-1 pt-1">
          <Link
            href="/"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-[var(--syn-border)] bg-[var(--syn-surface)] text-[var(--syn-text-secondary)] transition hover:text-[var(--syn-text-primary)]"
            aria-label="Retour à l'accueil"
            title="Retour à l'accueil"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase text-[var(--syn-text-secondary)]">Ton espace créatif</p>
            <h1 className="mt-1 text-3xl font-black text-[var(--syn-text-primary)]">Créer</h1>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">
              Commence par une idée, un fichier ou un morceau Synaura.
            </p>
          </div>
        </header>

        {challengeId ? <CreateArrivalBanner context="challenge" title={challengeTitle} /> : null}

        {suggestion ? (
          <Link
            href={suggestion.href}
            className="group flex items-center gap-3 rounded-[14px] border-l-[3px] border-[#7357C6] bg-[#7357C6]/[0.08] p-3 transition hover:bg-[#7357C6]/[0.12]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#7357C6] text-white">
              <suggestion.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-[var(--syn-text-primary)]">{suggestion.title}</span>
              <span className="block text-xs font-semibold text-[var(--syn-text-secondary)]">{suggestion.text}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#7357C6] transition group-hover:translate-x-0.5" />
          </Link>
        ) : null}

        <Link
          href={withChallenge('/ai-generator')}
          className="group block min-h-[246px] overflow-hidden rounded-[20px] border border-[#4A9EAA]/25 border-b-[3px] border-b-[#4A9EAA] p-5 text-white transition sm:p-6"
          style={{ background: 'linear-gradient(135deg, #111111 0%, #292431 52%, #1E3D40 100%)' }}
        >
          <div className="flex h-full min-h-[204px] flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-[#E7DBFF]">Studio IA</p>
                <p className="mt-1 text-xs font-bold text-white/50">Prêt à composer</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-white/14">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">Créer avec l&apos;IA</h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-white/60">
                Imagine un morceau à partir d&apos;une idée.
              </p>
              <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#F7F6F3] px-4 text-sm font-black text-[#111111]">
                Entrer dans le Studio
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>

        <div className="divide-y divide-[var(--syn-border)] border-y border-[var(--syn-border)]">
          {SECONDARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={withChallenge(card.href)}
                className="group flex min-h-[72px] items-center gap-3 px-1 py-2.5 transition hover:bg-[var(--syn-soft)]"
              >
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]"
                  style={{ backgroundColor: card.bg, color: card.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[var(--syn-text-primary)]">{card.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--syn-text-secondary)]">{card.text}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--syn-soft)] text-[var(--syn-text-primary)]">
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="px-1 pt-3">
          <h2 className="text-xl font-black text-[var(--syn-text-primary)]">Crée avec les autres</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">
            Demande un regard, trouve une collaboration ou lance un défi.
          </p>
        </div>

        <div className="divide-y divide-[var(--syn-border)] border-y border-[var(--syn-border)]">
          {COMMUNITY_ACTIONS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex min-h-[72px] items-center gap-3 px-1 py-2.5 transition hover:bg-[var(--syn-soft)]"
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]"
                  style={{ backgroundColor: card.bg, color: card.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[var(--syn-text-primary)]">{card.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--syn-text-secondary)]">{card.text}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--syn-soft)] text-[var(--syn-text-primary)]">
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </SynauraAppShell>
  );
}
