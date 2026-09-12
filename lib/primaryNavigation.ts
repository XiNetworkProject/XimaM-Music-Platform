export type PrimaryWebNavId = 'home' | 'discover' | 'create' | 'library' | 'profile';

export const PRIMARY_WEB_NAV_ITEMS = [
  { id: 'home', label: 'Accueil', href: '/live' },
  { id: 'discover', label: 'Découvrir', href: '/discover' },
  { id: 'create', label: 'Créer', href: null },
  { id: 'library', label: 'Bibliothèque', href: '/library' },
  { id: 'profile', label: 'Profil', href: null },
] as const satisfies ReadonlyArray<{
  id: PrimaryWebNavId;
  label: string;
  href: string | null;
}>;

/** Shared route inventory for secondary creation/social surfaces. */
export const SECONDARY_WEB_NAV_ITEMS = [
  { id: 'messages', label: 'Messages', href: '/messages' },
  { id: 'notifications', label: 'Notifications', href: '/notifications' },
  { id: 'community', label: 'Communauté', href: '/community' },
] as const;

/** Account destinations consumed by menus; profile is resolved per session. */
export const ACCOUNT_WEB_NAV_ITEMS = [
  { id: 'profile', label: 'Mon profil', href: null },
  { id: 'clip', label: 'Publier un clip', href: '/clips/new' },
  { id: 'studio', label: 'Créer avec l’IA', href: '/ai-generator' },
  { id: 'library', label: 'Bibliothèque', href: '/library' },
  { id: 'settings', label: 'Paramètres', href: '/settings' },
  { id: 'subscription', label: 'Abonnement', href: '/subscriptions' },
  { id: 'help', label: 'Aide et centre légal', href: '/legal' },
] as const;

const PRIMARY_ROUTE_PREFIXES: Record<PrimaryWebNavId, readonly string[]> = {
  home: ['/live', '/swipe'],
  discover: ['/discover', '/radar', '/search'],
  create: ['/create', '/upload', '/publish', '/ai-generator', '/studio', '/clips/new', '/posts'],
  library: ['/library', '/playlists', '/album'],
  profile: ['/profile', '/settings', '/subscriptions', '/stats'],
};

export function isPrimaryWebRouteActive(id: PrimaryWebNavId, pathname: string | null) {
  if (!pathname) return id === 'home';
  if (id === 'home') return pathname === '/live' || pathname.startsWith('/swipe');

  return PRIMARY_ROUTE_PREFIXES[id].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getWebProfileHref(username?: string | null, authenticated = false) {
  const normalized = username?.trim();
  if (normalized) return `/profile/${encodeURIComponent(normalized)}`;
  if (authenticated) return '/settings';
  return '/auth/signin?callbackUrl=%2F';
}

export function shouldShowPrimaryWebDock(pathname: string | null, currentUsername?: string | null) {
  if (!pathname) return false;
  if (pathname === '/discover' || pathname === '/library' || pathname === '/create') return true;
  const profileMatch = /^\/profile\/([^/]+)\/?$/.exec(pathname);
  if (!profileMatch || !currentUsername) return false;
  try {
    return decodeURIComponent(profileMatch[1]).toLocaleLowerCase('fr-FR') === currentUsername.toLocaleLowerCase('fr-FR');
  } catch {
    return profileMatch[1].toLowerCase() === currentUsername.toLowerCase();
  }
}
