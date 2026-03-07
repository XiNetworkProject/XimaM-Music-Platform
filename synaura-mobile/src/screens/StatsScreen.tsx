import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { api, ApiTrack } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENT = '#7B61FF';
const ACCENT_CYAN = '#00D0BB';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

type OverviewStat = {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const StatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalPlays: number;
    totalLikes: number;
    totalShares: number;
    totalFavorites: number;
  }>({ totalPlays: 0, totalLikes: 0, totalShares: 0, totalFavorites: 0 });
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [statsRes, tracksRes] = await Promise.all([
      api.getCreatorStats(),
      user?.username ? api.getUserTracks(user.username) : Promise.resolve({ success: false as const, error: 'no user' }),
    ]);

    if (statsRes.success && statsRes.data.stats) {
      const s = statsRes.data.stats;
      setStats({
        totalPlays: s.totalPlays ?? s.plays ?? 0,
        totalLikes: s.totalLikes ?? s.likes ?? 0,
        totalShares: s.totalShares ?? s.shares ?? 0,
        totalFavorites: s.totalFavorites ?? s.favorites ?? 0,
      });
    }

    if (tracksRes.success) {
      const sorted = [...(tracksRes.data.tracks ?? [])].sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
      setTracks(sorted);
      setIsCreator(sorted.length > 0);
    } else {
      setIsCreator(false);
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTrack(expandedTrack === id ? null : id);
  };

  const maxPlays = tracks.length > 0 ? Math.max(...tracks.map(t => t.plays ?? 0), 1) : 1;

  const overviewStats: OverviewStat[] = [
    { label: 'Écoutes', value: stats.totalPlays, icon: 'headset-outline', color: ACCENT },
    { label: 'Likes', value: stats.totalLikes, icon: 'heart-outline', color: '#FF6B8A' },
    { label: 'Partages', value: stats.totalShares, icon: 'share-social-outline', color: ACCENT_CYAN },
    { label: 'Favoris', value: stats.totalFavorites, icon: 'star-outline', color: '#FFB800' },
  ];

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  if (!isCreator) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Pas encore de stats</Text>
          <Text style={styles.emptySubtitle}>Publie ta première piste pour voir tes stats</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Overview Grid */}
        <View style={styles.overviewGrid}>
          {overviewStats.map((s, i) => (
            <View key={i} style={styles.overviewCard}>
              <View style={[styles.overviewIconWrap, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={styles.overviewValue}>{formatNumber(s.value)}</Text>
              <Text style={styles.overviewLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tracks Section */}
        <Text style={styles.sectionTitle}>Mes pistes</Text>
        {tracks.map((track, i) => {
          const plays = track.plays ?? 0;
          const barWidth = Math.max((plays / maxPlays) * 100, 4);
          const isExpanded = expandedTrack === track._id;

          return (
            <Pressable key={track._id} onPress={() => toggleExpand(track._id)}>
              <View style={[styles.trackCard, isExpanded && styles.trackCardExpanded]}>
                <View style={styles.trackRow}>
                  <Text style={styles.trackRank}>#{i + 1}</Text>
                  {track.coverUrl ? (
                    <Image source={{ uri: track.coverUrl }} style={styles.trackCover} />
                  ) : (
                    <LinearGradient
                      colors={[ACCENT, ACCENT_CYAN]}
                      style={styles.trackCover}
                    >
                      <Ionicons name="musical-note" size={18} color="#fff" />
                    </LinearGradient>
                  )}
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                    <View style={styles.trackBar}>
                      <LinearGradient
                        colors={[ACCENT, ACCENT_CYAN]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.trackBarFill, { width: `${barWidth}%` as any }]}
                      />
                    </View>
                  </View>
                  <Text style={styles.trackPlays}>{formatNumber(plays)}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>

                {isExpanded && (
                  <View style={styles.trackDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="headset-outline" size={16} color={ACCENT} />
                      <Text style={styles.detailLabel}>Écoutes</Text>
                      <Text style={styles.detailValue}>{plays}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={ACCENT} />
                      <Text style={styles.detailLabel}>Durée</Text>
                      <Text style={styles.detailValue}>
                        {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                      </Text>
                    </View>
                    {track.genre && track.genre.length > 0 && (
                      <View style={styles.detailRow}>
                        <Ionicons name="pricetag-outline" size={16} color={ACCENT} />
                        <Text style={styles.detailLabel}>Genre</Text>
                        <Text style={styles.detailValue}>{track.genre.join(', ')}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {tracks.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="musical-notes-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyCardText}>Aucune piste pour le moment</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function Header({ navigation }: { navigation: any }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>Statistiques</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020017' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: 16 },

  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 28,
  },
  overviewCard: {
    width: '48%' as any,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
    flexBasis: '46%' as any,
  },
  overviewIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  overviewLabel: { fontSize: 12, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  trackCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 8,
  },
  trackCardExpanded: { borderColor: 'rgba(123,97,255,0.3)' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackRank: { fontSize: 13, fontWeight: '800', color: colors.textTertiary, width: 24, textAlign: 'center' },
  trackCover: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1, gap: 6 },
  trackTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  trackBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  trackBarFill: { height: 4, borderRadius: 2 },
  trackPlays: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, minWidth: 36, textAlign: 'right' },

  trackDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    gap: 10,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { flex: 1, fontSize: 13, color: colors.textTertiary },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyCardText: { fontSize: 14, color: colors.textTertiary },
});

export default StatsScreen;
