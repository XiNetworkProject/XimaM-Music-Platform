export function safeEntryTarget(value: string | null | undefined, fallback = '/') {
  if (!value || !/^\/(?!\/|\\)/.test(value) || value.includes('\\')) return fallback;
  return value;
}

export function buildMemberContinueUrl(target: string | null | undefined) {
  const safeTarget = safeEntryTarget(target, '/live');
  return `/enter/continue?callbackUrl=${encodeURIComponent(safeTarget)}`;
}
