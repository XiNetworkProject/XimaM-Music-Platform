import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createComment, deleteComment, getCommentsPage, getPublicProfile, getTimestampedComments, hideTrackComment, replyToTrackComment, toggleTrackCommentLike, type MobileProfile } from '@/api/client';
import type { HomeComment, HomePost, MusicClip, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { TrackCover } from '@/components/TrackCover';
import { WaveformSeekBar, invalidateTrackMoments } from './WaveformSeekBar';
import { fmtCount, fmtTime } from './helpers';
import { useSheetDrag } from './useSheetDrag';

type Props = {
  visible: boolean; track: Track | null; clip?: MusicClip | null; post?: HomePost | null; commentCount: number;
  onClose: () => void; onCountChange?: (id: string, count: number) => void;
  initialTimestamp?: number | null; onSeek?: (seconds: number) => void;
};
type Draft = { text: string; timestamp: number | null; reply: HomeComment | null; tab: 'conversation' | 'moments' };
const blank = (): Draft => ({ text: '', timestamp: null, reply: null, tab: 'conversation' });
function mapComment(rows: HomeComment[], id: string, change: (row: HomeComment) => HomeComment | null): HomeComment[] {
  return rows.flatMap(row => {
    if (row.id !== id) return [{ ...row, replies: mapComment(row.replies || [], id, change) }];
    const next = change(row);
    return next ? [next] : [];
  });
}

function AuthorPeek({ author, onBack, onFullProfile, backLabel = 'Retour aux commentaires' }: { author: HomeComment['user']; onBack: () => void; onFullProfile: () => void; backLabel?: string }) {
  const { insets } = useResponsiveLayout();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [error, setError] = useState('');
  const player = usePlayer();
  useEffect(() => {
    let alive = true;
    void getPublicProfile(author.username).then(next => { if (alive) setProfile(next); }).catch(() => { if (alive) setError('Le profil est momentanément indisponible.'); });
    return () => { alive = false; };
  }, [author.username]);
  return <View style={styles.peek}>
    <View style={styles.head}><Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.icon}><Ionicons name="arrow-back" size={22} color="#EDEBFA" /></Pressable><Text style={styles.heading}>L’artiste, de plus près</Text></View>
    <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 100 + insets.bottom }}>
      <SynauraImage source={profile?.avatar || author.avatar} style={styles.peekAvatar} />
      <Text accessibilityRole="header" style={styles.peekName}>{profile?.name || author.name}</Text><Text style={styles.muted}>@{author.username}</Text>
      {profile ? <><Text style={styles.bio}>{profile.bio}</Text><Text style={styles.muted}>{fmtCount(profile.followerCount)} abonnés · {fmtCount(profile.totalPlays)} écoutes</Text><Text style={[styles.heading, { marginTop: 26, marginBottom: 12 }]}>Ses sons</Text>
        {profile.tracks.slice(0, 5).map(track => <Pressable key={track._id} accessibilityRole="button" accessibilityLabel={`Écouter ${track.title}`} onPress={() => void player.playTrack(track)} style={styles.peekTrack}><TrackCover track={track} active={false} style={{ flex: 0, width: 48, height: 48, borderRadius: 10, overflow: 'hidden' }} /><View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.author}>{track.title}</Text><Text style={styles.muted}>{fmtTime(track.duration)}</Text></View><Ionicons name="play" size={20} color="#CAB9FF" /></Pressable>)}
      </> : error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={{ marginTop: 30 }} color="#BEA9FF" />}
    </ScrollView>
    <Pressable accessibilityRole="button" onPress={onFullProfile} style={[styles.fullProfile, { bottom: 20 + insets.bottom }]}><Text style={styles.author}>Ouvrir le profil complet</Text><Ionicons name="arrow-forward" size={19} color="#DDD4FF" /></Pressable>
  </View>;
}

export function LiveProfilePeek({ username, onClose }: { username: string | null; onClose: () => void }) {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const { settings } = useMobileSettings();
  return <Modal visible={Boolean(username)} transparent animationType={settings.reducedMotion ? 'none' : 'slide'} statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}><Pressable accessibilityLabel="Fermer le profil" onPress={onClose} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={[styles.sheet, { bottom: 0, left: layout.overlayLeftInset, right: layout.overlayRightInset, height: layout.height * .82, paddingBottom: layout.insets.bottom }]}>
      {username ? <AuthorPeek key={username} author={{ id: '', name: username, username }} backLabel="Retour au Live" onBack={onClose} onFullProfile={() => { onClose(); navigation.navigate('PublicProfile', { username }); }} /> : null}
    </View></View>
  </Modal>;
}

