import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cancelSubscription,
  createSubscriptionCheckout,
  downgradeSubscriptionToFree,
  getCurrentSubscription,
  getSubscriptionPlans,
  getSubscriptionUsage,
  refreshSubscription,
  type CurrentSubscription,
  type SubscriptionPlan,
  type SubscriptionUsage,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { SynauraBackground } from '@/components/SynauraBackground';
import { usePlayer } from '@/player/PlayerProvider';
import { colors } from '@/theme/tokens';

type Period = 'month' | 'year';

const FAQ = [
  { q: 'Les crédits non utilisés sont-ils conservés ?', a: 'Les crédits achetés restent disponibles. Les crédits mensuels sont renouvelés avec ton abonnement.' },
  { q: 'Puis-je changer de plan plus tard ?', a: 'Oui. Tu peux passer à un autre plan ou revenir au plan Free depuis cette page.' },
  { q: 'Le paiement est-il sécurisé ?', a: 'Le paiement et la gestion bancaire sont assurés par Stripe. Synaura ne stocke pas ta carte.' },
];

function euro(value: number) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return safeValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function limit(value: number) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return safeValue < 0 ? 'Illimité' : String(safeValue);
}

export function SubscriptionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const player = usePlayer();
  const [period, setPeriod] = useState<Period>('year');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!auth.requireAuth()) {
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      if (refresh) await refreshSubscription().catch(() => {});
      const [nextPlans, nextCurrent, nextUsage] = await Promise.all([
        getSubscriptionPlans(),
        getCurrentSubscription(),
        getSubscriptionUsage(),
      ]);
      setPlans(nextPlans);
      setCurrent(nextCurrent);
      setUsage(nextUsage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les abonnements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const activePlan = String(current?.subscription?.name || usage?.plan || 'free').toLowerCase();
  const activeStatus = String(current?.userSubscription?.status || 'none');
  const nextBilling = useMemo(() => {
    const raw = current?.userSubscription?.currentPeriodEnd;
    if (!raw) return 'Aucune échéance';
    return new Date(raw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [current?.userSubscription?.currentPeriodEnd]);

  const choosePlan = async (plan: SubscriptionPlan) => {
    if (plan.id === activePlan) return;
    if (plan.id === 'free') {
      Alert.alert('Revenir au plan Free ?', 'Ton abonnement payant sera arrêté et les limites Free seront appliquées.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => void downgrade() },
      ]);
      return;
    }
    const priceId = plan.stripePriceIds?.[period];
    if (!priceId) {
      setError(`Le tarif ${period === 'year' ? 'annuel' : 'mensuel'} de ${plan.label || plan.name} n’est pas configuré.`);
      return;
    }
    setBusy(plan.id);
    setError('');
    try {
      const result = await createSubscriptionCheckout(priceId);
      if (!result.checkoutUrl) throw new Error('Stripe n’a pas renvoyé de lien de paiement.');
      await Linking.openURL(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Impossible d’ouvrir le paiement.');
    } finally {
      setBusy('');
    }
  };

  const downgrade = async () => {
    setBusy('downgrade');
    try {
      await downgradeSubscriptionToFree();
      await load(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Impossible de changer de plan.');
    } finally {
      setBusy('');
    }
  };

  const cancel = () => {
    Alert.alert('Annuler l’abonnement ?', 'Il restera actif jusqu’à la fin de la période déjà payée.', [
      { text: 'Garder mon plan', style: 'cancel' },
      {
        text: 'Annuler à l’échéance',
        style: 'destructive',
        onPress: async () => {
          setBusy('cancel');
          try {
            await cancelSubscription();
            await load(true);
          } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : 'Impossible d’annuler l’abonnement.');
          } finally {
            setBusy('');
          }
        },
      },
    ]);
  };

  if (!auth.user) {
    return (
      <View style={styles.root}>
        <SynauraBackground variant="warm" />
        <View style={styles.authGate}>
          <Ionicons name="diamond-outline" size={34} color={colors.violet} />
          <Text style={styles.authTitle}>Connecte-toi pour gérer ton plan</Text>
          <Pressable onPress={() => navigation.getParent()?.navigate('Login')} style={styles.darkButton}><Text style={styles.darkButtonText}>Se connecter</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.violet} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + (player.current ? 205 : 125) }]}
      >
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
          <Text style={styles.topLabel}>ABONNEMENTS</Text>
          <Pressable onPress={() => load(true)} style={styles.iconButton}><Ionicons name="refresh" size={19} color={colors.text} /></Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroHead}><View style={styles.heroBadge}><Ionicons name="sparkles" size={13} color={colors.paper} /><Text style={styles.heroBadgeText}>SYNAURA PLUS</Text></View><Text style={styles.heroStatus}>{activeStatus.toUpperCase()}</Text></View>
          <Text style={styles.heroTitle}>Crée plus. Publie mieux.</Text>
          <Text style={styles.heroText}>Crédits IA mensuels, stockage étendu et outils avancés, synchronisés avec la version web.</Text>
          <View style={styles.currentPlan}>
            <View><Text style={styles.currentLabel}>PLAN ACTUEL</Text><Text style={styles.currentName}>{activePlan.toUpperCase()}</Text></View>
            <View style={styles.currentRight}><Text style={styles.currentDate}>{nextBilling}</Text><Text style={styles.currentLabel}>PROCHAINE ÉCHÉANCE</Text></View>
          </View>
        </View>

        <View style={styles.unlockPanel}>
          <View style={styles.unlockHead}><Text style={styles.sectionKicker}>CE QUE TU DÉBLOQUES</Text><Ionicons name="arrow-forward-circle" size={20} color={colors.coral} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unlockRail}>
            <UnlockCard icon="sparkles" title="Studio V5.5" text="Le modèle le plus avancé, clairement identifié dans le Studio." />
            <UnlockCard icon="flash" title="Crédits mensuels" text="Plus de générations et de remixes sans recharger à chaque session." />
            <UnlockCard icon="analytics" title="Outils artiste" text="Analytics, collaboration et limites de publication étendues." />
            <UnlockCard icon="download" title="Écoute libre" text="Qualité audio supérieure et téléchargements selon ton plan." />
          </ScrollView>
        </View>

        {usage ? (
          <View style={styles.usagePanel}>
            <Text style={styles.sectionKicker}>UTILISATION ACTUELLE</Text>
            <UsageBar label="Pistes publiées" used={usage.tracks.used} max={usage.tracks.limit} percentage={usage.tracks.percentage} />
            <UsageBar label="Playlists" used={usage.playlists.used} max={usage.playlists.limit} percentage={usage.playlists.percentage} />
          </View>
        ) : null}

        <View style={styles.periodSwitch}>
          <Pressable onPress={() => setPeriod('month')} style={[styles.periodButton, period === 'month' && styles.periodActive]}><Text style={[styles.periodText, period === 'month' && styles.periodTextActive]}>Mensuel</Text></Pressable>
          <Pressable onPress={() => setPeriod('year')} style={[styles.periodButton, period === 'year' && styles.periodActive]}><Text style={[styles.periodText, period === 'year' && styles.periodTextActive]}>Annuel · économise 20 %</Text></Pressable>
        </View>

        {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
        {loading ? <ActivityIndicator color={colors.violet} style={{ marginVertical: 30 }} /> : null}

        <View style={styles.planList}>
          {plans.map((plan) => {
            const active = activePlan === plan.id;
            const price = Number(period === 'year' ? plan.priceYearly : plan.priceMonthly) || 0;
            const monthlyEquivalent = period === 'year' && price > 0 ? price / 12 : price;
            const planLimits = plan.limits || { maxTracks: 0, maxPlaylists: 0, audioQuality: '128kbps', fileMaxMb: 80, ads: true, analytics: false, collaborations: false, apiAccess: false, support: 'Communautaire' };
            const planFeatures = Array.isArray(plan.features) ? plan.features : [];
            return (
              <View key={plan.id} style={[styles.planCard, plan.id === 'pro' && styles.planPro, active && styles.planActive]}>
                <View style={styles.planHead}>
                  <View><Text style={[styles.planName, plan.id === 'pro' && styles.planNameLight]}>{plan.label || plan.name}</Text><Text style={[styles.planDescription, plan.id === 'pro' && styles.planMutedLight]}>{plan.description}</Text></View>
                  {active ? <Text style={styles.activeBadge}>ACTUEL</Text> : plan.badge ? <Text style={styles.planBadge}>{plan.badge.toUpperCase()}</Text> : null}
                </View>
                <View style={styles.priceRow}><Text style={[styles.price, plan.id === 'pro' && styles.planNameLight]}>{euro(monthlyEquivalent)}</Text><Text style={[styles.priceSuffix, plan.id === 'pro' && styles.planMutedLight]}>/ mois</Text></View>
                {period === 'year' && price > 0 ? <Text style={[styles.yearPrice, plan.id === 'pro' && styles.planMutedLight]}>{euro(price)} facturés par an</Text> : null}
                <View style={styles.planMetrics}>
                  <Metric label="CRÉDITS / MOIS" value={plan.creditsMonthly.toLocaleString('fr-FR')} light={plan.id === 'pro'} />
                  <Metric label="PISTES" value={limit(planLimits.maxTracks)} light={plan.id === 'pro'} />
                  <Metric label="QUALITÉ" value={String(planLimits.audioQuality || '128kbps')} light={plan.id === 'pro'} />
                </View>
                <View style={styles.featureList}>{planFeatures.slice(0, 6).map((feature) => <View key={feature} style={styles.feature}><Ionicons name="checkmark-circle" size={16} color={plan.id === 'pro' ? '#6EE7B7' : colors.violet} /><Text style={[styles.featureText, plan.id === 'pro' && styles.planMutedLight]}>{feature}</Text></View>)}</View>
                <Pressable disabled={active || Boolean(busy)} onPress={() => void choosePlan(plan)} style={[styles.planButton, plan.id === 'pro' && styles.planButtonLight, active && styles.planButtonDisabled]}>
                  {busy === plan.id ? <ActivityIndicator color={plan.id === 'pro' ? colors.text : colors.paper} /> : <Text style={[styles.planButtonText, plan.id === 'pro' && styles.planButtonTextDark]}>{active ? 'Plan actuel' : plan.id === 'free' ? 'Passer au plan Free' : `Choisir ${plan.label || plan.name}`}</Text>}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.compare}>
          <Text style={styles.sectionKicker}>COMPARAISON RAPIDE</Text>
          <CompareRow label="Modèles IA avancés" starter="V4.5+" pro="Tous" />
          <CompareRow label="Playlists collaboratives" starter="—" pro="Inclus" />
          <CompareRow label="Analyses" starter="Base" pro="Avancées" />
          <CompareRow label="Téléchargement musique" starter="—" pro="Inclus" />
        </View>

        <View style={styles.faq}>
          <Text style={styles.sectionKicker}>QUESTIONS FRÉQUENTES</Text>
          {FAQ.map((entry, index) => <Pressable key={entry.q} onPress={() => setOpenFaq(openFaq === index ? null : index)} style={styles.faqRow}><View style={{ flex: 1 }}><Text style={styles.faqQuestion}>{entry.q}</Text>{openFaq === index ? <Text style={styles.faqAnswer}>{entry.a}</Text> : null}</View><Ionicons name={openFaq === index ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textTertiary} /></Pressable>)}
        </View>

        {activePlan !== 'free' ? <Pressable disabled={Boolean(busy)} onPress={cancel} style={styles.cancelButton}><Ionicons name="close-circle-outline" size={17} color={colors.danger} /><Text style={styles.cancelText}>{busy === 'cancel' ? 'Annulation...' : 'Annuler à la fin de la période'}</Text></Pressable> : null}
      </ScrollView>
    </View>
  );
}

function UsageBar({ label, used, max, percentage }: { label: string; used: number; max: number; percentage: number }) {
  const safePercentage = Number.isFinite(Number(percentage)) ? Number(percentage) : 0;
  return <View style={styles.usageRow}><View style={styles.usageHead}><Text style={styles.usageLabel}>{label}</Text><Text style={styles.usageValue}>{used} / {max < 0 ? '∞' : max}</Text></View><View style={styles.usageTrack}><View style={[styles.usageFill, { width: `${Math.max(2, Math.min(100, safePercentage))}%` }]} /></View></View>;
}

function Metric({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return <View style={styles.metric}><Text style={[styles.metricValue, light && styles.planNameLight]}>{value}</Text><Text style={[styles.metricLabel, light && styles.planMutedLight]}>{label}</Text></View>;
}

function CompareRow({ label, starter, pro }: { label: string; starter: string; pro: string }) {
  return <View style={styles.compareRow}><Text style={styles.compareLabel}>{label}</Text><Text style={styles.compareValue}>{starter}</Text><Text style={[styles.compareValue, { color: colors.violet }]}>{pro}</Text></View>;
}

function UnlockCard({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return <View style={styles.unlockCard}><View style={styles.unlockIcon}><Ionicons name={icon} size={18} color={colors.paper} /></View><Text style={styles.unlockTitle}>{title}</Text><Text style={styles.unlockText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 11 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  iconButton: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  hero: { overflow: 'hidden', borderRadius: 16, padding: 16, gap: 12, backgroundColor: colors.black },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -100, right: -70, backgroundColor: 'rgba(124,92,255,0.3)' },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 15, paddingHorizontal: 10, minHeight: 30, backgroundColor: 'rgba(255,250,242,0.12)' },
  heroBadgeText: { color: colors.paper, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroStatus: { color: '#6EE7B7', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { maxWidth: 280, color: colors.paper, fontSize: 24, lineHeight: 27, fontWeight: '900' },
  heroText: { color: 'rgba(255,250,242,0.58)', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  currentPlan: { minHeight: 62, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  currentLabel: { color: 'rgba(255,250,242,0.4)', fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  currentName: { marginTop: 4, color: colors.paper, fontSize: 17, fontWeight: '900' },
  currentRight: { maxWidth: '55%', alignItems: 'flex-end' },
  currentDate: { marginBottom: 4, color: colors.paper, fontSize: 10, fontWeight: '900', textAlign: 'right' },
  unlockPanel: { borderRadius: 14, paddingVertical: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  unlockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 11 },
  unlockRail: { gap: 9, paddingHorizontal: 14, paddingRight: 24 },
  unlockCard: { width: 150, minHeight: 124, borderRadius: 12, padding: 12, backgroundColor: colors.background },
  unlockIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  unlockTitle: { marginTop: 11, color: colors.text, fontSize: 12, fontWeight: '900' },
  unlockText: { marginTop: 5, color: colors.textTertiary, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  usagePanel: { borderRadius: 14, padding: 13, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionKicker: { color: colors.violet, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  usageRow: { gap: 7 },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { color: colors.text, fontSize: 10, fontWeight: '900' },
  usageValue: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  usageTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.07)' },
  usageFill: { height: 7, borderRadius: 4, backgroundColor: colors.coral },
  periodSwitch: { flexDirection: 'row', borderRadius: 12, padding: 3, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodButton: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  periodActive: { backgroundColor: colors.black },
  periodText: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  periodTextActive: { color: colors.paper },
  error: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(217,45,32,0.08)' },
  errorText: { flex: 1, color: colors.danger, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  planList: { gap: 12 },
  planCard: { borderRadius: 14, padding: 14, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  planPro: { backgroundColor: colors.black, borderColor: colors.black },
  planActive: { borderColor: colors.coral, borderWidth: 2 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planName: { color: colors.text, fontSize: 21, fontWeight: '900' },
  planNameLight: { color: colors.paper },
  planDescription: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  planMutedLight: { color: 'rgba(255,250,242,0.56)' },
  activeBadge: { overflow: 'hidden', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, color: colors.paper, backgroundColor: colors.coral, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  planBadge: { color: colors.violet, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  price: { color: colors.text, fontSize: 28, fontWeight: '900' },
  priceSuffix: { marginBottom: 5, color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  yearPrice: { marginTop: -9, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  planMetrics: { flexDirection: 'row', gap: 7 },
  metric: { flex: 1, minHeight: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,92,255,0.08)' },
  metricValue: { color: colors.text, fontSize: 12, fontWeight: '900' },
  metricLabel: { marginTop: 3, color: colors.textTertiary, fontSize: 6, fontWeight: '900', letterSpacing: 0.6 },
  featureList: { gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  planButton: { minHeight: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  planButtonLight: { backgroundColor: colors.paper },
  planButtonDisabled: { opacity: 0.42 },
  planButtonText: { color: colors.paper, fontSize: 11, fontWeight: '900' },
  planButtonTextDark: { color: colors.text },
  compare: { borderRadius: 14, padding: 14, gap: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  compareRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  compareLabel: { flex: 1.5, color: colors.text, fontSize: 9, fontWeight: '800' },
  compareValue: { flex: 0.7, color: colors.textSecondary, fontSize: 9, fontWeight: '900', textAlign: 'right' },
  faq: { borderRadius: 14, padding: 14, gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  faqRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  faqQuestion: { color: colors.text, fontSize: 10, fontWeight: '900' },
  faqAnswer: { marginTop: 6, color: colors.textSecondary, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  cancelButton: { minHeight: 46, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(217,45,32,0.07)' },
  cancelText: { color: colors.danger, fontSize: 10, fontWeight: '900' },
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 },
  authTitle: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  darkButton: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, backgroundColor: colors.black },
  darkButtonText: { color: colors.paper, fontSize: 11, fontWeight: '900' },
});
