import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { 
  MusicIcon, 
  PlayIcon, 
  PauseIcon,
  HeartIcon, 
  RadioIcon, 
  TrendingIcon, 
  StarIcon, 
  RefreshIcon,
  ArrowRightIcon,
  UserIcon,
  GiftIcon,
  SparklesIcon,
  HeadphonesIcon,
  EyeIcon,
  ShareIcon
} from '../components/IconSystem';
import { TrackCover, UserAvatar } from '../components/ImageSystem';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import radioService, { RadioData } from '../services/radioService';
import SearchBar from '../components/SearchBar';

const { width } = Dimensions.get('window');

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  coverUrl?: string;
  audioUrl: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  createdAt: string;
  genre?: string[];
  description?: string;
  isDiscovery?: boolean;
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // États pour les différentes catégories
  const [categories, setCategories] = useState<Record<string, { tracks: Track[]; loading: boolean; error: string | null }>>({
    featured: { tracks: [], loading: false, error: null },
    trending: { tracks: [], loading: false, error: null },
    popular: { tracks: [], loading: false, error: null },
    recent: { tracks: [], loading: false, error: null },
    mostLiked: { tracks: [], loading: false, error: null },
    following: { tracks: [], loading: false, error: null },
    recommended: { tracks: [], loading: false, error: null }
  });

  // États pour les statistiques en temps réel
  const [realTimeStats, setRealTimeStats] = useState<{
    tracks: number;
    artists: number;
    totalPlays: number;
    totalLikes: number;
    loading: boolean;
    error: string | null;
  }>({
    tracks: 0,
    artists: 0,
    totalPlays: 0,
    totalLikes: 0,
    loading: false,
    error: null
  });

  // États pour la radio
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [radioData, setRadioData] = useState<RadioData>({
    name: 'Mixx Party Radio',
    description: 'Radio électronique en continu 24h/24',
    status: 'LIVE',
    isOnline: true,
    currentTrack: {
      title: 'Mixx Party Radio',
      artist: 'En boucle continue',
      genre: 'Electronic',
      album: 'Mixx Party Collection'
    },
    stats: {
      listeners: 0,
      bitrate: 128,
      uptime: '24h/24',
      quality: 'Standard'
    },
    technical: {
      serverName: 'Mixx Party Server',
      serverDescription: 'Radio en boucle continue',
      contentType: 'audio/mpeg',
      serverType: 'Icecast',
      serverVersion: '2.4.0'
    },
    lastUpdate: new Date().toISOString(),
    streamUrl: 'https://rocket.streamradio.fr/stream/mixxparty'
  });

  // Fonction pour charger les données radio
  const loadRadioData = async () => {
    try {
      const response = await radioService.getRadioStatus();
      if (response.success) {
        setRadioData(response.data);
        console.log('📻 Données radio chargées:', {
          listeners: response.data.stats.listeners,
          currentTrack: response.data.currentTrack.title,
          quality: response.data.stats.quality
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement données radio:', error);
    }
  };

  // Fonction pour gérer la lecture/arrêt de la radio
  const handleRadioToggle = () => {
    setIsRadioPlaying(!isRadioPlaying);
    // Ici vous pouvez ajouter la logique pour démarrer/arrêter la radio
    console.log('Radio toggle:', !isRadioPlaying ? 'Playing' : 'Stopped');
  };

  // États pour les recommandations personnalisées
  const [personalRecommendations, setPersonalRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // États pour les découvertes du jour
  const [dailyDiscoveries, setDailyDiscoveries] = useState<Track[]>([]);

      // Données de test pour le développement
  const mockTracks: Track[] = [
    {
      _id: '1',
      title: 'Midnight Vibes',
      isDiscovery: true,
      artist: { _id: '1', name: 'DJ Electro', username: 'djelectro' },
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      audioUrl: 'https://example.com/audio1.mp3',
      duration: 180,
      likes: ['user1', 'user2'],
      comments: ['comment1'],
      plays: 1250,
      createdAt: '2024-01-01',
      genre: ['House', 'Electronic']
    },
    {
      _id: '2',
      title: 'Summer Groove',
      artist: { _id: '2', name: 'MC Groove', username: 'mcgroove' },
      coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
      audioUrl: 'https://example.com/audio2.mp3',
      duration: 210,
      likes: ['user1', 'user3'],
      comments: ['comment2'],
      plays: 890,
      createdAt: '2024-01-02',
      genre: ['Funk', 'Soul']
    },
    {
      _id: '3',
      title: 'Deep House Session',
      artist: { _id: '3', name: 'House Master', username: 'housemaster' },
      coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
      audioUrl: 'https://example.com/audio3.mp3',
      duration: 240,
      likes: ['user2', 'user4'],
      comments: ['comment3'],
      plays: 2100,
      createdAt: '2024-01-03',
      genre: ['Deep House', 'Electronic']
    }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // Mise à jour automatique des données radio toutes les 30 secondes
  useEffect(() => {
    const radioInterval = setInterval(() => {
      loadRadioData();
    }, 30000);

    return () => clearInterval(radioInterval);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Charger les données en parallèle
      const [
        featuredResponse,
        trendingResponse,
        popularResponse,
        recentResponse,
        mostLikedResponse,
        followingResponse,
        recommendedResponse,
        statsResponse,
        recommendationsResponse,
        radioResponse
      ] = await Promise.all([
        apiService.getFeaturedTracks(),
        apiService.getTrendingTracks(),
        apiService.getPopularTracks(),
        apiService.getRecentTracks(),
        apiService.getMostLikedTracks(),
        apiService.getFollowingTracks(),
        apiService.getRecommendedTracks(),
        apiService.getRealTimeStats(),
        apiService.getPersonalRecommendations(),
        loadRadioData()
      ]);

      // Mettre à jour les catégories
      setCategories(prev => ({
        ...prev,
        featured: { 
          tracks: featuredResponse.success ? featuredResponse.data || [] : mockTracks, 
          loading: false, 
          error: featuredResponse.error || null
        },
        trending: { 
          tracks: trendingResponse.success ? trendingResponse.data || [] : mockTracks.slice(0, 2), 
          loading: false, 
          error: trendingResponse.error || null
        },
        popular: { 
          tracks: popularResponse.success ? popularResponse.data || [] : mockTracks, 
          loading: false, 
          error: popularResponse.error || null
        },
        recent: { 
          tracks: recentResponse.success ? recentResponse.data || [] : mockTracks.slice(1), 
          loading: false, 
          error: recentResponse.error || null
        },
        mostLiked: { 
          tracks: mostLikedResponse.success ? mostLikedResponse.data || [] : mockTracks, 
          loading: false, 
          error: mostLikedResponse.error || null
        },
        following: { 
          tracks: followingResponse.success ? followingResponse.data || [] : mockTracks.slice(0, 2), 
          loading: false, 
          error: followingResponse.error || null
        },
        recommended: { 
          tracks: recommendedResponse.success ? recommendedResponse.data || [] : mockTracks, 
          loading: false, 
          error: recommendedResponse.error || null
        }
      }));

      // Mettre à jour les statistiques
      if (statsResponse.success) {
        setRealTimeStats({
          tracks: statsResponse.data?.tracks || 0,
          artists: statsResponse.data?.artists || 0,
          totalPlays: statsResponse.data?.totalPlays || 0,
          totalLikes: statsResponse.data?.totalLikes || 0,
          loading: false,
          error: null
        });
      } else {
        setRealTimeStats({
          tracks: 15420,
          artists: 2847,
          totalPlays: 2847591,
          totalLikes: 847392,
          loading: false,
          error: statsResponse.error || null
        });
      }

      // Charger les découvertes du jour
      if (featuredResponse.success) {
        // Marquer les 3 premiers comme découvertes
        const discoveries = (featuredResponse.data || []).slice(0, 3).map(track => ({
          ...track,
          isDiscovery: true
        }));
        setDailyDiscoveries(discoveries);
      } else {
        // Données de test si l'API échoue
        setDailyDiscoveries(mockTracks.slice(0, 3).map(track => ({
          ...track,
          isDiscovery: true
        })));
      }

      // Mettre à jour les recommandations
      if (recommendationsResponse.success) {
        setPersonalRecommendations(recommendationsResponse.data || []);
      } else {
        setPersonalRecommendations([
          {
            title: 'Basé sur vos goûts',
            description: 'Découvrez des artistes similaires à ceux que vous aimez',
            type: 'Basé sur vos goûts',
            confidence: '95%',
            icon: 'trending-up',
            tracks: mockTracks.slice(0, 2)
          },
          {
            title: 'Nouveautés populaires',
            description: 'Les dernières sorties qui cartonnent',
            type: 'Nouveautés populaires',
            confidence: '92%',
            icon: 'star',
            tracks: mockTracks.slice(1)
          }
        ]);
      }

      // Les données radio sont maintenant chargées via loadRadioData()

    } catch (error) {
      console.error('Erreur chargement données:', error);
      // Utiliser les données de fallback en cas d'erreur
      setCategories(prev => ({
        ...prev,
        featured: { tracks: mockTracks, loading: false, error: 'Erreur de connexion' },
        trending: { tracks: mockTracks.slice(0, 2), loading: false, error: 'Erreur de connexion' },
        popular: { tracks: mockTracks, loading: false, error: 'Erreur de connexion' },
        recent: { tracks: mockTracks.slice(1), loading: false, error: 'Erreur de connexion' },
        mostLiked: { tracks: mockTracks, loading: false, error: 'Erreur de connexion' },
        following: { tracks: mockTracks.slice(0, 2), loading: false, error: 'Erreur de connexion' },
        recommended: { tracks: mockTracks, loading: false, error: 'Erreur de connexion' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const TrackCard = ({ track, size = 'md' }: { track: Track; size?: 'sm' | 'md' | 'lg' }) => (
    <TouchableOpacity style={[styles.trackCard, size === 'sm' && styles.trackCardSmall]}>
      <View style={styles.trackImageContainer}>
        <TrackCover 
          source={track.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'} 
          size={size === 'sm' ? 100 : 120}
        />
        <TouchableOpacity style={styles.playButton}>
          <PlayIcon size={16} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, size === 'sm' && styles.trackTitleSmall]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={[styles.trackArtist, size === 'sm' && styles.trackArtistSmall]} numberOfLines={1}>
          {track.artist.name}
        </Text>
        <View style={styles.trackStats}>
          <View style={styles.statItem}>
            <PlayIcon size={12} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.statText}>{formatNumber(track.plays)}</Text>
          </View>
          <View style={styles.statItem}>
            <HeartIcon size={12} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.statText}>{track.likes.length}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const CategorySection = ({ title, tracks, loading, error }: any) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tracksScroll}>
          {tracks.map((track: Track) => (
            <View key={track._id} style={styles.trackCardWrapper}>
              <TrackCard track={track} size="sm" />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
      }
    >
      {/* Header avec salutation */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              Bonjour, {user?.username || 'Musicien'} 👋
            </Text>
            <Text style={styles.subtitle}>
              Découvrez de nouvelles musiques
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <UserIcon size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      <SearchBar />

      {/* Statistiques en temps réel */}
      <View style={styles.statsContainer}>
                  <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MusicIcon size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{formatNumber(realTimeStats.tracks)}</Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
            <View style={styles.statCard}>
              <UserIcon size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{formatNumber(realTimeStats.artists)}</Text>
              <Text style={styles.statLabel}>Artistes</Text>
            </View>
            <View style={styles.statCard}>
              <PlayIcon size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{formatNumber(realTimeStats.totalPlays)}</Text>
              <Text style={styles.statLabel}>Écoutes</Text>
            </View>
            <View style={styles.statCard}>
              <HeartIcon size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{formatNumber(realTimeStats.totalLikes)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>
      </View>

      {/* Section Radio - Version Améliorée */}
      <View style={styles.radioSection}>
        {/* En-tête de la section */}
        <View style={styles.radioSectionHeader}>
          <View style={styles.radioBadge}>
            <View style={styles.radioBadgeDot} />
            <Text style={styles.radioBadgeText}>EN DIRECT</Text>
            <RadioIcon size={14} color="#06B6D4" />
          </View>
          <Text style={styles.radioSectionTitle}>Mixx Party Radio</Text>
          <Text style={styles.radioSectionSubtitle}>La radio électronique qui pulse 24h/24</Text>
        </View>

        {/* Carte principale de la radio */}
        <View style={styles.radioCard}>
          {/* En-tête de la radio */}
          <View style={styles.radioHeader}>
            <View style={styles.radioIconContainer}>
              <RadioIcon size={28} color="white" />
              <View style={styles.radioIconGlow} />
            </View>
            <View style={styles.radioInfo}>
              <Text style={styles.radioTitle}>Mixx Party Radio</Text>
              <Text style={styles.radioSubtitle}>Musique électronique en continu • 24h/24</Text>
              <View style={styles.radioStatusContainer}>
                <View style={styles.radioStatusDot} />
                <Text style={styles.radioStatusText}>LIVE</Text>
              </View>
            </View>
          </View>

          {/* Statistiques */}
          <View style={styles.radioStats}>
            <View style={styles.radioStatItem}>
              <View style={styles.radioStatHeader}>
                <HeadphonesIcon size={16} color="#06B6D4" />
                <Text style={styles.radioStatLabel}>Auditeurs</Text>
              </View>
              <Text style={styles.radioStatValue}>{radioService.formatListeners(radioData.stats.listeners)}</Text>
            </View>
            
            <View style={styles.radioStatItem}>
              <View style={styles.radioStatHeader}>
                <View style={styles.radioStatDot} />
                <Text style={styles.radioStatLabel}>Statut</Text>
              </View>
              <Text style={styles.radioStatValueLive}>LIVE</Text>
            </View>
            
            <View style={styles.radioStatItem}>
              <View style={styles.radioStatHeader}>
                <View style={[styles.radioStatDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.radioStatLabel}>Qualité</Text>
              </View>
              <Text style={[styles.radioStatValueHD, { color: radioService.getQualityColor(radioData.stats.quality) }]}>
                {radioData.stats.quality}
              </Text>
            </View>
          </View>

          {/* Bouton de contrôle principal */}
          <TouchableOpacity 
            style={[
              styles.radioPlayButtonMain,
              isRadioPlaying ? styles.radioPlayButtonStop : styles.radioPlayButtonPlay
            ]}
            onPress={handleRadioToggle}
          >
            <View style={styles.radioPlayButtonContent}>
              {isRadioPlaying ? (
                <>
                  <PauseIcon size={24} color="white" />
                  <Text style={styles.radioPlayButtonText}>Arrêter la Radio</Text>
                </>
              ) : (
                <>
                  <PlayIcon size={24} color="white" />
                  <Text style={styles.radioPlayButtonText}>Écouter la Radio</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Informations sur la piste actuelle */}
          <View style={styles.radioTrackCard}>
            <View style={styles.radioTrackHeader}>
              <View style={styles.radioTrackDot} />
              <Text style={styles.radioTrackHeaderText}>En cours de lecture</Text>
            </View>
            
            <View style={styles.radioTrackContent}>
              <View style={styles.radioTrackIcon}>
                <RadioIcon size={32} color="#8B5CF6" />
              </View>
              <View style={styles.radioTrackInfo}>
                <Text style={styles.radioTrackTitle} numberOfLines={2}>
                  {radioData.currentTrack.title || 'Chargement...'}
                </Text>
                <Text style={styles.radioTrackArtist}>Mixx Party Radio</Text>
                <Text style={styles.radioTrackUpdate}>
                  Mis à jour: {radioService.getTimeSinceUpdate(radioData.lastUpdate)}
                </Text>
                <View style={styles.radioStatusIndicator}>
                  <View style={styles.radioStatusDot} />
                  <Text style={styles.radioStatusText}>Simulation réaliste</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Boutons d'action secondaires */}
          <View style={styles.radioActions}>
            <TouchableOpacity 
              style={styles.radioActionButton}
              onPress={() => setShowProgramDialog(true)}
            >
              <EyeIcon size={18} color="white" />
              <Text style={styles.radioActionText}>Programme</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioActionButton, styles.radioActionButtonSecondary]}
              onPress={() => {
                // Fonctionnalité de partage
                Share.share({
                  title: 'Mixx Party Radio',
                  message: 'Écoutez Mixx Party Radio en direct !',
                  url: 'https://synaura.com'
                });
              }}
            >
              <ShareIcon size={18} color="white" />
              <Text style={styles.radioActionText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Section Découvertes du Jour */}
      {dailyDiscoveries.length > 0 && (
        <View style={styles.discoveriesSection}>
          <View style={styles.discoveriesHeader}>
            <View style={styles.discoveriesTitleContainer}>
              <GiftIcon size={28} color="#F59E0B" />
              <View>
                <Text style={styles.discoveriesTitle}>Découvertes du Jour</Text>
                <Text style={styles.discoveriesSubtitle}>Nos coups de cœur sélectionnés rien que pour vous</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.discoveriesButton}>
              <Text style={styles.discoveriesButtonText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.discoveriesGrid}>
            {dailyDiscoveries.map((track, index) => (
              <View key={track._id} style={styles.discoveryCard}>
                {/* Badge Découverte */}
                <View style={styles.discoveryBadge}>
                  <SparklesIcon size={12} color="white" />
                  <Text style={styles.discoveryBadgeText}>Découverte</Text>
                </View>
                {/* Image */}
                <View style={styles.discoveryImageContainer}>
                  <TrackCover source={track.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'} size={112} />
                </View>
                {/* Titre */}
                <Text style={styles.discoveryTitle} numberOfLines={1}>
                  {track.title || 'Titre inconnu'}
                </Text>
                {/* Artiste */}
                <Text style={styles.discoveryArtist} numberOfLines={1}>
                  {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                </Text>
                {/* Durée + Bouton play */}
                <View style={styles.discoveryControls}>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{formatDuration(track.duration)}</Text>
                  </View>
                  <TouchableOpacity style={styles.discoveryPlayButton}>
                    <PlayIcon size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {/* Stats */}
                <View style={styles.discoveryStats}>
                  <View style={styles.discoveryStatItem}>
                    <PlayIcon size={12} color="rgba(255, 255, 255, 0.6)" />
                    <Text style={styles.discoveryStatText}>{formatNumber(track.plays)}</Text>
                  </View>
                  <View style={styles.discoveryStatItem}>
                    <HeartIcon size={12} color="rgba(255, 255, 255, 0.6)" />
                    <Text style={styles.discoveryStatText}>{track.likes?.length || 0}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sections de tracks */}
      <CategorySection 
        title="À la une" 
        tracks={categories.featured.tracks} 
        loading={categories.featured.loading}
        error={categories.featured.error}
      />

      <CategorySection 
        title="Tendances" 
        tracks={categories.trending.tracks} 
        loading={categories.trending.loading}
        error={categories.trending.error}
      />

      <CategorySection 
        title="Populaires" 
        tracks={categories.popular.tracks} 
        loading={categories.popular.loading}
        error={categories.popular.error}
      />

      {/* Recommandations personnalisées */}
      <View style={styles.recommendationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommandations pour vous</Text>
          <TouchableOpacity>
            <RefreshIcon size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
        
        {recommendationsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        ) : (
          <View style={styles.recommendationsGrid}>
            {personalRecommendations.map((rec: any, index: number) => (
              <TouchableOpacity key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                                     <View style={styles.recommendationIcon}>
                     {rec.icon === 'trending-up' ? (
                       <TrendingIcon size={20} color="white" />
                     ) : rec.icon === 'star' ? (
                       <StarIcon size={20} color="white" />
                     ) : (
                       <MusicIcon size={20} color="white" />
                     )}
                   </View>
                  <View style={styles.recommendationBadge}>
                    <Text style={styles.recommendationBadgeText}>{rec.confidence}</Text>
                  </View>
                </View>
                <Text style={styles.recommendationType}>{rec.type}</Text>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>{rec.description}</Text>
                <TouchableOpacity style={styles.recommendationButton}>
                  <Text style={styles.recommendationButtonText}>Découvrir</Text>
                                     <ArrowRightIcon size={16} color="white" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Sections supplémentaires */}
      <CategorySection 
        title="Récent" 
        tracks={categories.recent.tracks} 
        loading={categories.recent.loading}
        error={categories.recent.error}
      />

      <CategorySection 
        title="Plus aimés" 
        tracks={categories.mostLiked.tracks} 
        loading={categories.mostLiked.loading}
        error={categories.mostLiked.error}
      />

      {user && (
        <CategorySection 
          title="Abonnements" 
          tracks={categories.following.tracks} 
          loading={categories.following.loading}
          error={categories.following.error}
        />
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  // Styles améliorés pour la section radio
  radioSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  radioSectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  radioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginBottom: 12,
  },
  radioBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06B6D4',
    marginRight: 6,
  },
  radioBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06B6D4',
    marginRight: 6,
  },
  radioSectionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  radioSectionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  radioCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  radioIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  radioIconGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
    opacity: 0.5,
  },
  radioInfo: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  radioSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  radioStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  radioStatItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  radioStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  radioStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  radioStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  radioStatValueLive: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  radioStatValueHD: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  radioPlayButtonMain: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  radioPlayButtonPlay: {
    backgroundColor: '#8B5CF6',
  },
  radioPlayButtonStop: {
    backgroundColor: '#EF4444',
  },
  radioPlayButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioPlayButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  radioTrackCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  radioTrackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioTrackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  radioTrackHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  radioTrackContent: {
    alignItems: 'center',
  },
  radioTrackIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioTrackInfo: {
    alignItems: 'center',
  },
  radioTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  radioTrackArtist: {
    fontSize: 14,
    color: 'rgba(139, 92, 246, 0.8)',
  },
  radioTrackUpdate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  radioStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  radioStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 4,
  },
  radioStatusText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  radioActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioActionButton: {
    flex: 1,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActionButtonSecondary: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
  },
  radioActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  tracksScroll: {
    paddingLeft: 20,
  },
  trackCardWrapper: {
    marginRight: 12,
  },
  trackCard: {
    width: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trackCardSmall: {
    width: 120,
    padding: 8,
  },
  trackImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  trackImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  trackImageSmall: {
    height: 100,
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  trackTitleSmall: {
    fontSize: 12,
  },
  trackArtist: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
  },
  trackArtistSmall: {
    fontSize: 10,
  },
  trackStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 2,
  },
  recommendationsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  recommendationsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recommendationCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendationBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  recommendationType: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    lineHeight: 16,
  },
  recommendationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  recommendationButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomSpacer: {
    height: 100,
  },
  // Styles pour la section Découvertes du Jour
  discoveriesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  discoveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  discoveriesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  discoveriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  discoveriesSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 12,
    marginTop: 2,
  },
  discoveriesButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  discoveriesButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  discoveriesGrid: {
    marginHorizontal: -10,
  },
  discoveryCard: {
    width: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  discoveryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  discoveryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  discoveryImageContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  discoveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  discoveryArtist: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
  discoveryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
  },
  discoveryPlayButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoveryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 8,
  },
  discoveryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryStatText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 2,
  },
});

export default HomeScreen; 