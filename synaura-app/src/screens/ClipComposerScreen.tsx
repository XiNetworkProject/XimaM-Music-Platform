import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Video from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMusicChallenge,
  getMusicClipSources,
  recordClipFunnelEvent,
  type UploadAsset,
} from '@/api/client';
import type { MusicClipSource, Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { CreateArrivalBanner } from '@/components/create/CreateArrivalBanner';
import { AppHeader } from '@/components/ui/AppHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MotionPressable } from '@/components/motion/Motion';
import { useAuth } from '@/auth/AuthProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useClipUploads } from '@/clips/ClipUploadProvider';
import { colors, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const MIN_SECONDS = 15;
const MAX_SECONDS = 60;
const MAX_BYTES = 200 * 1024 * 1024;

function mmss(seconds = 0) {
  const safe = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function compactBytes(bytes = 0) {
  if (!bytes) return '';
  return `${Math.max(0.1, bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function tagsFromText(value: string) {
  return value.split(/[,\s]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 8);
}

function sourceToTrack(source: MusicClipSource): Track {
  return {
    _id: source._id,
    title: source.title,
    audioUrl: source.audioUrl,
    coverUrl: source.coverUrl || undefined,
    duration: source.duration,
    artist: source.artist,
    isAI: source.sourceTrackType === 'ai_track',
  } as Track;
}

export function ClipComposerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const auth = useAuth();
  const player = usePlayer();
  const uploads = useClipUploads();
  const presetSourceTrackId = route.params?.sourceTrackId ? String(route.params.sourceTrackId) : '';
  const presetSourceTrackType = route.params?.sourceTrackType === 'ai_track' ? 'ai_track' : 'track';
  const challengeId: string = route.params?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = React.useState<string | null>(null);
  const [asset, setAsset] = React.useState<UploadAsset | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [sources, setSources] = React.useState<MusicClipSource[]>([]);
  const [selectedSource, setSelectedSource] = React.useState<MusicClipSource | null>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = React.useState(false);
  const [sourceQuery, setSourceQuery] = React.useState('');
  const [isPreset, setIsPreset] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [caption, setCaption] = React.useState('');
  const [tagText, setTagText] = React.useState('');
  const [loadingSources, setLoadingSources] = React.useState(true);
  const [sourceError, setSourceError] = React.useState('');

  const loadSources = React.useCallback(async (query = '') => {
    setLoadingSources(true);
    setSourceError('');
    try {
      const next = await getMusicClipSources({
        sourceTrackId: presetSourceTrackId || undefined,
        sourceTrackType: presetSourceTrackType,
        query: query.trim() || undefined,
        limit: query.trim() ? 40 : 24,
      });
      setSources(next);
      if (!selectedSource) {
        const preset = presetSourceTrackId
          ? next.find((source) => source._id === presetSourceTrackId || source.sourceTrackId === presetSourceTrackId.replace(/^ai-/, ''))
          : null;
        const initial = preset || next[0] || null;
        setSelectedSource(initial);
        if (preset) {
          setIsPreset(true);
          void recordClipFunnelEvent(preset._id, 'clip_composer_opened');
        }
      }
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'Impossible de charger les sons.');
    } finally {
      setLoadingSources(false);
    }
  }, [presetSourceTrackId, presetSourceTrackType, selectedSource]);

  React.useEffect(() => {
    void loadSources();
    // La selection initiale ne doit pas relancer la requete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSourceTrackId, presetSourceTrackType]);

  React.useEffect(() => {
    const query = sourceQuery.trim().toLocaleLowerCase('fr');
    if (!sourceSheetOpen || query.length < 2) return;
    const hasLocalMatch = sources.some((source) =>
      `${source.title} ${source.artist?.name || ''} ${source.artist?.username || ''}`
        .toLocaleLowerCase('fr')
        .includes(query),
    );
    if (hasLocalMatch) return;
    const timer = setTimeout(() => void loadSources(sourceQuery), 320);
    return () => clearTimeout(timer);
  }, [loadSources, sourceQuery, sourceSheetOpen, sources]);

  React.useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    getMusicChallenge(challengeId).then((next) => mounted && setChallengeTitle(next.title)).catch(() => {});
    return () => { mounted = false; };
  }, [challengeId]);

  const filteredSources = React.useMemo(() => {
    const query = sourceQuery.trim().toLocaleLowerCase('fr');
    if (!query) return sources;
    return sources.filter((source) => `${source.title} ${source.artist?.name || ''} ${source.artist?.username || ''}`.toLocaleLowerCase('fr').includes(query));
  }, [sourceQuery, sources]);
  const maxOffset = Math.max(0, Math.round((selectedSource?.duration || 0) - Math.max(MIN_SECONDS, duration || MIN_SECONDS)));
  const ready = Boolean(asset && selectedSource && duration >= MIN_SECONDS && duration <= MAX_SECONDS);

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Galerie', 'Autorise l’accès à ta galerie pour choisir une vidéo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: MAX_SECONDS,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const picked = result.assets[0];
    const rawDuration = Number(picked.duration || 0);
    const seconds = rawDuration / (rawDuration > 1000 ? 1000 : 1);
    const bytes = Number((picked as any).fileSize || 0);
    if (seconds && (seconds < MIN_SECONDS || seconds > MAX_SECONDS)) {
      Alert.alert('Durée non compatible', 'Choisis une vidéo entre 15 et 60 secondes.');
      return;
    }
    if (bytes > MAX_BYTES) {
      Alert.alert('Vidéo trop lourde', 'La vidéo dépasse 200 Mo. Choisis une version plus légère.');
      return;
    }
    setAsset({
      uri: picked.uri,
      name: (picked as any).fileName || `clip_${Date.now()}.mp4`,
      type: picked.mimeType || 'video/mp4',
      size: bytes || undefined,
    });
    setDuration(Math.round(seconds || MIN_SECONDS));
  };

  const previewSource = async (source: MusicClipSource) => {
    if (player.current?._id === source._id) {
      await player.togglePlayPause();
      return;
    }
    await player.playTrack(sourceToTrack(source));
  };

  const publish = () => {
    if (!asset || !selectedSource || !ready) {
      Alert.alert('Clip incomplet', !asset ? 'Choisis d’abord une vidéo.' : 'Choisis le son associé au Clip.');
      return;
    }
    try {
      uploads.enqueue({
        asset,
        source: selectedSource,
        duration,
        offset,
        caption,
        tags: tagsFromText(tagText),
        challengeId: challengeId || undefined,
      });
      void player.pause();
      navigation.navigate('Swipe', { mode: 'clips' });
    } catch (error) {
      Alert.alert('Publication impossible', error instanceof Error ? error.message : 'Connexion requise.');
    }
  };

  const primaryLabel = !asset ? 'Choisir une vidéo' : !selectedSource ? 'Choisir un son' : 'Publier le Clip';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            responsive.pageContent,
            { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 142, responsive.miniPlayerClearance) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title="Nouveau Clip" subtitle="Une vidéo, un son Synaura" onBack={() => navigation.goBack()} />
          <CreateArrivalBanner context={challengeId ? 'challenge' : 'clip'} title={challengeId ? challengeTitle : (isPreset ? selectedSource?.title : null)} />

          <View style={styles.videoPanel}>
            {asset ? (
              <>
                <Video source={{ uri: asset.uri }} paused muted repeat resizeMode="cover" style={StyleSheet.absoluteFill} />
                <View style={styles.videoShade} />
                <View style={styles.videoTopRow}>
                  <View style={styles.readyBadge}><Ionicons name="checkmark" size={13} color={colors.paper} /><Text style={styles.readyBadgeText}>VIDÉO PRÊTE</Text></View>
                  <Pressable accessibilityLabel="Changer la vidéo" onPress={() => void pickVideo()} style={styles.videoChange}><Ionicons name="swap-horizontal" size={18} color={colors.paper} /></Pressable>
                </View>
                <View style={styles.videoMeta}>
                  <Text numberOfLines={1} style={styles.videoName}>{asset.name}</Text>
                  <Text style={styles.videoDetail}>{mmss(duration)}{asset.size ? ` · ${compactBytes(Number(asset.size))}` : ''}</Text>
                </View>
              </>
            ) : (
              <Pressable onPress={() => void pickVideo()} style={styles.videoEmpty}>
                <View style={styles.videoIcon}><Ionicons name="add" size={28} color={colors.paper} /></View>
                <Text style={styles.videoEmptyTitle}>Choisir la vidéo</Text>
                <Text style={styles.videoEmptyText}>15 à 60 secondes · format vertical recommandé</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View><Text style={styles.sectionKicker}>SON ASSOCIÉ</Text><Text style={styles.sectionTitle}>La musique reste au centre</Text></View>
              <Pressable onPress={() => setSourceSheetOpen(true)} style={styles.changeButton}><Text style={styles.changeButtonText}>{selectedSource ? 'Changer' : 'Choisir'}</Text></Pressable>
            </View>
            {selectedSource ? (
              <View style={styles.selectedSource}>
                {selectedSource.coverUrl ? <Image source={{ uri: selectedSource.coverUrl }} style={styles.sourceCover} /> : <View style={styles.sourceCover} />}
                <Pressable onPress={() => setSourceSheetOpen(true)} style={styles.sourceCopy}>
                  <Text numberOfLines={1} style={styles.sourceTitle}>{selectedSource.title}</Text>
                  <Text numberOfLines={1} style={styles.sourceArtist}>{selectedSource.artist?.name || selectedSource.artist?.username || 'Artiste Synaura'}</Text>
                </Pressable>
                <Pressable accessibilityLabel="Écouter le son" onPress={() => void previewSource(selectedSource)} style={styles.sourcePlay}>
                  <Ionicons name={player.current?._id === selectedSource._id && player.isPlaying ? 'pause' : 'play'} size={18} color={colors.paper} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setSourceSheetOpen(true)} style={styles.sourceEmpty}><Ionicons name="musical-notes-outline" size={22} color={colors.violet} /><Text style={styles.sourceEmptyText}>Choisir dans les sons autorisés</Text><Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /></Pressable>
            )}
            {selectedSource && duration ? (
              <View style={styles.offsetRow}>
                <Pressable disabled={offset <= 0} onPress={() => setOffset(Math.max(0, offset - 5))} style={styles.offsetButton}><Ionicons name="remove" size={18} color={colors.text} /></Pressable>
                <View style={styles.offsetCopy}><Text style={styles.offsetLabel}>EXTRAIT UTILISÉ</Text><Text style={styles.offsetValue}>{mmss(offset)} – {mmss(offset + duration)}</Text></View>
                <Pressable disabled={offset >= maxOffset} onPress={() => setOffset(Math.min(maxOffset, offset + 5))} style={styles.offsetButton}><Ionicons name="add" size={18} color={colors.text} /></Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionKicker}>PUBLICATION</Text>
            <TextInput value={caption} onChangeText={setCaption} maxLength={280} multiline placeholder="Ajoute une légende…" placeholderTextColor={colors.textTertiary} style={[styles.input, styles.captionInput]} />
            <TextInput value={tagText} onChangeText={setTagText} placeholder="#tags séparés par des espaces" placeholderTextColor={colors.textTertiary} style={styles.input} />
            <Text style={styles.counter}>{caption.length}/280</Text>
          </View>
        </ScrollView>

        <View style={[styles.publishDock, { paddingBottom: Math.max(insets.bottom, 10), paddingLeft: responsive.insets.left + responsive.gutter, paddingRight: responsive.insets.right + responsive.gutter }]}>
          <MotionPressable
            onPress={() => {
              if (!asset) void pickVideo();
              else if (!selectedSource) setSourceSheetOpen(true);
              else publish();
            }}
            style={[styles.publishButton, ready && styles.publishButtonReady]}
            scaleTo={0.985}
          >
            <Ionicons name={!asset ? 'videocam-outline' : !selectedSource ? 'musical-notes-outline' : 'arrow-up'} size={19} color={colors.paper} />
            <Text style={styles.publishText}>{primaryLabel}</Text>
          </MotionPressable>
        </View>

        <BottomSheet visible={sourceSheetOpen} title="Choisir un son" subtitle="Sons publics autorisés pour les Clips" onClose={() => setSourceSheetOpen(false)} keyboard maxHeight="90%">
          <View style={styles.sheetBody}>
            <View style={styles.searchShell}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput value={sourceQuery} onChangeText={setSourceQuery} placeholder="Titre ou artiste…" placeholderTextColor={colors.textTertiary} style={styles.searchInput} autoCorrect={false} />
              {sourceQuery ? <Pressable accessibilityLabel="Effacer" onPress={() => { setSourceQuery(''); void loadSources(''); }}><Ionicons name="close-circle" size={19} color={colors.textTertiary} /></Pressable> : null}
            </View>
            {loadingSources ? <ActivityIndicator color={colors.violet} style={styles.sheetLoader} /> : sourceError ? (
              <Pressable onPress={() => void loadSources(sourceQuery)} style={styles.retry}><Ionicons name="refresh" size={18} color={colors.violet} /><Text style={styles.retryText}>Recharger les sons</Text></Pressable>
            ) : (
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.sourceList} keyboardShouldPersistTaps="handled">
                {filteredSources.map((source) => {
                  const active = selectedSource?._id === source._id;
                  const own = Boolean(auth.user?.id) && source.artist?._id === auth.user?.id;
                  const playing = player.current?._id === source._id && player.isPlaying;
                  return (
                    <View key={source._id} style={[styles.sourceRow, active && styles.sourceRowActive]}>
                      {source.coverUrl ? <Image source={{ uri: source.coverUrl }} style={styles.sheetCover} /> : <View style={styles.sheetCover} />}
                      <Pressable onPress={() => { setSelectedSource(source); setOffset(0); setSourceSheetOpen(false); }} style={styles.sourceCopy}>
                        <Text numberOfLines={1} style={styles.sourceTitle}>{source.title}</Text>
                        <Text numberOfLines={1} style={styles.sourceArtist}>{source.artist?.name || source.artist?.username || 'Artiste Synaura'} · {own ? 'Clip officiel' : 'Utiliser ce son'}</Text>
                      </Pressable>
                      <Pressable accessibilityLabel={playing ? 'Pause' : 'Écouter'} onPress={() => void previewSource(source)} style={styles.sheetPlay}><Ionicons name={playing ? 'pause' : 'play'} size={17} color={colors.text} /></Pressable>
                      <Pressable accessibilityLabel="Sélectionner" onPress={() => { setSelectedSource(source); setOffset(0); setSourceSheetOpen(false); }} style={[styles.selectCircle, active && styles.selectCircleActive]}>{active ? <Ionicons name="checkmark" size={15} color={colors.paper} /> : null}</Pressable>
                    </View>
                  );
                })}
                {!filteredSources.length ? <View style={styles.noResults}><Ionicons name="musical-notes-outline" size={24} color={colors.textTertiary} /><Text style={styles.noResultsText}>Aucun son autorisé ne correspond.</Text></View> : null}
              </ScrollView>
            )}
          </View>
        </BottomSheet>
      </SynauraBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: 14 },
  videoPanel: { width: '100%', aspectRatio: 4 / 5, maxHeight: 440, overflow: 'hidden', borderRadius: 8, backgroundColor: colors.black, borderWidth: 1, borderColor: 'rgba(17,17,17,0.14)' },
  videoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.16)' },
  videoTopRow: { position: 'absolute', left: 12, right: 12, top: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readyBadge: { height: 30, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 9, backgroundColor: 'rgba(17,17,17,0.72)' },
  readyBadgeText: { color: colors.paper, fontSize: 9, fontWeight: '900' },
  videoChange: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.72)' },
  videoMeta: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  videoName: { color: colors.paper, fontSize: 15, fontWeight: '900' },
  videoDetail: { marginTop: 4, color: 'rgba(247,246,243,0.7)', fontSize: 10, fontWeight: '800' },
  videoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  videoIcon: { width: 58, height: 58, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  videoEmptyTitle: { marginTop: 16, color: colors.paper, fontSize: 21, fontWeight: '900' },
  videoEmptyText: { marginTop: 7, color: 'rgba(247,246,243,0.58)', textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  section: { gap: 11, borderRadius: 8, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionKicker: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  sectionTitle: { marginTop: 3, color: colors.text, fontSize: 15, fontWeight: '900' },
  changeButton: { minHeight: 36, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 11, backgroundColor: colors.violetSoft },
  changeButtonText: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  selectedSource: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 8, padding: 9, backgroundColor: colors.background },
  sourceCover: { width: 52, height: 52, borderRadius: 8, backgroundColor: 'rgba(17,17,17,0.08)' },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  sourceArtist: { marginTop: 4, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  sourcePlay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  sourceEmpty: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.background, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  sourceEmptyText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '900' },
  offsetRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 8, padding: 8, backgroundColor: colors.background },
  offsetButton: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  offsetCopy: { flex: 1, alignItems: 'center' },
  offsetLabel: { color: colors.textTertiary, fontSize: 8, fontWeight: '900' },
  offsetValue: { marginTop: 3, color: colors.text, fontSize: 13, fontWeight: '900' },
  input: { minHeight: 48, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, fontSize: 13, fontWeight: '700' },
  captionInput: { minHeight: 106, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  publishDock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, backgroundColor: 'rgba(247,246,243,0.96)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  publishButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: colors.black },
  publishButtonReady: { backgroundColor: colors.violet },
  publishText: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  sheetBody: { minHeight: 300, maxHeight: 620, paddingHorizontal: 14, paddingTop: 12 },
  searchShell: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minWidth: 0, color: colors.text, fontSize: 13, fontWeight: '700' },
  sheetLoader: { marginVertical: 70 },
  sourceList: { gap: 8, paddingTop: 12, paddingBottom: 18 },
  sourceRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 8, padding: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sourceRowActive: { borderColor: 'rgba(115,87,198,0.45)', backgroundColor: colors.violetSoft },
  sheetCover: { width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(17,17,17,0.08)' },
  sheetPlay: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  selectCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.borderStrong },
  selectCircleActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  retry: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  noResults: { alignItems: 'center', gap: 8, paddingVertical: 42 },
  noResultsText: { color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
});

export default ClipComposerScreen;
