import React from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createMusicClipDraft,
  getCoverVideoPosterUrl,
  getMusicChallenge,
  getMusicClipSources,
  participateInChallenge,
  recordClipFunnelEvent,
  updateMusicClip,
  uploadToCloudinaryMobile,
  type UploadAsset,
} from '@/api/client';
import type { MusicClipSource } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { CreateArrivalBanner } from '@/components/create/CreateArrivalBanner';
import { AppHeader } from '@/components/ui/AppHeader';
import { useAuth } from '@/auth/AuthProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const MIN_SECONDS = 15;
const MAX_SECONDS = 60;
const MAX_BYTES = 200 * 1024 * 1024;

function mmss(seconds = 0) {
  const safe = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function tagsFromText(value: string) {
  return value.split(/[,\s]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 8);
}

export function ClipComposerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const presetSourceTrackId = route.params?.sourceTrackId ? String(route.params.sourceTrackId) : '';
  const presetSourceTrackType = route.params?.sourceTrackType === 'ai_track' ? 'ai_track' : 'track';
  const challengeId: string = route.params?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(1);
  const [asset, setAsset] = React.useState<UploadAsset | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [sources, setSources] = React.useState<MusicClipSource[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [isPreset, setIsPreset] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [caption, setCaption] = React.useState('');
  const [tagText, setTagText] = React.useState('');
  const [loadingSources, setLoadingSources] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    getMusicClipSources(presetSourceTrackId ? { sourceTrackId: presetSourceTrackId, sourceTrackType: presetSourceTrackType } : {})
      .then((next) => {
        if (!mounted) return;
        setSources(next);
        const presetResolved = Boolean(presetSourceTrackId) && next[0]?._id === presetSourceTrackId;
        if (presetResolved) {
          setSelectedId(next[0]._id);
          setIsPreset(true);
          void recordClipFunnelEvent(presetSourceTrackId, 'clip_composer_opened');
        } else if (next[0]?._id) {
          setSelectedId(next[0]._id);
        }
      })
      .catch((e) => Alert.alert('Clips', e instanceof Error ? e.message : 'Impossible de charger les morceaux autorises'))
      .finally(() => mounted && setLoadingSources(false));
    return () => {
      mounted = false;
    };
  }, [presetSourceTrackId, presetSourceTrackType]);

  React.useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    getMusicChallenge(challengeId).then((next) => mounted && setChallengeTitle(next.title)).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  const selectedSource = sources.find((source) => source._id === selectedId) || null;
  const maxOffset = Math.max(0, Math.round((selectedSource?.duration || 0) - MIN_SECONDS));

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Galerie', 'Autorise l acces a ta galerie pour choisir une video.');
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
    const seconds = Number(picked.duration || 0) / (Number(picked.duration || 0) > 1000 ? 1000 : 1);
    const bytes = Number((picked as any).fileSize || 0);
    if (seconds && (seconds < MIN_SECONDS || seconds > MAX_SECONDS)) {
      Alert.alert('Clip trop long', 'Un clip doit durer entre 15 et 60 secondes.');
      return;
    }
    if (bytes > MAX_BYTES) {
      Alert.alert('Video trop lourde', 'La video depasse la limite de 200 Mo du MVP.');
      return;
    }
    setAsset({
      uri: picked.uri,
      name: (picked as any).fileName || `clip_${Date.now()}.mp4`,
      type: picked.mimeType || 'video/mp4',
      size: bytes || undefined,
    });
    setDuration(Math.round(seconds || MIN_SECONDS));
    setStep(isPreset && selectedId ? 3 : 2);
  };

  const publish = async () => {
    if (!asset || !selectedSource) {
      Alert.alert('Clip', 'Ajoute une video et choisis un morceau.');
      return;
    }
    setPublishing(true);
    try {
      const upload = await uploadToCloudinaryMobile(asset, 'video', 'ximam/music-clips');
      const draft = await createMusicClipDraft({ sourceTrackId: selectedSource.sourceTrackId, sourceTrackType: selectedSource.sourceTrackType });
      void recordClipFunnelEvent(selectedSource._id, 'clip_draft_created');
      await updateMusicClip(draft.id, {
        videoUrl: upload.secureUrl,
        videoPublicId: upload.publicId,
        posterUrl: getCoverVideoPosterUrl(upload.secureUrl),
        videoBytes: upload.bytes,
        videoDurationSeconds: upload.duration || duration,
        caption,
        tags: tagsFromText(tagText),
        sourceTrackOffsetSeconds: offset,
        sourceTrackDurationSeconds: duration,
        visibility: 'published',
      });
      void recordClipFunnelEvent(selectedSource._id, 'clip_published');
      if (challengeId) {
        participateInChallenge(challengeId, { contentType: 'clip', contentId: draft.id }).catch(() => {});
      }
      navigation.navigate('Swipe');
    } catch (e) {
      Alert.alert('Publication impossible', e instanceof Error ? e.message : 'Impossible de publier le clip.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SynauraBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title="Publier un clip" subtitle="Video verticale liee a un morceau" onBack={() => navigation.goBack()} />
        <CreateArrivalBanner
          context={challengeId ? 'challenge' : 'clip'}
          title={challengeId ? challengeTitle : (isPreset ? selectedSource?.title : null)}
        />
        <View style={styles.steps}>
          {['Importer la video', 'Choisir un morceau Synaura', 'Legende, tags et publier'].map((label, index) => (
            <View key={label} style={[styles.step, step >= index + 1 && styles.stepActive]}>
              <Text style={[styles.stepText, step >= index + 1 && styles.stepTextActive]}>{index + 1}. {label}</Text>
            </View>
          ))}
        </View>

        {step === 1 ? (
          <View style={{ gap: spacing.sm }}>
            {isPreset && selectedSource ? (
              <View style={styles.presetCard}>
                {selectedSource.coverUrl ? <Image source={{ uri: selectedSource.coverUrl }} style={styles.sourceCover} /> : <View style={styles.sourceCover} />}
                <View style={styles.sourceCopy}>
                  <Text style={styles.presetBadge}>Son sélectionné</Text>
                  <Text numberOfLines={1} style={styles.sourceTitle}>{selectedSource.title}</Text>
                  <Text numberOfLines={1} style={styles.sourceArtist}>{selectedSource.artist?.name || selectedSource.artist?.username || 'Artiste Synaura'}</Text>
                </View>
                <Pressable onPress={() => setStep(2)} style={styles.changeSourceButton}>
                  <Text style={styles.changeSourceText}>Changer de son</Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={pickVideo} style={styles.uploadBox}>
              <Ionicons name="cloud-upload-outline" size={38} color={colors.violet} />
              <Text style={styles.uploadTitle}>Importer une video</Text>
              <Text style={styles.uploadText}>Vertical 9:16 recommande, 15-60 secondes, 200 Mo maximum.</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Choisir le morceau</Text>
            {loadingSources ? <ActivityIndicator color={colors.violet} /> : null}
            {sources.map((source) => {
              const active = source._id === selectedId;
              const isOwnTrack = Boolean(auth.user?.id) && source.artist?._id === auth.user?.id;
              return (
                <Pressable key={source._id} onPress={() => setSelectedId(source._id)} style={[styles.sourceRow, active && styles.sourceRowActive]}>
                  {source.coverUrl ? <Image source={{ uri: source.coverUrl }} style={styles.sourceCover} /> : <View style={styles.sourceCover} />}
                  <View style={styles.sourceCopy}>
                    <Text numberOfLines={1} style={styles.sourceTitle}>{source.title}</Text>
                    <Text numberOfLines={1} style={styles.sourceArtist}>{source.artist?.name || source.artist?.username || 'Artiste Synaura'} · extrait {mmss(duration)}</Text>
                    <Text style={styles.sourceAction}>{isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}</Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={active ? colors.violet : colors.textTertiary} />
                </Pressable>
              );
            })}
            <Pressable disabled={!selectedSource} onPress={() => setStep(3)} style={[styles.primary, !selectedSource && styles.disabled]}>
              <Text style={styles.primaryText}>Continuer</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.card}>
            {selectedSource ? (
              <View style={styles.musicCard}>
                {selectedSource.coverUrl ? <Image source={{ uri: selectedSource.coverUrl }} style={styles.sourceCover} /> : <View style={styles.sourceCover} />}
                <View style={styles.sourceCopy}>
                  <Text numberOfLines={1} style={styles.sourceTitle}>{selectedSource.title}</Text>
                  <Text numberOfLines={1} style={styles.sourceArtist}>{mmss(offset)} a {mmss(offset + duration)}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.offsetRow}>
              <Pressable onPress={() => setOffset(Math.max(0, offset - 5))} style={styles.offsetButton}><Ionicons name="remove" size={18} color={colors.text} /></Pressable>
              <Text style={styles.offsetText}>Debut {mmss(offset)}</Text>
              <Pressable onPress={() => setOffset(Math.min(maxOffset, offset + 5))} style={styles.offsetButton}><Ionicons name="add" size={18} color={colors.text} /></Pressable>
            </View>
            <TextInput value={caption} onChangeText={setCaption} maxLength={280} multiline placeholder="Legende" placeholderTextColor={colors.textTertiary} style={[styles.input, styles.textarea]} />
            <TextInput value={tagText} onChangeText={setTagText} placeholder="Tags separes par espaces ou virgules" placeholderTextColor={colors.textTertiary} style={styles.input} />
            <Pressable disabled={publishing} onPress={() => void publish()} style={[styles.primary, publishing && styles.disabled]}>
              {publishing ? <ActivityIndicator color={colors.paper} /> : <Ionicons name="film-outline" size={18} color={colors.paper} />}
              <Text style={styles.primaryText}>Publier le clip</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  steps: { gap: 8 },
  step: { borderRadius: radius.md, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stepActive: { borderColor: 'rgba(115,87,198,0.28)', backgroundColor: 'rgba(115,87,198,0.08)' },
  stepText: { color: colors.textTertiary, fontSize: 11, fontWeight: '900' },
  stepTextActive: { color: colors.text },
  uploadBox: { minHeight: 310, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(115,87,198,0.34)', backgroundColor: colors.surface, padding: spacing.xl },
  presetCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, padding: 10, backgroundColor: 'rgba(115,87,198,0.08)', borderWidth: 1, borderColor: 'rgba(115,87,198,0.2)' },
  presetBadge: { color: colors.violet, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  changeSourceButton: { flexShrink: 0, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.paper },
  changeSourceText: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  uploadTitle: { marginTop: spacing.md, color: colors.text, fontSize: 20, fontWeight: '900' },
  uploadText: { marginTop: spacing.sm, color: colors.textTertiary, textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  card: { gap: 12, borderRadius: radius.xl, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, padding: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  sourceRowActive: { borderColor: 'rgba(115,87,198,0.42)', backgroundColor: 'rgba(115,87,198,0.08)' },
  sourceCover: { width: 52, height: 52, borderRadius: 15, backgroundColor: 'rgba(17,17,17,0.08)' },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  sourceArtist: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  sourceAction: { marginTop: 3, color: colors.violet, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  primary: { minHeight: 50, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black },
  primaryText: { color: colors.paper, fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  musicCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, padding: 10, backgroundColor: colors.background },
  offsetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.lg, padding: 10, backgroundColor: colors.background },
  offsetButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  offsetText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  input: { minHeight: 50, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, fontSize: 13, fontWeight: '700' },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
});

export default ClipComposerScreen;
