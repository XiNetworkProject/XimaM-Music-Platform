import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { api } from '../services/api';

const ACCENT = '#7B61FF';
const ACCENT_CYAN = '#00D0BB';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

type PlanInfo = {
  id: string;
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0€',
    features: [
      '5 pistes uploadées',
      '3 playlists',
      'Écoute illimitée',
      'Profil basique',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '4,99€',
    highlight: true,
    features: [
      '25 pistes uploadées',
      '10 playlists',
      'Statistiques avancées',
      'Badge Starter',
      '50 crédits IA / mois',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9,99€',
    features: [
      'Pistes illimitées',
      'Playlists illimitées',
      'Statistiques complètes',
      'Badge Pro vérifié',
      '200 crédits IA / mois',
      'Support prioritaire',
    ],
  },
];

const SubscriptionsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [credits, setCredits] = useState(0);
  const [usage, setUsage] = useState<{ tracks: number; maxTracks: number; playlists: number; maxPlaylists: number }>({
    tracks: 0, maxTracks: 5, playlists: 0, maxPlaylists: 3,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [subRes, usageRes, creditsRes] = await Promise.all([
      api.getMySubscription(),
      api.getSubscriptionUsage(),
      api.getAICredits(),
    ]);
    if (subRes.success) {
      setCurrentPlan(subRes.data.plan ?? 'free');
    }
    if (usageRes.success) {
      const u = usageRes.data.usage ?? {};
      const l = usageRes.data.limits ?? {};
      setUsage({
        tracks: u.tracks ?? u.trackCount ?? 0,
        maxTracks: l.maxTracks ?? l.tracks ?? 5,
        playlists: u.playlists ?? u.playlistCount ?? 0,
        maxPlaylists: l.maxPlaylists ?? l.playlists ?? 3,
      });
    }
    if (creditsRes.success) {
      setCredits(creditsRes.data.balance ?? 0);
    }
    setLoading(false);
  };

  const handleChoosePlan = (planId: string) => {
    if (planId === currentPlan) return;
    Alert.alert(
      'Changer de plan',
      'Le paiement sera redirigé vers le navigateur via Stripe.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: () => Linking.openURL(`https://synaura.com/pricing?plan=${planId}`).catch(() => {}),
        },
      ]
    );
  };

  const handleBuyCredits = () => {
    Linking.openURL('https://synaura.com/credits').catch(() => {});
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

  const trackPct = usage.maxTracks > 0 ? Math.min(usage.tracks / usage.maxTracks, 1) : 0;
  const playlistPct = usage.maxPlaylists > 0 ? Math.min(usage.playlists / usage.maxPlaylists, 1) : 0;

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Current Plan Badge */}
        <LinearGradient
          colors={[ACCENT, ACCENT_CYAN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.currentPlanBanner}
        >
          <Ionicons name="diamond" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.currentPlanLabel}>Plan actuel</Text>
            <Text style={styles.currentPlanName}>{PLANS.find(p => p.id === currentPlan)?.name ?? currentPlan}</Text>
          </View>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>ACTIF</Text>
          </View>
        </LinearGradient>

        {/* Plans */}
        <Text style={styles.sectionTitle}>Choisir un plan</Text>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isCurrent && styles.planCardCurrent,
                plan.highlight && !isCurrent && styles.planCardHighlight,
              ]}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {plan.price}<Text style={styles.planPriceUnit}> /mois</Text>
                  </Text>
                </View>
                {isCurrent && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Actuel</Text>
                  </View>
                )}
              </View>
              <View style={styles.featuresList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isCurrent ? ACCENT_CYAN : ACCENT}
                    />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              {!isCurrent && (
                <Pressable style={styles.choosePlanButton} onPress={() => handleChoosePlan(plan.id)}>
                  <LinearGradient
                    colors={[ACCENT, '#6F4CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.choosePlanGradient}
                  >
                    <Text style={styles.choosePlanText}>Choisir</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Credits IA */}
        <Text style={styles.sectionTitle}>Crédits IA</Text>
        <View style={styles.creditsCard}>
          <View style={styles.creditsRow}>
            <LinearGradient colors={[ACCENT, ACCENT_CYAN]} style={styles.creditsIcon}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.creditsLabel}>Solde actuel</Text>
              <Text style={styles.creditsBalance}>{credits} crédits</Text>
            </View>
          </View>
          <Pressable style={styles.buyCreditsButton} onPress={handleBuyCredits}>
            <Ionicons name="cart-outline" size={18} color={ACCENT} />
            <Text style={styles.buyCreditsText}>Acheter des crédits</Text>
          </Pressable>
        </View>

        {/* Usage */}
        <Text style={styles.sectionTitle}>Utilisation</Text>
        <View style={styles.usageCard}>
          <UsageBar
            label="Pistes"
            current={usage.tracks}
            max={usage.maxTracks}
            pct={trackPct}
            icon="musical-note-outline"
          />
          <View style={styles.separator} />
          <UsageBar
            label="Playlists"
            current={usage.playlists}
            max={usage.maxPlaylists}
            pct={playlistPct}
            icon="list-outline"
          />
        </View>

        {/* Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.noticeText}>Le paiement sera redirigé vers le navigateur</Text>
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
      <Text style={styles.headerTitle}>Abonnements</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function UsageBar({ label, current, max, pct, icon }: { label: string; current: number; max: number; pct: number; icon: keyof typeof Ionicons.glyphMap }) {
  const unlimited = max >= 9999;
  return (
    <View>
      <View style={styles.usageRow}>
        <Ionicons name={icon} size={18} color={ACCENT} />
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageCount}>
          {current}{unlimited ? '' : ` / ${max}`}
        </Text>
      </View>
      {!unlimited && (
        <View style={styles.progressBg}>
          <LinearGradient
            colors={[ACCENT, ACCENT_CYAN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.max(pct * 100, 2)}%` as any }]}
          />
        </View>
      )}
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

  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  currentPlanLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  currentPlanName: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  currentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  planCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    marginBottom: 12,
  },
  planCardCurrent: { borderColor: ACCENT_CYAN, borderWidth: 2 },
  planCardHighlight: { borderColor: 'rgba(123,97,255,0.4)' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  planName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  planPrice: { fontSize: 24, fontWeight: '800', color: ACCENT, marginTop: 4 },
  planPriceUnit: { fontSize: 14, fontWeight: '500', color: colors.textTertiary },
  activeBadge: {
    backgroundColor: 'rgba(0,208,187,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeBadgeText: { fontSize: 12, fontWeight: '700', color: ACCENT_CYAN },
  featuresList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: colors.textSecondary },
  choosePlanButton: { marginTop: 16 },
  choosePlanGradient: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  choosePlanText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  creditsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    marginBottom: 24,
  },
  creditsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  creditsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsLabel: { fontSize: 12, color: colors.textTertiary },
  creditsBalance: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  buyCreditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(123,97,255,0.12)',
  },
  buyCreditsText: { fontSize: 14, fontWeight: '600', color: ACCENT },

  usageCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    marginBottom: 24,
  },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  usageLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  usageCount: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  separator: { height: 1, backgroundColor: CARD_BORDER, marginVertical: 14 },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: { fontSize: 13, color: colors.textTertiary, flex: 1 },
});

export default SubscriptionsScreen;
