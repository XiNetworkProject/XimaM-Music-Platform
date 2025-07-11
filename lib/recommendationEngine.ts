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
      totalLikes += track.likes?.length || 0;
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
        reasons.push(`Artiste ${track.artist.name}: +${artistScore}`);
      }
    }

    // Score de récence (pistes récentes favorisées)
    const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, (30 - daysSinceCreation) * this.WEIGHTS.RECENCY);
    score += recencyScore;
    if (recencyScore > 0) {
      reasons.push(`Récente: +${recencyScore.toFixed(1)}`);
    }

    // Score de popularité
    const popularityScore = Math.min(track.plays / 100, 10) * this.WEIGHTS.POPULARITY;
    score += popularityScore;
    if (popularityScore > 0) {
      reasons.push(`Populaire: +${popularityScore.toFixed(1)}`);
    }

    // Score d'engagement (likes)
    const engagementScore = Math.min(track.likes?.length || 0, 20) * this.WEIGHTS.ENGAGEMENT;
    score += engagementScore;
    if (engagementScore > 0) {
      reasons.push(`Engagement: +${engagementScore}`);
    }

    // Bonus de qualité (pistes avec cover et description)
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
  static getPersonalRecommendations(
    allTracks: Track[],
    userLikedTracks: Track[],
    limit: number = 20
  ): Track[] {
    if (userLikedTracks.length === 0) {
      return this.getPopularRecommendations(allTracks, limit);
    }

    const userPrefs = this.analyzeUserPreferences(userLikedTracks);
    const excludeIds = userLikedTracks.map(t => t._id);

    const scoredTracks = allTracks
      .map(track => this.calculateTrackScore(track, userPrefs, excludeIds))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredTracks.slice(0, limit).map(item => item.track);
  }

  /**
   * Génère des recommandations populaires (fallback)
   */
  static getPopularRecommendations(allTracks: Track[], limit: number = 20): Track[] {
    return allTracks
      .sort((a, b) => {
        const scoreA = (a.likes?.length || 0) * 2 + (a.plays || 0);
        const scoreB = (b.likes?.length || 0) * 2 + (b.plays || 0);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Génère des recommandations basées sur une piste spécifique
   */
  static getSimilarTracks(
    referenceTrack: Track,
    allTracks: Track[],
    limit: number = 10
  ): Track[] {
    const excludeIds = [referenceTrack._id];

    return allTracks
      .filter(track => !excludeIds.includes(track._id))
      .map(track => {
        let score = 0;
        const reasons: string[] = [];

        // Score par genre commun
        const commonGenres = referenceTrack.genre?.filter(g => 
          track.genre?.includes(g)
        ) || [];
        score += commonGenres.length * this.WEIGHTS.GENRE_MATCH;
        if (commonGenres.length > 0) {
          reasons.push(`Genres communs: ${commonGenres.join(', ')}`);
        }

        // Score par même artiste
        if (referenceTrack.artist?._id === track.artist?._id) {
          score += this.WEIGHTS.ARTIST_MATCH * 2;
          reasons.push('Même artiste');
        }

        // Score de popularité relative
        const popularityScore = Math.min(track.plays / 100, 5);
        score += popularityScore;
        if (popularityScore > 0) {
          reasons.push(`Populaire: +${popularityScore.toFixed(1)}`);
        }

        return { track, score, reasons };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.track);
  }

  /**
   * Génère des tendances intelligentes
   */
  static getTrendingTracks(allTracks: Track[], limit: number = 20): Track[] {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    return allTracks
      .map(track => {
        const trackDate = new Date(track.createdAt).getTime();
        const isRecent = trackDate > oneWeekAgo;
        
        // Score de tendance basé sur la récence et l'engagement
        let trendScore = track.plays || 0;
        if (isRecent) trendScore *= 1.5; // Bonus pour les pistes récentes
        trendScore += (track.likes?.length || 0) * 2;

        return { track, trendScore };
      })
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit)
      .map(item => item.track);
  }

  /**
   * Génère des découvertes du jour
   */
  static getDailyDiscoveries(allTracks: Track[], limit: number = 10): Track[] {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return allTracks
      .filter(track => {
        const trackDate = new Date(track.createdAt).getTime();
        return trackDate > oneDayAgo;
      })
      .sort((a, b) => {
        // Priorité aux nouvelles pistes avec engagement
        const scoreA = (a.likes?.length || 0) * 3 + (a.plays || 0);
        const scoreB = (b.likes?.length || 0) * 3 + (b.plays || 0);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Génère des pistes en vedette pour le carrousel
   */
  static getFeaturedTracks(allTracks: Track[], limit: number = 5): Track[] {
    return allTracks
      .map(track => {
        // Score spécial pour le carrousel (qualité visuelle + engagement)
        let featuredScore = track.plays || 0;
        featuredScore += (track.likes?.length || 0) * 2;
        
        // Bonus pour les pistes avec cover
        if (track.coverUrl) featuredScore *= 1.3;
        
        // Bonus pour les pistes récentes
        const daysSinceCreation = (Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) featuredScore *= 1.2;

        return { track, featuredScore };
      })
      .sort((a, b) => b.featuredScore - a.featuredScore)
      .slice(0, limit)
      .map(item => item.track);
  }

  /**
   * Diversifie les recommandations pour éviter la répétition
   */
  static diversifyRecommendations(tracks: Track[], maxSimilarGenres: number = 3): Track[] {
    const genreCounts: { [key: string]: number } = {};
    const diversified: Track[] = [];

    for (const track of tracks) {
      const trackGenres = track.genre || [];
      const hasTooManySimilar = trackGenres.some(genre => 
        (genreCounts[genre] || 0) >= maxSimilarGenres
      );

      if (!hasTooManySimilar) {
        diversified.push(track);
        trackGenres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    }

    return diversified;
  }
} 