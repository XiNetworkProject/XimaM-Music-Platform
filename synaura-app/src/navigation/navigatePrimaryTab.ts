export type PrimaryTabName = 'Swipe' | 'Discover' | 'Create' | 'Library' | 'Profile';

type NavigationLike = {
  getState?: () => { routeNames?: string[] } | undefined;
  navigate: (name: string, params?: Record<string, unknown>) => void;
};

export function primaryTabTarget(routeNames: readonly string[] | undefined, screen: PrimaryTabName) {
  return routeNames?.includes(screen)
    ? { name: screen, params: undefined }
    : { name: 'Tabs', params: { screen } };
}

export function navigatePrimaryTab(
  navigation: NavigationLike,
  screen: PrimaryTabName,
  params?: Record<string, unknown>,
) {
  const target = primaryTabTarget(navigation.getState?.()?.routeNames, screen);
  if (target.name === screen) {
    navigation.navigate(screen, params);
    return;
  }
  navigation.navigate('Tabs', { screen, ...(params ? { params } : {}) });
}
