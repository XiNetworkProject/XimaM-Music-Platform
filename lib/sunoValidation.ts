type SunoModel = 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5';

type ValidateInput = {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  prompt?: string;
  style?: string;
  title?: string;
  hasUploadUrl?: boolean;
};

type ValidateTuningInput = {
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  vocalGender?: string;
};

const MODEL_LIMITS: Record<SunoModel, { prompt: number; style: number; title: number }> = {
  V4: { prompt: 3000, style: 200, title: 80 },
  V4_5: { prompt: 5000, style: 1000, title: 100 },
  V4_5PLUS: { prompt: 5000, style: 1000, title: 100 },
  V4_5ALL: { prompt: 5000, style: 1000, title: 80 },
  V5: { prompt: 5000, style: 1000, title: 100 },
};

export function normalizeSunoModel(model: string | undefined): SunoModel {
  const m = String(model || 'V4_5').toUpperCase();
  if (m === 'V4' || m === 'V4_5' || m === 'V4_5PLUS' || m === 'V4_5ALL' || m === 'V5') return m;
  return 'V4_5';
}

export function validateSunoGenerationInput(input: ValidateInput): { ok: true } | { ok: false; error: string } {
  const model = normalizeSunoModel(input.model);
  const limits = MODEL_LIMITS[model];
  const prompt = (input.prompt || '').trim();
  const style = (input.style || '').trim();
  const title = (input.title || '').trim();

  if (input.hasUploadUrl === true) {
    // For upload-cover/upload-extend, caller ensures actual uploadUrl string exists.
  }

  if (!input.customMode) {
    if (!prompt) return { ok: false, error: 'prompt requis en mode Simple' };
    if (prompt.length > 500) return { ok: false, error: 'prompt trop long en mode Simple (max 500)' };
    return { ok: true };
  }

  // Custom mode
  if (!style) return { ok: false, error: 'style requis en mode Custom' };
  if (!title) return { ok: false, error: 'title requis en mode Custom' };
  if (style.length > limits.style) return { ok: false, error: `style trop long (max ${limits.style})` };
  if (title.length > limits.title) return { ok: false, error: `title trop long (max ${limits.title})` };

  if (!input.instrumental) {
    if (!prompt) return { ok: false, error: 'prompt (lyrics) requis en mode Custom quand instrumental=false' };
    if (prompt.length > limits.prompt) return { ok: false, error: `prompt trop long (max ${limits.prompt})` };
  }

  return { ok: true };
}

export function validateUploadCoverExtra(model: string, uploadDurationSec?: number): { ok: true } | { ok: false; error: string } {
  const m = normalizeSunoModel(model);
  if (typeof uploadDurationSec === 'number' && uploadDurationSec > 8 * 60) {
    return { ok: false, error: 'audio source trop long (max 8 minutes pour upload-cover)' };
  }
  if (m === 'V4_5ALL' && typeof uploadDurationSec === 'number' && uploadDurationSec > 60) {
    return { ok: false, error: 'V4_5ALL: audio source max 60 secondes en upload-cover' };
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
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return { ok: false, error: `${key} invalide` };
    }
    if (value < 0 || value > 1) {
      return { ok: false, error: `${key} doit être entre 0.00 et 1.00` };
    }
  }
  if (input.vocalGender != null && input.vocalGender !== '' && input.vocalGender !== 'm' && input.vocalGender !== 'f') {
    return { ok: false, error: 'vocalGender doit être "m" ou "f"' };
  }
  return { ok: true };
}
