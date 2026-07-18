const REASON_LABELS: Record<string, string> = {
  global_performance: 'De bons signaux auprès des auditeurs',
  fresh: 'Tout juste publié',
  followed_artist: 'Un artiste que tu suis',
  recent_repeat: 'Tu reviens souvent vers ce son',
  current_obsession: 'Dans tes écoutes du moment',
  artist_affinity: 'Proche des artistes que tu écoutes',
  genre_affinity: 'Dans les styles que tu apprécies',
  collaborative: 'Apprécié par des auditeurs aux goûts proches',
  quality_signal: 'Une écoute particulièrement engageante',
  momentum: 'Ce son progresse rapidement',
  emerging_creator: 'Un petit créateur prometteur',
  catalog_rediscovery: 'Une pépite du catalogue à redécouvrir',
  social_engagement: 'La communauté réagit à ce son',
  post_track_match: 'Lié à un post qui pourrait te plaire',
  exploration: 'Une proposition pour élargir ton univers',
};

export function recommendationReasonLabel(reasons: string[] | undefined, fallback = '') {
  for (const reason of reasons || []) {
    const label = REASON_LABELS[String(reason || '').trim()];
    if (label) return label;
  }
  return fallback;
}
