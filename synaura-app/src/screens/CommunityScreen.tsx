import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCommunityClubs, getCommunityFaq, getCommunityPosts, getUserPreferences, likeCommunityPost } from '@/api/client';
import type { CommunityClubAggregate, CommunityFaq, CommunityPost } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { COMMUNITY_CLUBS, getClubByCategory } from '@/community/clubs';
import { CollectionEmpty, CollectionHeader, CollectionHeading, CollectionIconButton, CollectionReveal, CollectionSurface, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CommunityDiscussionModal, CommunityPostCard } from './ClubDetailScreen';

const INTENTIONS: Record<string, string> = { remix: 'remix', collab: 'collab', create_ai: 'ai' };
export function CommunityScreen() {
  const navigation = useNavigation<any>(); const route = useRoute<any>();
  const auth = useAuth(); const player = usePlayer(); const layout = useResponsiveLayout(); const p = useCollectionPalette();
  const [clubs, setClubs] = useState<CommunityClubAggregate[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]); const [selected, setSelected] = useState<CommunityPost | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [more, setMore] = useState(false);
  const [error, setError] = useState(''); const [hasMore, setHasMore] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false); const [faqs, setFaqs] = useState<CommunityFaq[] | null>(null); const [faqError, setFaqError] = useState(''); const [openFaq, setOpenFaq] = useState('');
  const generation = useRef(0); const page = useRef(1); const paging = useRef(false); const pendingLikes = useRef(new Set<string>());
  useEffect(() => { if (!auth.token) { setHighlighted([]); return; } let live = true;
    getUserPreferences().then(preferences => { const intentions = (preferences as any)?.onboarding?.creatorIntentions; if (live) setHighlighted((Array.isArray(intentions) ? intentions : []).map((key: string) => INTENTIONS[key]).filter(Boolean)); }).catch(() => {});
    return () => { live = false; };
  }, [auth.token]);
  const orderedClubs = useMemo(() => [...COMMUNITY_CLUBS].sort((a, b) => Number(highlighted.includes(b.slug)) - Number(highlighted.includes(a.slug))), [highlighted]);
  const load = useCallback(async (refresh = false) => {
    const epoch = ++generation.current; paging.current = false; setMore(false); setError('');
    if (refresh) setRefreshing(true); else setLoading(true);
    const [feed, aggregates] = await Promise.allSettled([getCommunityPosts('all', 1, 15), getCommunityClubs()]);
    if (epoch !== generation.current) return;
    if (feed.status === 'fulfilled') { setPosts(feed.value.posts); setHasMore(feed.value.hasMore); page.current = 1; }
    else setError('Les discussions ne sont pas disponibles. Réessaie dans un instant.');
    if (aggregates.status === 'fulfilled') setClubs(aggregates.value);
    setLoading(false); setRefreshing(false);
  }, [auth.token]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const loadMore = async () => {
    if (loading || refreshing || paging.current || !hasMore || error) return;
    const epoch = generation.current; const next = page.current + 1; paging.current = true; setMore(true);
    try { const result = await getCommunityPosts('all', next, 15); if (epoch !== generation.current) return;
      setPosts(previous => [...previous, ...result.posts.filter(post => !previous.some(item => item.id === post.id))]); page.current = next; setHasMore(result.hasMore);
    } catch { if (epoch === generation.current) setError('La suite des discussions n’a pas pu charger.'); }
    finally { if (epoch === generation.current) { paging.current = false; setMore(false); } }
  };
  useEffect(() => { if (!route.params?.compose) return;
    const club = getClubByCategory(route.params.category) || COMMUNITY_CLUBS[0];
    navigation.navigate('ClubDetail', { slug: club.slug, compose: true, track: route.params.track });
    navigation.setParams({ compose: undefined, category: undefined, track: undefined });
  }, [navigation, route.params]);
  useEffect(() => { if (!faqOpen || faqs) return; let live = true; setFaqError('');
    getCommunityFaq(20).then(items => { if (live) setFaqs(items); }).catch(() => { if (live) setFaqError('Impossible de charger les réponses.'); });
    return () => { live = false; };
  }, [faqOpen, faqs]);
  const updatePost = (id: string, transform: (post: CommunityPost) => CommunityPost) => { setPosts(items => items.map(item => item.id === id ? transform(item) : item)); setSelected(item => item?.id === id ? transform(item) : item); };
  const like = async (post: CommunityPost) => {
    if (!auth.requireAuth()) { navigation.navigate('Login'); return; }
    if (pendingLikes.current.has(post.id)) return;
    pendingLikes.current.add(post.id); const epoch = generation.current; const next = !post.isLiked;
    updatePost(post.id, item => ({ ...item, isLiked: next, likesCount: Math.max(0, item.likesCount + (next ? 1 : -1)) }));
    try { await likeCommunityPost(post.id, next); }
    catch { if (epoch === generation.current) { updatePost(post.id, item => ({ ...item, isLiked: post.isLiked, likesCount: post.likesCount })); setError('Le like n’a pas pu être enregistré.'); } }
    finally { pendingLikes.current.delete(post.id); }
  };
  const header = <>
    <CollectionHeader title="Communauté" eyebrow="LA MUSIQUE, ENSEMBLE" onBack={() => navigation.goBack()} actions={<CollectionIconButton icon="help-circle-outline" label="Aide communauté" onPress={() => setFaqOpen(true)} />} />
    <CollectionReveal><View style={s.hero}>
      <LinearGradient colors={['#253D55', '#242744', '#171F32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={s.orbit} /><View pointerEvents="none" style={[s.orbit, s.orbitInner]} />
      <Text style={s.heroKicker}>DES RENCONTRES. DES MORCEAUX.</Text><Text style={s.heroTitle}>Fais du son.{'\n'}Pas tout seul.</Text>
      <Text style={s.heroBody}>Un avis, une voix, une idée.{'\n'}Trouve la personne qui manque.</Text>
      <EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('ClubDetail', { slug: 'collab', compose: true })} style={s.heroAction}><Ionicons name="add" size={21} color="#142139" /><Text style={s.heroActionText}>Lancer une discussion</Text></EntryPressable>
    </View></CollectionReveal>
    <View style={s.shortcuts}><Shortcut icon="planet-outline" title="City" detail="Événements & votes" onPress={() => navigation.navigate('City')} /><Shortcut icon="chatbubbles-outline" title="Tes échanges" detail="Messages & amis" onPress={() => navigation.navigate('Messages')} /></View>
    <CollectionHeading title="Trouve ton cercle" detail="Les clubs sont ouverts à tous." />
    <View style={s.clubs}>{orderedClubs.map(club => { const aggregate = clubs.find(item => item.slug === club.slug); return <EntryPressable key={club.slug} accessibilityRole="button" accessibilityLabel={club.name + '. ' + club.promise} onPress={() => navigation.navigate('ClubDetail', { slug: club.slug })} style={[s.club, { backgroundColor: p.surface }]}>
      <View style={s.clubTop}><Ionicons name={club.icon as any} color={p.blue} size={25} /><Ionicons name="arrow-forward" color={p.muted} size={16} /></View>
      <Text style={[s.clubName, { color: p.text }]}>{club.name}</Text><Text style={[s.clubDescription, { color: p.muted }]}>{club.promise}</Text>
      <Text style={[s.clubMeta, { color: p.blue }]}>{highlighted.includes(club.slug) ? 'Pour tes projets' : aggregate ? aggregate.postsCount + ' discussion' + (aggregate.postsCount === 1 ? '' : 's') : 'Explorer'}</Text>
    </EntryPressable>; })}</View>
    <CollectionHeading title="Ça se discute" detail="Les dernières conversations, tous sujets confondus." />
    {error ? <CollectionEmpty icon="cloud-offline-outline" title="Un instant…" text={error} action="Réessayer" onPress={() => void load(true)} /> : null}
  </>;
  return <CollectionSurface><FlatList data={posts} keyExtractor={post => post.id} renderItem={({ item }) => <CommunityPostCard post={item} accent={p.blue} playing={player.current?._id === item.track?._id && player.isPlaying} onLike={() => void like(item)} onOpen={() => setSelected(item)} onProfile={() => item.author.username && navigation.navigate('PublicProfile', { username: item.author.username })} onPlay={() => { if (item.track) void (player.current?._id === item.track._id ? player.togglePlayPause() : player.playTrack(item.track)); }} />}
    contentContainerStyle={[layout.pageContent, { paddingTop: layout.insets.top + 4, paddingBottom: layout.miniPlayerClearance }]}
    ListHeaderComponent={header} ListEmptyComponent={<CollectionEmpty loading={loading} icon="chatbubbles-outline" title={loading ? 'Les discussions arrivent…' : error ? 'Connexion indisponible' : 'À vous la parole'} text={loading || error ? undefined : 'Choisis un club et partage ta première idée.'} />}
    ListFooterComponent={more ? <ActivityIndicator style={{ padding: 24 }} color={p.blue} /> : null} ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    onEndReached={() => void loadMore()} onEndReachedThreshold={.3} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={p.blue} />} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" />
    <CommunityDiscussionModal post={selected} accent={p.blue} onClose={() => setSelected(null)} onPlay={track => void (player.current?._id === track._id ? player.togglePlayPause() : player.playTrack(track))} onReply={id => updatePost(id, item => ({ ...item, repliesCount: item.repliesCount + 1 }))} />
    <BottomSheet visible={faqOpen} onClose={() => setFaqOpen(false)} title="Besoin d’un repère ?" maxHeight="84%"><ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}>{faqs?.map(faq => <EntryPressable key={faq.id} accessibilityRole="button" accessibilityState={{ expanded: openFaq === faq.id }} onPress={() => setOpenFaq(value => value === faq.id ? '' : faq.id)} style={[s.faq, { backgroundColor: p.surface }]}><Text style={[s.faqTitle, { color: p.text }]}>{faq.question}</Text>{openFaq === faq.id ? <Text style={[s.faqAnswer, { color: p.muted }]}>{faq.answer}</Text> : null}</EntryPressable>)}{!faqs ? <CollectionEmpty loading={!faqError} title={faqError || 'Chargement…'} /> : faqs.length === 0 ? <CollectionEmpty title="Pas encore de réponses publiées" /> : null}</ScrollView></BottomSheet>
  </CollectionSurface>;
}
function Shortcut({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void }) { const p = useCollectionPalette(); return <EntryPressable accessibilityRole="button" onPress={onPress} style={[s.shortcut, { backgroundColor: p.surface }]}><Ionicons name={icon} size={24} color={p.blue} /><Text style={[s.shortcutTitle, { color: p.text }]}>{title}</Text><Text style={[s.shortcutDetail, { color: p.muted }]}>{detail}</Text></EntryPressable>; }
const s = StyleSheet.create({
  hero: { borderRadius: 29, overflow: 'hidden', padding: 25, marginVertical: 15 }, heroKicker: { color: '#B7D8EE', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, heroTitle: { color: '#F5F8FF', fontSize: 37, lineHeight: 41, fontWeight: '800', marginTop: 23, letterSpacing: 0 }, heroBody: { color: '#BFCDE2', fontSize: 14, lineHeight: 22, marginTop: 14 }, heroAction: { backgroundColor: '#D2E6FA', borderRadius: 25, padding: 13, flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start', marginTop: 24 }, heroActionText: { color: '#142139', fontSize: 13, fontWeight: '700', flexShrink: 1 }, orbit: { position: 'absolute', right: -125, top: -110, width: '90%', aspectRatio: 1, borderRadius: 160, borderWidth: 1, borderColor: 'rgba(181,208,245,.2)' }, orbitInner: { right: -85, top: -70, width: '65%', aspectRatio: 1, borderRadius: 120, backgroundColor: 'rgba(142,164,227,.06)' },
  shortcuts: { flexDirection: 'row', gap: 10, marginBottom: 29 }, shortcut: { flex: 1, borderRadius: 22, padding: 17, gap: 7 }, shortcutTitle: { fontSize: 16, fontWeight: '700' }, shortcutDetail: { fontSize: 12, lineHeight: 18 },
  clubs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 }, club: { width: '48%', flexGrow: 1, padding: 17, borderRadius: 23, gap: 9 }, clubTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }, clubName: { fontSize: 18, fontWeight: '700' }, clubDescription: { fontSize: 13, lineHeight: 19 }, clubMeta: { fontSize: 11, fontWeight: '600', marginTop: 4 }, faq: { padding: 17, borderRadius: 20, gap: 12 }, faqTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' }, faqAnswer: { fontSize: 14, lineHeight: 23 },
});
export default CommunityScreen;
