export type PrimaryWebNavId = 'home' | 'discover' | 'create' | 'library' | 'profile';

export const PRIMARY_WEB_NAV_ITEMS = [
  { id: 'home', label: 'Accueil', href: '/' },
  { id: 'discover', label: 'Découvrir', href: '/discover' },
  { id: 'create', label: 'Créer', href: null },
  { id: 'library', label: 'Bibliothèque', href: '/library' },
  { id: 'profile', label: 'Profil', href: null },
] as const satisfies ReadonlyArray<{
  id: PrimaryWebNavId;
  label: string;
  href: string | null;
}>;

const PRIMARY_ROUTE_PREFIXES: Record<PrimaryWebNavId, readonly string[]> = {
  home: ['/', '/swipe'],
  discover: ['/discover', '/radar', '/search'],
  create: ['/create', '/upload', '/publish', '/ai-generator', '/studio', '/clips/new', '/posts'],
  library: ['/library', '/playlists', '/album'],
  profile: ['/profile', '/settings', '/subscriptions', '/stats'],
};

export function isPrimaryWebRouteActive(id: PrimaryWebNavId, pathname: string | null) {
  if (!pathname) return id === 'home';
  if (id === 'home') return pathname === '/' || pathname.startsWith('/swipe');

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
