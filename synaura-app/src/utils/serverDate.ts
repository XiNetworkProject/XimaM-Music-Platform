/** PostgreSQL timestamptz can arrive with a space and +00. Hermes requires ISO. */
export function serverDateMillis(value?: string | null): number | null {
  if (!value?.trim()) return null;
  const iso = value.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:)/, '$1T$2').replace(/([+-]\d{2})$/, '$1:00');
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp) ? timestamp : null;
}
export function countdownLabel(target?: string | null, now = Date.now()): string {
  const time = serverDateMillis(target); if (time === null) return 'Horaire indisponible';
  const seconds = Math.max(0, Math.floor((time - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}
export function serverDateLabel(value?: string | null) {
  const time = serverDateMillis(value);
  return time === null ? 'Date indisponible' : new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
