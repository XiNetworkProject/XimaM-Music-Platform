export const CONTEXT_SURFACE_HISTORY_KEY = 'synauraContextSurface';
export const CONTEXT_SURFACE_HISTORY_VERSION = 1;
export const MAX_CONTEXT_SURFACE_DEPTH = 3;

export type ContextSurfaceOrigin = 'live' | 'discover' | 'search' | 'other';
export type ContextSurfacePresentation = 'auto' | 'drawer-right' | 'sheet' | 'modal';
export type ContextSurfaceUrlPolicy = 'transient' | 'canonical-route';

export interface ContextSurfaceInput {
  surface: string;
  entityType: string;
  entityId: string | null;
  origin: ContextSurfaceOrigin;
  presentation?: ContextSurfacePresentation;
  returnSnapshotId?: string | null;
}

export interface ContextSurfaceEntry extends ContextSurfaceInput {
  presentation: ContextSurfacePresentation;
  returnSnapshotId: string | null;
  historyKey: string;
}

export interface ContextSurfaceHistoryMarker {
  version: typeof CONTEXT_SURFACE_HISTORY_VERSION;
  backgroundPath: string;
  stack: ContextSurfaceEntry[];
}

type HistoryState = Record<string, unknown> | null | undefined;

function isBoundedToken(value: unknown, max = 180): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isNullableBoundedToken(value: unknown, max = 240): value is string | null {
  return value === null || isBoundedToken(value, max);
}

export function isContextSurfaceEntry(value: unknown): value is ContextSurfaceEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ContextSurfaceEntry>;
  return (
    isBoundedToken(entry.surface, 80) &&
    isBoundedToken(entry.entityType, 80) &&
    isNullableBoundedToken(entry.entityId) &&
    ['live', 'discover', 'search', 'other'].includes(String(entry.origin)) &&
    ['auto', 'drawer-right', 'sheet', 'modal'].includes(String(entry.presentation)) &&
    isNullableBoundedToken(entry.returnSnapshotId) &&
    isBoundedToken(entry.historyKey, 180)
  );
}

export function createContextSurfaceEntry(
  input: ContextSurfaceInput,
  createHistoryKey: () => string = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `surface-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  },
): ContextSurfaceEntry {
  const entry: ContextSurfaceEntry = {
    ...input,
    presentation: input.presentation || 'auto',
    returnSnapshotId: input.returnSnapshotId || null,
    historyKey: createHistoryKey(),
  };
  if (!isContextSurfaceEntry(entry)) throw new Error('Invalid context surface descriptor');
  return entry;
}

export function pushContextSurface(
  stack: ContextSurfaceEntry[],
  entry: ContextSurfaceEntry,
): { stack: ContextSurfaceEntry[]; mode: 'push' | 'replace' } {
  const current = stack.at(-1);
  const duplicate = current &&
    current.surface === entry.surface &&
    current.entityType === entry.entityType &&
    current.entityId === entry.entityId &&
    current.origin === entry.origin;
  if (duplicate || stack.length >= MAX_CONTEXT_SURFACE_DEPTH) {
    return { stack: [...stack.slice(0, -1), entry], mode: 'replace' };
  }
  return { stack: [...stack, entry], mode: 'push' };
}

export function replaceContextSurface(stack: ContextSurfaceEntry[], entry: ContextSurfaceEntry): ContextSurfaceEntry[] {
  if (!stack.length) return [entry];
  return [...stack.slice(0, -1), entry];
}

export function closeTopContextSurface(stack: ContextSurfaceEntry[]): ContextSurfaceEntry[] {
  return stack.slice(0, -1);
}

export function withContextSurfaceHistory(
  state: HistoryState,
  stack: ContextSurfaceEntry[],
  backgroundPath: string,
): Record<string, unknown> {
  const base = state && typeof state === 'object' ? { ...state } : {};
  if (!stack.length) {
    delete base[CONTEXT_SURFACE_HISTORY_KEY];
    return base;
  }
  base[CONTEXT_SURFACE_HISTORY_KEY] = {
    version: CONTEXT_SURFACE_HISTORY_VERSION,
    backgroundPath,
    stack,
  } satisfies ContextSurfaceHistoryMarker;
  return base;
}

export function readContextSurfaceHistory(state: unknown): ContextSurfaceHistoryMarker | null {
  if (!state || typeof state !== 'object') return null;
  const marker = (state as Record<string, unknown>)[CONTEXT_SURFACE_HISTORY_KEY];
  if (!marker || typeof marker !== 'object') return null;
  const candidate = marker as Partial<ContextSurfaceHistoryMarker>;
  if (
    candidate.version !== CONTEXT_SURFACE_HISTORY_VERSION ||
    !isBoundedToken(candidate.backgroundPath, 1000) ||
    !Array.isArray(candidate.stack) ||
    candidate.stack.length > MAX_CONTEXT_SURFACE_DEPTH ||
    !candidate.stack.every(isContextSurfaceEntry)
  ) return null;
  return candidate as ContextSurfaceHistoryMarker;
}

export function reconcileContextSurfaceHistory(
  current: ContextSurfaceEntry[],
  historyState: unknown,
  pathname: string,
): { stack: ContextSurfaceEntry[]; closed: ContextSurfaceEntry[] } {
  const marker = readContextSurfaceHistory(historyState);
  const next = marker?.backgroundPath === pathname ? marker.stack : [];
  const nextKeys = new Set(next.map((entry) => entry.historyKey));
  return {
    stack: next,
    closed: current.filter((entry) => !nextKeys.has(entry.historyKey)).reverse(),
  };
}

export function resolveContextSurfacePresentation(
  presentation: ContextSurfacePresentation,
  viewportWidth: number,
): Exclude<ContextSurfacePresentation, 'auto'> {
  if (presentation !== 'auto') return presentation;
  return viewportWidth < 768 ? 'sheet' : 'drawer-right';
}

export function getContextSurfaceUrlPolicy(entry: Pick<ContextSurfaceEntry, 'entityType' | 'entityId'>): ContextSurfaceUrlPolicy {
  if (entry.entityId && ['profile', 'track', 'playlist', 'post'].includes(entry.entityType)) return 'canonical-route';
  return 'transient';
}

export function getContextSurfaceCanonicalHref(entry: Pick<ContextSurfaceEntry, 'entityType' | 'entityId'>): string | null {
  if (!entry.entityId) return null;
  const encodedId = encodeURIComponent(entry.entityId);
  if (entry.entityType === 'profile') return `/profile/${encodedId}`;
  if (entry.entityType === 'track') return `/track/${encodedId}`;
  if (entry.entityType === 'playlist') return `/playlists/${encodedId}`;
  if (entry.entityType === 'post') return `/posts/${encodedId}`;
  return null;
}
