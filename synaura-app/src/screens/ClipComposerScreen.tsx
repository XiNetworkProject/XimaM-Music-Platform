import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
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
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MotionPressable } from '@/components/motion/Motion';
import { useAuth } from '@/auth/AuthProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useClipUploads } from '@/clips/ClipUploadProvider';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';

const MIN_SECONDS = 15;
const MAX_SECONDS = 60;
const MAX_BYTES = 95 * 1024 * 1024;

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

function OffsetSlider({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const [width, setWidth] = React.useState(1);
  const progress = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const update = React.useCallback((event: GestureResponderEvent) => {
    if (max <= 0) return;
    const x = Math.max(0, Math.min(width, event.nativeEvent.locationX));
    onChange(Math.round((x / width) * max));
  }, [max, onChange, width]);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Début de l'extrait"
      onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={update}
      onResponderMove={update}
      style={styles.offsetSlider}
    >
      <View style={styles.offsetTrack} />
      <View pointerEvents="none" style={[styles.offsetFill, { width: `${progress * 100}%` }]} />
      <View pointerEvents="none" style={[styles.offsetKnob, { left: `${progress * 100}%` }]} />
    </View>
  );
}

export function ClipComposerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const auth = useAuth();
  const player = usePlayer();
  const uploads = useClipUploads();
  const editUploadTaskId = route.params?.editUploadTaskId ? String(route.params.editUploadTaskId) : '';
  const editTask = uploads.tasks.find((task) => task.id === editUploadTaskId && task.status === 'failed') || null;
  const presetSourceTrackId = route.params?.sourceTrackId
    ? String(route.params.sourceTrackId)
    : editTask?.source.sourceTrackId || '';
  const presetSourceTrackType = route.params?.sourceTrackType === 'ai_track' || editTask?.source.sourceTrackType === 'ai_track' ? 'ai_track' : 'track';
  const challengeId: string = route.params?.challengeId || editTask?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = React.useState<string | null>(null);
  const [asset, setAsset] = React.useState<UploadAsset | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [sources, setSources] = React.useState<MusicClipSource[]>([]);
  const [selectedSource, setSelectedSource] = React.useState<MusicClipSource | null>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = React.useState(false);
  const [sourceQuery, setSourceQuery] = React.useState('');
  const [sourceScope, setSourceScope] = React.useState<'all' | 'mine'>('all');
  const [offset, setOffset] = React.useState(0);
  const [caption, setCaption] = React.useState('');
  const [tagText, setTagText] = React.useState('');
  const [loadingSources, setLoadingSources] = React.useState(true);
  const [sourceError, setSourceError] = React.useState('');
  const sourceRequestRef = React.useRef(0);
  const presetRecordedRef = React.useRef(false);
  const editPrefilledRef = React.useRef(false);
  const publishingRef = React.useRef(false);

  React.useEffect(() => {
    if (!editTask || editPrefilledRef.current) return;
    editPrefilledRef.current = true;
    setAsset({ ...editTask.asset, uri: editTask.localUri || editTask.asset.uri });
    setDuration(editTask.duration);
    setSelectedSource(editTask.source);
    setOffset(editTask.offset);
    setCaption(editTask.caption);
    setTagText(editTask.tags.map((tag) => `#${tag}`).join(' '));
  }, [editTask]);

  const loadSources = React.useCallback(async (query = '', scope: 'all' | 'mine' = 'all') => {
    const requestId = ++sourceRequestRef.current;
    setLoadingSources(true);
    setSourceError('');
    try {
      const next = await getMusicClipSources({
        sourceTrackId: presetSourceTrackId || undefined,
        sourceTrackType: presetSourceTrackType,
        query: query.trim() || undefined,
        limit: query.trim() ? 50 : 36,
        scope,
      });
      if (requestId !== sourceRequestRef.current) return;
      setSources(next);
      if (presetSourceTrackId) {
        const preset = next.find((source) => (
          source._id === presetSourceTrackId
          || source.sourceTrackId === presetSourceTrackId.replace(/^ai-/, '')
        ));
        if (preset) {
          setSelectedSource((current) => current || preset);
          if (!presetRecordedRef.current) {
            presetRecordedRef.current = true;
            void recordClipFunnelEvent(preset._id, 'clip_composer_opened');
          }
        }
      }
    } catch (error) {
      if (requestId === sourceRequestRef.current) {
        setSourceError(error instanceof Error ? error.message : 'Impossible de charger les sons.');
      }
    } finally {
      if (requestId === sourceRequestRef.current) setLoadingSources(false);
    }
  }, [presetSourceTrackId, presetSourceTrackType]);

  React.useEffect(() => {
    void loadSources('', 'all');
  }, [loadSources]);

  React.useEffect(() => {
    if (!sourceSheetOpen) return;
    const timer = setTimeout(() => void loadSources(sourceQuery, sourceScope), sourceQuery.trim() ? 320 : 0);
    return () => clearTimeout(timer);
  }, [loadSources, sourceQuery, sourceScope, sourceSheetOpen]);

  React.useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    getMusicChallenge(challengeId).then((next) => mounted && setChallengeTitle(next.title)).catch(() => {});
    return () => { mounted = false; };
  }, [challengeId]);

  const visibleSources = React.useMemo(() => {
    const query = sourceQuery.trim().toLocaleLowerCase('fr');
    return sources
      .filter((source) => sourceScope !== 'mine' || source.artist?._id === auth.user?.id)
      .filter((source) => !query || `${source.title} ${source.artist?.name || ''} ${source.artist?.username || ''}`.toLocaleLowerCase('fr').includes(query))
      .sort((a, b) => Number(b.artist?._id === auth.user?.id) - Number(a.artist?._id === auth.user?.id));
  }, [auth.user?.id, sourceQuery, sourceScope, sources]);
  const maxOffset = Math.max(0, Math.round((selectedSource?.duration || 0) - Math.max(MIN_SECONDS, duration || MIN_SECONDS)));
  const ready = Boolean(asset && selectedSource && duration >= MIN_SECONDS && duration <= MAX_SECONDS);
  const currentStep = !asset ? 1 : !selectedSource ? 2 : 3;
  const wideLayout = responsive.isTablet || responsive.isPhoneLandscape;
  const previewHeight = Math.max(
    responsive.isVeryShort ? 220 : 270,
    Math.min(responsive.isShort ? 340 : 440, responsive.usableHeight * (wideLayout ? 0.68 : 0.48)),
  );
  const previewWidth = Math.min(
    wideLayout ? responsive.availableContentWidth * 0.43 : responsive.availableContentWidth,
    previewHeight * 0.75,
  );

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
      Alert.alert('Vidéo trop lourde', 'La vidéo dépasse 95 Mo. Choisis une version plus légère.');
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

  const chooseSource = (source: MusicClipSource) => {
    setSelectedSource(source);
    setOffset(0);
    setSourceSheetOpen(false);
    void recordClipFunnelEvent(source._id, 'clip_use_sound_started');
  };

  const publish = () => {
    if (publishingRef.current) return;
    if (!asset || !selectedSource || !ready) {
      Alert.alert('Clip incomplet', !asset ? 'Choisis d’abord une vidéo.' : 'Choisis le son associé au Clip.');
      return;
    }
    publishingRef.current = true;
    try {
      const input = {
        asset,
        source: selectedSource,
        duration,
        offset,
        caption,
        tags: tagsFromText(tagText),
        challengeId: challengeId || undefined,
      };
      if (editTask) uploads.revise(editTask.id, input);
      else uploads.enqueue(input);
      void player.pause();
      navigatePrimaryTab(navigation, 'Swipe', { mode: 'clips' });
    } catch (error) {
      publishingRef.current = false;
      Alert.alert('Publication impossible', error instanceof Error ? error.message : 'Connexion requise.');
    }
  };

  const primaryLabel = !asset ? 'Ajouter la vidéo' : !selectedSource ? 'Choisir le son' : editTask ? 'Enregistrer et réessayer' : 'Publier le Clip';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground variant="dark">
        <View style={[styles.header, responsive.contentFrame, { paddingTop: insets.top + 8, paddingHorizontal: responsive.gutter }]}>
          <Pressable accessibilityLabel="Fermer" onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={22} color={colors.paper} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{editTask ? 'Modifier le Clip' : 'Créer un Clip'}</Text>
            <View style={styles.progressRail}>
              {[1, 2, 3].map((step) => <View key={step} style={[styles.progressSegment, step <= currentStep && styles.progressSegmentActive]} />)}
            </View>
          </View>
          <Text style={styles.stepText}>{currentStep}/3</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            responsive.pageContent,
            { paddingBottom: Math.max(insets.bottom + 112, 126) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {challengeId ? (
            <View style={styles.challengeChip}>
              <Ionicons name="trophy-outline" size={14} color="#F2C86B" />
              <Text numberOfLines={1} style={styles.challengeText}>{challengeTitle || 'Challenge Synaura'}</Text>
            </View>
          ) : null}

          <View style={[styles.workspace, wideLayout && styles.workspaceWide]}>
            <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}>
              {asset ? (
                <>
                  <Video source={{ uri: asset.uri }} paused muted repeat resizeMode="cover" style={StyleSheet.absoluteFill} />
                  <View style={styles.previewShade} />
                  <Pressable accessibilityLabel="Changer la vidéo" onPress={() => void pickVideo()} style={styles.changeVideoButton}>
                    <Ionicons name="camera-reverse-outline" size={20} color={colors.paper} />
                  </Pressable>
                  <View style={styles.previewMeta}>
                    <View style={styles.previewReady}><View style={styles.readyDot} /><Text style={styles.previewReadyText}>VIDÉO PRÊTE</Text></View>
                    <Text numberOfLines={1} style={styles.previewName}>{asset.name}</Text>
                    <Text style={styles.previewDetail}>{mmss(duration)}{asset.size ? ` · ${compactBytes(Number(asset.size))}` : ''}</Text>
                  </View>
                </>
              ) : (
                <Pressable onPress={() => void pickVideo()} style={styles.previewEmpty}>
                  <View style={styles.addVideoIcon}><Ionicons name="add" size={30} color={colors.paper} /></View>
                  <Text style={styles.previewEmptyTitle}>Ajouter une vidéo</Text>
                  <Text style={styles.previewEmptyText}>15 à 60 secondes · 95 Mo maximum</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.editorPanel, wideLayout && styles.editorPanelWide]}>
              <Pressable onPress={() => setSourceSheetOpen(true)} style={styles.editorRow}>
                <View style={[styles.rowIcon, styles.rowIconViolet]}>
                  {selectedSource?.coverUrl ? <Image source={{ uri: selectedSource.coverUrl }} style={styles.rowCover} /> : <Ionicons name="musical-notes" size={19} color="#B8A6F0" />}
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>SON</Text>
                  <Text numberOfLines={1} style={styles.rowTitle}>{selectedSource?.title || 'Choisir un son Synaura'}</Text>
                  {selectedSource ? <Text numberOfLines={1} style={styles.rowSubtitle}>{selectedSource.artist?.name || selectedSource.artist?.username || 'Artiste Synaura'}</Text> : null}
                </View>
                {selectedSource ? (
                  <Pressable accessibilityLabel="Écouter" onPress={(event) => { event.stopPropagation(); void previewSource(selectedSource); }} style={styles.inlinePlay}>
                    <Ionicons name={player.current?._id === selectedSource._id && player.isPlaying ? 'pause' : 'play'} size={16} color={colors.paper} />
                  </Pressable>
                ) : <Ionicons name="chevron-forward" size={18} color="rgba(247,246,243,0.42)" />}
              </Pressable>

              {selectedSource && maxOffset > 0 ? (
                <View style={styles.offsetSection}>
                  <View style={styles.offsetHeader}>
                    <Text style={styles.rowLabel}>DÉBUT DE L'EXTRAIT</Text>
                    <Text style={styles.offsetValue}>{mmss(offset)} – {mmss(offset + duration)}</Text>
                  </View>
                  <OffsetSlider value={offset} max={maxOffset} onChange={setOffset} />
                </View>
              ) : null}

              <View style={styles.detailsSection}>
                <View style={styles.inputHeading}>
                  <Text style={styles.rowLabel}>LÉGENDE</Text>
                  <Text style={styles.captionCount}>{caption.length}/280</Text>
                </View>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={280}
                  multiline
                  placeholder="Écris quelque chose sur ce Clip…"
                  placeholderTextColor="rgba(247,246,243,0.34)"
                  style={[styles.input, styles.captionInput]}
                />
                <View style={styles.tagInputRow}>
                  <Ionicons name="pricetag-outline" size={17} color="rgba(247,246,243,0.46)" />
                  <TextInput
                    value={tagText}
                    onChangeText={setTagText}
                    placeholder="Ajouter des tags"
                    placeholderTextColor="rgba(247,246,243,0.34)"
                    style={styles.tagInput}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.publishDock, { paddingBottom: Math.max(insets.bottom, 10), paddingLeft: responsive.pagePaddingLeft, paddingRight: responsive.pagePaddingRight }]}>
          <MotionPressable
            onPress={() => {
              if (!asset) void pickVideo();
              else if (!selectedSource) setSourceSheetOpen(true);
              else publish();
            }}
            style={[styles.publishButton, ready && styles.publishButtonReady]}
            scaleTo={0.985}
          >
            <Ionicons name={!asset ? 'videocam-outline' : !selectedSource ? 'musical-notes-outline' : 'arrow-up'} size={20} color={colors.paper} />
            <Text style={styles.publishText}>{primaryLabel}</Text>
          </MotionPressable>
        </View>

        <BottomSheet visible={sourceSheetOpen} title="Choisir le son" subtitle="Tous les sons que tu peux utiliser" onClose={() => setSourceSheetOpen(false)} keyboard maxHeight="92%">
          <View style={styles.sheetBody}>
            <View style={styles.scopeTabs}>
              {([
                { key: 'all' as const, label: 'Tous les sons', icon: 'musical-notes-outline' as const },
                { key: 'mine' as const, label: 'Mes sons', icon: 'person-outline' as const },
              ]).map((item) => {
                const active = sourceScope === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      setSourceScope(item.key);
                      setSourceQuery('');
                    }}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                  >
                    <Ionicons name={item.icon} size={16} color={active ? colors.paper : colors.textSecondary} />
                    <Text style={[styles.scopeTabText, active && styles.scopeTabTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.searchShell}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput value={sourceQuery} onChangeText={setSourceQuery} placeholder="Rechercher un titre ou un artiste" placeholderTextColor={colors.textTertiary} style={styles.searchInput} autoCorrect={false} />
              {sourceQuery ? <Pressable accessibilityLabel="Effacer" onPress={() => setSourceQuery('')}><Ionicons name="close-circle" size={19} color={colors.textTertiary} /></Pressable> : null}
            </View>
            {loadingSources ? <ActivityIndicator color={colors.violet} style={styles.sheetLoader} /> : sourceError ? (
              <Pressable onPress={() => void loadSources(sourceQuery, sourceScope)} style={styles.retry}><Ionicons name="refresh" size={18} color={colors.violet} /><Text style={styles.retryText}>Recharger les sons</Text></Pressable>
            ) : (
              <FlatList
                data={visibleSources}
                style={{ height: Math.max(220, Math.min(470, responsive.usableHeight * 0.55)) }}
                keyExtractor={(source) => source._id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                contentContainerStyle={styles.sourceList}
                ListEmptyComponent={(
                  <View style={styles.noResults}>
                    <View style={styles.noResultsIcon}><Ionicons name={sourceScope === 'mine' ? 'person-outline' : 'musical-notes-outline'} size={23} color={colors.textTertiary} /></View>
                    <Text style={styles.noResultsTitle}>{sourceScope === 'mine' ? 'Aucun son public à toi' : 'Aucun son trouvé'}</Text>
                    <Text style={styles.noResultsText}>{sourceScope === 'mine' ? 'Publie un morceau pour pouvoir créer son Clip officiel.' : 'Essaie un autre titre ou un autre artiste.'}</Text>
                  </View>
                )}
                renderItem={({ item: source }) => {
                  const active = selectedSource?._id === source._id;
                  const own = Boolean(auth.user?.id) && source.artist?._id === auth.user?.id;
                  const playing = player.current?._id === source._id && player.isPlaying;
                  return (
                    <Pressable onPress={() => chooseSource(source)} style={[styles.sourceRow, active && styles.sourceRowActive]}>
                      {source.coverUrl ? <Image source={{ uri: source.coverUrl }} style={styles.sheetCover} /> : <View style={styles.sheetCover}><Ionicons name="musical-note" size={18} color={colors.textTertiary} /></View>}
                      <View style={styles.sourceCopy}>
                        <View style={styles.sourceTitleLine}>
                          <Text numberOfLines={1} style={styles.sourceTitle}>{source.title}</Text>
                          {own ? <Text style={styles.ownBadge}>MON SON</Text> : null}
                        </View>
                        <Text numberOfLines={1} style={styles.sourceArtist}>{source.artist?.name || source.artist?.username || 'Artiste Synaura'} · {mmss(source.duration)}</Text>
                      </View>
                      <Pressable accessibilityLabel={playing ? 'Pause' : 'Écouter'} onPress={(event) => { event.stopPropagation(); void previewSource(source); }} style={styles.sheetPlay}>
                        <Ionicons name={playing ? 'pause' : 'play'} size={17} color={colors.text} />
                      </Pressable>
                      <View style={[styles.selectCircle, active && styles.selectCircleActive]}>{active ? <Ionicons name="checkmark" size={15} color={colors.paper} /> : <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />}</View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </BottomSheet>
      </SynauraBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  header: { width: '100%', minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(247,246,243,0.12)' },
  headerButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(247,246,243,0.08)', borderWidth: 1, borderColor: 'rgba(247,246,243,0.10)' },
  headerTitleWrap: { flex: 1, maxWidth: 220, alignItems: 'center', gap: 7 },
  headerTitle: { color: colors.paper, fontSize: 16, fontWeight: '900' },
  progressRail: { width: '100%', flexDirection: 'row', gap: 5 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(247,246,243,0.14)' },
  progressSegmentActive: { backgroundColor: colors.violet },
  stepText: { width: 42, color: 'rgba(247,246,243,0.48)', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  content: { gap: 12, paddingTop: 4 },
  challengeChip: { maxWidth: '100%', alignSelf: 'center', minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 17, paddingHorizontal: 12, backgroundColor: 'rgba(242,200,107,0.10)', borderWidth: 1, borderColor: 'rgba(242,200,107,0.18)' },
  challengeText: { maxWidth: 260, color: '#F2D58D', fontSize: 10, fontWeight: '900' },
  workspace: { width: '100%', alignItems: 'center', gap: 14 },
  workspaceWide: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 16 },
  previewFrame: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#191817', borderWidth: 1, borderColor: 'rgba(247,246,243,0.16)' },
  previewShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.15)' },
  changeVideoButton: { position: 'absolute', right: 12, top: 12, width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.74)', borderWidth: 1, borderColor: 'rgba(247,246,243,0.16)' },
  previewMeta: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  previewReady: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  readyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cyan },
  previewReadyText: { color: 'rgba(247,246,243,0.78)', fontSize: 9, fontWeight: '900' },
  previewName: { color: colors.paper, fontSize: 15, fontWeight: '900' },
  previewDetail: { marginTop: 4, color: 'rgba(247,246,243,0.60)', fontSize: 10, fontWeight: '800' },
  previewEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  addVideoIcon: { width: 62, height: 62, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  previewEmptyTitle: { marginTop: 18, color: colors.paper, fontSize: 20, fontWeight: '900' },
  previewEmptyText: { marginTop: 7, color: 'rgba(247,246,243,0.48)', textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  editorPanel: { width: '100%', overflow: 'hidden', borderRadius: 14, backgroundColor: 'rgba(31,29,28,0.96)', borderTopWidth: 3, borderTopColor: colors.cyan },
  editorPanelWide: { flex: 1, minWidth: 260 },
  editorRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11 },
  rowIcon: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowIconViolet: { backgroundColor: 'rgba(115,87,198,0.16)' },
  rowCover: { width: '100%', height: '100%' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: 'rgba(247,246,243,0.42)', fontSize: 9, fontWeight: '900' },
  rowTitle: { marginTop: 5, color: colors.paper, fontSize: 13, fontWeight: '900' },
  rowSubtitle: { marginTop: 3, color: 'rgba(247,246,243,0.48)', fontSize: 10, fontWeight: '700' },
  inlinePlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  offsetSection: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(247,246,243,0.10)' },
  offsetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  offsetValue: { color: colors.paper, fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  offsetSlider: { height: 28, justifyContent: 'center', marginTop: 6 },
  offsetTrack: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: 'rgba(247,246,243,0.14)' },
  offsetFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: colors.cyan },
  offsetKnob: { position: 'absolute', width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: colors.paper, borderWidth: 3, borderColor: colors.cyan },
  detailsSection: { gap: 9, padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(247,246,243,0.10)' },
  inputHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  captionCount: { color: 'rgba(247,246,243,0.32)', fontSize: 9, fontWeight: '800' },
  input: { color: colors.paper, backgroundColor: '#272523', borderBottomWidth: 1, borderColor: 'rgba(247,246,243,0.18)', fontSize: 13, fontWeight: '700' },
  captionInput: { minHeight: 92, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, textAlignVertical: 'top' },
  tagInputRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#272523', borderWidth: 1, borderColor: 'rgba(247,246,243,0.12)' },
  tagInput: { flex: 1, minWidth: 0, color: colors.paper, fontSize: 12, fontWeight: '700' },
  publishDock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, backgroundColor: 'rgba(17,17,17,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(247,246,243,0.10)' },
  publishButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, backgroundColor: '#363331', borderBottomWidth: 3, borderColor: 'rgba(247,246,243,0.16)' },
  publishButtonReady: { backgroundColor: colors.violet, borderColor: colors.cyan },
  publishText: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  sheetBody: { minHeight: 360, maxHeight: 650, paddingHorizontal: 14, paddingTop: 10 },
  scopeTabs: { minHeight: 46, flexDirection: 'row', gap: 0, borderRadius: 0, padding: 0, backgroundColor: 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  scopeTab: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 0 },
  scopeTabActive: { backgroundColor: colors.black },
  scopeTabText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  scopeTabTextActive: { color: colors.paper },
  searchShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, borderRadius: 0, paddingHorizontal: 2, backgroundColor: 'transparent', borderBottomWidth: 1, borderColor: colors.borderStrong },
  searchInput: { flex: 1, minWidth: 0, color: colors.text, fontSize: 13, fontWeight: '700' },
  sheetLoader: { marginVertical: 80 },
  sourceList: { gap: 0, paddingTop: 11, paddingBottom: 22 },
  sourceRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 0, paddingVertical: 8, backgroundColor: 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sourceRowActive: { borderColor: colors.violet, backgroundColor: colors.violetSoft, borderLeftWidth: 3, paddingLeft: 8 },
  sheetCover: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceTitle: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '900' },
  ownBadge: { color: colors.violet, fontSize: 8, fontWeight: '900' },
  sourceArtist: { marginTop: 5, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  sheetPlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  selectCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong },
  selectCircleActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  retry: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  noResults: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 48 },
  noResultsIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  noResultsTitle: { marginTop: 12, color: colors.text, fontSize: 14, fontWeight: '900' },
  noResultsText: { maxWidth: 280, marginTop: 6, color: colors.textTertiary, textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
});

export default ClipComposerScreen;
