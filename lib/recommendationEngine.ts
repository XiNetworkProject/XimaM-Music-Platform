import { Track, User } from '@/types';

export interface UserPreferences {
  genres: { [key: string]: number };
  artists: { [key: string]: number };
  mood: { [key: string]: number };
  tempo: { min: number; max: number };
  duration: { min: number; max: number };
}

export interface TrackScore {
  track: Track;
  score: number;
  reasons: string[];
}

export interface RecommendationResult {
  tracks: Track[];
  score: number;
  reasons: string[];
}

export class RecommendationEngine {
  private static readonly WEIGHTS = {
    GENRE_MATCH: 10,
    ARTIST_MATCH: 8,
    RECENCY: 0.5,
    POPULARITY: 2,
    ENGAGEMENT: 1.5,
    QUALITY: 3,
    DIVERSITY: 5,
    DISCOVERY: 4
  };

  /**
   * Analyse les préférences utilisateur basées sur ses pistes likées
   */
  static analyzeUserPreferences(likedTracks: Track[]): UserPreferences {
    const genres: { [key: string]: number } = {};
    const artists: { [key: string]: number } = {};
    let totalPlays = 0;
    let totalLikes = 0;

    likedTracks.forEach(track => {
      // Analyser les genres
      track.genre?.forEach(genre => {
        genres[genre] = (genres[genre] || 0) + 1;
      });

      // Analyser les artistes
      if (track.artist?._id) {
        const artistId = track.artist._id;
        artists[artistId] = (artists[artistId] || 0) + 1;
      }

      totalPlays += track.plays || 0;
      totalLikes += track.likesCount || 0;
    });

    return {
      genres,
      artists,
      mood: {},
      tempo: { min: 0, max: 200 },
      duration: { min: 0, max: 600 }
    };
  }

  /**
   * Calcule un score de pertinence pour une piste
   */
  static calculateTrackScore(
    track: Track,
    userPrefs: UserPreferences,
    excludeTrackIds: string[] = []
  ): TrackScore {
    if (excludeTrackIds.includes(track.id)) {
      return { track, score: 0, reasons: ['Exclue'] };
    }

    let score = 0;
    const reasons: string[] = [];

    // Score par genre
    track.genre?.forEach(genre => {
      const genreWeight = userPrefs.genres[genre] || 0;
      const genreScore = genreWeight * this.WEIGHTS.GENRE_MATCH;
      score += genreScore;
      if (genreScore > 0) {
        reasons.push(`Genre ${genre}: +${genreScore}`);
      }
    });

    // Score par artiste
    if (track.artist?._id) {
      const artistId = track.artist._id;
      const artistWeight = userPrefs.artists[artistId] || 0;
      const artistScore = artistWeight * this.WEIGHTS.ARTIST_MATCH;
      score += artistScore;
      if (artistScore > 0) {
        reasons.push(`Artiste ${track.artist?.name}: +${artistScore}`);
      }
    }

    // Score de récence (pistes récentes favorisées)
    const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, (30 - daysSinceCreation) * this.WEIGHTS.RECENCY);
    score += recencyScore;
    if (recencyScore > 0) {
      reasons.push(`Récent: +${recencyScore}`);
    }

    // Score de popularité
    const popularityScore = Math.min(track.plays / 100, 10) * this.WEIGHTS.POPULARITY;
    score += popularityScore;
    if (popularityScore > 0) {
      reasons.push(`Populaire: +${popularityScore}`);
    }

    // Score d'engagement (likes, commentaires)
    const engagementScore = Math.min(track.likesCount || 0, 20) * this.WEIGHTS.ENGAGEMENT;
    score += engagementScore;
    if (engagementScore > 0) {
      reasons.push(`Engagement: +${engagementScore}`);
    }

    // Bonus qualité (cover, description)
    let qualityBonus = 0;
    if (track.coverUrl) qualityBonus += this.WEIGHTS.QUALITY;
    if (track.description) qualityBonus += this.WEIGHTS.QUALITY;
    score += qualityBonus;
    if (qualityBonus > 0) {
      reasons.push(`Qualité: +${qualityBonus}`);
    }

