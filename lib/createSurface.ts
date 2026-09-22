import type { ContextSurfaceInput, ContextSurfaceEntry } from './contextSurfaces';

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
const liveToken = (value: string | null) => Boolean(value && /^live-[a-zA-Z0-9-]{1,90}$/.test(value));

/** Only the plain launcher is transient. Source-bound Clip/remix edges keep their routes. */
export function getCreateSurfaceInput(href: string, pathname: string): ContextSurfaceInput | null {
  if (!href.startsWith('/') || href.startsWith('//') || /[\\\u0000-\u0020]/.test(href)) return null;
  const url = new URL(href, 'https://create.invalid');
  if (url.pathname !== '/create' || url.hash || ['intent', 'sourceTrackId', 'sourceTrack', 'sourceTrackType'].some(key => url.searchParams.has(key))) return null;
  if (Array.from(url.searchParams.keys()).some(key => !['challengeId', 'liveReturn', 'pilotReview'].includes(key))) return null;
  const challenge = url.searchParams.get('challengeId');
  if (challenge && challenge.length > 240) return null;
  const token = url.searchParams.get('liveReturn');
  return {
    surface: 'create', entityType: 'creation', entityId: challenge || null, presentation: 'sheet',
    origin: /^\/(?:v2\/)?live$/.test(pathname) ? 'live' : /^\/(?:v2\/)?discover$/.test(pathname) ? 'discover' : pathname === '/search' ? 'search' : 'other',
    returnSnapshotId: liveToken(token) ? token : null,
  };
}

/** Cold URLs remain useful: show the launcher over Live, never an orphan hub page. */
export function getCreateRouteHref(params: Record<string, string | string[] | undefined>): string {
  const intent = first(params.intent);
  const source = first(params.sourceTrackId) || first(params.sourceTrack);
  const query = new URLSearchParams();
  let path = '/live';
  if (intent === 'variation' && source) {
    path = '/ai-generator'; query.set('mode', 'remix'); query.set('sourceTrackId', source); query.set('sourceTrackType', first(params.sourceTrackType) || 'track');
  } else if (intent === 'clip' && source) {
    path = '/clips/new'; query.set('trackId', source); query.set('trackType', first(params.sourceTrackType) || 'track');
  } else query.set('create', '1');
  const challenge = first(params.challengeId);
  if (challenge) query.set(path === '/live' ? 'createChallengeId' : 'challengeId', challenge);
  const token = first(params.liveReturn);
  if (liveToken(token)) query.set('liveReturn', token);
  if (first(params.pilotReview) === '1') query.set('pilotReview', '1');
  return `${path}?${query}`;
}

export function withCreateSurfaceContext(href: string, entry: Pick<ContextSurfaceEntry, 'entityId' | 'returnSnapshotId'>): string {
  const url = new URL(href, 'https://create.invalid');
  if (entry.entityId) url.searchParams.set('challengeId', entry.entityId);
  if (liveToken(entry.returnSnapshotId)) url.searchParams.set('liveReturn', entry.returnSnapshotId!);
  return url.pathname + url.search;
}

export const CREATE_TOOLS = [
  { id: 'ai', title: 'Créer avec l’IA', description: 'Une idée ou des paroles deviennent musique.', href: '/studio' },
  { id: 'upload', title: 'Importer un morceau', description: 'Publier un fichier audio déjà créé.', href: '/upload' },
  { id: 'clip', title: 'Publier un Clip', description: 'Une vidéo courte avec un son Synaura.', href: '/clips/new' },
  { id: 'collab', title: 'Trouver une collaboration', description: 'Proposer un projet à la communauté.', href: '/community?compose=true&category=collab' },
] as const;

export const CREATE_OTHER_TOOLS = [
  { id: 'variation', title: 'Créer une variation', href: '/create/variation' },
  { id: 'post', title: 'Écrire un post', href: '/posts?compose=true' },
  { id: 'feedback', title: 'Demander un avis', href: '/community?compose=true&category=feedback' },
  { id: 'remix', title: 'Lancer un défi remix', href: '/community?compose=true&category=remix' },
] as const;
