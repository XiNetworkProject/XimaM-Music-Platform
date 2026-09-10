export type SynauraEntryEvent =
  | 'discover_view'
  | 'enter_click'
  | 'sonic_intro_start'
  | 'sonic_intro_complete'
  | 'sonic_intro_dismiss'
  | 'signup_start'
  | 'signup_complete'
  | 'login_complete'
  | 'onboarding_start'
  | 'onboarding_complete';

/**
 * Contrat d'evenements sans identifiant personnel. La Phase 4A ne branche pas
 * une nouvelle plateforme : les consommateurs analytics deja presents peuvent
 * ecouter `synaura:entry-event` sans que l'entree publique en depende.
 */
export function recordEntryEvent(event: SynauraEntryEvent, detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('synaura:entry-event', { detail: { event, ...detail } }));
}
