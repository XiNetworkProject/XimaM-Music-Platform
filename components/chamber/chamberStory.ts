export const CHAMBER_CHAPTERS = [
  { id: 'ressentir', label: 'Ressentir' },
  { id: 'synaura', label: 'Synaura' },
  { id: 'explorer', label: 'Explorer' },
  { id: 'creer', label: 'Créer' },
  { id: 'rencontrer', label: 'Rencontrer' },
  { id: 'ecouter', label: 'Écouter' },
] as const;

export const LAST_CHAMBER_CHAPTER = CHAMBER_CHAPTERS.length - 1;

export function progressAtScroll(scrollTop: number, height: number) {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(height) || height <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / (height * LAST_CHAMBER_CHAPTER)));
}

export function chapterAtScroll(scrollTop: number, height: number) {
  return Math.round(progressAtScroll(scrollTop, height) * LAST_CHAMBER_CHAPTER);
}
