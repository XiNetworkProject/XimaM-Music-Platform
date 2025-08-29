import { Track } from '@/types';

interface UserPreferences {
  genres: { [key: string]: number };
  artists: { [key: string]: number };
  avgPlays: number;
  avgLikes: number;
  totalTracks: number;
}

interface TrackScore {
  track: Track;
  score: number;
  reasons: string[];
}

export class RecommendationEngine {
  private static readonly WEIGHTS = {
    GENRE_MATCH: 10,
    ARTIST_MATCH: 15,
    RECENCY: 5,
    POPULARITY: 3,
    DIVERSITY: 2,
    ENGAGEMENT: 4,
    QUALITY: 2
  };

  /**
   * Analyse les préférences utilisateur basées sur son historique
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
        const artistId = track.artist._id.toString();
        artists[artistId] = (artists[artistId] || 0) + 1;
      }

      totalPlays += track.plays || 0;
      totalLikes += Array.isArray(track.likes) ? track.likes.length : 0;
    });

    return {
      genres,
      artists,
      avgPlays: likedTracks.length > 0 ? totalPlays / likedTracks.length : 0,
      avgLikes: likedTracks.length > 0 ? totalLikes / likedTracks.length : 0,
      totalTracks: likedTracks.length
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
    if (excludeTrackIds.includes(track._id)) {
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
      const artistId = track.artist._id.toString();
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
    const engagementScore = Math.min(Array.isArray(track.likes) ? track.likes.length : 0, 20) * this.WEIGHTS.ENGAGEMENT;
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
    if (userTracks.length === 0) {
      return this.generatePopularRecommendations(allTracks, limit);
    }

    const userPrefs = this.analyzeUserPreferences(userTracks);
    const excludeIds = [userTracks[0]?._id].filter(Boolean);

    const scoredTracks = allTracks
      .filter(track => !excludeIds.includes(track._id))
      .map(track => this.calculateTrackScore(track, userPrefs, excludeIds))
      .sort((a, b) => b.score - a.score);

    return scoredTracks.slice(0, limit).map(st => st.track);
  }

  /**
   * Génère des recommandations basées sur une piste de référence
   */
  static generateSimilarTrackRecommendations(
    referenceTrack: Track,
    allTracks: Track[],
    limit: number = 15
  ): Track[] {
    const excludeIds = [referenceTrack._id];

    const similarTracks = allTracks
      .filter(track => !excludeIds.includes(track._id))
      .map(track => {
        let score = 0;
        const reasons: string[] = [];

        // Score par genre commun
        if (referenceTrack.genre && track.genre) {
          const commonGenres = referenceTrack.genre.filter(g =>
            track.genre?.includes(g)
          );
          score += commonGenres.length * 10;
        }

        // Score basé sur l'artiste
        if (referenceTrack.artist?._id === track.artist?._id) {
          score += 5;
        }

        // Score par popularité
        const popularityScore = Math.min(track.plays / 100, 5);
        score += popularityScore;

        // Score par engagement
        score += Math.min(Array.isArray(track.likes) ? track.likes.length / 10 : 0, 3);

        return { track, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    return similarTracks.slice(0, limit).map(st => st.track);
  }

  /**
   * Génère des recommandations de tendances
   */
  static generateTrendingRecommendations(
    allTracks: Track[],
    limit: number = 20
  ): Track[] {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const trendingTracks = allTracks
      .map(track => {
        const trackDate = new Date(track.createdAt).getTime();
        const isRecent = trackDate > oneWeekAgo;

        let trendScore = track.plays || 0;
        if (isRecent) {
          trendScore += (Array.isArray(track.likes) ? track.likes.length : 0) * 2;
        }

        return { track, trendScore };
      })
      .sort((a, b) => b.trendScore - a.trendScore);

    return trendingTracks.slice(0, limit).map(tt => tt.track);
  }

  /**
   * Génère des recommandations de découverte
   */
  static generateDiscoveryRecommendations(
    allTracks: Track[],
    userHistory: string[],
    limit: number = 15
  ): Track[] {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const discoveryTracks = allTracks
      .filter(track => !userHistory.includes(track._id))
      .map(track => {
        const trackDate = new Date(track.createdAt).getTime();
        const isRecent = trackDate > oneWeekAgo;

        let discoveryScore = track.plays || 0;
        if (isRecent) {
          discoveryScore += (Array.isArray(track.likes) ? track.likes.length : 0) * 2;
        }

        return { track, discoveryScore };
      })
      .sort((a, b) => b.discoveryScore - a.discoveryScore);

    return discoveryTracks.slice(0, limit).map(dt => dt.track);
  }

  /**
   * Génère des recommandations populaires
   */
  static generatePopularRecommendations(
    allTracks: Track[],
    limit: number = 20
  ): Track[] {
    const popularTracks = allTracks
      .map(track => {
        let featuredScore = track.plays || 0;
        featuredScore += (Array.isArray(track.likes) ? track.likes.length : 0) * 2;

        // Bonus pour les pistes avec cover
        if (track.coverUrl) featuredScore *= 1.3;

        // Bonus pour les pistes récentes
        const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= 7) featuredScore *= 1.2;

        return { track, featuredScore };
      })
      .sort((a, b) => b.featuredScore - a.featuredScore);

    return popularTracks.slice(0, limit).map(pt => pt.track);
  }

  /**
   * Génère des recommandations par genre
   */
  static generateGenreRecommendations(
    genre: string,
    allTracks: Track[],
    limit: number = 15
  ): Track[] {
    const trackGenres = genre || [];
    
    const genreTracks = allTracks
      .filter(track => track.genre?.includes(genre))
      .map(track => {
        let genreScore = track.plays || 0;
        genreScore += (Array.isArray(track.likes) ? track.likes.length : 0) * 2;

        // Bonus pour les pistes récentes du genre
        const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= 14) genreScore *= 1.1;

        return { track, genreScore };
      })
      .sort((a, b) => b.genreScore - a.genreScore);

    return genreTracks.slice(0, limit).map(gt => gt.track);
  }

  /**
   * Mélange les recommandations pour éviter la répétition
   */
  static shuffleRecommendations<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
} 