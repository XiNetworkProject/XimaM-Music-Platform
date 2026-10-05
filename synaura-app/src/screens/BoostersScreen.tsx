import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { activateNativeBooster, getNativeBoosterActivity, getNativeBoosterHistory, getNativeBoosterTargets, getNativeBoosters, getNativeSpinStatus, openNativeBooster, spinNativeWheel } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { CollectionSurface, CollectionHeader, CollectionIconButton, CollectionTabs, CollectionEmpty, CollectionHeading, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { BoosterCard, BoosterReveal, NativeRewardWheel } from '@/boosters/BoosterReveal';
import { RARITY_COLOR, RARITY_LABEL, remainingLabel, type BoosterData, type OwnedBooster, type BoosterTarget, type SpinStatus } from '@/boosters/boosterModel';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { serverDateLabel, serverDateMillis } from '@/utils/serverDate';

export function BoostersScreen() {
  const auth = useAuth(); const p = useCollectionPalette(); const layout = useResponsiveLayout(); const insets = useSafeAreaInsets(); const navigation = useNavigation<any>(); const focused = useIsFocused();
  const [data, setData] = useState<BoosterData | null>(null); const [spin, setSpin] = useState<SpinStatus | null>(null);
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof getNativeBoosterActivity>> | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getNativeBoosterHistory>> | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [detailError, setDetailError] = useState('');
  const [tab, setTab] = useState<'inventory' | 'active' | 'history' | 'catalog'>('inventory'); const [sheet, setSheet] = useState<string | null>(null);
  const [selected, setSelected] = useState<OwnedBooster | null>(null); const [targets, setTargets] = useState<BoosterTarget[]>([]); const [targetId, setTargetId] = useState('');
  const [targetLoading, setTargetLoading] = useState(false); const [targetError, setTargetError] = useState(''); const [busy, setBusy] = useState(false); const [paging, setPaging] = useState(false); const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now()); const [availableAt, setAvailableAt] = useState<number | null>(null);
  const epoch = useRef(0); const detailEpoch = useRef(0); const targetEpoch = useRef(0); const actionLock = useRef(false); const pagingLock = useRef(false); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; epoch.current++; detailEpoch.current++; targetEpoch.current++; }; }, []);
  useEffect(() => { if (!focused) return; setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, [focused]);
  const load = useCallback(async () => {
    if (!auth.user) return;
    const id = ++epoch.current; setLoading(true); setError('');
    const [inventory, wheel] = await Promise.allSettled([getNativeBoosters(), getNativeSpinStatus()]);
    if (id !== epoch.current) return;
    if (inventory.status === 'fulfilled') { setData(inventory.value); setAvailableAt(Number.isFinite(inventory.value.remainingMs) ? Date.now() + inventory.value.remainingMs : null); }
    else setError(inventory.reason instanceof Error ? inventory.reason.message : 'Inventaire indisponible.');
    setSpin(wheel.status === 'fulfilled' ? wheel.value : null); setLoading(false);
  }, [auth.user?.id]);
  useEffect(() => { setData(null); setHistory(null); setActivity(null); setSpin(null); setSheet(null); setSelected(null); if (focused) void load(); return () => { epoch.current++; }; }, [load, focused]);
  const loadDetails = useCallback(async (cursor = '') => {
    if (!auth.user || (tab !== 'active' && tab !== 'history')) return;
    if (cursor && pagingLock.current) return;
    if (cursor) pagingLock.current = true;
    const id = ++detailEpoch.current; setDetailError(''); setPaging(true);
    try {
      if (tab === 'active') { const result = await getNativeBoosterActivity(); if (id === detailEpoch.current) setActivity(result); }
      else { const result = await getNativeBoosterHistory(cursor); if (id === detailEpoch.current) setHistory(previous => ({ ...result, items: cursor && previous ? [...previous.items, ...result.items.filter(item => !previous.items.some(existing => existing.id === item.id))] : result.items })); }
    } catch (reason) { if (id === detailEpoch.current) setDetailError(reason instanceof Error ? reason.message : 'Détails indisponibles.'); }
    finally { if (id === detailEpoch.current) setPaging(false); pagingLock.current = false; }
  }, [auth.user?.id, tab]);
  useEffect(() => { if (focused) void loadDetails(); return () => { detailEpoch.current++; }; }, [focused, loadDetails]);
  const openActivation = async (item: OwnedBooster) => {
    setSelected(item); setTargetId(''); setTargets([]); setTargetError(''); setTargetLoading(false);
    const id = ++targetEpoch.current;
    if (item.booster.type !== 'track') return;
    setTargetLoading(true);
    try { const result = await getNativeBoosterTargets(); if (id === targetEpoch.current) setTargets(result); }
    catch (reason) { if (id === targetEpoch.current) setTargetError(reason instanceof Error ? reason.message : 'Morceaux indisponibles.'); }
    finally { if (id === targetEpoch.current) setTargetLoading(false); }
  };
  const refreshAfterMutation = () => { void load(); void loadDetails(); };
  const activate = async () => {
    if (!selected || actionLock.current || (selected.booster.type === 'track' && !targetId)) return;
    actionLock.current = true; setBusy(true); setTargetError('');
    try {
      const result = await activateNativeBooster(selected.id, targetId);
      if (!alive.current) return;
      if (!result.ok) throw new Error('Activation non confirmée. Actualise ton inventaire.');
      setSelected(null); setNotice(result.credits ? result.credits.amount + ' crédits ajoutés à ton compte.' : 'Booster activé. Son effet est maintenant en cours.'); refreshAfterMutation();
    } catch (reason) { if (alive.current) { setTargetError(reason instanceof Error ? reason.message : 'Activation non confirmée. Vérifie ton inventaire avant de réessayer.'); void load(); } }
    finally { actionLock.current = false; if (alive.current) setBusy(false); }
  };
  const claim = async () => {
    if (actionLock.current) throw new Error('Une ouverture est déjà en cours.');
    actionLock.current = true;
    try { return (await openNativeBooster(sheet === 'daily' ? undefined : sheet || undefined)).received; }
    finally { actionLock.current = false; if (alive.current) refreshAfterMutation(); }
  };
  const turn = async () => {
    if (actionLock.current) throw new Error('Un tour est déjà en cours.');
    actionLock.current = true;
    try { return await spinNativeWheel(); }
    finally { actionLock.current = false; if (alive.current) refreshAfterMutation(); }
  };
  const owned = data?.inventory.filter(item => item.status === 'owned') || [];
  const remaining = availableAt === null ? Infinity : availableAt - now;
  const activeItems = [...(activity?.boosts || []), ...(activity?.artistBoosts || [])];
  const canSpin = Boolean(spin && (spin.canSpin || (serverDateMillis(spin.nextAvailableAt) ?? Infinity) <= now));
  return <CollectionSurface>
    <ScrollView refreshControl={<RefreshControl refreshing={loading && Boolean(data)} onRefresh={() => { void load(); void loadDetails(); }} tintColor={p.blue} />} contentContainerStyle={[layout.pageContent, { paddingTop: insets.top, paddingBottom: layout.miniPlayerClearance + 28, gap: 20 }]}>
      <CollectionHeader title="Boosters" onBack={() => navigation.goBack()} actions={<CollectionIconButton icon="information-circle-outline" label="Comment fonctionnent les boosters" onPress={() => setSheet('info')} />} />
      <LinearGradient colors={['#24334D', '#302648', '#171E2C']} style={s.hero}><View style={s.heroArt}><Ionicons name="flash" size={68} color="#CEC3FF" /></View><Text style={s.eyebrow}>FAIS PASSER LE SON</Text><Text style={s.heroTitle}>Le bon coup{ '\n'}de projecteur.</Text><Text style={s.heroText}>Plus de visibilité, ou une impulsion pour créer. À toi de choisir le moment.</Text><EntryPressable accessibilityRole="button" disabled={Boolean(auth.user && (loading || !data || remaining > 0))} onPress={() => auth.user ? setSheet('daily') : navigation.navigate('Login')} style={s.heroButton}><Ionicons name="gift-outline" size={20} color="#192139" /><Text style={s.heroButtonText}>{!auth.user ? 'Retrouver mes boosters' : loading ? 'Chargement…' : remaining > 0 ? 'Prochain dans ' + remainingLabel(remaining) : 'Ouvrir mon booster'}</Text></EntryPressable><Text style={s.heroFoot}>Aucun crédit dépensé pour l’ouverture quotidienne.</Text></LinearGradient>
      {notice ? <Text accessibilityLiveRegion="polite" style={[s.notice, { backgroundColor: p.raised, color: p.text }]}>{notice}</Text> : null}
      {!auth.user ? <CollectionEmpty icon="gift-outline" title="Tes récompenses t’attendent" text="Connecte-toi pour consulter ton inventaire, retrouver tes packs et tourner la roue quotidienne." action="Se connecter" onPress={() => navigation.navigate('Login')} /> : error ? <CollectionEmpty icon="cloud-offline-outline" title="Inventaire indisponible" text={error + ' Si le service mobile n’est pas encore disponible, tes boosters restent accessibles sur le site.'} action="Réessayer" onPress={() => void load()} /> : loading && !data ? <CollectionEmpty loading title="Ton inventaire arrive…" /> : null}
      {auth.user && error ? <EntryPressable accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync('https://synaura.fr/boosters')} style={s.inline}><Text style={{ color: p.blue, fontWeight: '700' }}>Ouvrir les boosters sur le site</Text><Ionicons name="open-outline" size={18} color={p.blue} /></EntryPressable> : null}
      {data && auth.user ? <>
        <View style={[s.panel, { backgroundColor: p.surface }]}><View style={s.row}><Ionicons name="color-filter-outline" size={32} color={p.violet} /><View style={s.flex}><Text style={[s.heading, { color: p.text }]}>La roue quotidienne</Text><Text style={[s.meta, { color: p.muted }]}>{!spin ? 'Statut indisponible' : canSpin ? 'Un tour offert est disponible' : 'Dans ' + remainingLabel((serverDateMillis(spin.nextAvailableAt) ?? Infinity) - now)}</Text></View></View><EntryPressable accessibilityRole="button" disabled={!canSpin || loading} onPress={() => setSheet('wheel')} style={[s.button, { backgroundColor: p.text }]}><Text style={[s.buttonText, { color: p.bg }]}>À toi de tourner</Text></EntryPressable></View>
        {Object.entries(data.packs).filter(([, pack]) => pack.eligible).map(([key, pack]) => <View key={key} style={[s.packRow, { backgroundColor: p.surface }]}><View style={s.flex}><Text style={[s.name, { color: p.text }]}>{key === 'pro_weekly' ? 'Pack Pro' : key === 'starter_weekly' ? 'Pack Starter' : 'Pack inclus'}</Text><Text style={[s.meta, { color: p.muted }]}>{pack.size} boosters · {Math.max(0, pack.perWeek - pack.claimed)} pack(s) restant(s) cette semaine</Text></View><EntryPressable accessibilityRole="button" disabled={pack.claimed >= pack.perWeek} onPress={() => setSheet(key)} style={[s.smallButton, { backgroundColor: p.raised }]}><Text style={{ color: p.blue, fontWeight: '700' }}>Ouvrir</Text></EntryPressable></View>)}
        <CollectionTabs value={tab} onChange={setTab} options={[{ value: 'inventory', label: 'À utiliser', count: owned.length }, { value: 'active', label: 'Actifs' }, { value: 'history', label: 'Historique' }, { value: 'catalog', label: 'Catalogue' }]} />
        {tab === 'inventory' ? owned.length ? owned.map(item => <EntryPressable key={item.id} accessibilityRole="button" onPress={() => void openActivation(item)} style={[s.inventory, { backgroundColor: p.surface }]}><View style={[s.glyph, { backgroundColor: '#1D263D' }]}><Ionicons name={item.booster.type === 'credits' ? 'sparkles' : 'flash'} size={25} color={RARITY_COLOR[item.booster.rarity]} /></View><View style={s.flex}><Text style={[s.name, { color: p.text }]}>{item.booster.name}</Text><Text style={[s.meta, { color: p.muted }]}>{RARITY_LABEL[item.booster.rarity]} · {item.booster.type === 'credits' ? 'Création' : item.booster.type === 'artist' ? 'Artiste' : 'Morceau'}</Text></View><Ionicons name="arrow-forward" size={22} color={p.blue} /></EntryPressable>) : <CollectionEmpty icon="sparkles-outline" title="Prêt pour ta prochaine trouvaille" text="Tes prochaines récompenses apparaîtront ici. Aucun booster n’est activé sans ton choix." /> : null}
        {tab === 'catalog' ? <><Text style={[s.body, { color: p.muted }]}>Les coefficients agissent sur la visibilité. Ils ne garantissent ni écoutes ni abonnés.</Text>{data.catalog.filter(item => item.enabled !== false).map(item => <BoosterCard key={item.id} booster={item} />)}</> : null}
        {tab === 'active' ? paging && !activity ? <CollectionEmpty loading title="Effets actifs…" /> : activeItems.length ? activeItems.map(item => <View key={item.id} style={[s.panel, { backgroundColor: p.surface }]}><Text style={[s.name, { color: p.text }]}>{data.catalog.find(booster => booster.key === item.booster_key)?.name || 'Boost actif'} · ×{item.multiplier}</Text><Text style={[s.meta, { color: p.muted }]}>Jusqu’au {serverDateLabel(item.expires_at)}</Text></View>) : !detailError ? <CollectionEmpty icon="flash-outline" title="Aucun effet en cours" text="Active un booster de ton inventaire au moment qui te convient." /> : null : null}
        {tab === 'history' ? paging && !history ? <CollectionEmpty loading title="Tes récompenses…" /> : history?.items.length ? <>{history.items.map(item => <View key={item.id} style={s.historyRow}><Ionicons name="gift-outline" size={22} color={p.blue} /><View style={s.flex}><Text style={[s.name, { color: p.text }]}>{data.catalog.find(booster => booster.key === item.booster_key)?.name || item.booster_key}</Text><Text style={[s.meta, { color: p.muted }]}>{serverDateLabel(item.opened_at)}</Text></View></View>)}{history.nextCursor ? <EntryPressable disabled={paging} accessibilityRole="button" onPress={() => void loadDetails(history.nextCursor!)} style={s.inline}><Text style={{ color: p.blue }}>{paging ? 'Chargement…' : 'Voir les récompenses précédentes'}</Text></EntryPressable> : null}</> : !detailError ? <CollectionEmpty title="L’histoire commence ici" text="Tes ouvertures seront conservées dans cet historique." /> : null : null}
        {detailError && (tab === 'active' || tab === 'history') ? <CollectionEmpty title="Chargement interrompu" text={detailError} action="Réessayer" onPress={() => void loadDetails()} /> : null}
      </> : null}
    </ScrollView>
    <BottomSheet visible={Boolean(sheet)} title={sheet === 'info' ? 'Un coup de pouce, à ton rythme' : sheet === 'wheel' ? 'La roue Synaura' : 'Ton prochain booster'} onClose={() => { if (!busy) setSheet(null); }} maxHeight="93%"><ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      {sheet === 'info' ? <><Text style={[s.body, { color: p.text }]}>Les boosters restent dans ton inventaire jusqu’à leur activation. Certains mettent un morceau ou ton profil en avant ; d’autres ajoutent des crédits de création.</Text><Text style={[s.body, { color: p.muted }]}>Le serveur attribue chaque récompense et contrôle sa disponibilité. Aucun achat n’est déclenché ici. Les boosts de visibilité ne garantissent pas de résultat.</Text>{data?.odds ? <><CollectionHeading title="Prochaine ouverture" detail="Probabilités renvoyées par le serveur" />{data.odds.map(item => <View key={item.rarity} style={s.row}><Text style={[s.body, s.flex, { color: p.text }]}>{RARITY_LABEL[item.rarity]}</Text><Text style={[s.body, { color: p.muted }]}>{item.percent.toFixed(2)} %</Text></View>)}</> : null}</> : sheet === 'wheel' ? <NativeRewardWheel key={sheet} onSpin={turn} onBusy={setBusy} /> : sheet ? <BoosterReveal key={sheet} onOpen={claim} onBusy={setBusy} /> : null}
    </ScrollView></BottomSheet>
    <BottomSheet visible={Boolean(selected)} title="Activer un booster" onClose={() => { if (!busy) { setSelected(null); targetEpoch.current++; } }} maxHeight="92%"><ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
      {selected ? <><BoosterCard booster={selected.booster} />{selected.booster.type === 'track' ? <><Text style={[s.heading, { color: p.text }]}>Choisis ton morceau</Text>{targetLoading ? <ActivityIndicator color={p.blue} /> : targets.length ? targets.map(target => <EntryPressable key={target.id} accessibilityRole="radio" accessibilityState={{ checked: targetId === target.id }} disabled={busy} onPress={() => setTargetId(target.id)} style={[s.inventory, { backgroundColor: targetId === target.id ? p.raised : p.surface }]}><SynauraImage source={target.coverUrl} style={s.targetCover} /><Text style={[s.name, s.flex, { color: p.text }]}>{target.title}</Text><Ionicons name={targetId === target.id ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={p.blue} /></EntryPressable>) : !targetError ? <Text style={[s.body, { color: p.muted }]}>Aucun morceau original publié n’est éligible.</Text> : null}</> : null}{targetError ? <Text accessibilityRole="alert" style={[s.notice, { color: p.text, backgroundColor: p.raised }]}>{targetError}</Text> : null}<EntryPressable accessibilityRole="button" disabled={busy || targetLoading || selected.booster.enabled === false || (selected.booster.type === 'track' && !targetId)} onPress={() => Alert.alert('Activer maintenant ?', 'Ce booster sera consommé et son effet démarrera immédiatement.', [{ text: 'Pas maintenant', style: 'cancel' }, { text: 'Activer', onPress: () => void activate() }])} style={[s.button, { backgroundColor: p.text }]}>{busy ? <ActivityIndicator color={p.bg} /> : null}<Text style={[s.buttonText, { color: p.bg }]}>{busy ? 'Activation…' : 'Activer maintenant'}</Text></EntryPressable></> : null}
    </ScrollView></BottomSheet>
  </CollectionSurface>;
}
const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, hero: { overflow: 'hidden', padding: 26, borderRadius: 30, gap: 17, minHeight: 360 }, heroArt: { position: 'absolute', right: -16, top: 52, width: 170, height: 170, borderRadius: 55, transform: [{ rotate: '16deg' }], backgroundColor: 'rgba(168,159,232,.13)', alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: '#ADBDDF', fontSize: 11, fontWeight: '700', letterSpacing: 2 }, heroTitle: { color: '#F2F2FC', fontSize: 39, lineHeight: 42, fontWeight: '800', maxWidth: 330 }, heroText: { color: '#C4CDE1', fontSize: 15, lineHeight: 22, maxWidth: 300 }, heroButton: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 54, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#DBDBFF', marginTop: 6 }, heroButtonText: { flexShrink: 1, color: '#192139', fontSize: 14, fontWeight: '800' }, heroFoot: { color: '#B6C1D7', fontSize: 12, lineHeight: 18 },
  panel: { padding: 22, borderRadius: 25, gap: 18 }, row: { flexDirection: 'row', gap: 14, alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '800' }, name: { fontSize: 15, lineHeight: 20, fontWeight: '700' }, meta: { fontSize: 12, lineHeight: 18, marginTop: 5 }, body: { fontSize: 14, lineHeight: 22 },
  button: { minHeight: 52, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, buttonText: { fontSize: 15, fontWeight: '700' }, inline: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, smallButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center' },
  packRow: { flexDirection: 'row', gap: 12, padding: 19, borderRadius: 24, alignItems: 'center' }, inventory: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 23 }, glyph: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, notice: { padding: 17, borderRadius: 18, fontSize: 14, lineHeight: 21 }, historyRow: { flexDirection: 'row', gap: 13, paddingVertical: 14, alignItems: 'center' }, targetCover: { width: 48, height: 48, borderRadius: 12 },
});
