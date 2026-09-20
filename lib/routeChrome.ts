export type RouteChromeKind = 'immersive' | 'standard' | 'wide' | 'studio' | 'auth-public' | 'subproduct' | 'admin';

export type RouteChrome = {
  kind: RouteChromeKind;
  showSidebar: boolean;
  showTopSearch: boolean;
  showBottomNav: boolean;
  useFullScreenLayout: boolean;
  suppressGlobalPlayerPadding: boolean;
  showGlobalShutdownNotice: boolean;
};

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

/** Opt-in local product study; similarly named routes keep their existing chrome. */
export function isChamberProductRoute(pathname: string | null | undefined) {
  return pathname === '/dev/chambre' || Boolean(pathname?.startsWith('/dev/chambre/'));
}

/** Validated Live/Discover plus preview aliases; other routes keep their chrome. */
export function isV2PilotRoute(pathname: string | null | undefined) {
  return pathname === '/live' || pathname === '/discover' || pathname === '/v2' || pathname === '/v2/live' || pathname === '/v2/discover';
}

export function getRouteChrome(pathname: string | null): RouteChrome {
  if (process.env.NODE_ENV !== 'production' && pathname === '/dev/studio') return getRouteChrome('/studio');
  if (!pathname) {
    return {
      kind: 'standard',
      showSidebar: true,
      showTopSearch: true,
      showBottomNav: true,
      useFullScreenLayout: false,
      suppressGlobalPlayerPadding: false,
      showGlobalShutdownNotice: true,
    };
  }

  if (isChamberProductRoute(pathname) || isV2PilotRoute(pathname)) {
    return {
      kind: 'immersive',
      showSidebar: false,
      showTopSearch: false,
      showBottomNav: false,
      useFullScreenLayout: true,
      suppressGlobalPlayerPadding: true,
      showGlobalShutdownNotice: false,
    };
  }

  const isHome = pathname === '/' || pathname === '/live';
  const isAuth = pathname.startsWith('/auth');
  const isOnboarding = pathname.startsWith('/onboarding');
  const isPublicEntry = pathname.startsWith('/enter') || pathname.startsWith('/landing');
  const isMeteoFullscreen = pathname.includes('/meteo/login') || pathname.includes('/meteo/dashboard');
  const isSynauraSurface = pathname === '/publish' || startsWithAny(pathname, [
    '/discover',
    '/radar',
    '/library',
    '/upload',
    '/ai-generator',
    '/ai-library',
    '/studio',
    '/create',
    '/posts',
    '/profile',
    '/track',
    '/playlists',
    '/album',
    '/settings',
    '/stats',
    '/search',
    '/notifications',
    '/messages',
    '/join',
    '/subscriptions',
    '/swipe',
    '/city',
    '/community',
    '/download',
    '/dev/ui',
    '/dev/v2',
  ]);
  const isImmersivePlayer = pathname.startsWith('/swipe');
  const isConversation = /^\/messages\/[^/]+/.test(pathname);
  const kind: RouteChromeKind = isAuth || isOnboarding || isPublicEntry
    ? 'auth-public'
    : pathname.startsWith('/admin')
      ? 'admin'
      : pathname.startsWith('/meteo') || pathname.startsWith('/star-academy-tiktok')
        ? 'subproduct'
        : pathname.startsWith('/studio') || pathname.startsWith('/ai-generator')
          ? 'studio'
          : isHome || isImmersivePlayer || isConversation
            ? 'immersive'
            : startsWithAny(pathname, ['/discover', '/library', '/profile', '/track', '/playlists', '/community', '/messages', '/dev/ui'])
              ? 'wide'
              : 'standard';
  const useFullScreenLayout = isHome || isAuth || isOnboarding || isPublicEntry || isMeteoFullscreen || isSynauraSurface;
  const hideTopSearch = startsWithAny(pathname, [
    '/discover',
    '/radar',
    '/ai-generator',
    '/studio',
    '/library',
    '/boosters',
    '/star-academy-tiktok',
    '/messages',
  ]);

  return {
    kind,
    showSidebar: !useFullScreenLayout,
    showTopSearch: !useFullScreenLayout && !hideTopSearch,
    showBottomNav: !useFullScreenLayout,
    useFullScreenLayout,
    suppressGlobalPlayerPadding: isAuth || isOnboarding || isPublicEntry || pathname.startsWith('/ai-generator') || pathname.startsWith('/studio') || pathname.startsWith('/city') || isImmersivePlayer || isConversation,
    showGlobalShutdownNotice: !useFullScreenLayout,
  };
}

export function shouldRenderGlobalMiniPlayer(pathname: string | null) {
  if (!pathname) return true;
  if (isChamberProductRoute(pathname) || isV2PilotRoute(pathname)) return false;
  if (pathname === '/' || pathname === '/live' || pathname.startsWith('/swipe')) return false;
  if (/^\/messages\/[^/]+/.test(pathname)) return false;
  if (pathname.startsWith('/upload')) return false;
  if (pathname.startsWith('/clips/new')) return false;
  if (pathname.startsWith('/create/variation') || pathname === '/create') return false;
  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding') || pathname.startsWith('/enter') || pathname.startsWith('/landing')) return false;
  return true;
}
