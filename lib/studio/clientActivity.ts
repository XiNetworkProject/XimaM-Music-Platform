'use client';
import { mergeFeedback, safeFeedbackText, type StudioFeedback, type StudioOperation } from './feedback';

const stores = new Map<string, StudioFeedback[]>();
const listeners = new Set<() => void>();
const EMPTY: StudioFeedback[] = [];
const key = (owner: string) => `synaura.studio.activity.v1.${owner}`;
export const getStudioActivity = (owner?: string) => owner ? stores.get(owner) || EMPTY : EMPTY;
export function subscribeStudioActivity(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function persist(owner: string, items: StudioFeedback[]) {
  stores.set(owner, items);
  try { localStorage.setItem(key(owner), JSON.stringify(items)); } catch { /* Feedback remains available in memory. */ }
  listeners.forEach(listener => listener());
}
export function hydrateStudioActivity(owner: string) {
  if (!owner || stores.has(owner)) return;
  let items: StudioFeedback[] = [];
  try {
    const data = JSON.parse(localStorage.getItem(key(owner)) || '[]');
    if (Array.isArray(data)) items = data.filter(item => item && typeof item.id === 'string' && ['generation','upload','source','lyrics','style','tool'].includes(item.kind) && ['pending','success','failed','uncertain','warning','cancelled'].includes(item.state) && Number.isFinite(item.startedAt) && Number.isFinite(item.updatedAt) && Date.now() - item.updatedAt < 30 * 86400000).slice(0, 40).map(item => ({ id: item.id.slice(0, 180), kind: item.kind, state: item.state, startedAt: item.startedAt, updatedAt: item.updatedAt, stage: safeFeedbackText(item.stage), message: safeFeedbackText(item.message), advice: safeFeedbackText(item.advice), code: safeFeedbackText(item.code), taskId: safeFeedbackText(item.taskId), acknowledged: !!item.acknowledged, canCheck: !!item.canCheck }));
  } catch { /* Empty journal, never expose another account's entries. */ }
  // A previous page's in-flight request cannot still be observed by this instance.
  // Known background jobs will reconcile this entry from their protected status endpoint.
  items = items.map(item => item.state === 'pending' ? { ...item, state: 'uncertain', message: 'Le suivi a été interrompu par le rechargement ou la fermeture de la page.', advice: 'Vérifiez la bibliothèque ou le suivi existant avant de relancer. Le résultat de cette demande n’est pas encore confirmé.', code: 'PAGE_INTERRUPTED', acknowledged: false } : item);
  stores.set(owner, items); listeners.forEach(listener => listener());
}
export function reportStudioActivity(owner: string | undefined, update: Omit<StudioFeedback, 'startedAt' | 'updatedAt' | 'id'> & { id?: string; startedAt?: number }) {
  const id = update.id || crypto.randomUUID();
  if (!owner || typeof window === 'undefined') return id;
  hydrateStudioActivity(owner);
  const next: StudioFeedback = { ...update, id, startedAt: update.startedAt ?? Date.now(), updatedAt: Date.now(), stage: safeFeedbackText(update.stage), message: safeFeedbackText(update.message), advice: safeFeedbackText(update.advice), code: safeFeedbackText(update.code), taskId: update.taskId?.replace(/[^\w-]/g, '').slice(0, 128) };
  const old = getStudioActivity(owner), items = mergeFeedback(old, next);
  if (items !== old) persist(owner, items);
  return id;
}
export function startStudioActivity(owner: string | undefined, kind: StudioOperation, stage: string, id?: string) {
  return reportStudioActivity(owner, { id, kind, stage, state: 'pending', message: 'Demande en cours…' });
}
export function acknowledgeStudioActivity(owner: string, id: string) { persist(owner, getStudioActivity(owner).map(item => item.id === id ? { ...item, acknowledged: true } : item)); }
