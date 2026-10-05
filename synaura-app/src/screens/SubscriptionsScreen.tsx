import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { cancelSubscription, createSubscriptionCheckout, downgradeSubscriptionToFree, getCurrentSubscription, getSubscriptionPlans, getSubscriptionUsage, refreshSubscription, type CurrentSubscription, type SubscriptionPlan, type SubscriptionUsage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { CollectionEmpty, CollectionHeader, CollectionHeading, CollectionIconButton, CollectionReveal, CollectionSurface, CollectionTabs, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { planCharge, annualSaving, isStripeCheckout } from '@/subscriptions/planModel';
import { serverDateLabel } from '@/utils/serverDate';

type Period = 'month' | 'year';
const money = (value: number, currency = 'EUR') => value.toLocaleString('fr-FR', { style: 'currency', currency });
const limit = (value: number) => value < 0 ? 'Illimité' : value.toLocaleString('fr-FR');
export function SubscriptionsScreen() {
  const navigation = useNavigation<any>(); const auth = useAuth(); const layout = useResponsiveLayout(); const p = useCollectionPalette();
  const [period, setPeriod] = useState<Period>('month'); const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null); const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [busy, setBusy] = useState('');
  const [error, setError] = useState(''); const [accountLoaded, setAccountLoaded] = useState(false); const [openFaq, setOpenFaq] = useState(-1);
  const request = useRef(0); const actionLock = useRef(false); const checkoutPending = useRef(false);
  const load = useCallback(async (refresh = false) => {
    const epoch = ++request.current; refresh ? setRefreshing(true) : setLoading(true); setError('');
    if (refresh && auth.token) await refreshSubscription().catch(() => {});
    const [catalog, account, limits] = await Promise.allSettled([getSubscriptionPlans(), auth.token ? getCurrentSubscription() : Promise.resolve(null), auth.token ? getSubscriptionUsage() : Promise.resolve(null)]);
    if (epoch !== request.current) return;
    if (catalog.status === 'fulfilled') setPlans(catalog.value); else setError('Les formules ne sont pas disponibles pour le moment.');
    setCurrent(account.status === 'fulfilled' ? account.value : null); setUsage(limits.status === 'fulfilled' ? limits.value : null);
    const known = !auth.token || account.status === 'fulfilled' && Boolean(account.value) || limits.status === 'fulfilled' && Boolean(limits.value);
    setAccountLoaded(known);
    if (!known) setError('Ton abonnement ne peut pas être vérifié. Actualise avant de changer de formule.');
    setLoading(false); setRefreshing(false);
  }, [auth.token]);
  useEffect(() => { setCurrent(null); setUsage(null); setAccountLoaded(false); void load(); return () => { request.current++; }; }, [load]);
  useEffect(() => { const listener = AppState.addEventListener('change', state => { if (state === 'active' && checkoutPending.current) { checkoutPending.current = false; void load(true); } }); return () => listener.remove(); }, [load]);
  const activePlan = auth.token ? String(current?.subscription?.name || usage?.plan || (current?.hasSubscription === false ? 'free' : '')).toLowerCase() : '';
  const active = plans.find(plan => plan.id === activePlan);
  const operate = async (key: string, action: () => Promise<void>) => {
    if (actionLock.current) return; actionLock.current = true; setBusy(key); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Action indisponible. Réessaie.'); }
    finally { actionLock.current = false; setBusy(''); }
  };
  const choose = (plan: SubscriptionPlan) => {
    if (!auth.requireAuth()) { navigation.navigate('Login'); return; }
    if (!accountLoaded || activePlan === plan.id || actionLock.current) return;
    if (plan.id === 'free') {
      Alert.alert('Revenir à Free ?', 'La formule payante sera arrêtée et les limites Free s’appliqueront.', [{ text: 'Garder ma formule', style: 'cancel' }, { text: 'Revenir à Free', style: 'destructive', onPress: () => void operate('free', async () => { await downgradeSubscriptionToFree(); await load(true); }) }]); return;
    }
    const charge = planCharge(plan, period); const priceId = plan.stripePriceIds?.[period];
    if (charge === null || !priceId) { setError('Ce tarif n’est pas disponible. Choisis une autre période.'); return; }
    void operate(plan.id, async () => {
      const result = await createSubscriptionCheckout(priceId);
      if (!isStripeCheckout(result.checkoutUrl)) throw new Error('Le lien de paiement sécurisé n’est pas disponible.');
      checkoutPending.current = true;
      try { await Linking.openURL(result.checkoutUrl); } catch (error) { checkoutPending.current = false; throw error; }
    });
  };
  const cancel = () => Alert.alert('Arrêter le renouvellement ?', 'Ta formule reste active jusqu’à la fin de la période payée.', [
    { text: 'Conserver', style: 'cancel' }, { text: 'Arrêter le renouvellement', style: 'destructive', onPress: () => void operate('cancel', async () => { await cancelSubscription(); await load(true); }) },
  ]);
  const faq = [
    ['Est-ce que je peux rester gratuitement ?', 'Oui. La formule Free reste disponible, avec ses limites indiquées ci-dessus. Aucun abonnement n’est nécessaire pour découvrir Synaura.'],
    ['Quand est-ce que je paie ?', period === 'year' ? 'Le total annuel indiqué est payé en une fois. Le montant par mois est seulement un équivalent pour comparer.' : 'La formule mensuelle se renouvelle chaque mois. Le prix exact est confirmé avant le paiement.'],
    ['Puis-je arrêter plus tard ?', 'Tu peux arrêter le renouvellement depuis cette page. La période déjà payée reste accessible jusqu’à son échéance.'],
  ];
  return <CollectionSurface><ScrollView contentContainerStyle={[layout.pageContent, { paddingTop: layout.insets.top, paddingBottom: layout.miniPlayerClearance, gap: 20 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={p.blue} />}>
    <CollectionHeader title="À ton rythme." eyebrow="LES FORMULES SYNAURA" onBack={() => navigation.goBack()} actions={<CollectionIconButton icon="refresh-outline" label="Actualiser mon abonnement" onPress={() => void load(true)} />} />
    <CollectionReveal><View style={s.hero}><LinearGradient colors={['#27344C', '#352B54', '#1B2541']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /><View pointerEvents="none" style={s.glow} /><Ionicons name="sparkles-outline" size={30} color="#CADDFC" /><Text style={s.heroTitle}>Plus de place{ '\n' }pour tes idées.</Text><Text style={s.heroText}>Commence librement. Passe à la formule qui suit ton envie de créer.</Text><View style={s.freeNote}><Ionicons name="checkmark" size={16} color="#BCD9D5" /><Text style={s.freeText}>Free reste disponible.</Text></View></View></CollectionReveal>
    {auth.token && accountLoaded ? <View style={[s.account, { backgroundColor: p.surface }]}><View style={s.between}><View style={{ flex: 1 }}><Text style={[s.label, { color: p.muted }]}>TA FORMULE</Text><Text style={[s.planName, { color: p.text }]}>{active?.label || activePlan || 'Non disponible'}</Text></View><Ionicons name="checkmark-circle-outline" size={29} color={p.blue} /></View>{current?.userSubscription?.currentPeriodEnd ? <Text style={[s.body, { color: p.muted }]}>Échéance : {serverDateLabel(current.userSubscription.currentPeriodEnd)}</Text> : null}{usage ? <><Usage label="Morceaux publiés" used={usage.tracks.used} max={usage.tracks.limit} /><Usage label="Playlists" used={usage.playlists.used} max={usage.playlists.limit} /></> : null}</View> : null}
    <View><CollectionHeading title="Choisis ton espace" detail="Les crédits et limites changent selon la formule." /><CollectionTabs options={[{ value: 'month', label: 'Mensuel' }, { value: 'year', label: 'Annuel' }]} value={period} onChange={setPeriod} /></View>
    {error ? <CollectionEmpty icon="cloud-offline-outline" title="Un instant…" text={error} action="Actualiser" onPress={() => void load(true)} /> : null}
    {loading && !plans.length ? <CollectionEmpty loading title="Chargement des formules…" /> : null}
    {plans.map(plan => <PlanCard key={plan.id} plan={plan} period={period} active={activePlan === plan.id} busy={busy === plan.id} disabled={Boolean(busy) || Boolean(auth.token && !accountLoaded)} onChoose={() => choose(plan)} />)}
    {!loading && !plans.length && !error ? <CollectionEmpty title="Aucune formule disponible" action="Réessayer" onPress={() => void load()} /> : null}
    <CollectionHeading title="En toute clarté" />
    {faq.map(([question, answer], index) => <EntryPressable key={question} accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }} onPress={() => setOpenFaq(value => value === index ? -1 : index)} style={[s.faq, { backgroundColor: p.surface }]}><View style={s.between}><Text style={[s.faqQuestion, { color: p.text }]}>{question}</Text><Ionicons name={openFaq === index ? 'remove' : 'add'} size={20} color={p.blue} /></View>{openFaq === index ? <Text style={[s.body, { color: p.muted }]}>{answer}</Text> : null}</EntryPressable>)}
    {auth.token && accountLoaded && activePlan && activePlan !== 'free' ? <EntryPressable accessibilityRole="button" disabled={Boolean(busy)} onPress={cancel} style={s.cancel}><Text style={{ color: p.muted, textAlign: 'center' }}>{busy === 'cancel' ? 'Mise à jour…' : 'Arrêter le renouvellement'}</Text></EntryPressable> : null}
  </ScrollView></CollectionSurface>;
}
function PlanCard({ plan, period, active, busy, disabled, onChoose }: { plan: SubscriptionPlan; period: Period; active: boolean; busy: boolean; disabled: boolean; onChoose: () => void }) {
  const p = useCollectionPalette(); const [expanded, setExpanded] = useState(false); const charge = planCharge(plan, period); const saving = annualSaving(plan);
  const available = plan.id === 'free' || charge !== null && Boolean(plan.stripePriceIds?.[period]);
  const features = expanded ? plan.features : plan.features.slice(0, 4);
  return <View style={[s.plan, { backgroundColor: p.surface }]}>
    <View style={s.between}><Text style={[s.planName, { color: p.text }]}>{plan.label || plan.name}</Text>{active ? <Text style={[s.badge, { color: p.blue, backgroundColor: p.raised }]}>Ta formule</Text> : period === 'year' && saving ? <Text style={[s.badge, { color: p.blue, backgroundColor: p.raised }]}>−{saving} % / an</Text> : null}</View>
    <Text style={[s.body, { color: p.muted }]}>{plan.description}</Text>
    <View style={[s.between, { justifyContent: 'flex-start' }]}><Text style={[s.price, { color: p.text }]}>{charge === null ? '—' : money(period === 'year' && plan.id !== 'free' ? charge / 12 : charge, plan.currency)}</Text><Text style={[s.body, { color: p.muted }]}>{plan.id === 'free' ? 'pour commencer' : '/ mois'}</Text></View>
    {period === 'year' && charge !== null && plan.id !== 'free' ? <Text style={[s.body, { color: p.muted }]}>{money(charge, plan.currency)} facturés en une fois par an</Text> : null}
    <View style={[s.credits, { backgroundColor: p.raised }]}><Ionicons name="sparkles-outline" size={25} color={p.blue} /><View style={{ flex: 1 }}><Text style={[s.creditCount, { color: p.text }]}>{plan.creditsMonthly > 0 ? plan.creditsMonthly.toLocaleString('fr-FR') + ' crédits / mois' : 'L’essentiel, gratuitement'}</Text><Text style={[s.small, { color: p.muted }]}>{limit(plan.limits.maxTracks)} morceaux · {limit(plan.limits.maxPlaylists)} playlists</Text></View></View>
    {features.map(feature => <View key={feature} style={s.feature}><Ionicons name="checkmark" color={p.blue} size={18} /><Text style={[s.featureText, { color: p.muted }]}>{feature}</Text></View>)}
    {plan.features.length > 4 ? <EntryPressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={s.more}><Text style={{ color: p.blue }}>{expanded ? 'Voir moins' : 'Tous les avantages'}</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={p.blue} /></EntryPressable> : null}
    <EntryPressable accessibilityRole="button" disabled={active || disabled || !available} accessibilityState={{ disabled: active || disabled || !available, busy }} onPress={onChoose} style={[s.choose, { backgroundColor: active ? p.raised : p.text, opacity: disabled ? .55 : 1 }]}>{busy ? <ActivityIndicator color={p.bg} /> : <Text style={{ color: active ? p.muted : p.bg, fontSize: 15, fontWeight: '700' }}>{active ? 'Ta formule actuelle' : !available ? 'Tarif indisponible' : plan.id === 'free' ? 'Continuer avec Free' : 'Choisir ' + (plan.label || plan.name)}</Text>}</EntryPressable>
  </View>;
}
function Usage({ label, used, max }: { label: string; used: number; max: number }) { const p = useCollectionPalette(); const ratio = max > 0 ? Math.min(1, Math.max(0, used / max)) : 0; return <View style={{ gap: 9 }}><View style={s.between}><Text style={[s.body, { color: p.muted }]}>{label}</Text><Text style={[s.body, { color: p.text }]}>{used} / {max < 0 ? '∞' : max}</Text></View><View style={{ height: 5, backgroundColor: p.raised, borderRadius: 3 }}><View style={{ height: 5, borderRadius: 3, width: (ratio * 100) + '%' as `${number}%`, backgroundColor: p.blue }} /></View></View>; }
const s = StyleSheet.create({
  hero: { borderRadius: 29, overflow: 'hidden', padding: 26, gap: 19 }, glow: { position: 'absolute', right: -90, top: -100, width: '75%', aspectRatio: 1, borderRadius: 300, backgroundColor: 'rgba(168,157,224,.1)' }, heroTitle: { color: '#F2F6FF', fontSize: 35, lineHeight: 41, fontWeight: '800' }, heroText: { color: '#C2CEE2', fontSize: 15, lineHeight: 24, maxWidth: 450 }, freeNote: { flexDirection: 'row', alignItems: 'center', gap: 8 }, freeText: { color: '#BCD9D5', fontSize: 13 },
  account: { borderRadius: 25, padding: 21, gap: 19 }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 6 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }, plan: { borderRadius: 28, padding: 24, gap: 15 }, planName: { fontSize: 25, fontWeight: '800' }, body: { fontSize: 14, lineHeight: 22 }, small: { fontSize: 12, lineHeight: 19, marginTop: 4 }, badge: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, fontWeight: '700' }, price: { fontSize: 39, fontWeight: '800' }, credits: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: 21 }, creditCount: { fontSize: 17, fontWeight: '700' }, feature: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, featureText: { flex: 1, fontSize: 14, lineHeight: 21 }, more: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, choose: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', padding: 13 }, faq: { borderRadius: 23, padding: 20, gap: 13 }, faqQuestion: { flex: 1, fontSize: 15, lineHeight: 23, fontWeight: '700' }, cancel: { minHeight: 50, justifyContent: 'center', marginTop: 10 },
});
