import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  tags?: string[];
}

interface RecommendationEngine {
  getSimilarTracks: (currentTrack: Track, allTracks: Track[], limit?: number) => Track[];
  getRecommendedTracks: (userHistory: Track[], allTracks: Track[], limit?: number) => Track[];
  getAutoPlayNext: (currentTrack: Track, queue: Track[], allTracks: Track[]) => Track | null;
  getMoodBasedRecommendations: (mood: string, allTracks: Track[], limit?: number) => Track[];
}

export const useAudioRecommendations = () => {
  const { data: session } = useSession();
  const [userHistory, setUserHistory] = useState<Track[]>([]);
  const [userPreferences, setUserPreferences] = useState<{
    favoriteGenres: string[];
    favoriteArtists: string[];
    listeningTime: number;
  }>({
    favoriteGenres: [],
    favoriteArtists: [],
    listeningTime: 0,
  });

  // Charger l'historique utilisateur
  useEffect(() => {
    if (session?.user?.id) {
      const savedHistory = localStorage.getItem(`userHistory_${session.user.id}`);
      if (savedHistory) {
        try {
          setUserHistory(JSON.parse(savedHistory));
        } catch (error) {
          console.error('Erreur lors du chargement de l\'historique:', error);
        }
      }

      const savedPreferences = localStorage.getItem(`userPreferences_${session.user.id}`);
      if (savedPreferences) {
        try {
          setUserPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          console.error('Erreur lors du chargement des préférences:', error);
        }
      }
    }
  }, [session?.user?.id]);

  // Sauvegarder l'historique
  const saveToHistory = useCallback((track: Track) => {
    if (!session?.user?.id) return;

    setUserHistory(prev => {
      const newHistory = [track, ...prev.filter(t => t._id !== track._id)].slice(0, 100);
      localStorage.setItem(`userHistory_${session.user.id}`, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [session?.user?.id]);

  // Mettre à jour les préférences utilisateur
  const updatePreferences = useCallback((track: Track) => {
    if (!session?.user?.id) return;

    setUserPreferences(prev => {
      const newPreferences = {
        ...prev,
        favoriteGenres: [...prev.favoriteGenres, ...(track.genre || [])].filter((genre, index, arr) => arr.indexOf(genre) === index),
        favoriteArtists: [...prev.favoriteArtists, track.artist._id].filter((artist, index, arr) => arr.indexOf(artist) === index)
      };

      // Limiter le nombre d'éléments
      newPreferences.favoriteGenres = newPreferences.favoriteGenres.slice(0, 20);
      newPreferences.favoriteArtists = newPreferences.favoriteArtists.slice(0, 50);

      localStorage.setItem(`userPreferences_${session.user.id}`, JSON.stringify(newPreferences));
      return newPreferences;
    });
  }, [session?.user?.id]);

  // Obtenir des pistes similaires basées sur le genre et l'artiste
  const getSimilarTracks = useCallback((currentTrack: Track, allTracks: Track[], limit: number = 10): Track[] => {
    if (!currentTrack || !allTracks.length) return [];

    const scores = allTracks
      .filter(track => track._id !== currentTrack._id)
      .map(track => {
        let score = 0;

        // Score par genre (poids élevé)
        if (currentTrack.genre && track.genre) {
          const commonGenres = currentTrack.genre.filter(g => track.genre?.includes(g));
          score += commonGenres.length * 10;
        }

        // Score par artiste (poids très élevé)
        if (track.artist?._id === currentTrack.artist?._id) {
          score += 50;
        }

        // Score par popularité
        score += Math.min(track.plays / 100, 5);

        // Score par likes
        score += Math.min(track.likes.length / 10, 3);

        return { track, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.track);

    return scores;
  }, []);

  // Obtenir des recommandations basées sur l'historique utilisateur
  const getRecommendedTracks = useCallback((allTracks: Track[], limit: number = 10): Track[] => {
    if (!userHistory.length || !allTracks.length) return [];

    // Analyser les préférences de l'utilisateur
    const genreCounts: { [key: string]: number } = {};
    const artistCounts: { [key: string]: number } = {};

    userHistory.forEach(track => {
      track.genre?.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
      if (track.artist?._id) {
        artistCounts[track.artist._id] = (artistCounts[track.artist._id] || 0) + 1;
      }
    });

    const scores = allTracks
      .filter(track => !userHistory.some(h => h._id === track._id))
      .map(track => {
        let score = 0;

        // Score par genre préféré
        track.genre?.forEach(genre => {
          score += (genreCounts[genre] || 0) * 5;
        });

        // Score par artiste préféré
        if (track.artist?._id && artistCounts[track.artist._id]) {
          score += artistCounts[track.artist._id] * 10;
        }

        // Score par popularité générale
        score += Math.min(track.plays / 100, 3);

        return { track, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.track);

    return scores;
  }, [userHistory]);

  // Obtenir la prochaine piste pour l'auto-play
  const getAutoPlayNext = useCallback((currentTrack: Track, queue: Track[], allTracks: Track[]): Track | null => {
    if (!currentTrack) return null;

    // Si on a une file d'attente, prendre la suivante
    if (queue.length > 1) {
      const currentIndex = queue.findIndex(t => t._id === currentTrack._id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        return queue[currentIndex + 1];
      }
    }

    // Sinon, chercher une piste similaire
    const similarTracks = getSimilarTracks(currentTrack, allTracks, 5);
    if (similarTracks.length > 0) {
      // Éviter de rejouer la même piste
      const filteredSimilar = similarTracks.filter(t => t._id !== currentTrack._id);
      if (filteredSimilar.length > 0) {
        return filteredSimilar[Math.floor(Math.random() * filteredSimilar.length)];
      }
    }

    // En dernier recours, prendre une recommandation
    const recommendations = getRecommendedTracks(allTracks, 3);
    if (recommendations.length > 0) {
      return recommendations[Math.floor(Math.random() * recommendations.length)];
    }

    return null;
  }, [getSimilarTracks, getRecommendedTracks]);

  // Obtenir des recommandations basées sur l'humeur
  const getMoodBasedRecommendations = useCallback((mood: string, allTracks: Track[], limit: number = 10): Track[] => {
    const moodGenres: { [key: string]: string[] } = {
      'energetic': ['rock', 'electronic', 'dance', 'pop'],
      'chill': ['ambient', 'jazz', 'lofi', 'classical'],
      'happy': ['pop', 'reggae', 'folk', 'indie'],
      'sad': ['blues', 'soul', 'ballad', 'acoustic'],
      'focused': ['instrumental', 'classical', 'ambient', 'post-rock'],
      'party': ['dance', 'hip-hop', 'electronic', 'reggaeton'],
    };

    const targetGenres = moodGenres[mood.toLowerCase()] || [];
    if (!targetGenres.length) return [];

    return allTracks
      .filter(track => track.genre?.some(g => targetGenres.includes(g.toLowerCase())))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, limit);
  }, []);

  // Analyser et mettre à jour les préférences après écoute
  const analyzeListeningSession = useCallback((track: Track, listenDuration: number) => {
    saveToHistory(track);
    updatePreferences(track);

    // Mettre à jour le temps d'écoute
    if (session?.user?.id) {
      setUserPreferences(prev => {
        const newPreferences = {
          ...prev,
          listeningTime: prev.listeningTime + listenDuration
        };
        localStorage.setItem(`userPreferences_${session.user.id}`, JSON.stringify(newPreferences));
        return newPreferences;
      });
    }
  }, [saveToHistory, updatePreferences, session?.user?.id]);

  return {
    userHistory,
    userPreferences,
    getSimilarTracks,
    getRecommendedTracks,
    getAutoPlayNext,
    getMoodBasedRecommendations,
    analyzeListeningSession,
    saveToHistory,
    updatePreferences,
  };
}; 