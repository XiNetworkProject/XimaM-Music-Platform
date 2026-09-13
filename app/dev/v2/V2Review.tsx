'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DISCOVER_MOODS } from '@/lib/discoverMoods';

const Live = dynamic(() => import('@/components/home/SynauraScroll'), { ssr: false });
const Prelude = dynamic(() => import('@/components/home/HomeFlowPrelude'), { ssr: false });
const Discover = dynamic(() => import('@/app/discover/DiscoverClient'), { ssr: false });
const Track = dynamic(() => import('@/app/track/[id]/TrackPageClient'), { ssr: false });
const WORKSPACES = {
  ai: dynamic(() => import('@/app/ai-generator/page'), { ssr: false }),
  studio: dynamic(() => import('@/app/studio/StudioClient'), { ssr: false }),
  upload: dynamic(() => import('@/app/upload/page'), { ssr: false }),
  library: dynamic(() => import('@/app/library/LibraryClient'), { ssr: false }),
  messages: dynamic(() => import('@/app/messages/page'), { ssr: false }),
  settings: dynamic(() => import('@/app/settings/SettingsClient'), { ssr: false }),
};

/** Component review only. Canonical SSR pages and their authentication are never bypassed. */
export default function V2Review() {
  const query = useSearchParams();
  const surface = query.get('surface');
  const [tracks, setTracks] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reviewAction, setReviewAction] = useState('Aucune action de revue');
  useEffect(() => {
    const controller = new AbortController();
    // Public read-only catalog; no fixture, session override or private query.
    fetch('/api/ranking/feed?limit=18&ai=1&strategy=fresh', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Selection unavailable');
      const data = await response.json();
      if (!controller.signal.aborted) setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  const track = tracks?.[0];
  const Workspace = WORKSPACES[surface as keyof typeof WORKSPACES];
  const known = ['live', 'prelude', 'discover', 'track'].includes(surface || '') || Boolean(Workspace);
  return <div className="v2-component-review" data-review-surface={surface || 'index'}>
    <aside className="v2-review-notice" role="note" title="Revue de composants réels uniquement. Catalogue public éventuellement en cache. Authentification serveur et parcours complets NON VALIDÉS ici." style={{ width: 'max-content', maxWidth: 'calc(100vw - 24px)', fontSize: 9, padding: '3px 7px' }}><Link href="/dev/v2">Revue Chambre</Link> · Composants seuls · SSR/parcours NON VALIDÉS</aside>
    {!known ? <main className="v2-page"><p className="v2-kicker">Candidate locale, non déployée</p><h1 className="v2-heading mt-6">LA CHAMBRE.<br />TOUT UN UNIVERS.</h1><p className="v2-intro my-6">Revue des vrais composants avec le catalogue public, éventuellement en cache. Aucun compte simulé : les espaces connectés gardent leur contrôle d’accès. Les sélections de démonstration de Découvrir partagent ici le même échantillon ; elles ne valident pas les classements serveur.</p><nav aria-label="Surfaces de revue" className="flex flex-wrap gap-3">{['live', 'discover', 'track', ...Object.keys(WORKSPACES)].map(name => <Link key={name} href={`/dev/v2?surface=${name}`} className="v2-action">{name}</Link>)}</nav><h2 className="mt-12 text-2xl">Parcours de l’application</h2><nav className="mt-5 flex flex-wrap gap-4">{['','enter','create','publish','ai-generator','ai-library','studio','library','messages','notifications','settings','community','support','subscriptions','legal','download'].map(name => <Link key={name} href={`/${name}`} className="v2-action">{name || 'Entrée immersive'}</Link>)}</nav><p className="v2-metadata mt-8">Cette page renvoie 404 dans un build production. Authentification serveur et parcours complets NON VALIDÉS. Aucune validation Android/Gboard ou NVDA réelle n’est déduite de ce laboratoire.</p></main>
      : Workspace ? <Workspace />
      : surface === 'live' ? <Live />
      : failed ? <div className="v2-empty" role="status">La sélection locale est indisponible. Un environnement de test connecté est nécessaire.</div>
      : !tracks ? <div className="v2-empty" role="status">Chargement de la sélection de revue…</div>
      : surface === 'prelude' ? <>
        <p role="status" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: '#030508', color: '#f3f6fc', padding: 6, fontSize: 10, textAlign: 'center', pointerEvents: 'none' }}>Composition seule · catalogue public · pas de lecture ou navigation · {reviewAction}</p>
        <Prelude open tracks={tracks} posts={[]} currentTrack={track} currentPlaying={false}
          onEnterFlow={() => setReviewAction('Ouvrir le Flow')}
          onPlayTrack={item => setReviewAction(`Écouter : ${item.title}`)}
          onOpenTrack={item => setReviewAction(`Morceau : ${item.title}`)}
          onOpenPost={() => setReviewAction('Publication')}
          onSearch={() => setReviewAction('Recherche')}
          onNotifications={() => setReviewAction('Notifications')}
          onDiscover={() => setReviewAction('Découvrir')}
          onRadar={() => setReviewAction('Radar')}
          onStudio={() => setReviewAction('Studio')}
          onEvents={() => setReviewAction('Événements')} />
      </>
      : surface === 'discover' ? <Discover initialMood={null} radarTracks={tracks} newestTracks={tracks} hiddenTracks={tracks} popularTracks={tracks} totalTracks={tracks.length} moodPreviews={Object.fromEntries(DISCOVER_MOODS.map(mood => [mood.id, tracks.map(t => t.coverUrl).filter(Boolean)]))} collections={[]} artists={[]} />
      : <Track track={track ? { ...track, id: track._id, artist: track.artist?.name || track.artist?.artistName || track.artist?.username || 'Créateur', artistUsername: track.artist?.username || '', artistAvatar: track.artist?.avatar || null, creatorId: track.artist?._id, coverUrl: track.coverUrl || null, likes: Array.isArray(track.likes) ? track.likes.length : track.likes || 0, isAI: track._id.startsWith('ai-') } : null} />}
  </div>;
}
