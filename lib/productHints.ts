/** Honest, read-only opportunities. Never infer a paid plan or a reward on error. */
export type HintPlacement = 'live' | 'discover' | 'studio' | 'publish' | 'messages' | 'notifications';
export type Hint = { id: string; kind: 'boost' | 'membership'; title: string; short: string; body: string; cta: string; href: '/boosters' | '/subscriptions' };
export type HintFacts = { plan: 'free' | 'starter' | 'pro' | 'enterprise'; owned: number; creation: number; dailyReady: boolean; earlierWithMembership: boolean; packs: number };
const HOUR = 3_600_000;
export const HINT_DAY = 24 * HOUR;
export const HINT_GAP = HOUR / 2;
export const HINT_EVENT = 'synaura:product-hints-changed';
export const hintStorageKey = (identity: string) => `synaura:product-hints:v1:${identity}`;
export type HintHistory = { seen: { id: string; at: number }[]; dismissed: Record<string, number>; quietUntil: number };
export const emptyHintHistory = (): HintHistory => ({ seen: [], dismissed: {}, quietUntil: 0 });

export function parseHintFacts(raw: any): HintFacts | null {
  if (!raw || !['free', 'starter', 'pro', 'enterprise'].includes(raw.plan) || !Array.isArray(raw.inventory)
    || !Number.isFinite(raw.remainingMs) || raw.remainingMs < 0 || !Number.isFinite(raw.cooldownMs) || raw.cooldownMs <= 0) return null;
  const owned = raw.inventory.filter((item: any) => item?.status === 'owned' && item.booster?.enabled !== false && ['track', 'artist', 'credits'].includes(item.booster?.type));
  const packs = Object.values(raw.packs || {}).filter((item: any) => item?.eligible === true && Number.isInteger(item.claimed) && item.claimed >= 0 && Number.isInteger(item.perWeek) && item.claimed < item.perWeek).length;
  return { plan: raw.plan, owned: owned.filter((item: any) => item.booster.type !== 'credits').length,
    creation: owned.filter((item: any) => item.booster.type === 'credits').length,
    dailyReady: raw.remainingMs === 0,
    earlierWithMembership: raw.plan === 'free' && raw.cooldownMs === HINT_DAY && raw.remainingMs > 0 && raw.remainingMs <= 12 * HOUR,
    packs: raw.plan === 'free' ? 0 : packs };
}

export function hintsFor(facts: HintFacts, placement: HintPlacement): Hint[] {
  const result: Hint[] = [];
  if (placement === 'studio' && facts.creation > 0) result.push({ id: 'creation-owned', kind: 'boost', title: 'Une recharge attend déjà dans ta réserve.', short: 'Des crédits dans ta réserve', body: 'Tu possèdes un booster Création. Tu peux l’activer avant de reprendre ton morceau.', cta: 'Voir ma recharge', href: '/boosters' });
  if (placement === 'studio' && facts.plan === 'free') result.push({ id: 'studio-models', kind: 'membership', title: 'Et si tu essayais une autre version de ton idée ?', short: 'Plus de possibilités au Studio', body: 'V6 Mini reste inclus gratuitement. Les abonnements ouvrent les autres modèles V6 et ajoutent des crédits chaque mois.', cta: 'Comparer les formules', href: '/subscriptions' });
  if (facts.packs > 0) result.push({ id: 'included-pack', kind: 'boost', title: 'Ton abonnement a encore quelque chose pour toi.', short: 'Un pack inclus t’attend', body: 'Un pack de boosters inclus dans ta formule reste à récupérer cette semaine. Aucun achat supplémentaire.', cta: 'Voir mes récompenses', href: '/boosters' });
  if (facts.owned > 0) result.push({ id: 'boost-owned', kind: 'boost', title: placement === 'publish' ? 'Et après la sortie, un peu de lumière ?' : 'Ton prochain coup de projecteur est déjà là.', short: `${facts.owned} boost${facts.owned > 1 ? 's' : ''} en réserve`, body: `Tu as ${facts.owned} booster${facts.owned > 1 ? 's' : ''} de visibilité en réserve. Choisis quand les utiliser : aucune écoute n’est garantie.`, cta: 'Explorer ma réserve', href: '/boosters' });
  if (facts.dailyReady) result.push({ id: 'daily-ready', kind: 'boost', title: 'Un petit rituel. Un nouveau coup de pouce.', short: 'Ton booster gratuit est prêt', body: 'Ton booster quotidien est disponible. Récupère-le gratuitement ; tu décides ensuite quand l’utiliser.', cta: 'Voir mon booster', href: '/boosters' });
  if (facts.earlierWithMembership) result.push({ id: 'earlier-daily', kind: 'membership', title: 'Ton prochain booster pourrait déjà être prêt.', short: 'Un booster toutes les 12 h ?', body: 'Avec un abonnement, le délai est de 12 h au lieu de 24 h. Selon ton dernier tirage, tu pourrais déjà en récupérer un.', cta: 'Voir les avantages', href: '/subscriptions' });
  if (facts.plan === 'free' && placement !== 'studio') result.push({ id: 'membership-discovery', kind: 'membership', title: placement === 'messages' ? 'Au fait, tu connais les petits plus de Synaura ?' : 'Pour les idées qui demandent un peu plus.', short: 'Les petits plus Synaura', body: 'Plus de crédits de création, tous les modèles V6 et des packs de boosters inclus. Le gratuit reste disponible, à ton rythme.', cta: 'Découvrir les abonnements', href: '/subscriptions' });
  return result;
}

export function parseHintHistory(value: string | null, now: number): HintHistory {
  const state = emptyHintHistory();
  if (!value) return state;
  try {
    const raw = JSON.parse(value);
    if (!raw || typeof raw !== 'object') return state;
    state.seen = (Array.isArray(raw.seen) ? raw.seen : []).filter((item: any) => typeof item?.id === 'string' && item.id.length < 80 && Number.isFinite(item.at) && item.at > now - 14 * HINT_DAY && item.at <= now + HINT_GAP).slice(-40);
    for (const [id, until] of Object.entries(raw.dismissed || {})) if (id.length < 80 && Number.isFinite(until) && Number(until) > now) state.dismissed[id] = Math.min(Number(until), now + 30 * HINT_DAY);
    state.quietUntil = Number.isFinite(raw.quietUntil) ? Math.min(raw.quietUntil, now + 30 * HINT_DAY) : 0;
  } catch { /* Corrupt local preferences never break the page. */ }
  return state;
}
export function hintBudgetAvailable(state: HintHistory, now: number) {
  return state.quietUntil <= now && state.seen.filter(item => item.at > now - HINT_DAY).length < 2 && !state.seen.some(item => item.at > now - HINT_GAP);
}
export function chooseHint(facts: HintFacts, placement: HintPlacement, state: HintHistory, now: number): Hint | null {
  if (!hintBudgetAvailable(state, now)) return null;
  return hintsFor(facts, placement).find(item => !(state.dismissed[item.id] > now) && !state.seen.some(seen => seen.id === item.id && seen.at > now - 7 * HINT_DAY)) || null;
}

export function recordHint(state: HintHistory, id: string, now: number): HintHistory {
  return { ...state, seen: [...state.seen, { id, at: now }].slice(-40) };
}
export function dismissHint(state: HintHistory, id: string, now: number, quiet = false): HintHistory {
  return { ...state, dismissed: { ...state.dismissed, [id]: now + 14 * HINT_DAY }, quietUntil: quiet ? now + 30 * HINT_DAY : state.quietUntil };
}
