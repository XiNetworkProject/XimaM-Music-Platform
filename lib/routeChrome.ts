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
  const isMeteoFullscreen = pathname.includes('/meteo/login') || pathname.includes('/meteo/dashboard');
  const isSynauraSurface = startsWithAny(pathname, ['/discover', '/library', '/upload', '/ai-generator', '/studio']);
  const useFullScreenLayout = isHome || isAuth || isMeteoFullscreen || isSynauraSurface;
  const hideTopSearch = startsWithAny(pathname, [
    '/discover',
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
    suppressGlobalPlayerPadding: isAuth || pathname.startsWith('/ai-generator') || pathname.startsWith('/studio'),
    showGlobalShutdownNotice: !useFullScreenLayout,
  };
}