    return { track, score, reasons };
  }

  /**
   * Génère des recommandations personnalisées
   */
  static generatePersonalizedRecommendations(
    userTracks: Track[],
    allTracks: Track[],
    limit: number = 20
  ): Track[] {
    const userPrefs = this.analyzeUserPreferences(userTracks);
    const excludeIds = userTracks.map(track => track.id);

    const scoredTracks = allTracks
      .filter(track => !excludeIds.includes(track.id))
      .map(track => this.calculateTrackScore(track, userPrefs, excludeIds))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredTracks.slice(0, limit).map(result => result.track);
  }

  /**
   * Génère des recommandations basées sur une piste de référence
   */
  static generateSimilarTracks(
    referenceTrack: Track,
    allTracks: Track[],
    limit: number = 10
  ): Track[] {
    const excludeIds = [referenceTrack.id];

    const similarTracks = allTracks
      .filter(track => !excludeIds.includes(track.id))
      .map(track => {
        let score = 0;
        const reasons: string[] = [];

        // Score par genre commun
        const commonGenres = referenceTrack.genre?.filter(g => track.genre?.includes(g)) || [];
        score += commonGenres.length * 5;

        // Score par artiste
        if (track.artist?._id === referenceTrack.artist?._id) {
          score += 20;
          reasons.push('Même artiste');
        }

        // Score par popularité
        score += Math.min(track.plays / 100, 10);
        score += Math.min(track.likesCount || 0 / 10, 3);

        // Score par récence
        const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, (30 - daysSinceCreation) * 0.5);

        return { track, score, reasons };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return similarTracks.slice(0, limit).map(result => result.track);
  }

  /**
   * Génère des recommandations de découverte
   */
  static generateDiscoveryRecommendations(
    userHistory: string[],
    allTracks: Track[],
    limit: number = 15
  ): Track[] {
    const discoveryTracks = allTracks
      .filter(track => !userHistory.includes(track.id))
      .map(track => {
        let discoveryScore = 0;

        // Score par popularité modérée (pas trop populaire)
        const popularityScore = Math.min(track.plays / 1000, 5);
        discoveryScore += popularityScore;

        // Score par engagement
        discoveryScore += (track.likesCount || 0) * 2;

        // Bonus pour les nouveaux artistes
        const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) discoveryScore += 10;

        return { track, score: discoveryScore };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return discoveryTracks.slice(0, limit).map(result => result.track);
  }

  /**
   * Génère des recommandations basées sur les tendances
   */
  static generateTrendingRecommendations(
    allTracks: Track[],
    limit: number = 20
  ): Track[] {
    const trendingTracks = allTracks.map(track => {
      let trendScore = 0;

      // Score par popularité récente
      const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) {
        trendScore += track.plays * 0.1;
        trendScore += (track.likesCount || 0) * 2;
      }

      // Bonus pour les pistes très récentes
      if (daysSinceCreation < 7) trendScore *= 1.5;

      return { track, score: trendScore };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);

    return trendingTracks.slice(0, limit).map(result => result.track);
  }

  /**
   * Génère des recommandations basées sur les genres populaires
   */
  static generateGenreBasedRecommendations(
    genre: string,
    allTracks: Track[],
    limit: number = 15
  ): Track[] {
    const genreTracks = allTracks
      .filter(track => track.genre?.includes(genre))
      .map(track => {
        let genreScore = 0;

        // Score par popularité
        genreScore += track.plays * 0.01;
        genreScore += (track.likesCount || 0) * 2;

        // Bonus pour les pistes récentes
        const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) genreScore *= 1.2;

        return { track, score: genreScore };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return genreTracks.slice(0, limit).map(result => result.track);
  }

  /**
   * Génère des recommandations mixtes (personnalisées + découverte)
   */
  static generateMixedRecommendations(
    userTracks: Track[],
    allTracks: Track[],
    limit: number = 25
  ): Track[] {
    const personalizedLimit = Math.floor(limit * 0.6);
    const discoveryLimit = limit - personalizedLimit;

    const personalized = this.generatePersonalizedRecommendations(userTracks, allTracks, personalizedLimit);
    const userHistory = userTracks.map(track => track.id);
    const discovery = this.generateDiscoveryRecommendations(userHistory, allTracks, discoveryLimit);

    // Mélanger les recommandations
    const mixed = [...personalized, ...discovery];
    return this.shuffleArray(mixed).slice(0, limit);
  }

  /**
   * Mélange un tableau de manière aléatoire
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
} 