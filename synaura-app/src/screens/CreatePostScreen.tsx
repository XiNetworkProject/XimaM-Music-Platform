import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPost, getMyProfile, uploadPostImage, type MobileProfileTrack } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import type { Track } from '@/api/types';
import { colors } from '@/theme/tokens';
import { AppHeader } from '@/components/ui/AppHeader';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';

type ComposerMode = 'text' | 'photo' | 'track_share';

const MODES: Array<{ id: ComposerMode | 'studio'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'text', label: 'Texte', icon: 'chatbubble-ellipses-outline' },
  { id: 'photo', label: 'Image', icon: 'image-outline' },
  { id: 'track_share', label: 'Son', icon: 'musical-note-outline' },
  { id: 'studio', label: 'Studio', icon: 'sparkles-outline' },
];

function artistLabel(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const auth = useAuth();
  const initialTrack = (route.params?.track || null) as Track | null;
  const [mode, setMode] = useState<ComposerMode>(initialTrack ? 'track_share' : 'text');
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MobileProfileTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(initialTrack);
  const [trackPickerOpen, setTrackPickerOpen] = useState(Boolean(initialTrack));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.user?.username) return;
    let mounted = true;
    setTracksLoading(true);
    getMyProfile(auth.user.username)
      .then((profile) => {
        if (mounted) setTracks(profile.tracks);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setTracksLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [auth.user?.username]);

  const filteredTracks = useMemo(() => {
    const query = trackSearch.trim().toLowerCase();
    if (!query) return tracks;
    return tracks.filter((track) => (
      String(track.title || '').toLowerCase().includes(query)
      || artistLabel(track).toLowerCase().includes(query)
    ));
  }, [trackSearch, tracks]);

  const publishDisabled = submitting
    || (mode === 'text' ? !text.trim() : mode === 'photo' ? !imageUri : !selectedTrack);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Autorise l’accès aux photos pour ajouter une image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setMode('photo');
      setSelectedTrack(null);
      setTrackPickerOpen(false);
      setImageUri(result.assets[0].uri);
      setError('');
    }
  };

  const selectMode = (next: ComposerMode | 'studio') => {
    void Haptics.selectionAsync().catch(() => {});
    setError('');
    if (next === 'studio') {
      navigation.navigate('AIStudio');
      return;
    }
    if (next === 'text') {
      setMode('text');
      setImageUri(null);
      setSelectedTrack(null);
      setTrackPickerOpen(false);
      return;
    }
    if (next === 'photo') {
      void pickImage();
      return;
    }
    setMode('track_share');
    setImageUri(null);
    setTrackPickerOpen(true);
  };

  const submit = async () => {
    if (submitting) return;
    if (mode === 'text' && !text.trim()) {
      setError('Écris quelque chose avant de publier.');
      return;
    }
    if (mode === 'photo' && !imageUri) {
      setError('Ajoute une image pour publier ce post.');
      return;
    }
    if (mode === 'track_share' && !selectedTrack) {
      setError('Choisis un son à partager.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const imageUrl = mode === 'photo' && imageUri ? await uploadPostImage(imageUri) : null;
      await createPost({
        content: text.trim(),
        imageUrl,
        trackId: mode === 'track_share' ? selectedTrack?._id || null : null,
        type: mode,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigatePrimaryTab(navigation, 'Profile', { tab: 'posts' });
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Publication impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!auth.user) {
    return (
      <View style={styles.root}>
        <SynauraBackground variant="warm" />
        <View style={styles.gate}>
          <Text style={styles.title}>Connecte-toi pour publier.</Text>
          <Pressable onPress={() => navigation.getParent()?.navigate('Login')} style={styles.publish}>
            <Text style={styles.publishText}>Se connecter</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const placeholder = mode === 'photo'
    ? 'Ajoute une légende à ton image...'
    : mode === 'track_share'
      ? 'Ajoute un texte pour accompagner le son...'
      : 'Une histoire, un passage précis, une émotion...';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground variant="warm" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: 0, paddingBottom: Math.max(insets.bottom + 54, 72) },
        ]}
      >
        <AppHeader
          flush
          eyebrow="Contexte musical"
          title="Nouveau post"
          subtitle="La musique reste au centre."
          onBack={() => navigation.goBack()}
          action={{ icon: submitting ? 'hourglass-outline' : 'send', label: 'Publier', onPress: () => void submit() }}
        />

        <Reveal distance={7} style={styles.modeShell}>
          {MODES.map((item) => {
            const active = item.id === mode;
            return (
              <MotionPressable
                key={item.id}
                accessibilityLabel={item.label}
                onPress={() => selectMode(item.id)}
                style={[styles.modeButton, active && styles.modeButtonActive]}
                scaleTo={0.96}
              >
                <Ionicons name={item.icon} size={17} color={active ? colors.paper : item.id === 'studio' ? colors.coral : colors.textSecondary} />
                <Text numberOfLines={1} style={[styles.modeLabel, active && styles.modeLabelActive]}>{item.label}</Text>
              </MotionPressable>
            );
          })}
        </Reveal>

        <Reveal distance={8} style={styles.hero}>
          <Text style={styles.kicker}>{mode === 'track_share' ? 'PARTAGER UN SON' : mode === 'photo' ? 'POST IMAGE' : 'PRENDRE LA PAROLE'}</Text>
          <Text style={styles.title}>{mode === 'track_share' ? 'Fais entendre ce qui mérite une écoute.' : mode === 'photo' ? 'Donne une image à ton univers.' : 'Donne une histoire à ce que tu écoutes.'}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus={mode === 'text'}
            maxLength={1200}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,250,242,0.3)"
            style={[styles.composer, mode !== 'text' && styles.composerCompact]}
          />
          <Text style={styles.characterCount}>{text.length}/1200</Text>
        </Reveal>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === 'photo' ? (
          imageUri ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} />
              <Pressable onPress={() => { setImageUri(null); setMode('text'); }} style={styles.remove} accessibilityLabel="Retirer l’image">
                <Ionicons name="close" size={18} color={colors.paper} />
              </Pressable>
            </View>
          ) : (
            <MotionPressable onPress={() => void pickImage()} style={styles.emptyAttachment} scaleTo={0.98}>
              <Ionicons name="images-outline" size={25} color={colors.violet} />
              <Text style={styles.emptyAttachmentTitle}>Choisir une image</Text>
              <Text style={styles.emptyAttachmentText}>Ajoute une photo depuis ton appareil.</Text>
            </MotionPressable>
          )
        ) : null}

        {mode === 'track_share' ? (
          <Reveal distance={6} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{selectedTrack ? 'Son attaché' : 'Choisis un de tes sons'}</Text>
                <Text style={styles.sectionHint}>Le lecteur sera intégré directement au post.</Text>
              </View>
              {selectedTrack ? (
                <Pressable onPress={() => setTrackPickerOpen((value) => !value)} style={styles.changeButton}>
                  <Text style={styles.changeButtonText}>{trackPickerOpen ? 'Fermer' : 'Changer'}</Text>
                </Pressable>
              ) : null}
            </View>

            {selectedTrack ? <TrackChoice track={selectedTrack} active onPress={() => setTrackPickerOpen(true)} /> : null}

            {trackPickerOpen ? (
              <View style={styles.trackPicker}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={17} color={colors.textTertiary} />
                  <TextInput
                    value={trackSearch}
                    onChangeText={setTrackSearch}
                    placeholder="Rechercher dans tes sons"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.searchInput}
                  />
                  {trackSearch ? (
                    <Pressable onPress={() => setTrackSearch('')} accessibilityLabel="Effacer la recherche">
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </Pressable>
                  ) : null}
                </View>

                {tracksLoading ? (
                  <View style={styles.loadingTracks}><ActivityIndicator color={colors.violet} /><Text style={styles.empty}>Chargement de tes sons...</Text></View>
                ) : filteredTracks.length ? (
                  filteredTracks.slice(0, 30).map((track) => (
                    <TrackChoice
                      key={track._id}
                      track={track}
                      active={selectedTrack?._id === track._id}
                      onPress={() => {
                        setSelectedTrack(track);
                        setTrackPickerOpen(false);
                        setError('');
                      }}
                    />
                  ))
                ) : (
                  <Text style={styles.empty}>{tracks.length ? 'Aucun son ne correspond à ta recherche.' : 'Tu n’as encore aucun son à partager.'}</Text>
                )}
              </View>
            ) : null}
          </Reveal>
        ) : null}

        <MotionPressable
          accessibilityLabel="Publier le post"
          disabled={publishDisabled}
          onPress={() => void submit()}
          style={[styles.publish, publishDisabled && styles.publishDisabled]}
          scaleTo={0.985}
        >
          {submitting ? <ActivityIndicator size="small" color={colors.paper} /> : <Ionicons name="send" size={18} color={colors.paper} />}
          <Text style={styles.publishText}>{submitting ? 'Publication...' : 'Publier'}</Text>
        </MotionPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TrackChoice({ track, active, onPress }: { track: Track; active: boolean; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={[styles.track, active && styles.trackActive]} scaleTo={0.985}>
      <TrackCover track={track} style={styles.trackCover} />
      <View style={styles.trackCopy}>
        <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.trackMeta}>{artistLabel(track)}</Text>
      </View>
      <Ionicons name={active ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={active ? colors.violet : colors.textTertiary} />
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, gap: 12 },
  modeShell: { minHeight: 58, flexDirection: 'row', gap: 5, padding: 5, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  modeButton: { flex: 1, minWidth: 0, minHeight: 46, gap: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  modeButtonActive: { backgroundColor: colors.black },
  modeLabel: { width: '100%', textAlign: 'center', color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  modeLabelActive: { color: colors.paper },
  hero: { borderRadius: 18, padding: 16, backgroundColor: colors.black, borderWidth: 1, borderColor: colors.borderStrong, borderTopWidth: 3, borderTopColor: colors.violet },
  kicker: { color: '#C7B8FF', fontSize: 9, fontWeight: '900' },
  title: { marginTop: 8, color: colors.paper, fontSize: 23, lineHeight: 27, fontWeight: '900' },
  composer: { marginTop: 13, minHeight: 142, borderRadius: 14, padding: 13, textAlignVertical: 'top', color: colors.paper, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  composerCompact: { minHeight: 98 },
  characterCount: { marginTop: 6, textAlign: 'right', color: 'rgba(255,250,242,0.38)', fontSize: 9, fontWeight: '800' },
  imagePreview: { minHeight: 220, aspectRatio: 1.35, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  remove: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.82)' },
  emptyAttachment: { minHeight: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface, padding: 20 },
  emptyAttachmentTitle: { marginTop: 9, color: colors.text, fontSize: 14, fontWeight: '900' },
  emptyAttachmentText: { marginTop: 4, color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  section: { borderRadius: 16, padding: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sectionHint: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  changeButton: { minHeight: 34, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12, backgroundColor: colors.violetSoft },
  changeButtonText: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  trackPicker: { marginTop: 8 },
  searchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, marginBottom: 5, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, color: colors.text, fontSize: 12, fontWeight: '700' },
  track: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  trackActive: { borderRadius: 12, paddingHorizontal: 9, backgroundColor: colors.violetSoft, borderBottomColor: 'transparent' },
  trackCover: { width: 50, height: 50, borderRadius: 8 },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  loadingTracks: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { overflow: 'hidden', borderRadius: 14, padding: 11, color: colors.danger, backgroundColor: 'rgba(239,68,68,0.1)', fontSize: 11, fontWeight: '800' },
  empty: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, fontWeight: '700', textAlign: 'center', padding: 14 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  publish: { minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingHorizontal: 20, backgroundColor: colors.violet },
  publishDisabled: { opacity: 0.42 },
  publishText: { color: colors.paper, fontSize: 13, fontWeight: '900' },
});
