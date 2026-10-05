export const SETTINGS_GROUPS = [
  { title: 'Ton expérience', keys: ['preferences', 'notifications', 'events'] },
  { title: 'Ton compte', keys: ['profil', 'compte', 'securite', 'abonnement'] },
  { title: 'Et aussi', keys: ['parrainage', 'updates', 'legal'] },
] as const;

export function matchesSetting(query: string, label: string, description: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
  return normalize(`${label} ${description}`).includes(normalize(query));
}
