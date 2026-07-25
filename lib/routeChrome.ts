export type RouteChrome = {
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
  ]);
  const isImmersivePlayer = pathname.startsWith('/swipe');
  const isConversation = /^\/messages\/[^/]+/.test(pathname);
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
