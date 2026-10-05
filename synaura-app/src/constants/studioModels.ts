// Mobile mirror of lib/sunoModels.ts. Entitlements always come from /api/ai/quota.
// Never rewrite the model attached to an existing generation.
export const STUDIO_MODELS = ['V6', 'V6_WILD', 'V6_MINI'] as const;
export function studioAvailableModels(allowed?: string[] | null): string[] {
  const current = allowed?.filter(model => (STUDIO_MODELS as readonly string[]).includes(model));
  return current?.length ? current : ['V6_MINI'];
}
export function studioGenerationModel(value: string, allowed?: string[] | null): string {
  const choices = studioAvailableModels(allowed);
  return choices.includes(value) ? value : choices.includes('V6') ? 'V6' : choices[0];
}
export function studioModelLabel(value: string): string {
  return ({ V6: 'V6', V6_WILD: 'V6 Wild', V6_MINI: 'V6 Mini', V5_5: 'V5.5', V5: 'V5', V4_5: 'V4.5', V4_5PLUS: 'V4.5+' } as Record<string, string>)[value] || value;
}
