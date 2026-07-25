export const HOME_PUNCHLINES = [
  'POV : tu voulais juste écouter un son.',
  "On t'a gardé du lourd pendant ton absence.",
  'Petit scroll innocent, grosse obsession musicale.',
  'Ton Flow a bossé pendant que tu vivais ta vie.',
  'Ça sent le son envoyé à quatre potes direct.',
  'Le Radar a encore cuisiné quelque chose.',
  'Tu viens pour un son, tu repars avec douze.',
  'Promis, juste deux minutes. On connaît.',
  'Ta prochaine claque est peut-être à un swipe.',
  'Ton FYP imaginaire aurait validé ça.',
  "Il s'est passé deux-trois trucs pas mal ici.",
  'Alerte : risque élevé de remettre ce son en boucle.',
] as const;

export const HOME_BANNER_ROTATION_MS = 4_200;

type PreludeMetricInput = {
  width: number;
  height: number;
  topInset: number;
  bottomPad: number;
  isPhoneLandscape: boolean;
  isVeryShort: boolean;
};

export type HomePreludeMetrics = {
  availableHeight: number;
  headerHeight: number;
  pulseHeight: number;
  previewHeight: number;
  railCardWidth: number;
  railGap: number;
  actionSize: number;
  compactTop: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pickNextPunchlineIndex(
  previousIndex: number,
  randomValue: number,
  count = HOME_PUNCHLINES.length,
) {
  if (count <= 1) return 0;
  const normalizedRandom = clamp(Number.isFinite(randomValue) ? randomValue : 0, 0, 0.999999);
  if (previousIndex < 0 || previousIndex >= count) {
    return Math.floor(normalizedRandom * count);
  }
  const offset = 1 + Math.floor(normalizedRandom * (count - 1));
  return (previousIndex + offset) % count;
}

export function resolveHomePreludeMetrics(input: PreludeMetricInput): HomePreludeMetrics {
  const width = Math.max(1, input.width);
  const availableHeight = Math.max(240, input.height - Math.max(0, input.bottomPad));
  const headerContentHeight = input.isPhoneLandscape ? 44 : 50;
  const headerHeight = Math.max(0, input.topInset) + headerContentHeight;
  const compactTop = input.isPhoneLandscape || input.isVeryShort;
  const minPulseHeight = input.isPhoneLandscape ? 132 : input.isVeryShort ? 202 : 246;
  const maxPulseHeight = input.isPhoneLandscape ? 176 : 322;
  const minPreviewHeight = input.isPhoneLandscape ? 96 : input.isVeryShort ? 188 : 214;
  const desiredPulseHeight = Math.round(availableHeight * 0.42);
  const roomLimitedPulseHeight = availableHeight - headerHeight - minPreviewHeight;
  const boundedPulseHeight = Math.round(clamp(
    Math.min(desiredPulseHeight, roomLimitedPulseHeight),
    input.isPhoneLandscape ? 120 : 190,
    maxPulseHeight,
  ));
  const pulseHeight = Math.max(Math.min(minPulseHeight, roomLimitedPulseHeight), boundedPulseHeight);
  const previewHeight = Math.max(0, availableHeight - headerHeight - pulseHeight);
  const boundedContentWidth = Math.min(width, 520);
  const railCardWidth = Math.round(clamp(
    input.isPhoneLandscape ? boundedContentWidth * 0.34 : 220,
    220,
    width >= 600 ? 285 : 220,
  ));

  return {
    availableHeight,
    headerHeight,
    pulseHeight,
    previewHeight,
    railCardWidth,
    railGap: input.isPhoneLandscape ? 8 : 10,
    actionSize: width < 360 ? 42 : 44,
    compactTop,
  };
}
