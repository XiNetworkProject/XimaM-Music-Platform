import { normalizeGenerationModel, SUNO_GENERATION_LIMITS, type CurrentSunoModel } from './sunoModels';

type ValidationResult = { ok: true } | { ok: false; error: string };

type ValidateInput = {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  prompt?: string;
  style?: string;
  title?: string;
  duration?: number;
  hasUploadUrl?: boolean;
};

type ValidateTuningInput = {
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  vocalGender?: string;
  negativeTags?: string;
};

/** Normalize new requests and reused drafts, never historical model labels. */
export function normalizeSunoModel(model: unknown): CurrentSunoModel {
  return normalizeGenerationModel(model);
}

export function validateSunoGenerationInput(input: ValidateInput): ValidationResult {
  const limits = SUNO_GENERATION_LIMITS;
  if (typeof input.customMode !== 'boolean' || typeof input.instrumental !== 'boolean') {
    return { ok: false, error: 'customMode et instrumental doivent être des booléens' };
  }
  for (const key of ['prompt', 'style', 'title'] as const) {
    if (input[key] != null && typeof input[key] !== 'string') {
      return { ok: false, error: `${key} invalide` };
    }
  }
  // Validate the exact outgoing text, including whitespace in supplied lyrics.
  const prompt = input.prompt || '';
  const style = input.style || '';
  const title = input.title || '';

  if (input.duration != null) {
    if (!input.customMode) return { ok: false, error: 'La durée est disponible uniquement en mode Custom' };
    if (!Number.isInteger(input.duration) || input.duration < limits.minDuration || input.duration > limits.maxDuration) {
      return { ok: false, error: `duration doit être un entier entre ${limits.minDuration} et ${limits.maxDuration} secondes` };
    }
  }

  if (!input.customMode) {
    const maxPrompt = input.hasUploadUrl ? limits.coverSimplePrompt : limits.simplePrompt;
    if (!prompt.trim()) return { ok: false, error: 'prompt requis en mode Simple' };
    if (prompt.length > maxPrompt) return { ok: false, error: `prompt trop long en mode Simple (max ${maxPrompt})` };
    return { ok: true };
  }

  // Custom mode
  if (!style.trim()) return { ok: false, error: 'style requis en mode Custom' };
  if (!title.trim()) return { ok: false, error: 'title requis en mode Custom' };
  if (style.length > limits.style) return { ok: false, error: `style trop long (max ${limits.style})` };
  if (title.length > limits.title) return { ok: false, error: `title trop long (max ${limits.title})` };

  if (!input.instrumental) {
    if (!prompt.trim()) return { ok: false, error: 'prompt (lyrics) requis en mode Custom quand instrumental=false' };
    if (prompt.length > limits.prompt) return { ok: false, error: `prompt trop long (max ${limits.prompt})` };
  }

  return { ok: true };
}

export function validateUploadCoverExtra(_model: string, uploadDurationSec?: number): ValidationResult {
  if (uploadDurationSec != null && (!Number.isFinite(uploadDurationSec) || uploadDurationSec <= 0)) {
    return { ok: false, error: 'Durée de l’audio source invalide' };
  }
  if (typeof uploadDurationSec === 'number' && uploadDurationSec > 8 * 60) {
    return { ok: false, error: 'audio source trop long (max 8 minutes pour upload-cover)' };
  }
  return { ok: true };
}

export function validateSunoTuningInput(input: ValidateTuningInput): { ok: true } | { ok: false; error: string } {
  const checks: Array<{ key: string; value: number | undefined }> = [
    { key: 'styleWeight', value: input.styleWeight },
    { key: 'weirdnessConstraint', value: input.weirdnessConstraint },
    { key: 'audioWeight', value: input.audioWeight },
  ];
  for (const { key, value } of checks) {
    if (value == null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, error: `${key} invalide` };
    }
    if (value < 0 || value > 1) {
      return { ok: false, error: `${key} doit être entre 0.00 et 1.00` };
    }
  }
  if (input.vocalGender != null && input.vocalGender !== '' && input.vocalGender !== 'm' && input.vocalGender !== 'f') {
    return { ok: false, error: 'vocalGender doit être "m" ou "f"' };
  }
  if (input.negativeTags != null && typeof input.negativeTags !== 'string') {
    return { ok: false, error: 'negativeTags invalide' };
  }
  return { ok: true };
}
