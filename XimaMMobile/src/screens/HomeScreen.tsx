import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../services/api';
import { Track, User } from '../types';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalPlays: 0,
    totalLikes: 0,
    totalComments: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      
      // Charger les données en parallèle
      const [
        featuredResponse,
        trendingResponse,
        recentResponse,
        popularResponse,
        statsResponse,
      ] = await Promise.all([
        apiService.getFeaturedTracks(),
        apiService.getTrendingTracks(),
        apiService.getRecentTracks(),
        apiService.getPopularTracks(),
        apiService.getStats(),
      ]);

      if (featuredResponse.success) setFeaturedTracks(featuredResponse.data || []);
      if (trendingResponse.success) setTrendingTracks(trendingResponse.data || []);
      if (recentResponse.success) setRecentTracks(recentResponse.data || []);
      if (popularResponse.success) setPopularTracks(popularResponse.data || []);
      if (statsResponse.success) setStats(statsResponse.data || stats);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadData();
  };

  const handleTrackPress = (track: Track) => {
    navigation.navigate('TrackDetail', { trackId: track._id });
  };

  const handleUserPress = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const handleLikeTrack = async (track: Track) => {
    try {
      const response = track.isLiked
        ? await apiService.unlikeTrack(track._id)
        : await apiService.likeTrack(track._id);

      if (response.success) {
        // Mettre à jour l'état local
        const updatedTrack = { ...track, isLiked: !track.isLiked };
        const updateTrackInList = (list: Track[]) =>
          list.map(t => t._id === track._id ? updatedTrack : t);

        setFeaturedTracks(updateTrackInList);
        setTrendingTracks(updateTrackInList);
        setRecentTracks(updateTrackInList);
        setPopularTracks(updateTrackInList);
      }
    } catch (error) {
      console.error('Erreur lors du like:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const TrackCard = ({ track, showArtist = true }: { track: Track; showArtist?: boolean }) => (
    <TouchableOpacity
      style={styles.trackCard}
      onPress={() => handleTrackPress(track)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: track.coverUrl || 'https://via.placeholder.com/80' }}
        style={styles.trackCover}
        resizeMode="cover"
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        {showArtist && (
          <TouchableOpacity onPress={() => handleUserPress(track.artistId)}>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {track.artist}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.trackStats}>
          <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
          <Text style={styles.trackPlays}>{formatNumber(track.plays)} écoutes</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => handleLikeTrack(track)}
        activeOpacity={0.7}
      >
        <Icon
          name={track.isLiked ? 'favorite' : 'favorite-border'}
          size={20}
          color={track.isLiked ? '#FF6B6B' : '#999'}
        />
        <Text style={[styles.likeCount, track.isLiked && styles.likedCount]}>
          {formatNumber(track.likes)}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title, onPress }: { title: string; onPress?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Voir tout</Text>
          <Icon name="chevron-right" size={16} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  const StatsCard = ({ title, value, icon }: { title: string; value: string; icon: string }) => (
    <View style={styles.statsCard}>
      <Icon name={icon} size={24} color="#FF6B6B" />
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                Bonjour, {user?.username || 'Utilisateur'} 👋
              </Text>
              <Text style={styles.subtitle}>
                Découvrez de nouvelles musiques
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Image
                source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
                style={styles.profileAvatar}
              />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatsCard
              title="Titres"
              value={formatNumber(stats.totalTracks)}
              icon="music-note"
            />
            <StatsCard
              title="Écoutes"
              value={formatNumber(stats.totalPlays)}
              icon="play-circle-outline"
            />
            <StatsCard
              title="Likes"
              value={formatNumber(stats.totalLikes)}
              icon="favorite"
            />
            <StatsCard
              title="Commentaires"
              value={formatNumber(stats.totalComments)}
              icon="chat-bubble-outline"
            />
          </View>

          {/* Featured Tracks */}
          {featuredTracks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Titres en vedette" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {featuredTracks.map((track) => (
                  <View key={track._id} style={styles.featuredTrack}>
                    <TouchableOpacity onPress={() => handleTrackPress(track)}>
                      <Image
                        source={{ uri: track.coverUrl || 'https://via.placeholder.com/120' }}
                        style={styles.featuredCover}
                      />
                      <View style={styles.featuredOverlay}>
                        <Icon name="play-circle-fill" size={40} color="white" />
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.featuredTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.featuredArtist} numberOfLines={1}>
                      {track.artist}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending Tracks */}
          {trendingTracks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Tendances" />
              {trendingTracks.slice(0, 5).map((track) => (
                <TrackCard key={track._id} track={track} />
              ))}
            </View>
          )}

          {/* Recent Tracks */}
          {recentTracks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Nouveautés" />
              {recentTracks.slice(0, 5).map((track) => (
                <TrackCard key={track._id} track={track} />
              ))}
            </View>
          )}

          {/* Popular Tracks */}
          {popularTracks.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Populaires" />
              {popularTracks.slice(0, 5).map((track) => (
                <TrackCard key={track._id} track={track} />
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Upload')}
            >
              <View style={styles.actionGradient}>
                <Icon name="add" size={24} color="white" />
                <Text style={styles.actionText}>Uploader</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Discover')}
            >
              <View style={styles.actionGradient}>
                <Icon name="explore" size={24} color="white" />
                <Text style={styles.actionText}>Découvrir</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Community')}
            >
              <View style={styles.actionGradient}>
                <Icon name="people" size={24} color="white" />
                <Text style={styles.actionText}>Communauté</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  featuredTrack: {
    width: 120,
    marginLeft: 20,
    marginRight: 10,
  },
  featuredCover: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
    textAlign: 'center',
  },
  featuredArtist: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 15,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  trackPlays: {
    fontSize: 12,
    color: '#666',
  },
  likeButton: {
    alignItems: 'center',
    marginLeft: 10,
  },
  likeCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  likedCount: {
    color: '#FF6B6B',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  actionGradient: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});

export default HomeScreen; 