/** PostgreSQL text timestamps must be ISO 8601 before crossing the JSON boundary.
 * Hermes rejects the SQL space and bare +00 offset that V8 happens to accept.
 * Legacy timestamp-without-zone columns in Synaura are UTC, never device-local.
 */
export function messagingIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  let iso = value.trim().replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T').replace(/(\.\d{3})\d+/, '$1');
  if (/T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(iso)) iso += 'Z';
  iso = iso.replace(/([+-]\d{2})$/, '$1:00');
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
