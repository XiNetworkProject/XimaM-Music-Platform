import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addTrackToPlaylistMobile,
  cleanupUploadMobile,
  createAlbumPlaylistMobile,
  createUploadedTrack,
  getCoverVideoPosterUrl,
  getMusicChallenge,
  getSynauraCity,
  isUploadCoverVideo,
  participateCityEvent,
  participateInChallenge,
  uploadToCloudinaryMobile,
  type UploadAsset,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { TrackCover } from '@/components/TrackCover';
import { EventChoice, EventTicker } from '@/components/events/SynauraEvents';
import { SynauraBackground } from '@/components/SynauraBackground';
import { CreateArrivalBanner } from '@/components/create/CreateArrivalBanner';
import { usePlayer } from '@/player/PlayerProvider';
import { RemixPermissionsSection, DEFAULT_REMIX_PERMISSIONS, type RemixPermissionsValue } from '@/components/upload/RemixPermissionsSection';
import type { SynauraCityData, Track } from '@/api/types';
import { AppHeader } from '@/components/ui/AppHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';

type ReleaseType = 'single' | 'ep' | 'album';
type Step = 1 | 2 | 3;
type Visibility = 'public' | 'unlisted' | 'private';
type ScheduleMode = 'now' | 'scheduled';

type TrackMeta = UploadAsset & {
  title: string;
  lyrics: string;
  genres: string[];
  explicit: boolean | null;
};

const GENRES = ['Pop', 'Rap', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Afrobeat', 'Jazz', 'Lo-Fi', 'Indie', 'Ambient', 'Soul', 'Trap', 'House', 'Techno'];
const MOODS = ['Chill', 'Energique', 'Melancolique', 'Dansant', 'Sombre', 'Love', 'Motivant', 'Cinema', 'Club'];
const LANGUAGES = [
  ['fr', 'Francais'],
  ['en', 'Anglais'],
  ['es', 'Espagnol'],
  ['ar', 'Arabe'],
  ['pt', 'Portugais'],
  ['instrumental', 'Instrumental'],
  ['other', 'Autre'],
] as const;

const RELEASES: Array<{ key: ReleaseType; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'single', title: 'Single', subtitle: '1 piste principale', icon: 'disc-outline' },
  { key: 'ep', title: 'EP', subtitle: '2 a 6 pistes', icon: 'albums-outline' },
  { key: 'album', title: 'Album', subtitle: '7 pistes et +', icon: 'library-outline' },
];

