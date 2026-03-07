import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { api } from '../services/api';

const ACCENT = '#7B61FF';
const ACCENT_DARK = '#6F4CFF';
const ACCENT_CYAN = '#00D0BB';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

type BoosterReward = { type: string; label?: string; amount?: number; icon?: string };

const BoostersScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [streak, setStreak] = useState(0);
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [rewards, setRewards] = useState<BoosterReward[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rewardAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (canClaim) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [canClaim]);

  useEffect(() => {
    if (!nextClaimAt || canClaim) { setCountdown(''); return; }
    const update = () => {
      const diff = new Date(nextClaimAt).getTime() - Date.now();
      if (diff <= 0) { setCountdown(''); setCanClaim(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextClaimAt, canClaim]);

  const loadData = async () => {
    setLoading(true);
    const [statusRes, historyRes] = await Promise.all([
      api.getBoosterStatus(),
      api.getBoosterHistory(),
    ]);
    if (statusRes.success) {
      setCanClaim(statusRes.data.canClaim);
      setStreak(statusRes.data.streak ?? 0);
      setNextClaimAt(statusRes.data.nextClaimAt ?? null);
    }
    if (historyRes.success) {
      setHistory(historyRes.data.history ?? []);
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    setClaiming(true);
    const res = await api.claimBoosterPack();
    setClaiming(false);
    if (res.success) {
      const r = (res.data.rewards ?? []).map((rw: any, i: number) => ({
        type: rw.type ?? 'bonus',
        label: rw.label ?? rw.type ?? `Récompense ${i + 1}`,
        amount: rw.amount,
        icon: rw.icon,
      }));
      setRewards(r);
      setStreak(res.data.streak ?? streak + 1);
      setCanClaim(false);
      animateRewards(r.length);
      loadData();
    }
  };

  const animateRewards = (count: number) => {
    rewardAnims.length = 0;
    for (let i = 0; i < count; i++) {
      const a = new Animated.Value(0);
      rewardAnims.push(a);
    }
    setShowRewards(true);
    const animations = rewardAnims.map((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 400, delay: i * 150, useNativeDriver: true })
    );
    Animated.stagger(150, animations).start();
  };

  const rewardIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'credits': return 'diamond-outline';
      case 'xp': return 'star-outline';
      case 'badge': return 'ribbon-outline';
      case 'track': return 'musical-note-outline';
      default: return 'gift-outline';
    }
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
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

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Streak */}
        <View style={styles.streakRow}>
          <LinearGradient colors={['rgba(255,140,50,0.2)', 'rgba(255,80,50,0.1)']} style={styles.streakBadge}>
            <Ionicons name="flame" size={22} color="#FF8C32" />
            <Text style={styles.streakNumber}>{streak}</Text>
          </LinearGradient>
          <View>
            <Text style={styles.streakLabel}>Série en cours</Text>
            <Text style={styles.streakSub}>{streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}` : 'Commence ta série !'}</Text>
          </View>
        </View>

        {/* Open Pack Button */}
        <View style={styles.packSection}>
          {canClaim ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable onPress={handleClaim} disabled={claiming}>
                <LinearGradient
                  colors={[ACCENT, ACCENT_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.packButton}
                >
                  {claiming ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="gift" size={40} color="#fff" />
                      <Text style={styles.packButtonText}>Ouvrir le pack</Text>
                      <Text style={styles.packButtonSub}>Récompense quotidienne disponible !</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.packUnavailable}>
              <LinearGradient
                colors={['rgba(123,97,255,0.15)', 'rgba(123,97,255,0.05)']}
                style={styles.packButton}
              >
                <Ionicons name="time-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.packButtonTextDisabled}>Prochain pack</Text>
                {countdown ? (
                  <Text style={styles.countdownText}>{countdown}</Text>
                ) : (
                  <Text style={styles.packButtonSub}>Reviens demain !</Text>
                )}
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Rewards reveal */}
        {showRewards && rewards.length > 0 && (
          <View style={styles.rewardsSection}>
            <Text style={styles.sectionTitle}>Récompenses obtenues</Text>
            {rewards.map((r, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.rewardCard,
                  {
                    opacity: rewardAnims[i] ?? 1,
                    transform: [{ translateY: (rewardAnims[i] ?? new Animated.Value(1)).interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[ACCENT, ACCENT_CYAN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rewardIconWrap}
                >
                  <Ionicons name={rewardIcon(r.type)} size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardLabel}>{r.label}</Text>
                  {r.amount != null && <Text style={styles.rewardAmount}>+{r.amount}</Text>}
                </View>
                <Ionicons name="checkmark-circle" size={22} color={ACCENT_CYAN} />
              </Animated.View>
            ))}
          </View>
        )}

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="archive-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Aucun historique pour le moment</Text>
            </View>
          ) : (
            history.map((h, i) => (
              <View key={i} style={styles.historyCard}>
                <View style={styles.historyDateWrap}>
                  <Ionicons name="calendar-outline" size={16} color={ACCENT} />
                  <Text style={styles.historyDate}>{formatDate(h.claimedAt ?? h.date ?? h.createdAt ?? '')}</Text>
                </View>
                <View style={styles.historyRewards}>
                  {(h.rewards ?? []).map((rw: any, j: number) => (
                    <View key={j} style={styles.historyRewardChip}>
                      <Ionicons name={rewardIcon(rw.type)} size={14} color={ACCENT} />
                      <Text style={styles.historyRewardText}>
                        {rw.label ?? rw.type}{rw.amount != null ? ` +${rw.amount}` : ''}
                      </Text>
                    </View>
                  ))}
                  {(!h.rewards || h.rewards.length === 0) && (
                    <Text style={styles.historyRewardText}>Pack ouvert</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
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
      <Text style={styles.headerTitle}>Boosters</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020017' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    marginBottom: 24,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  streakNumber: { fontSize: 22, fontWeight: '800', color: '#FF8C32' },
  streakLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  streakSub: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },

  packSection: { alignItems: 'center', marginBottom: 28 },
  packButton: {
    width: 260,
    height: 200,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  packButtonText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  packButtonTextDisabled: { fontSize: 20, fontWeight: '700', color: colors.textSecondary },
  packButtonSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 20 },
  packUnavailable: { opacity: 0.7 },
  countdownText: { fontSize: 28, fontWeight: '800', color: ACCENT, fontVariant: ['tabular-nums'] },

  rewardsSection: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 8,
  },
  rewardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  rewardAmount: { fontSize: 13, color: ACCENT_CYAN, fontWeight: '700', marginTop: 2 },

  historySection: { marginBottom: 20 },
  historyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 8,
  },
  historyDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  historyDate: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  historyRewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyRewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(123,97,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyRewardText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
});

export default BoostersScreen;
