// Miroir mobile de lib/communityClubs.ts (web). Les "Clubs" sont des espaces
// musicaux réels dérivés des catégories existantes de forum_posts. Aucun système de
// membres, rôles ou salons persistants pour l'instant (voir doc de livraison Clubs V1/V2).

export type ClubSlug = 'feedback' | 'collab' | 'remix' | 'ai';

export type ClubAction = { label: string; kind: 'compose' | 'view-posts' };

export type ClubConfig = {
  slug: ClubSlug;
  category: string;
  name: string;
  promise: string;
  /** Question affichée en haut du composer quand ce Club est actif. */
  question: string;
  accent: string;
  icon: string;
  actions: [ClubAction, ClubAction];
};

export const COMMUNITY_CLUBS: ClubConfig[] = [
  {
    slug: 'feedback',
    category: 'feedback',
    name: 'Feedback Lab',
    promise: 'Obtiens des retours utiles sur ton son.',
    question: 'Quel retour veux-tu sur ce son ?',
    accent: '#D96D63',
    icon: 'heart',
    actions: [
      { label: 'Partager un son', kind: 'compose' },
      { label: 'Demander un avis', kind: 'compose' },
    ],
  },
  {
    slug: 'collab',
    category: 'collab',
    name: 'Open Feat',
    promise: 'Trouve une voix, un couplet ou un producteur.',
    question: 'Quel type de collaboration recherches-tu ?',
    accent: '#7357C6',
    icon: 'people',
    actions: [
      { label: 'Chercher une collab', kind: 'compose' },
      { label: 'Proposer ma voix', kind: 'compose' },
    ],
  },
  {
    slug: 'remix',
    category: 'remix',
    name: 'Remix Lab',
    promise: 'Lance ou rejoins une création dérivée.',
    question: 'Quel morceau ou défi veux-tu proposer ?',
    accent: '#D9A441',
    icon: 'flash',
    actions: [
      { label: 'Lancer un défi', kind: 'compose' },
      { label: 'Voir les remixes', kind: 'view-posts' },
    ],
  },
  {
    slug: 'ai',
    category: 'ai_prompt',
    name: 'IA Lab',
    promise: 'Partager des idées, prompts et variations IA.',
    question: 'Quelle idée ou variation veux-tu partager ?',
    accent: '#4A9EAA',
    icon: 'sparkles',
    actions: [
      { label: 'Partager une idée', kind: 'compose' },
      { label: 'Voir les créations', kind: 'view-posts' },
    ],
  },
];

export function getClubBySlug(slug: string | null | undefined): ClubConfig | null {
  return COMMUNITY_CLUBS.find((club) => club.slug === slug) || null;
}

export function getClubByCategory(category: string | null | undefined): ClubConfig | null {
  return COMMUNITY_CLUBS.find((club) => club.category === category) || null;
}