export function CommentsSheet({ visible, track, clip = null, post = null, commentCount, onClose, onCountChange, initialTimestamp = null, onSeek }: Props) {
  const layout = useResponsiveLayout();
  const keyboardHeight = useKeyboardHeight();
  const { settings } = useMobileSettings();
  const auth = useAuth();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const progress = usePlayerProgress(400);
  const targetKind = post ? 'post' : clip ? 'clip' : 'track';
  const targetId = post?.id || clip?.id || track?._id || '';
  const key = `${auth.user?.id || 'guest'}:${targetKind}:${targetId}`;
  const disabled = !targetId || (targetKind === 'track' && /^(ai-|radio-)/.test(targetId));
  const canMoments = targetKind === 'track' && !disabled;
  const [comments, setComments] = useState<HomeComment[]>([]);
  const [moments, setMoments] = useState<HomeComment[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const drafts = useRef(new Map<string, Draft>());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [peek, setPeek] = useState<HomeComment['user'] | null>(null);
  const epoch = useRef(0);
  const cursor = useRef<string | number | null>(null);
  const moreLock = useRef(false);
  const mutationLock = useRef(new Set<string>());
  const input = useRef<TextInput>(null);
  const safePosition = player.current?._id === track?._id ? progress.positionSec : 0;
  const updateDraft = (patch: Partial<Draft>) => setDraft(current => {
    const next = { ...current, ...patch };
    drafts.current.set(key, next);
    return next;
  });
  const load = useCallback(async () => {
    const request = ++epoch.current;
    moreLock.current = false; cursor.current = null;
    setComments([]); setMoments([]); setHasMore(false); setLoadingMore(false); setError('');
    if (disabled || !visible) { setLoading(false); return; }
    setLoading(true);
    try {
      const [page, timed] = await Promise.all([getCommentsPage(targetKind, targetId), canMoments ? getTimestampedComments(targetId) : Promise.resolve([])]);
      if (epoch.current !== request) return;
      setComments(page.comments); setMoments(timed); setHasMore(page.hasMore);
      cursor.current = page.nextCursor;
    } catch (caught) { if (epoch.current === request) setError(caught instanceof Error ? caught.message : 'Chargement impossible.'); }
    finally { if (epoch.current === request) setLoading(false); }
  }, [canMoments, disabled, targetId, targetKind, visible, key]);

  useEffect(() => {
    setPeek(null); setSubmitting(false);
    if (!visible) { epoch.current += 1; return; }
    const restored = drafts.current.get(key) || blank();
    const next = initialTimestamp != null && canMoments ? { ...restored, timestamp: initialTimestamp, tab: 'moments' as const } : restored;
    setDraft(next); drafts.current.set(key, next);
    void load();
    return () => { epoch.current += 1; };
  }, [key, visible, initialTimestamp, canMoments, load]);

  const loadMore = async () => {
    if (moreLock.current || !hasMore || loading || draft.tab === 'moments') return;
    const request = epoch.current; moreLock.current = true; setLoadingMore(true);
    try {
      const page = await getCommentsPage(targetKind, targetId, cursor.current);
      if (request !== epoch.current) return;
      setComments(current => Array.from(new Map([...current, ...page.comments].map(row => [row.id, row])).values()));
      cursor.current = page.nextCursor;
      setHasMore(page.hasMore);
    } catch (caught) { if (request === epoch.current) setError(caught instanceof Error ? caught.message : 'Chargement impossible.'); }
    finally { if (request === epoch.current) { setLoadingMore(false); moreLock.current = false; } }
  };

  const submit = async () => {
    const content = draft.text.trim();
    if (!content || disabled || !auth.user || mutationLock.current.has(`send:${key}`)) return;
    const request = epoch.current; const sentDraft = draft;
    mutationLock.current.add(`send:${key}`); setSubmitting(true); setError('');
    try {
      const next = draft.reply && canMoments
        ? await replyToTrackComment(targetId, draft.reply.id, content)
        : await createComment(targetKind, targetId, content, canMoments ? { timestampSeconds: draft.timestamp } : undefined);
      if (drafts.current.get(key) === sentDraft) drafts.current.set(key, { ...sentDraft, text: '', reply: null, timestamp: null });
      if (canMoments) invalidateTrackMoments(targetId);
      if (request !== epoch.current) return;
      if (draft.reply) {
        const append = (rows: HomeComment[]) => mapComment(rows, draft.reply!.id, row => ({ ...row, replies: [...row.replies, next] }));
        setComments(append); setMoments(append);
      } else { setComments(rows => [next, ...rows]); if (next.timestampSeconds != null) setMoments(rows => [...rows, next]); }
      updateDraft({ text: '', reply: null, timestamp: null });
      onCountChange?.(targetId, commentCount + 1);
    } catch (caught) { if (request === epoch.current) setError(caught instanceof Error ? caught.message : 'Commentaire non envoyé.'); }
    finally { mutationLock.current.delete(`send:${key}`); if (request === epoch.current) setSubmitting(false); }
  };

  const mutate = async (comment: HomeComment, action: 'like' | 'delete' | 'hide') => {
    if (!auth.user || mutationLock.current.has(`${key}:${comment.id}`)) return;
    const request = epoch.current;
    mutationLock.current.add(`${key}:${comment.id}`); setError('');
    try {
      const liked = action === 'like' ? await toggleTrackCommentLike(targetId, comment.id) : null;
      if (action === 'delete') await deleteComment(targetKind, targetId, comment.id);
      if (action === 'hide') await hideTrackComment(targetId, comment.id);
      if (canMoments) invalidateTrackMoments(targetId);
      if (request !== epoch.current) return;
      const change = (rows: HomeComment[]) => mapComment(rows, comment.id, row => liked ? { ...row, ...liked } : null);
      setComments(change); setMoments(change);
      if (!liked) { onCountChange?.(targetId, Math.max(0, commentCount - 1 - (comment.replies?.length || 0))); if (draft.reply?.id === comment.id) updateDraft({ reply: null }); }
    } catch (caught) { if (request === epoch.current) setError(caught instanceof Error ? caught.message : 'Action impossible.'); }
    finally { mutationLock.current.delete(`${key}:${comment.id}`); }
  };
  const remove = (comment: HomeComment, own: boolean) => Alert.alert(own ? 'Supprimer ce commentaire ?' : 'Masquer ce commentaire ?', 'Cette action s’applique à cette discussion.', [
    { text: 'Annuler', style: 'cancel' }, { text: own ? 'Supprimer' : 'Masquer', style: 'destructive', onPress: () => void mutate(comment, own ? 'delete' : 'hide') },
  ]);
  const openAuthor = (author: HomeComment['user']) => { Keyboard.dismiss(); setPeek(author); };
  const renderComment = (comment: HomeComment, nested = false) => <View key={comment.id} style={[styles.comment, nested && styles.reply]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Profil de ${comment.user.name}`} onPress={() => openAuthor(comment.user)} style={styles.avatar}>
      {comment.user.avatar ? <SynauraImage source={comment.user.avatar} style={StyleSheet.absoluteFill} /> : <Text style={styles.author}>{comment.user.name.slice(0, 1)}</Text>}
    </Pressable>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Pressable accessibilityRole="button" onPress={() => openAuthor(comment.user)}><Text style={styles.author}>{comment.user.name} <Text style={styles.date}>{new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text></Text></Pressable>
      {comment.timestampSeconds != null ? <Pressable accessibilityRole="button" accessibilityLabel={`Écouter à ${fmtTime(comment.timestampSeconds)}`} onPress={() => onSeek?.(comment.timestampSeconds!)} style={styles.timestamp}><Ionicons name="play" size={11} color="#C4ADFF" /><Text style={styles.accent}>{fmtTime(comment.timestampSeconds)}</Text></Pressable> : null}
      <Text style={styles.content}>{comment.content}</Text>
      <View style={styles.commentActions}>
        {canMoments ? <Pressable accessibilityRole="button" accessibilityLabel={comment.isLiked ? 'Retirer le like du commentaire' : 'Aimer le commentaire'} onPress={() => void mutate(comment, 'like')} style={styles.smallAction}><Ionicons name={comment.isLiked ? 'heart' : 'heart-outline'} size={16} color={comment.isLiked ? '#C4ADFF' : '#B0B3CA'} /><Text style={styles.muted}>{comment.likesCount || ''}</Text></Pressable> : null}
        {canMoments && !nested && auth.user ? <Pressable accessibilityRole="button" onPress={() => { updateDraft({ reply: comment, timestamp: null }); input.current?.focus(); }} style={styles.smallAction}><Text style={styles.muted}>Répondre</Text></Pressable> : null}
        {auth.user?.id === comment.user.id ? <Pressable accessibilityRole="button" accessibilityLabel="Supprimer mon commentaire" onPress={() => remove(comment, true)} style={styles.smallAction}><Ionicons name="trash-outline" size={15} color="#B0B3CA" /></Pressable> : canMoments && auth.user?.id === track?.artist?._id ? <Pressable accessibilityRole="button" onPress={() => remove(comment, false)} style={styles.smallAction}><Text style={styles.muted}>Masquer</Text></Pressable> : null}
      </View>
      {comment.replies?.map(reply => renderComment(reply, true))}
    </View>
  </View>;
  const data = useMemo(() => draft.tab === 'moments' ? [...moments].sort((a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0)) : comments, [comments, moments, draft.tab]);
  // Subtract any resize already applied by Android, avoiding double keyboard lift.
  const keyboardInset = Math.max(0, keyboardHeight - Math.max(0, Dimensions.get('screen').height - layout.height));
  const sheetHeight = Math.max(180, Math.min(layout.height * .88, layout.height - keyboardInset - layout.insets.top - 8));
  const close = () => { Keyboard.dismiss(); onClose(); };
  const drag = useSheetDrag(visible, close, !peek);
  return <Modal visible={visible} transparent animationType={settings.reducedMotion ? 'none' : 'slide'} statusBarTranslucent onRequestClose={() => peek ? setPeek(null) : close()}>
    <View style={styles.overlay}>
      <Pressable accessibilityLabel="Fermer les commentaires" onPress={close} style={StyleSheet.absoluteFill} />
      <Animated.View accessibilityViewIsModal style={[styles.sheet, { left: layout.overlayLeftInset, right: layout.overlayRightInset, bottom: keyboardInset, height: sheetHeight, paddingBottom: keyboardInset > 0 ? 8 : Math.max(layout.insets.bottom, 12), transform: drag.transform }]}>
        <View {...drag.panHandlers} style={{ height: 30 }}>
        <View style={styles.handle} />
        </View>
        <View style={styles.head}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.heading}>La conversation <Text style={styles.muted}>{fmtCount(commentCount)}</Text></Text><Text numberOfLines={1} style={styles.muted}>{clip?.sourceTrack?.title || track?.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} style={styles.icon}><Ionicons name="close" size={23} color="#E9E6F6" /></Pressable></View>
        {canMoments ? <View style={styles.tabs}>{(['conversation', 'moments'] as const).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: draft.tab === tab }} onPress={() => updateDraft({ tab })} style={[styles.tab, draft.tab === tab && styles.tabActive]}><Ionicons name={tab === 'conversation' ? 'chatbubble-outline' : 'pulse-outline'} size={16} color={draft.tab === tab ? '#E7DEFF' : '#989FB6'} /><Text style={draft.tab === tab ? styles.author : styles.muted}>{tab === 'conversation' ? 'Conversation' : 'Moments'}</Text></Pressable>)}</View> : null}
        {draft.tab === 'moments' && canMoments ? <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}><WaveformSeekBar minimal trackId={targetId} position={safePosition} duration={track?.duration || 0} onSeek={seconds => onSeek?.(seconds)} onCreateMoment={seconds => updateDraft({ timestamp: seconds, reply: null })} height={34} /></View> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <FlatList data={loading || disabled ? [] : data} keyExtractor={row => row.id} renderItem={({ item }) => renderComment(item)} style={{ flex: 1 }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} onEndReached={() => void loadMore()} onEndReachedThreshold={.4}
          ListEmptyComponent={<View style={styles.empty}>{loading ? <ActivityIndicator color="#C4ADFF" /> : <Ionicons name={draft.tab === 'moments' ? 'pulse-outline' : 'chatbubbles-outline'} size={32} color="#BAA6EB" />}<Text style={styles.emptyTitle}>{disabled ? 'Discussion indisponible pour cette source' : loading ? 'Un instant…' : error ? 'Connexion interrompue' : draft.tab === 'moments' ? 'Quel passage t’a marqué ?' : 'Le premier mot est à toi.'}</Text><Text style={styles.muted}>{!disabled && !loading && !error ? draft.tab === 'moments' ? 'Choisis un instant sur la waveform.' : 'Un avis, une émotion, une rencontre.' : ''}</Text>{error ? <Pressable onPress={() => void load()} style={styles.icon}><Text style={styles.accent}>Réessayer</Text></Pressable> : null}</View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#BEA9FF" /> : null} />
        {!disabled ? <View style={styles.composer}>
          {draft.reply ? <View style={styles.composerMode}><Text numberOfLines={1} style={[styles.accent, { flex: 1 }]}>Réponse à {draft.reply.user.name}</Text><Pressable accessibilityLabel="Annuler la réponse" onPress={() => updateDraft({ reply: null })} style={styles.icon}><Ionicons name="close" size={18} color="#C4ADFF" /></Pressable></View> : canMoments ? <Pressable accessibilityRole="button" accessibilityLabel={draft.timestamp != null ? 'Retirer le timestamp' : 'Commenter le moment actuel'} onPress={() => updateDraft({ timestamp: draft.timestamp != null ? null : Math.floor(safePosition) })} style={styles.composerMode}><Ionicons name={draft.timestamp != null ? 'close-circle-outline' : 'time-outline'} size={16} color="#C4ADFF" /><Text style={styles.accent}>{draft.timestamp != null ? `À ${fmtTime(draft.timestamp)} · retirer` : 'Ajouter un instant'}</Text></Pressable> : null}
          <View style={styles.inputRow}><TextInput ref={input} accessibilityLabel="Ton commentaire" value={draft.text} onChangeText={text => updateDraft({ text })} editable={!!auth.user && !submitting} multiline maxLength={1000} placeholder={auth.user ? 'Ce que ce son te fait…' : 'Connecte-toi pour commenter'} placeholderTextColor="#999FB5" style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Envoyer le commentaire" disabled={!auth.user || !draft.text.trim() || submitting} onPress={() => void submit()} style={[styles.send, (!auth.user || !draft.text.trim() || submitting) && { opacity: .35 }]}>{submitting ? <ActivityIndicator color="#171426" /> : <Ionicons name="arrow-up" size={22} color="#171426" />}</Pressable></View>
          {!auth.user ? <Pressable accessibilityRole="button" onPress={() => { close(); navigation.navigate('Login'); }} style={styles.composerMode}><Text style={styles.accent}>Se connecter</Text></Pressable> : null}
        </View> : null}
        {peek ? <AuthorPeek key={peek.username} author={peek} onBack={() => setPeek(null)} onFullProfile={() => { const username = peek.username; setPeek(null); close(); navigation.navigate('PublicProfile', { username }); }} /> : null}
      </Animated.View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(2,3,8,.45)' }, sheet: { position: 'absolute', backgroundColor: '#0F121E', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, handle: { width: 32, height: 4, borderRadius: 4, backgroundColor: '#44495D', alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, paddingBottom: 9 }, heading: { color: '#F1EDFF', fontSize: 19, fontFamily: 'Inter_700Bold' }, icon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, muted: { color: '#A5ABC1', fontSize: 12, lineHeight: 18 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, gap: 18 }, tab: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: '#BBA1FA' }, list: { flexGrow: 1, padding: 20, paddingBottom: 24 }, comment: { flexDirection: 'row', gap: 11, marginBottom: 18 }, reply: { marginTop: 8, marginBottom: 3 }, avatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: '#272239', alignItems: 'center', justifyContent: 'center' }, author: { color: '#EDEBFA', fontSize: 13, fontWeight: '700' }, date: { color: '#9299AF', fontSize: 10, fontWeight: '400' }, content: { color: '#D6DAE9', fontSize: 14, lineHeight: 21, marginTop: 6 }, timestamp: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 }, accent: { color: '#C4ADFF', fontSize: 12 }, commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, smallAction: { minHeight: 40, minWidth: 40, alignItems: 'center', flexDirection: 'row', gap: 5 }, error: { color: '#FFABB9', fontSize: 12, lineHeight: 18, padding: 16 },
  empty: { flex: 1, minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20 }, emptyTitle: { color: '#DFDBED', fontSize: 15, fontWeight: '600', textAlign: 'center' }, composer: { paddingHorizontal: 16, paddingTop: 4 }, composerMode: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 5 }, inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 }, input: { flex: 1, minHeight: 48, maxHeight: 110, borderRadius: 21, backgroundColor: '#1C2131', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, color: '#F2EEFF', fontSize: 14 }, send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CCB8FF' },
  peek: { ...StyleSheet.absoluteFillObject, backgroundColor: '#10131F', paddingTop: 18, zIndex: 5 }, peekAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#252439', marginBottom: 18 }, peekName: { color: '#F2EEFF', fontSize: 29, fontFamily: 'Inter_700Bold', marginBottom: 4 }, bio: { color: '#C4C8D9', fontSize: 14, lineHeight: 21, marginVertical: 16 }, peekTrack: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68 }, fullProfile: { position: 'absolute', left: 20, right: 20, bottom: 20, minHeight: 50, borderRadius: 18, padding: 15, backgroundColor: '#2B2340', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
export default CommentsSheet;
