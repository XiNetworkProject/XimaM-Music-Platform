export type EntryRoute = 'Tabs' | 'Onboarding' | 'Welcome';
export type AuthDestination = { screen: string; params?: Record<string, unknown> };

// A token refresh must not reset navigation. A different identity must never
// reuse the guest's initial route, including after the MFA stack was unmounted.
export function entryIdentity(session: {
  loading: boolean;
  token: string | null;
  user: { id: string; profileComplete?: boolean } | null;
  biometricLocked: boolean;
  mfaRequired: boolean;
}): string | null {
  if (session.loading) return null;
  if (!session.user?.id || !session.token) return 'guest';
  if (session.biometricLocked || session.mfaRequired || session.user.profileComplete === false) return null;
  return `user:${session.user.id}`;
}

export function entryRoute(identity: string, completed: boolean): EntryRoute {
  return completed ? 'Tabs' : identity === 'guest' ? 'Welcome' : 'Onboarding';
}

let destination: AuthDestination | undefined;
export function rememberAuthDestination(next?: AuthDestination) { destination = next; }
export function takeAuthDestination() {
  const next = destination;
  destination = undefined;
  return next;
}
