'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from '@/components/navigation/HandoffLink';
import { useSearchParams } from 'next/navigation';
import { useHandoffRouter as useRouter } from '@/hooks/useHandoffRouter';
import HandoffReturn from '@/components/navigation/HandoffReturn';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Film,
  Loader2,
  Sparkles,
  ListMusic,
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

type CreativeIntent = 'idea' | 'audio' | 'video' | 'together';
const CREATIVE_INTENTS = [
  { id: 'idea' as const, label: 'Une idée', icon: Sparkles },
  { id: 'audio' as const, label: 'Un son', icon: UploadCloud },
  { id: 'video' as const, label: 'Un Clip', icon: Film },
  { id: 'together' as const, label: 'Avec les autres', icon: Users },
];
const CREATIVE_PATHS = {
  idea: {
    kicker: 'De l’intention au premier rendu', title: 'Donne une forme à ce que tu entends.',
    text: 'Suno V6 est dans l’atelier. Quelques mots, une ambiance, des paroles : explore ton idée musicale, puis choisis les versions à partager. V6 Mini est accessible à tous ; V6 et Wild sont inclus dans les abonnements.',
    steps: ['Décrire une intention', 'Affiner le style', 'Écouter tes versions'],
    primary: { href: '/ai-generator', label: 'Ouvrir AI Generator' },
    alternatives: [{ href: '/posts?compose=true', label: 'Commencer par un post', text: 'Un texte, une image ou un son à partager.' }],
  },
  audio: {
    kicker: 'À partir d’un morceau', title: 'Un son est un point de départ.',
    text: 'Publie un fichier que tu as créé, ou prends une nouvelle direction avec un morceau dont le créateur autorise les variations.',
    steps: ['Choisir la source', 'Soigner la présentation', 'Décider de la diffusion'],
    primary: { href: '/upload', label: 'Importer un morceau' },
    alternatives: [{ href: '/create/variation', label: 'Créer une variation', text: 'Explorer les morceaux Synaura autorisés.' }],
  },
  video: {
    kicker: 'Un son, un point de vue', title: 'Fais vivre un instant en image.',
    text: 'Associe une vidéo verticale à un son Synaura. Choisis l’extrait et la légende : ton Clip garde sa propre identité.',
    steps: ['Ajouter ta vidéo', 'Choisir le son', 'Publier le Clip'],
    primary: { href: '/clips/new', label: 'Créer un Clip' },
    alternatives: [{ href: '/posts?compose=true', label: 'Partager autrement', text: 'Créer un post avec ton texte, ton image ou ton son.' }],
  },
  together: {
    kicker: 'La création se rencontre', title: 'Ce que tu cherches existe peut-être chez quelqu’un.',
    text: 'Une écoute attentive, une voix complémentaire, une autre version. Ouvre une conversation autour de ton projet.',
    steps: ['Présenter le projet', 'Préciser ta recherche', 'Échanger dans la communauté'],
    primary: { href: '/community?compose=true&category=collab', label: 'Chercher une collab' },
    alternatives: [
      { href: '/community?compose=true&category=feedback', label: 'Demander un avis', text: 'Un regard sur un morceau ou une idée.' },
      { href: '/community?compose=true&category=remix', label: 'Lancer un défi remix', text: 'Proposer une source à transformer.' },
    ],
  },
};

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="max-w-[1120px]">
          <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--v2-accent)]" />
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
  const [creativeIntent, setCreativeIntent] = useState<CreativeIntent>('idea');
  const creativePath = CREATIVE_PATHS[creativeIntent];
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
    <SynauraAppShell contentClassName="v2-create v2-creation chambre-signature-create !max-w-[1680px]">
      <SynauraTopBar searchLabel="Rechercher un son, un profil ou une playlist..." />
      <main className="v2-create-main chambre-create-hub">
        <header className="v2-create-intro">
          <div className="chambre-create-back"><HandoffReturn fallbackHref="/" fallbackLabel="Retour" /></div>
          {challengeId ? <CreateArrivalBanner context="challenge" title={challengeTitle} /> : null}
          <div className="chambre-create-manifesto"><p className="v2-kicker">Synaura / L’atelier</p><h1 className="v2-heading">FAIS<br /><span>VIBRER.</span></h1><p className="v2-intro">Pars de ce que tu as.<br />Choisis ton point de départ.</p></div>
          <div className="chambre-creation-material" aria-hidden="true"><img src="/brand/chambre/membrane-cobalt.png" alt="" decoding="async" /></div>
        </header>
        <div className="v2-create-composition">
          <section className="v2-create-intentions" aria-label="Point de départ créatif">
            <p className="v2-kicker">Qu’est-ce qui t’amène ?</p>
            <div className="v2-intent-choices" role="group" aria-label="Choisir une intention">
              {CREATIVE_INTENTS.map(({ id, label, icon: Icon }, index) => (
                <button key={id} type="button" aria-pressed={creativeIntent === id} aria-controls="creative-path" onClick={() => setCreativeIntent(id)} className="v2-intent-choice"><span className="v2-intent-number">0{index + 1}</span><Icon aria-hidden="true" size={19} /><span className="chambre-signature-intent-copy"><strong>{label}</strong><small>{CREATIVE_PATHS[id].kicker}</small></span><ArrowRight aria-hidden="true" size={17} /></button>
              ))}
            </div>
            {suggestion ? <Link href={withChallenge(suggestion.href)} className="v2-create-suggestion"><suggestion.icon size={16} aria-hidden="true" /><span><strong>{suggestion.title}</strong><small>{suggestion.text}</small></span></Link> : null}
          </section>
          <section className="v2-create-path" id="creative-path" aria-labelledby="creative-path-title" data-creative-intent={creativeIntent}>
            <div className="chambre-signature-intent-orbit" aria-hidden="true"><span /><span /><span /></div>
            <p className="v2-kicker">{creativePath.kicker}</p><h2 id="creative-path-title">{creativePath.title}</h2>
            <Link href={withChallenge(creativePath.primary.href)} className="v2-create-primary">{creativePath.primary.label}<ArrowRight size={18} aria-hidden="true" /></Link>
            <p className="v2-create-path-description">{creativePath.text}</p>
            <ol className="v2-create-sequence">{creativePath.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>)}</ol>
            <div className="v2-create-alternatives">{creativePath.alternatives.map((alternative) => <Link href={withChallenge(alternative.href)} key={alternative.href}><span><strong>{alternative.label}</strong><small>{alternative.text}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>)}</div>
          </section>
          <aside className="v2-create-studio">
            <span className="v2-kicker">Ton espace de travail</span>
            <div className="v2-create-studio-mark" aria-hidden="true"><span>INTENTION</span><span>VERSIONS</span><span>CRÉATION</span></div>
            <h2>Studio IDE</h2><p>Construis tes générations, retrouve tes sources et examine chaque résultat dans un espace de travail dédié.</p>
            <Link href={withChallenge('/studio')}>Ouvrir Studio IDE<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/ai-library" className="v2-create-library"><ListMusic size={16} aria-hidden="true" />Retrouver mes créations</Link>
          </aside>
        </div>
      </main>
    </SynauraAppShell>
  );
}
