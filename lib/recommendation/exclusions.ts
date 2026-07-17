export function parseRecommendationExclusions(value: string | null | undefined, max = 200) {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, max),
  );
}