function formatBytes(bytes?: number | null) {
  const value = Number(bytes || 0);
  if (!value) return 'taille inconnue';
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatTimeLabel(value: string) {
  if (!value) return 'Immediatement';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date a verifier';
  return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function parseTags(value: string) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
}

function parseFeaturing(value: string) {
  return value.split(',').map((name) => name.trim()).filter(Boolean).slice(0, 8).map((name) => ({ name, isExternal: true }));
}

function assetFromDocument(asset: DocumentPicker.DocumentPickerAsset): UploadAsset {
  return {
    uri: asset.uri,
    name: asset.name || `audio-${Date.now()}`,
    type: asset.mimeType || 'audio/mpeg',
    size: asset.size || null,
  };
}

function metaFromAsset(asset: UploadAsset): TrackMeta {
  return {
    ...asset,
    title: asset.name.replace(/\.[^/.]+$/, ''),
    lyrics: '',
    genres: [],
    explicit: null,
  };
}

function assetFromImage(asset: ImagePicker.ImagePickerAsset): UploadAsset {
  const isVideo = asset.type === 'video';
  return {
    uri: asset.uri,
    name: asset.fileName || `cover-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
    type: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
    size: asset.fileSize || null,
  };
}

export function UploadScreen() {
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId: string = route.params?.challengeId || '';
  const auth = useAuth();
  const player = usePlayer();

  const [step, setStep] = useState<Step>(1);
  const [releaseType, setReleaseType] = useState<ReleaseType>('single');
  const [audio, setAudio] = useState<UploadAsset | null>(null);
  const [tracks, setTracks] = useState<TrackMeta[]>([]);
  const [cover, setCover] = useState<UploadAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [featuringText, setFeaturingText] = useState('');
  const [producer, setProducer] = useState('');
  const [composer, setComposer] = useState('');
  const [writer, setWriter] = useState('');
  const [copyrightYear, setCopyrightYear] = useState(String(new Date().getFullYear()));
  const [explicit, setExplicit] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [remixPermissions, setRemixPermissions] = useState<RemixPermissionsValue>(DEFAULT_REMIX_PERMISSIONS);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ audio: 0, cover: 0, save: 0 });
  const [tempPublicIds, setTempPublicIds] = useState<{ audio: string[]; cover?: string; coverVideo?: string }>({ audio: [] });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSynauraCity().then((next) => active && setCity(next)).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!challengeId) return;
    let active = true;
    void getMusicChallenge(challengeId).then((next) => active && setChallengeTitle(next.title)).catch(() => {});
    return () => { active = false; };
  }, [challengeId]);

  const selectedCount = releaseType === 'single' ? (audio ? 1 : 0) : tracks.length;
  const releaseLabel = releaseType === 'single' ? 'Single' : releaseType === 'ep' ? 'EP' : 'Album';
  const uploadLimitLabel = '80 MB';
  const scheduledLabel = scheduleMode === 'scheduled' ? formatTimeLabel(scheduledAt) : 'Immediatement';
  const tags = useMemo(() => parseTags(tagsText), [tagsText]);
  const featuring = useMemo(() => parseFeaturing(featuringText), [featuringText]);
  const trackCountValid = releaseType === 'single' ? !!audio : releaseType === 'ep' ? tracks.length >= 2 && tracks.length <= 6 : tracks.length >= 7;
  const step1Valid = trackCountValid;
  const step2Valid = !!title.trim() && !!cover;
  const canPublish = step1Valid && step2Valid && !uploading;
  const stepHint =
    step === 1 && !step1Valid
      ? (releaseType === 'single' ? 'Ajoute un fichier audio pour continuer.' : releaseType === 'ep' ? 'Ajoute entre 2 et 6 pistes pour continuer.' : 'Ajoute au moins 7 pistes pour continuer.')
      : step === 2 && !step2Valid
        ? (!title.trim() && !cover ? 'Ajoute un titre et une cover pour continuer.' : !title.trim() ? 'Ajoute un titre pour continuer.' : 'Ajoute une cover pour continuer.')
        : null;
  const progressPercent = Math.round((step / 3) * 100);
  const coverIsVideo = isUploadCoverVideo(cover);

  const previewTrack = useMemo<Track | null>(() => {
    if (!cover) return null;
    return {
      _id: 'upload-preview',
      title: title.trim() || 'Nouvelle sortie',
      audioUrl: audio?.uri || tracks[0]?.uri || '',
      coverUrl: cover.uri,
      coverVideoUrl: coverIsVideo ? cover.uri : null,
      coverVideoPosterUrl: coverIsVideo ? cover.uri : null,
      artist: { name: auth.user?.name || auth.user?.username || 'Toi' },
      genre: genres,
      tags,
    };
  }, [audio?.uri, auth.user?.name, auth.user?.username, cover, coverIsVideo, genres, tags, title, tracks]);

  const resetUpload = () => {
    if (tempPublicIds.audio.length || tempPublicIds.cover || tempPublicIds.coverVideo) {
      void cleanupUploadMobile({
        audioPublicId: tempPublicIds.audio[0],
        coverPublicId: tempPublicIds.cover,
        coverVideoPublicId: tempPublicIds.coverVideo,
      });
    }
    setStep(1);
    setAudio(null);
    setTracks([]);
    setCover(null);
    setTitle('');
    setDescription('');
    setLyrics('');
    setGenres([]);
    setMood(null);
    setLanguage(null);
    setTagsText('');
    setFeaturingText('');
    setProducer('');
    setComposer('');
    setWriter('');
    setVisibility('public');
    setScheduleMode('now');
    setScheduledAt('');
    setError(null);
    setSuccess(null);
    setSelectedEventId(null);
    setProgress({ audio: 0, cover: 0, save: 0 });
    setTempPublicIds({ audio: [] });
  };

  const selectRelease = (next: ReleaseType) => {
    setReleaseType(next);
    setError(null);
    if (next === 'single') {
      setTracks([]);
    } else {
      setAudio(null);
    }
  };

  const pickAudio = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: releaseType !== 'single',
    });
    if (result.canceled || !result.assets?.length) return;
    const assets = result.assets.map(assetFromDocument);
    if (releaseType === 'single') {
      setAudio(assets[0]);
      if (!title.trim()) setTitle(assets[0].name.replace(/\.[^/.]+$/, ''));
    } else {
      setTracks((current) => {
        const existing = new Set(current.map((item) => `${item.name}:${item.size || 0}`));
        const next = assets.filter((item) => !existing.has(`${item.name}:${item.size || 0}`)).map(metaFromAsset);
        return [...current, ...next].slice(0, 50);
      });
      if (!title.trim()) setTitle(releaseType === 'ep' ? 'Nouvel EP' : 'Nouvel album');
    }
  };

  const pickCover = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorise l’accès à ta galerie pour choisir une cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
      videoMaxDuration: 7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const next = assetFromImage(result.assets[0]);
    if (isUploadCoverVideo(next) && result.assets[0].duration && result.assets[0].duration > 7250) {
      setError('La cover video doit durer 7 secondes maximum.');
      return;
    }
    setCover(next);
  };

  const toggleGenre = (genre: string) => {
    setGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre].slice(0, 5));
  };

  const updateTrack = (index: number, patch: Partial<TrackMeta>) => {
    setTracks((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const removeTrack = (index: number) => {
    setTracks((current) => current.filter((_, i) => i !== index));
  };

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      setError(releaseType === 'single' ? 'Ajoute un fichier audio.' : releaseType === 'ep' ? 'Un EP doit contenir 2 a 6 pistes.' : 'Un album doit contenir au moins 7 pistes.');
      return;
    }
    if (step === 2 && !step2Valid) {
      setError(!cover ? 'Ajoute une cover image ou video.' : 'Ajoute un titre.');
      return;
    }
    setError(null);
    setStep((current) => Math.min(3, current + 1) as Step);
  };

  const publish = async () => {
    if (!canPublish) {
      setError('Verifie les fichiers, la cover et le titre avant de publier.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setProgress({ audio: 5, cover: 0, save: 0 });

    const rollbackIds: { audio: string[]; cover?: string; coverVideo?: string } = { audio: [] };
    try {
      const sourceTracks = releaseType === 'single' && audio ? [metaFromAsset(audio)] : tracks;
      const uploadedTracks = [];
      for (let i = 0; i < sourceTracks.length; i += 1) {
        const uploaded = await uploadToCloudinaryMobile(sourceTracks[i], 'video', 'ximam/audio');
        rollbackIds.audio.push(uploaded.publicId);
        setTempPublicIds((current) => ({ ...current, audio: [...current.audio, uploaded.publicId] }));
        uploadedTracks.push({ uploaded, meta: sourceTracks[i] });
        setProgress((current) => ({
          ...current,
          audio: Math.min(95, Math.round(((i + 1) / sourceTracks.length) * 90) + 5),
        }));
      }

      const coverAsset = cover!;
      const coverVideo = isUploadCoverVideo(coverAsset);
      setProgress((current) => ({ ...current, cover: 20 }));
      const coverResult = await uploadToCloudinaryMobile(coverAsset, coverVideo ? 'video' : 'image', coverVideo ? 'ximam/cover-videos' : 'ximam/images');
      if (coverVideo) rollbackIds.coverVideo = coverResult.publicId;
      else rollbackIds.cover = coverResult.publicId;
      setTempPublicIds((current) => ({ ...current, [coverVideo ? 'coverVideo' : 'cover']: coverResult.publicId }));
      const coverVideoPosterUrl = coverVideo ? getCoverVideoPosterUrl(coverResult.secureUrl) : null;
      const coverUrl = coverVideo ? coverVideoPosterUrl || coverResult.secureUrl : coverResult.secureUrl;
      setProgress((current) => ({ ...current, cover: 100, save: 15 }));

      const copyright = {
        owner: auth.user?.name || auth.user?.username || '',
        year: Number(copyrightYear) || new Date().getFullYear(),
        rights: 'Tous droits reserves',
      };
      const common = {
        coverUrl,
        coverPublicId: coverVideo ? null : coverResult.publicId,
        coverBytes: coverAsset.size || coverResult.bytes || 0,
        coverVideoUrl: coverVideo ? coverResult.secureUrl : null,
        coverVideoPublicId: coverVideo ? coverResult.publicId : null,
        coverVideoPosterUrl,
        mood,
        language,
        tags,
        featuring,
        credits: {
          producer: producer.trim(),
          composer: composer.trim(),
          writer: writer.trim(),
        },
        releaseType,
        scheduledAt: scheduleMode === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        visibility,
        remixPermissions,
      };

      let firstTrackId = '';
      if (releaseType === 'single') {
        const item = uploadedTracks[0];
        const created = await createUploadedTrack({
          audioUrl: item.uploaded.secureUrl,
          audioPublicId: item.uploaded.publicId,
          audioBytes: item.meta.size || item.uploaded.bytes || 0,
          duration: item.uploaded.duration || 0,
          trackData: {
            title: title.trim(),
            description: description.trim(),
            lyrics: lyrics.trim() || null,
            genre: genres,
            isExplicit: explicit,
            isPublic: visibility !== 'private',
            album: null,
            copyright,
          },
          ...common,
        });
        firstTrackId = created.trackId;
      } else {
        const playlist = await createAlbumPlaylistMobile({
          name: title.trim(),
          description: description.trim(),
          isPublic: visibility !== 'private',
          coverUrl,
        });

        for (let i = 0; i < uploadedTracks.length; i += 1) {
          const item = uploadedTracks[i];
          const trackTitle = item.meta.title.trim() || item.meta.name.replace(/\.[^/.]+$/, '') || `Piste ${i + 1}`;
          const created = await createUploadedTrack({
            audioUrl: item.uploaded.secureUrl,
            audioPublicId: item.uploaded.publicId,
            audioBytes: item.meta.size || item.uploaded.bytes || 0,
            duration: item.uploaded.duration || 0,
            trackData: {
              title: trackTitle,
              description: description.trim(),
              lyrics: item.meta.lyrics.trim() || lyrics.trim() || null,
              genre: item.meta.genres.length ? item.meta.genres : genres,
              isExplicit: typeof item.meta.explicit === 'boolean' ? item.meta.explicit : explicit,
              isPublic: visibility !== 'private',
              album: title.trim(),
              copyright,
            },
            ...common,
          });
          if (!firstTrackId) firstTrackId = created.trackId;
          await addTrackToPlaylistMobile(playlist.id, created.trackId);
          setProgress((current) => ({ ...current, save: Math.min(95, Math.round(((i + 1) / uploadedTracks.length) * 80) + 15) }));
        }
      }

      setProgress({ audio: 100, cover: 100, save: 100 });
      let eventMessage = '';
      if (selectedEventId && firstTrackId) {
        try {
          await participateCityEvent(selectedEventId, firstTrackId);
          const selectedEvent = city?.events.find((event) => event.id === selectedEventId);
          eventMessage = selectedEvent ? ` Il rejoint « ${selectedEvent.title} ».` : ' Il rejoint aussi ton event.';
        } catch {
          eventMessage = ' Le son est publié, mais son inscription à l’event devra être relancée.';
        }
      }
      if (challengeId && visibility === 'public' && firstTrackId) {
        participateInChallenge(challengeId, { contentType: 'track', contentId: firstTrackId }).catch(() => {});
      }
      setSuccess(`${releaseType === 'single' ? 'Ton single est publie.' : `${uploadedTracks.length} pistes publiees dans ${releaseLabel}.`}${eventMessage}`);
      setTempPublicIds({ audio: [] });

      if (firstTrackId && previewTrack && releaseType === 'single') {
        void player.playTrack({
          ...previewTrack,
          _id: firstTrackId,
          audioUrl: uploadedTracks[0].uploaded.secureUrl,
          coverUrl,
          coverVideoUrl: coverVideo ? coverResult.secureUrl : null,
          coverVideoPosterUrl,
        });
      }
    } catch (err) {
      if (rollbackIds.audio.length || rollbackIds.cover || rollbackIds.coverVideo) {
        void cleanupUploadMobile({
          audioPublicId: rollbackIds.audio[0],
          coverPublicId: rollbackIds.cover,
          coverVideoPublicId: rollbackIds.coverVideo,
        });
      }
      setError(err instanceof Error ? err.message : 'Upload impossible.');
    } finally {
      setUploading(false);
    }
  };

  if (!auth.user) {
    return (
      <View style={styles.root}>
        <SynauraBackground variant="warm" />
        <View style={[styles.authGate, responsive.pageContent, { paddingTop: insets.top + 24 }]}>
          <View style={styles.authIcon}><Ionicons name="cloud-upload-outline" size={34} color="#FFFAF2" /></View>
          <Text style={styles.authTitle}>Connecte-toi pour publier</Text>
          <Text style={styles.authText}>L’upload est reserve aux artistes connectes a Synaura.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: 0, paddingBottom: Math.max(insets.bottom + 106, responsive.bottomDockClearance + 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader flush eyebrow="Sortie artiste" title="Publier" subtitle="Ton son, son identité, puis sa diffusion." onBack={() => navigation.goBack()} action={{ icon: 'library-outline', label: 'Bibliothèque', onPress: () => navigation.navigate('Library') }} />

        <CreateArrivalBanner context={challengeId ? 'challenge' : 'upload'} title={challengeId ? challengeTitle : null} />

        <View style={styles.hero}>
          <View style={styles.heroPills}>
            <Pill label="Upload Synaura" active />
            <Pill label={releaseLabel} />
            <Pill label={`${selectedCount} piste${selectedCount > 1 ? 's' : ''}`} />
          </View>
          <Text style={styles.heroTitle}>Une sortie, trois décisions.</Text>
          <View style={styles.heroActions}>
            <MotionPressable onPress={() => navigation.navigate('Library')} style={styles.lightButton} scaleTo={0.96}>
              <Ionicons name="library-outline" size={16} color="#171313" />
              <Text style={styles.lightButtonText}>Bibliothèque</Text>
            </MotionPressable>
            <MotionPressable onPress={resetUpload} style={styles.ghostButton} scaleTo={0.96}>
              <Ionicons name="refresh" size={15} color="rgba(255,250,242,0.78)" />
              <Text style={styles.ghostButtonText}>Réinitialiser</Text>
            </MotionPressable>
          </View>
        </View>

        <View style={styles.contextGrid}>
          <ContextBox label="Format" value={releaseLabel} />
          <ContextBox label="Limite" value={uploadLimitLabel} />
          <ContextBox label="Sortie" value={scheduledLabel} />
        </View>

        <EventTicker city={city} onPress={() => navigation.navigate('City')} tone="coral" text="Challenge en cours · publie ton son dans un Event Synaura pour gagner en visibilité" />

        <View style={styles.stepNav}>
          {[1, 2, 3].map((item) => {
            const enabled = item === 1 || (item === 2 && step1Valid) || (item === 3 && step1Valid && step2Valid);
            const done = item === 1 ? step1Valid : item === 2 ? step2Valid : step === 3;
            return (
              <MotionPressable key={item} disabled={!enabled} onPress={() => setStep(item as Step)} style={[styles.stepButton, step === item && styles.stepButtonActive, !enabled && styles.stepButtonDisabled]} scaleTo={0.97}>
                <Text style={[styles.stepNumber, step === item && styles.stepNumberActive]}>{done ? 'OK' : item}</Text>
                <Text style={[styles.stepLabel, step === item && styles.stepLabelActive]}>{item === 1 ? 'Fichier audio' : item === 2 ? 'Cover & infos' : 'Diffusion & droits'}</Text>
              </MotionPressable>
            );
          })}
        </View>
        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, { width: `${progressPercent}%` }]} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <View style={styles.studioPanel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelKicker}>Étape {step}/3</Text>
              <Text style={styles.panelTitle}>{step === 1 ? 'Fichier audio' : step === 2 ? 'Pochette et informations' : 'Diffusion et droits de création'}</Text>
            </View>
            <SegmentedControl value={releaseType} dark compact options={RELEASES.map((item) => ({ value: item.key, label: item.title }))} onChange={selectRelease} />
          </View>

          <Reveal key={step} distance={8} duration={320}>
          {step === 1 ? (
            <View style={styles.panelBody}>
              <View style={styles.releaseGrid}>
                {RELEASES.map((item) => (
                  <Pressable key={item.key} onPress={() => selectRelease(item.key)} style={[styles.releaseCard, releaseType === item.key && styles.releaseCardActive]}>
                    <Ionicons name={item.icon} size={24} color={releaseType === item.key ? '#171313' : 'rgba(255,250,242,0.52)'} />
                    <Text style={[styles.releaseTitle, releaseType === item.key && styles.releaseTitleActive]}>{item.title}</Text>
                    <Text style={[styles.releaseSub, releaseType === item.key && styles.releaseSubActive]}>{item.subtitle}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={pickAudio} style={styles.dropZone}>
                <Ionicons name="cloud-upload-outline" size={34} color="rgba(255,250,242,0.38)" />
                <Text style={styles.dropZoneTitle}>{releaseType === 'single' ? (audio ? audio.name : 'Ajoute ton morceau principal') : 'Ajouter les pistes'}</Text>
                <Text style={styles.dropZoneText}>
                  {releaseType === 'single'
                    ? audio ? `${formatBytes(audio.size)} - toucher pour remplacer` : `MP3, WAV, FLAC - max ${uploadLimitLabel}`
                    : `${releaseType === 'ep' ? '2 a 6 pistes' : '7 a 50 pistes'} - selection multiple`}
                </Text>
              </Pressable>

              {releaseType !== 'single' && tracks.length > 0 ? (
                <View style={styles.trackList}>
                  <View style={styles.trackListHead}>
                    <Text style={styles.sectionLabel}>{tracks.length} piste(s)</Text>
                    {!trackCountValid ? <Text style={styles.warnText}>{releaseType === 'ep' ? 'EP: 2-6 pistes' : 'Album: 7+ pistes'}</Text> : null}
                  </View>
                  {tracks.map((track, index) => (
                    <View key={`${track.uri}-${index}`} style={styles.trackRow}>
                      <View style={styles.trackIndex}><Text style={styles.trackIndexText}>{index + 1}</Text></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <TextInput value={track.title} onChangeText={(value) => updateTrack(index, { title: value })} placeholder="Titre piste" placeholderTextColor="rgba(255,250,242,0.25)" style={styles.trackInput} />
                        <Text style={styles.trackFile} numberOfLines={1}>{track.name} - {formatBytes(track.size)}</Text>
                      </View>
                      <Pressable onPress={() => removeTrack(index)} style={styles.iconButton}><Ionicons name="close" size={16} color="rgba(255,250,242,0.62)" /></Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.panelBody}>
              <View style={[styles.coverTitleRow, responsive.isTiny && styles.coverTitleRowStack]}>
                <Pressable onPress={pickCover} style={styles.coverPicker}>
                  {previewTrack ? <TrackCover track={previewTrack} active autoPlayVideo style={StyleSheet.absoluteFill} /> : (
                    <View style={styles.coverEmpty}>
                      <Ionicons name="image-outline" size={28} color="rgba(255,250,242,0.34)" />
                      <Text style={styles.coverEmptyText}>Cover image ou video</Text>
                      <Text style={styles.coverEmptySub}>Video 7s max</Text>
                    </View>
                  )}
                </Pressable>
                <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                  <Field dark label={releaseType === 'single' ? 'Titre' : releaseType === 'ep' ? "Nom de l'EP" : "Nom de l'album"} value={title} onChangeText={setTitle} placeholder="Titre de ta sortie" />
                  <View style={styles.artistField}>
                    <Text style={styles.darkLabel}>Artiste</Text>
                    <Text style={styles.artistValue}>{auth.user.name || auth.user.username || 'Synaura Artist'}</Text>
                  </View>
                </View>
              </View>
              {cover && coverIsVideo ? <Text style={styles.coverInfo}>Cover video selectionnee. Cloudinary generera un poster fallback comme sur le web.</Text> : null}

              <Field dark label="Description" value={description} onChangeText={setDescription} placeholder="Decris ta musique..." multiline />
              <Collapsible title="Genres" icon="musical-notes" defaultOpen>
                <ChipGrid items={GENRES} selected={genres} onToggle={toggleGenre} dark />
              </Collapsible>
              <Collapsible title="Ambiance & tags" icon="sparkles-outline">
                <Text style={styles.darkLabel}>Mood</Text>
                <ChipGrid items={MOODS} selected={mood ? [mood] : []} onToggle={(item) => setMood(mood === item ? null : item)} dark />
                <Text style={[styles.darkLabel, { marginTop: 12 }]}>Langue</Text>
                <ChipGrid items={LANGUAGES.map(([, label]) => label)} selected={language ? [LANGUAGES.find(([key]) => key === language)?.[1] || language] : []} onToggle={(label) => {
                  const next = LANGUAGES.find(([, itemLabel]) => itemLabel === label)?.[0] || null;
                  setLanguage(language === next ? null : next);
                }} dark />
                <View style={{ marginTop: 12 }}>
                  <Field dark label="Tags separes par virgules" value={tagsText} onChangeText={setTagsText} placeholder="club, cloud, freestyle" />
                </View>
              </Collapsible>
              {releaseType === 'single' ? (
                <Collapsible title="Paroles" icon="document-text-outline">
                  <Field dark label="Lyrics" value={lyrics} onChangeText={setLyrics} placeholder="Ajoute les paroles..." multiline tall />
                </Collapsible>
              ) : null}
              <Collapsible title="Featuring" icon="people-outline">
                <Field dark label="Artistes invites" value={featuringText} onChangeText={setFeaturingText} placeholder="Nom 1, Nom 2..." />
              </Collapsible>
              <Collapsible title="Credits" icon="shield-checkmark-outline">
                <Field dark label="Producteur" value={producer} onChangeText={setProducer} placeholder="Nom producteur" />
                <Field dark label="Compositeur" value={composer} onChangeText={setComposer} placeholder="Nom compositeur" />
                <Field dark label="Auteur" value={writer} onChangeText={setWriter} placeholder="Nom auteur" />
              </Collapsible>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.panelBody}>
              <Text style={styles.sectionLabel}>Visibilité</Text>
              <View style={styles.visibilityGrid}>
                {(['public', 'unlisted', 'private'] as Visibility[]).map((item) => (
                  <Pressable key={item} onPress={() => setVisibility(item)} style={[styles.visibilityItem, visibility === item && styles.visibilityItemActive]}>
                    <Text style={[styles.visibilityText, visibility === item && styles.visibilityTextActive]}>{item === 'public' ? 'Public' : item === 'unlisted' ? 'Non répertorié' : 'Privé'}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.switchRowDark}>
                <View>
                  <Text style={styles.switchTitleDark}>Contenu explicite</Text>
                  <Text style={styles.switchSubDark}>Marque le titre comme explicit.</Text>
                </View>
                <Switch value={explicit} onValueChange={setExplicit} />
              </View>

              <View style={styles.remixPermissionsBox}>
                <View style={styles.remixPermissionsHead}>
                  <View style={styles.remixPermissionsIcon}><Ionicons name="repeat" size={15} color="#8fd3da" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remixPermissionsTitle}>Droits de création</Text>
                    <Text style={styles.remixPermissionsSub}>Ce que les autres membres peuvent faire avec ce morceau.</Text>
                  </View>
                </View>
                <RemixPermissionsSection value={remixPermissions} onChange={setRemixPermissions} />
              </View>

              <Collapsible title="Date de publication" icon="time-outline" defaultOpen>
                <ChipGrid items={['Maintenant', 'Programmer']} selected={[scheduleMode === 'now' ? 'Maintenant' : 'Programmer']} onToggle={(item) => setScheduleMode(item === 'Maintenant' ? 'now' : 'scheduled')} dark />
                {scheduleMode === 'scheduled' ? <Field dark label="Date ISO ou locale" value={scheduledAt} onChangeText={setScheduledAt} placeholder="2026-06-08 18:00" /> : null}
              </Collapsible>

              <EventChoice events={city?.events || []} selectedId={selectedEventId} onSelect={setSelectedEventId} />

              <Field dark label="Année copyright" value={copyrightYear} onChangeText={setCopyrightYear} placeholder="2026" />

              <View style={styles.previewBox}>
                <View style={styles.previewCover}>
                  {previewTrack ? <TrackCover track={previewTrack} active autoPlayVideo style={StyleSheet.absoluteFill} /> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.previewTitle}>{title || 'Nouvelle sortie'}</Text>
                  <Text style={styles.previewMeta}>{releaseLabel} - {visibility} - {selectedCount} piste(s)</Text>
                  <Text style={styles.previewMeta}>{genres.slice(0, 3).join(', ') || 'Aucun genre'} {mood ? `- ${mood}` : ''}</Text>
                  <Text numberOfLines={2} style={styles.previewDesc}>{description || 'Aucune description pour le moment.'}</Text>
                </View>
              </View>

              {(progress.audio > 0 || progress.cover > 0 || progress.save > 0) ? (
                <View style={styles.progressBox}>
                  <Progress label="Audio" value={progress.audio} />
                  <Progress label="Cover" value={progress.cover} />
                  <Progress label="Sauvegarde" value={progress.save} />
                </View>
              ) : null}
            </View>
          ) : null}
          </Reveal>

          {stepHint ? <Text style={styles.stepHint}>{stepHint}</Text> : null}
          <View style={styles.footerBar}>
            <View style={styles.footerLeft}>
              {step > 1 ? <MotionPressable onPress={() => setStep((current) => Math.max(1, current - 1) as Step)} style={styles.backButton} scaleTo={0.96}><Text style={styles.backText}>Retour</Text></MotionPressable> : null}
              <MotionPressable onPress={resetUpload} style={styles.cancelButton} scaleTo={0.96}><Text style={styles.cancelText}>Annuler</Text></MotionPressable>
            </View>
            {step < 3 ? (
              <MotionPressable onPress={goNext} style={[styles.nextButton, ((step === 1 && !step1Valid) || (step === 2 && !step2Valid)) && styles.nextButtonDisabled]} scaleTo={0.97}>
                <Text style={styles.nextText}>Suivant</Text>
              </MotionPressable>
            ) : (
              <MotionPressable disabled={!canPublish} onPress={() => void publish()} style={[styles.nextButton, !canPublish && styles.nextButtonDisabled]} scaleTo={0.97}>
                {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.nextText}>Publier {releaseType === 'single' ? 'le morceau' : releaseType === 'ep' ? "l'EP" : "l'album"}</Text>}
              </MotionPressable>
            )}
          </View>
        </View>

        <View style={styles.checkPanel}>
          <Text style={styles.checkKicker}>À vérifier</Text>
          <CheckRow label="Audio" done={step1Valid} />
          <CheckRow label="Pochette + titre" done={step2Valid} />
          <CheckRow label="Publication" done={step === 3} />
        </View>
      </ScrollView>
    </View>
  );
}

function Pill({ label, active }: { label: string; active?: boolean }) {
  return <Text style={[styles.pill, active && styles.pillActive]}>{label}</Text>;
}

function StatusCard({ label, value, active, done }: { label: string; value: string; active: boolean; done: boolean }) {
  return (
    <View style={[styles.statusCard, active && styles.statusCardActive, done && !active && styles.statusCardDone]}>
      <View style={styles.statusTop}>
        <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>{label}</Text>
        <View style={[styles.statusIcon, active && styles.statusIconActive]}>
          <Ionicons name={done ? 'checkmark' : 'chevron-forward'} size={13} color={active ? '#FFFAF2' : 'rgba(255,250,242,0.54)'} />
        </View>
      </View>
      <Text numberOfLines={1} style={[styles.statusValue, active && styles.statusValueActive]}>{value}</Text>
    </View>
  );
}

function ContextBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contextBox}>
      <Text style={styles.contextLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.contextValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  tall,
  dark,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  tall?: boolean;
  dark?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={dark ? styles.darkLabel : styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={dark ? 'rgba(255,250,242,0.24)' : colors.textTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, dark && styles.inputDark, multiline && styles.inputMulti, tall && styles.inputTall]}
      />
    </View>
  );
}

function Collapsible({ title, icon, children, defaultOpen = false }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.collapsible}>
      <Pressable onPress={() => setOpen(!open)} style={styles.collapsibleHead}>
        <View style={styles.collapsibleIcon}><Ionicons name={icon} size={16} color="#C7B8FF" /></View>
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color="rgba(255,250,242,0.34)" />
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

function ChipGrid({ items, selected, onToggle, dark }: { items: string[]; selected: string[]; onToggle: (item: string) => void; dark?: boolean }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <Pressable key={item} onPress={() => onToggle(item)} style={[styles.chip, dark && styles.chipDark, active && styles.chipActive, active && dark && styles.chipActiveDark]}>
            <Text style={[styles.chipText, dark && styles.chipTextDark, active && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{Math.round(value)}%</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} /></View>
    </View>
  );
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkIcon, done && styles.checkIconDone]}><Ionicons name={done ? 'checkmark' : 'ellipse-outline'} size={14} color={done ? '#66D6A2' : colors.textTertiary} /></View>
      <Text style={styles.checkText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, gap: 13 },
  hero: { borderRadius: 12, backgroundColor: '#151316', padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(217,109,99,0.34)', borderLeftWidth: 4, borderLeftColor: '#D96D63' },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(255,250,242,0.08)', color: 'rgba(255,250,242,0.62)', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  pillActive: { backgroundColor: '#FFFAF2', color: '#171313' },
  heroTitle: { marginTop: 12, color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '900' },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 15 },
  lightButton: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, borderRadius: 4, paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  lightButtonText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  ghostButton: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, borderRadius: 4, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  ghostButtonText: { color: 'rgba(255,250,242,0.78)', fontSize: 12, fontWeight: '900' },
  heroStatusGrid: { marginTop: 15, gap: 8 },
  statusCard: { borderRadius: 11, padding: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.06)' },
  statusCardActive: { backgroundColor: '#FFFAF2', borderColor: '#FFFAF2' },
  statusCardDone: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(167,243,208,0.22)' },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: 'rgba(255,250,242,0.38)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  statusLabelActive: { color: 'rgba(23,19,19,0.45)' },
  statusIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.08)' },
  statusIconActive: { backgroundColor: '#171313' },
  statusValue: { marginTop: 7, color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  statusValueActive: { color: '#171313' },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contextBox: { flex: 1, minWidth: 96, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  contextLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  contextValue: { marginTop: 5, color: colors.text, fontSize: 13, fontWeight: '900' },
  stepNav: { flexDirection: 'row', gap: 4, borderRadius: 10, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  stepButton: { flex: 1, minHeight: 56, borderRadius: 7, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  stepButtonActive: { backgroundColor: colors.violet },
  stepButtonDisabled: { opacity: 0.42 },
  stepNumber: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  stepNumberActive: { color: 'rgba(255,250,242,0.6)' },
  stepLabel: { marginTop: 2, color: colors.text, fontSize: 12, fontWeight: '900' },
  stepLabelActive: { color: '#FFFAF2' },
  progressOuter: { height: 4, borderRadius: 999, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  progressInner: { height: 4, borderRadius: 999, backgroundColor: colors.cyan },
  studioPanel: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#151316', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderTopWidth: 3, borderTopColor: '#7357C6' },
  panelHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,250,242,0.08)', backgroundColor: '#1D1717', gap: 12 },
  panelKicker: { color: 'rgba(255,250,242,0.34)', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  panelTitle: { marginTop: 2, color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', padding: 3, borderRadius: 10 },
  segmentItem: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: '#FFFAF2' },
  segmentText: { color: 'rgba(255,250,242,0.46)', fontSize: 11, fontWeight: '900', textTransform: 'capitalize' },
  segmentTextActive: { color: '#171313' },
  panelBody: { padding: 14, gap: 14 },
  releaseGrid: { gap: 0 },
  releaseCard: { minHeight: 78, borderRadius: 0, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'transparent' },
  releaseCardActive: { backgroundColor: '#FFFAF2', borderColor: '#FFFAF2' },
  releaseTitle: { marginTop: 7, color: '#FFFAF2', fontSize: 15, fontWeight: '900' },
  releaseTitleActive: { color: '#171313' },
  releaseSub: { marginTop: 2, color: 'rgba(255,250,242,0.38)', fontSize: 11, fontWeight: '700' },
  releaseSubActive: { color: 'rgba(23,19,19,0.5)' },
  dropZone: { minHeight: 156, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.035)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  dropZoneTitle: { marginTop: 10, color: '#FFFAF2', textAlign: 'center', fontSize: 16, fontWeight: '900' },
  dropZoneText: { marginTop: 5, color: 'rgba(255,250,242,0.38)', textAlign: 'center', fontSize: 11, fontWeight: '700' },
  trackList: { gap: 9 },
  trackListHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { color: 'rgba(255,250,242,0.48)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  warnText: { color: '#D96D63', fontSize: 11, fontWeight: '900' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  trackIndex: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.08)' },
  trackIndexText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900' },
  trackInput: { minHeight: 38, color: '#FFFAF2', fontSize: 14, fontWeight: '900', padding: 0 },
  trackFile: { color: 'rgba(255,250,242,0.34)', fontSize: 10, fontWeight: '700' },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.07)' },
  coverTitleRow: { flexDirection: 'row', gap: 12 },
  coverPicker: { width: 120, height: 120, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.035)' },
  coverTitleRowStack: { flexDirection: 'column', alignItems: 'stretch' },
  coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  coverEmptyText: { marginTop: 8, color: 'rgba(255,250,242,0.48)', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  coverEmptySub: { marginTop: 3, color: 'rgba(255,250,242,0.28)', fontSize: 9, fontWeight: '800' },
  coverInfo: { color: 'rgba(167,243,208,0.85)', fontSize: 11, fontWeight: '800' },
  artistField: { gap: 7 },
  artistValue: { minHeight: 46, borderRadius: 4, paddingHorizontal: 13, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.035)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.44)', fontSize: 13, fontWeight: '800' },
  field: { gap: 7 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  darkLabel: { color: 'rgba(255,250,242,0.36)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  input: { minHeight: 46, borderRadius: 8, backgroundColor: colors.surfaceStrong, paddingHorizontal: 13, color: colors.text, fontSize: 14, fontWeight: '700', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  inputDark: { backgroundColor: 'rgba(255,250,242,0.04)', borderBottomColor: 'rgba(255,250,242,0.18)', color: '#FFFAF2' },
  inputMulti: { minHeight: 86, paddingTop: 12, paddingBottom: 12 },
  inputTall: { minHeight: 150 },
  collapsible: { overflow: 'hidden', borderRadius: 0, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.13)', backgroundColor: 'transparent' },
  collapsibleHead: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  collapsibleIcon: { width: 32, height: 32, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.06)' },
  collapsibleTitle: { flex: 1, color: 'rgba(255,250,242,0.86)', fontSize: 13, fontWeight: '900' },
  collapsibleBody: { gap: 12, paddingHorizontal: 12, paddingBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  chipDark: { backgroundColor: 'rgba(255,250,242,0.06)', borderColor: 'rgba(255,250,242,0.08)' },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipActiveDark: { backgroundColor: '#FFFAF2', borderColor: '#FFFAF2' },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  chipTextDark: { color: 'rgba(255,250,242,0.54)' },
  chipTextActive: { color: '#171313' },
  visibilityGrid: { flexDirection: 'row', gap: 4 },
  visibilityItem: { flex: 1, minHeight: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: 'rgba(255,255,255,0.06)' },
  visibilityItemActive: { backgroundColor: '#FFFAF2' },
  visibilityText: { color: 'rgba(255,250,242,0.48)', fontSize: 13, fontWeight: '900' },
  visibilityTextActive: { color: '#171313' },
  switchRowDark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, backgroundColor: 'transparent', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.13)' },
  remixPermissionsBox: { borderRadius: 4, backgroundColor: 'rgba(74,158,170,0.08)', borderLeftWidth: 3, borderColor: '#4A9EAA', padding: 13 },
  remixPermissionsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  remixPermissionsIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,158,170,0.16)' },
  remixPermissionsTitle: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  remixPermissionsSub: { marginTop: 1, color: 'rgba(255,250,242,0.4)', fontSize: 10, fontWeight: '700' },
  switchTitleDark: { color: 'rgba(255,250,242,0.78)', fontSize: 13, fontWeight: '900' },
  switchSubDark: { marginTop: 2, color: 'rgba(255,250,242,0.34)', fontSize: 10, fontWeight: '700' },
  previewBox: { flexDirection: 'row', gap: 12, borderRadius: 4, borderLeftWidth: 3, borderColor: '#D96D63', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12 },
  previewCover: { width: 88, height: 88, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' },
  previewTitle: { color: '#FFFAF2', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  previewMeta: { marginTop: 5, color: 'rgba(255,250,242,0.46)', fontSize: 11, fontWeight: '800' },
  previewDesc: { marginTop: 8, color: 'rgba(255,250,242,0.34)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  progressBox: { gap: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', padding: 12 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { color: 'rgba(255,250,242,0.38)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  progressValue: { color: 'rgba(255,250,242,0.56)', fontSize: 10, fontWeight: '900' },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,250,242,0.08)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: '#FFFAF2' },
  footerBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,250,242,0.08)', backgroundColor: 'rgba(23,19,19,0.96)' },
  footerLeft: { flexDirection: 'row', flexShrink: 1, gap: 8 },
  backButton: { height: 40, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.07)' },
  backText: { color: 'rgba(255,250,242,0.62)', fontSize: 12, fontWeight: '900' },
  cancelButton: { height: 40, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(239,68,68,0.12)' },
  cancelText: { color: '#FECACA', fontSize: 12, fontWeight: '900' },
  nextButton: { minWidth: 118, minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: '#7357C6', borderBottomWidth: 3, borderBottomColor: '#4A9EAA' },
  nextButtonDisabled: { opacity: 0.34 },
  nextText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  stepHint: { color: '#D96D63', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  checkPanel: { borderRadius: 10, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, padding: 14, gap: 0 },
  checkKicker: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  checkIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  checkIconDone: { backgroundColor: 'rgba(16,185,129,0.14)' },
  checkText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  error: { overflow: 'hidden', borderRadius: 16, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', color: '#B91C1C', fontSize: 12, fontWeight: '800' },
  success: { overflow: 'hidden', borderRadius: 16, padding: 12, backgroundColor: 'rgba(16,185,129,0.12)', color: '#047857', fontSize: 12, fontWeight: '900' },
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
  authIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  authTitle: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  authText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
});
