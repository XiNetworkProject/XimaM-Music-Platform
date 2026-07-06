// Règle d'autorisation des Clips (distincte des règles de Remix IA — ne pas fusionner).
// Extrait de lib/musicClips.ts en module pur (aucune dépendance externe) pour rester
// directement testable avec le test runner natif de Node.

export type ClipRemixVisibility = 'everyone' | 'followers' | 'disabled';

export type ClipPermissionInput = {
  /** Le morceau source doit toujours être public pour être associé à un Clip public. */
  isPublic: boolean;
  /** Le propriétaire du morceau. */
  isOwner: boolean;
  allowClips: boolean;
  remixVisibility: ClipRemixVisibility;
  /** L'utilisateur suit-il réellement le créateur ? (non pertinent si isOwner ou visibility != 'followers') */
  isFollower: boolean;
};

/**
 * - Le morceau source doit toujours être public.
 * - Le propriétaire peut toujours créer un Clip officiel sur son propre morceau public,
 *   même si allowClips=false ou remixVisibility=disabled.
 * - Les autres utilisateurs : allowClips doit être true, et remixVisibility doit être
 *   'everyone', ou 'followers' avec un suivi réel (jamais 'disabled').
 */
export function canCreateClip(input: ClipPermissionInput): boolean {
  if (!input.isPublic) return false;
  if (input.isOwner) return true;
  if (!input.allowClips) return false;
  if (input.remixVisibility === 'disabled') return false;
  if (input.remixVisibility === 'everyone') return true;
  return input.isFollower;
}

export type ClipClientPermissionInput = {
  isOwner: boolean;
  allowClips: boolean;
  remixVisibility: ClipRemixVisibility;
};

/**
 * Pré-vérification côté client pour l'affichage des boutons "Utiliser ce son" /
 * "Créer un clip officiel" (entrées Scroll, détail morceau, détail clip). Optimiste
 * sur remixVisibility='followers' (le suivi réel n'est pas connu côté client sans
 * appel réseau) : canCreateClip côté serveur reste la seule source de vérité au
 * moment de la création/publication du Clip.
 */
export function canUseSoundClientSide(input: ClipClientPermissionInput): boolean {
  if (input.isOwner) return true;
  if (!input.allowClips) return false;
  return input.remixVisibility !== 'disabled';
}
