// Permissions de création/remix d'un morceau (tracks + ai_tracks).
// Par défaut : remix désactivé. Le créateur choisit explicitement à la publication.

export type RemixVisibility = 'everyone' | 'followers' | 'disabled';

export type RemixPermissions = {
  allowClips: boolean;
  allowAudioRemix: boolean;
  allowAiVariation: boolean;
  remixApprovalRequired: boolean;
  remixVisibility: RemixVisibility;
};

export const DEFAULT_REMIX_PERMISSIONS: RemixPermissions = {
  allowClips: false,
  allowAudioRemix: false,
  allowAiVariation: false,
  remixApprovalRequired: false,
  remixVisibility: 'disabled',
};

const VALID_VISIBILITY: RemixVisibility[] = ['everyone', 'followers', 'disabled'];

/** Valide/nettoie un objet de permissions venant du client (jamais de confiance aveugle). */
export function sanitizeRemixPermissions(input: unknown, fallback: RemixPermissions = DEFAULT_REMIX_PERMISSIONS): RemixPermissions {
  const raw = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};
  const remixVisibility = VALID_VISIBILITY.includes(raw.remixVisibility as RemixVisibility)
    ? (raw.remixVisibility as RemixVisibility)
    : fallback.remixVisibility;

  // Si le remix est désactivé, les autorisations détaillées n'ont pas de sens : on les force à false.
  if (remixVisibility === 'disabled') {
    return {
      allowClips: false,
      allowAudioRemix: false,
      allowAiVariation: false,
      remixApprovalRequired: false,
      remixVisibility: 'disabled',
    };
  }

  return {
    allowClips: typeof raw.allowClips === 'boolean' ? raw.allowClips : fallback.allowClips,
    allowAudioRemix: typeof raw.allowAudioRemix === 'boolean' ? raw.allowAudioRemix : fallback.allowAudioRemix,
    allowAiVariation: typeof raw.allowAiVariation === 'boolean' ? raw.allowAiVariation : fallback.allowAiVariation,
    remixApprovalRequired: typeof raw.remixApprovalRequired === 'boolean' ? raw.remixApprovalRequired : fallback.remixApprovalRequired,
    remixVisibility,
  };
}

/** Objet -> colonnes snake_case pour insert/update Supabase. */
export function remixPermissionsToRow(perms: RemixPermissions) {
  return {
    allow_clips: perms.allowClips,
    allow_audio_remix: perms.allowAudioRemix,
    allow_ai_variation: perms.allowAiVariation,
    remix_approval_required: perms.remixApprovalRequired,
    remix_visibility: perms.remixVisibility,
  };
}

/** Ligne DB (snake_case, potentiellement avant migration) -> objet camelCase avec défauts sûrs. */
export function remixPermissionsFromRow(row: any): RemixPermissions {
  const remixVisibility = VALID_VISIBILITY.includes(row?.remix_visibility) ? row.remix_visibility : 'disabled';
  return {
    allowClips: Boolean(row?.allow_clips),
    allowAudioRemix: Boolean(row?.allow_audio_remix),
    allowAiVariation: Boolean(row?.allow_ai_variation),
    remixApprovalRequired: Boolean(row?.remix_approval_required),
    remixVisibility,
  };
}

/** Un remix (clip, variation IA ou remix audio) est possible dès qu'un canal est ouvert. */
export function isRemixAvailable(perms: RemixPermissions): boolean {
  return perms.remixVisibility !== 'disabled' && (perms.allowClips || perms.allowAudioRemix || perms.allowAiVariation);
}

/** Le bouton Remixer du MVP ouvre uniquement une Variation IA. */
export function isAiVariationAvailable(perms: Pick<RemixPermissions, 'allowAiVariation' | 'remixVisibility'>): boolean {
  return perms.remixVisibility !== 'disabled' && Boolean(perms.allowAiVariation);
}
