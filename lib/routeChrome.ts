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

export function getRouteChrome(pathname: string | null): RouteChrome {
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

  const isHome = pathname === '/';
  const isAuth = pathname.startsWith('/auth');
  const isOnboarding = pathname.startsWith('/onboarding');
  const isMeteoFullscreen = pathname.includes('/meteo/login') || pathname.includes('/meteo/dashboard');
  const isSynauraSurface = startsWithAny(pathname, [
    '/discover',
    '/radar',
    '/library',
    '/upload',
    '/ai-generator',
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
  ]);
  const isImmersivePlayer = pathname.startsWith('/swipe');
  const isConversation = /^\/messages\/[^/]+/.test(pathname);
  const kind: RouteChromeKind = isAuth || isOnboarding
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
  const useFullScreenLayout = isHome || isAuth || isOnboarding || isMeteoFullscreen || isSynauraSurface;
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
    suppressGlobalPlayerPadding: isAuth || isOnboarding || pathname.startsWith('/ai-generator') || pathname.startsWith('/studio') || pathname.startsWith('/city') || isImmersivePlayer || isConversation,
    showGlobalShutdownNotice: !useFullScreenLayout,
  };
}

export function shouldRenderGlobalMiniPlayer(pathname: string | null) {
  if (!pathname) return true;
  if (pathname === '/' || pathname.startsWith('/swipe')) return false;
  if (pathname.startsWith('/notifications')) return false;
  if (/^\/messages\/[^/]+/.test(pathname)) return false;
  if (pathname.startsWith('/upload')) return false;
  if (pathname.startsWith('/clips/new')) return false;
  if (pathname.startsWith('/create/variation') || pathname === '/create') return false;
  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) return false;
  return true;
}
