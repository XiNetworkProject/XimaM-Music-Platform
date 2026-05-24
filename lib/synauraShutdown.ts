/** Annonce et arrêt définitif de Synaura — dates et helpers partagés */

export const SHUTDOWN_ANNOUNCEMENT_DATE = new Date('2026-05-24T00:00:00+02:00');
/** Dernier jour d'accès inclus — à 23:59:59 (heure de Paris) */
export const SHUTDOWN_END_DATE = new Date('2026-06-24T23:59:59+02:00');

export const SHUTDOWN_END_DATE_LABEL = '24 juin 2026';
export const SHUTDOWN_ANNOUNCEMENT_LABEL = '24 mai 2026';

export function isPastShutdownEnd(now = Date.now()): boolean {
  return now > SHUTDOWN_END_DATE.getTime();
}

export function isShutdownAnnounced(now = Date.now()): boolean {
  return now >= SHUTDOWN_ANNOUNCEMENT_DATE.getTime();
}

export function getMsUntilShutdownEnd(now = Date.now()): number {
  return Math.max(0, SHUTDOWN_END_DATE.getTime() - now);
}

export function getDaysUntilShutdownEnd(now = Date.now()): number {
  return Math.ceil(getMsUntilShutdownEnd(now) / (1000 * 60 * 60 * 24));
}

export function formatShutdownCountdown(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** Chemins accessibles après la date de fin */
export const SHUTDOWN_ALLOWED_PATHS = [
  '/arret',
  '/fermeture',
  '/legal',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/reset-password',
];

export function isShutdownAllowedPath(pathname: string): boolean {
  return SHUTDOWN_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}
