import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAIGenerationStatus,
  getAIStudioCredits,
  getAIStudioLibrary,
  getAIStudioQuota,
  getMusicChallenge,
  getRemixSource,
  getSynauraCity,
  getUserPreferences,
  createCreditsCheckout,
  generateAILyrics,
  generateAIMusicVideo,
  getTimestampedAILyrics,
  participateInChallenge,
  repairAIStudioMedia,
  saveAIGenerationTracks,
  setAIGenerationTrashed,
  setAITrackFavorite,
  setAITrackFolder,
  setAITrackPublic,
  startAIGeneration,
  startAIRemix,
  updateUserPreferences,
  uploadToCloudinaryMobile,
  type AIStatusTrack,
  type AIStudioGeneration,
  type AIStudioQuota,
  type AIStudioTrack,
  type CreditPackId,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { SynauraBackground } from '@/components/SynauraBackground';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { MobileAnimatedLogo } from '@/components/mobile/MobileAnimatedLogo';
import { MobileWaveform } from '@/components/mobile/MobileWaveform';
import { CreateArrivalBanner } from '@/components/create/CreateArrivalBanner';
import { EventChoice } from '@/components/events/SynauraEvents';
import { TrackCover } from '@/components/TrackCover';
import { RemixPermissionsSection, DEFAULT_REMIX_PERMISSIONS, type RemixPermissionsValue } from '@/components/upload/RemixPermissionsSection';
import { aiStudioPresets, type MobileAIStudioPreset } from '@/constants/aiStudioPresets';
import { buildRemixPrompt, DEFAULT_REMIX_PROMPT_VISIBILITY, DEFAULT_REMIX_TYPE, REMIX_TYPE_OPTIONS, type RemixPromptVisibility, type RemixType } from '@/constants/remixOptions';
import { usePlayer } from '@/player/PlayerProvider';
import { colors } from '@/theme/tokens';
import { getSunoErrorMessage } from '@/utils/getSunoErrorMessage';
import type { SynauraCityData, Track } from '@/api/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MotionPressable } from '@/components/motion/Motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DisclosureSection } from '@/components/ui/DisclosureSection';
import { SelectionSheet, type SelectionSheetOption } from '@/components/ui/SelectionSheet';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ShareSheet } from '@/components/swipe/ShareSheet';

type StudioTab = 'create' | 'library';
type StudioMode = 'simple' | 'custom' | 'remix';
const MODELS = ['V5_5', 'V5', 'V4_5PLUS', 'V4_5'];
const DURATIONS = [60, 120, 180];
const PREF_KEY = 'synaura.ai-studio.preferences';
const ACTIVE_TASK_KEY = 'synaura.ai-studio.active-task';
const MEDIA_REPAIR_KEY = 'synaura.ai-studio.media-repair.v2';
const MEDIA_REPAIR_INTERVAL = 12 * 60 * 60 * 1000;
const GENERATION_COST = 12;
const STUDIO_TAGS = ['Pop', 'Rap FR', 'Electronic', 'Club', 'Cinématique', 'Mélancolique', 'Épique', 'Viral', 'Acoustique', 'Nocturne', 'Énergique', 'Synaura'];
const STUDIO_FOLDERS = ['Favoris', 'À finir', 'À publier', 'Remix'];
const LIBRARY_FILTER_OPTIONS: Array<SelectionSheetOption<'all' | 'instrumental' | 'lyrics' | 'liked' | 'trashed'>> = [
  { value: 'all', label: 'Toutes les créations', description: 'Toute ta bibliothèque Studio.', icon: 'albums-outline' },
  { value: 'instrumental', label: 'Instrumentales', description: 'Créations générées sans voix.', icon: 'musical-notes-outline' },
  { value: 'lyrics', label: 'Avec paroles', description: 'Créations avec un texte ou un prompt vocal.', icon: 'document-text-outline' },
  { value: 'liked', label: 'Favorites', description: 'Les morceaux que tu as marqués.', icon: 'heart-outline' },
  { value: 'trashed', label: 'Corbeille', description: 'Créations retirées de ton espace principal.', icon: 'trash-outline' },
];
const LIBRARY_SORT_OPTIONS: Array<SelectionSheetOption<'newest' | 'oldest' | 'title'>> = [
  { value: 'newest', label: 'Plus récentes', description: 'Les dernières créations en premier.', icon: 'arrow-down-outline' },
  { value: 'oldest', label: 'Plus anciennes', description: 'Les premières créations en premier.', icon: 'arrow-up-outline' },
  { value: 'title', label: 'Titre', description: 'Classement alphabétique.', icon: 'text-outline' },
];
const CREDIT_PACKS: Array<{ id: CreditPackId; label: string; credits: number; price: string; badge?: string }> = [
  { id: 'petit', label: 'Petit', credits: 120, price: '1,99 €' },
  { id: 'moyen', label: 'Moyen', credits: 500, price: '6,99 €' },
  { id: 'populaire', label: 'Populaire', credits: 1200, price: '14,99 €', badge: 'POPULAIRE' },
  { id: 'best_value', label: 'Best Value', credits: 3000, price: '29,99 €', badge: 'MEILLEURE VALEUR' },
];

function aiTrackToPlayer(track: AIStatusTrack | NonNullable<AIStudioGeneration['tracks']>[number]): Track | null {
  const raw = track as any;
  const audioUrl = raw.stream_audio_url || raw.stream || raw.audio_url || raw.audio;
  if (!audioUrl) return null;
  const id = String(track.id || ('suno_id' in track ? track.suno_id : '') || `ai-${Date.now()}`);
  const image = raw.image_url || raw.image;
  return {
    _id: `ai-${id}`,
    title: track.title || 'Création Synaura',
    audioUrl,
    coverUrl: image || undefined,
    duration: Number(track.duration || 0),
    artist: { name: 'Synaura Studio', artistName: 'Synaura Studio' },
    genre: ['AI Studio'],
    isAI: true,
    isPublic: raw.is_public === true,
  } as Track;
}

function formatModelLabel(value: string) {
  return value.replace('V4_5PLUS', 'V4.5+').replaceAll('_', '.');
}

export function AIStudioScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const keyboardHeight = useKeyboardHeight();
  const auth = useAuth();
  const player = usePlayer();
  const [tab, setTab] = useState<StudioTab>('create');
  const [mode, setMode] = useState<StudioMode>('simple');
  const [remixType, setRemixType] = useState<RemixType>(DEFAULT_REMIX_TYPE);
  const [remixPromptVisibility, setRemixPromptVisibility] = useState<RemixPromptVisibility>(DEFAULT_REMIX_PROMPT_VISIBILITY);
  const [model, setModel] = useState('V4_5');
  const [duration, setDuration] = useState(120);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [weirdness, setWeirdness] = useState(46);
  const [styleInfluence, setStyleInfluence] = useState(86);
  const [audioWeight, setAudioWeight] = useState(50);
  const [remixAsset, setRemixAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [remixSource, setRemixSource] = useState<AIStudioTrack | null>(null);
  const [synauraRemixSource, setSynauraRemixSource] = useState<any | null>(null);
  const [credits, setCredits] = useState(0);
  const [creditsKnown, setCreditsKnown] = useState(false);
  const [quota, setQuota] = useState<AIStudioQuota | null>(null);
  const [library, setLibrary] = useState<AIStudioGeneration[]>([]);
  const [liveTaskId, setLiveTaskId] = useState('');
  const [liveStatus, setLiveStatus] = useState('');
  const [liveTracks, setLiveTracks] = useState<AIStatusTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [modelNotice, setModelNotice] = useState('');
  const [liveModel, setLiveModel] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'instrumental' | 'lyrics' | 'liked' | 'trashed'>('all');
  const [libraryFolder, setLibraryFolder] = useState('');
  const [librarySort, setLibrarySort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [inspector, setInspector] = useState<{ generation: AIStudioGeneration; track: AIStudioTrack } | null>(null);
  const [shareTrackTarget, setShareTrackTarget] = useState<Track | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [negativeTags, setNegativeTags] = useState('');
  const [vocalGender, setVocalGender] = useState<'' | 'f' | 'm'>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ideaOpen, setIdeaOpen] = useState(true);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [inspirationSheetOpen, setInspirationSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [repairingMedia, setRepairingMedia] = useState(false);
  const [repairMessage, setRepairMessage] = useState('');
  const [libraryPlaybackPendingId, setLibraryPlaybackPendingId] = useState<string | null>(null);
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const challengeId: string = route.params?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const composerScrollRef = useRef<ScrollView>(null);
  const libraryPlaybackLockRef = useRef<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (auth.user?.username) setTab('create');
  }, [auth.user?.username]));

  useEffect(() => {
    if (!challengeId) return;
    let active = true;
    void getMusicChallenge(challengeId).then((next) => active && setChallengeTitle(next.title)).catch(() => {});
    return () => { active = false; };
  }, [challengeId]);

  // Contexte Remix a restaurer apres Login -> Onboarding si l'utilisateur doit
  // s'authentifier (ou terminer l'onboarding) avant de generer.
  const remixReturnTo = useMemo(() => {
    const sourceTrackId = synauraRemixSource?.sourceTrackId || route.params?.sourceTrackId;
    const sourceTrackType = synauraRemixSource?.sourceTrackType || route.params?.sourceTrackType;
    if (!sourceTrackId) return undefined;
    return { screen: 'AIStudio', params: { sourceTrackId, sourceTrackType, mode: 'remix' } };
  }, [synauraRemixSource, route.params?.sourceTrackId, route.params?.sourceTrackType]);

  useEffect(() => {
    let active = true;
    void getSynauraCity().then((next) => active && setCity(next)).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sourceTrackId = route.params?.sourceTrackId;
    if (!sourceTrackId) return;
    let active = true;
    const sourceTrackType = route.params?.sourceTrackType === 'ai_track' ? 'ai_track' : 'track';
    setMode('remix');
    setTab('create');
    setRemixAsset(null);
    setRemixSource(null);
    getRemixSource(String(sourceTrackId), sourceTrackType)
      .then((source) => {
        if (!active) return;
        const prefill = source.prefill || {};
        const tags = Array.isArray(prefill.tags) ? prefill.tags.filter(Boolean).map(String) : [];
        const genres = Array.isArray(prefill.genre) ? prefill.genre.filter(Boolean).map(String) : [];
        const styleLabel = [...genres, prefill.mood, ...tags].filter(Boolean).map(String).join(', ') || 'variation IA Synaura';
        setSynauraRemixSource(source);
        setTitle((current) => current.trim() ? current : `Variation de ${source.title}`.slice(0, 80));
        setDescription((current) => current.trim() ? current : (prefill.prompt || prefill.description || `Creer une variation IA originale inspiree par "${source.title}".`));
        setStyle((current) => current.trim() ? current : styleLabel);
        setSelectedTags((current) => current.length ? current : tags.slice(0, 8));
        setInstrumental(true);
      })
      .catch((sourceError) => {
        if (active) setError(getSunoErrorMessage(sourceError));
      });
    return () => {
      active = false;
    };
  }, [route.params?.sourceTrackId, route.params?.sourceTrackType]);

  const selectEvent = useCallback((eventId: string | null) => {
    setSelectedEventId(eventId);
    if (!eventId) return;
    const event = city?.events.find((item) => item.id === eventId);
    if (!event) return;
    const direction = [event.theme, event.challengeTag, event.description].filter(Boolean).join(', ');
    if (direction) setStyle((current) => current.trim() ? `${current}, ${direction}` : direction);
    setDescription((current) => current.trim() ? current : `Créer pour ${event.title}: ${event.description}`);
    setTab('create');
  }, [city?.events]);

  const loadStudio = useCallback(async (refresh = false) => {
    if (!auth.requireAuth()) {
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [creditsResult, quotaResult, libraryResult, preferencesResult] = await Promise.allSettled([
        getAIStudioCredits(),
        getAIStudioQuota(),
        getAIStudioLibrary(),
        getUserPreferences(),
      ]);
      if (creditsResult.status === 'fulfilled') {
        setCredits(creditsResult.value);
        setCreditsKnown(true);
      }
      if (quotaResult.status === 'fulfilled') setQuota(quotaResult.value);
      if (libraryResult.status === 'fulfilled') setLibrary(libraryResult.value);
      if (libraryResult.status === 'fulfilled') {
        const pending = libraryResult.value.find((generation) => !['completed', 'success', 'failed', 'error'].includes(String(generation.status).toLowerCase()));
        if (pending) {
          setLiveTaskId((current) => current || pending.task_id);
          setLiveStatus((current) => current || pending.status);
        }
      }
      const preferences = preferencesResult.status === 'fulfilled' ? preferencesResult.value : {};
      const studioPreferences = (preferences as Record<string, any>)?.aiStudio || {};
      if (MODELS.includes(studioPreferences.modelVersion)) setModel(studioPreferences.modelVersion);
      if (DURATIONS.includes(studioPreferences.generationDuration)) setDuration(studioPreferences.generationDuration);
      if (['simple', 'custom', 'remix'].includes(studioPreferences.generationModeKind)) setMode(studioPreferences.generationModeKind);
      const failures = [creditsResult, quotaResult, libraryResult].filter((result) => result.status === 'rejected');
      if (failures.length === 3) setError(getSunoErrorMessage((failures[0] as PromiseRejectedResult).reason));
      else setError('');
    } catch (loadError) {
      setError(getSunoErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(PREF_KEY), AsyncStorage.getItem(ACTIVE_TASK_KEY)]).then(([rawPrefs, rawTask]) => {
      if (rawPrefs) {
        try {
          const prefs = JSON.parse(rawPrefs);
          if (MODELS.includes(prefs.model)) setModel(prefs.model);
          if (DURATIONS.includes(prefs.duration)) setDuration(prefs.duration);
        } catch {}
      }
      if (rawTask) {
        try {
          const active = JSON.parse(rawTask);
          if (active?.taskId) {
            setLiveTaskId(String(active.taskId));
            setLiveStatus(String(active.status || 'pending'));
            if (active.model) setLiveModel(String(active.model));
          }
        } catch {}
      }
    });
    void loadStudio();
  }, [loadStudio]);

  useEffect(() => {
    void AsyncStorage.setItem(PREF_KEY, JSON.stringify({ model, duration }));
    if (auth.requireAuth()) void updateUserPreferences({ aiStudio: { modelVersion: model, generationDuration: duration, generationModeKind: mode, isInstrumental: instrumental } }).catch(() => {});
  }, [auth, duration, instrumental, mode, model]);

  useEffect(() => {
    if (!liveTaskId || liveStatus === 'SUCCESS' || liveStatus === 'ERROR') return;
    let mounted = true;
    const poll = async () => {
      try {
        const result = await getAIGenerationStatus(liveTaskId);
        if (!mounted) return;
        setLiveStatus(result.status);
        if (result.tracks.length) setLiveTracks(result.tracks);
        if (String(result.status).toUpperCase() === 'SUCCESS') {
          await saveAIGenerationTracks(liveTaskId, result.tracks).catch(() => {});
          await AsyncStorage.removeItem(ACTIVE_TASK_KEY);
          await loadStudio(true);
        } else if (String(result.status).toUpperCase() === 'ERROR') {
          await AsyncStorage.removeItem(ACTIVE_TASK_KEY);
        }
      } catch {}
    };
    void poll();
    const interval = setInterval(poll, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [liveStatus, liveTaskId, loadStudio]);

  const repairMedia = useCallback(async (silent = false) => {
    if (repairingMedia) return;
    setRepairingMedia(true);
    if (!silent) setRepairMessage('');
    try {
      const result = await repairAIStudioMedia(100);
      await AsyncStorage.setItem(MEDIA_REPAIR_KEY, String(Date.now()));
      const nextLibrary = await getAIStudioLibrary();
      setLibrary(nextLibrary);
      if (!silent) setRepairMessage(result.updatedTracks ? `${result.updatedTracks} média(s) réparé(s).` : 'Toutes les pochettes sont à jour.');
    } catch (repairError) {
      if (!silent) setRepairMessage(getSunoErrorMessage(repairError));
    } finally {
      setRepairingMedia(false);
    }
  }, [repairingMedia]);

  useEffect(() => {
    if (loading || repairingMedia || !library.some((generation) => generation.tracks?.some((track) => !track.image_url))) return;
    let cancelled = false;
    AsyncStorage.getItem(MEDIA_REPAIR_KEY).then((lastRaw) => {
      if (cancelled || Date.now() - Number(lastRaw || 0) < MEDIA_REPAIR_INTERVAL) return;
      void repairMedia(true);
    });
    return () => {
      cancelled = true;
    };
  }, [library, loading, repairMedia, repairingMedia]);

  const applyPreset = (preset: MobileAIStudioPreset) => {
    void Haptics.selectionAsync();
    setMode('custom');
    setTitle(preset.defaults.title);
    setDescription(preset.defaults.description);
    setStyle(preset.defaults.style);
    setInstrumental(preset.defaults.instrumental);
    setWeirdness(preset.defaults.weirdness);
    setStyleInfluence(preset.defaults.styleInfluence);
    setAudioWeight(preset.defaults.audioWeight);
    setInspirationSheetOpen(false);
    setStylesOpen(true);
  };

  const pickRemix = async () => {
    setMode('remix');
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      setRemixAsset(result.assets[0]);
      setRemixSource(null);
      setIdeaOpen(true);
    }
  };

  const configureVoice = () => {
    void Haptics.selectionAsync().catch(() => {});
    setMode((current) => current === 'simple' ? 'custom' : current);
    setInstrumental(false);
    setLyricsOpen(true);
  };

  const createLyrics = async () => {
    const prompt = [title, description, style].filter(Boolean).join('. ').trim();
    if (!prompt) {
      setError('Ajoute une idée ou un style avant de générer les paroles.');
      return;
    }
    setLyricsLoading(true);
    setError('');
    try {
      const result = await generateAILyrics(prompt);
      if (result.best) setLyrics(result.best);
      else setError('Les paroles sont encore en préparation. Réessaie dans un instant.');
    } catch (lyricsError) {
      setError(getSunoErrorMessage(lyricsError));
    } finally {
      setLyricsLoading(false);
    }
  };

  const generate = async () => {
    if (!auth.requireAuth()) {
      navigation.getParent()?.navigate('Login', {
        message: 'Connecte-toi pour créer avec le Studio IA.',
        ...(remixReturnTo ? { returnTo: remixReturnTo } : null),
      });
      return;
    }
    if (!description.trim() && mode === 'simple') {
      setError('Décris le morceau que tu veux créer.');
      return;
    }
    if (mode !== 'simple' && !style.trim() && !selectedTags.length) {
      setError('Ajoute un style musical ou choisis un preset.');
      return;
    }
    if (mode === 'remix' && !synauraRemixSource && !remixAsset && !remixSource?.audio_url && !remixSource?.stream_audio_url) {
      setError('Choisis un fichier audio à remixer ou une source Synaura autorisée.');
      return;
    }
    if (creditsKnown && credits < GENERATION_COST) {
      setError(`Tu n'as pas assez de credits IA. Il faut ${GENERATION_COST} credits pour lancer une generation.`);
      setShowCredits(true);
      return;
    }
    setGenerating(true);
    setError('');
    setLiveTracks([]);
    try {
      const tagPrompt = selectedTags.join(', ');
      const remixCreativePrompt = mode === 'remix'
        ? buildRemixPrompt({
            remixType,
            userPrompt: description,
            sourceTitle: synauraRemixSource?.title || remixSource?.title || remixAsset?.name,
          })
        : '';
      const prompt = mode === 'simple'
        ? `${description.trim()}. ${tagPrompt}. Durée cible ${duration} secondes.`
        : lyrics.trim() || [description.trim(), remixCreativePrompt].filter(Boolean).join('. ');
      const payload = {
        customMode: mode !== 'simple',
        instrumental,
        model,
        title: title.trim() || undefined,
        style: [style.trim(), tagPrompt, remixCreativePrompt].filter(Boolean).join(', ') || undefined,
        prompt,
        negativeTags: negativeTags.trim() || undefined,
        vocalGender: vocalGender || undefined,
        styleWeight: styleInfluence / 100,
        weirdnessConstraint: weirdness / 100,
        audioWeight: audioWeight / 100,
        durationHint: `${duration} seconds`,
      };
      let result;
      if (mode === 'remix' && synauraRemixSource) {
        result = await startAIGeneration({
          ...payload,
          remixSource: {
            sourceTrackId: synauraRemixSource.sourceTrackId,
            sourceTrackType: synauraRemixSource.sourceTrackType,
          },
          remixType,
          remixPrompt: remixCreativePrompt,
          remixPromptVisibility,
          // Permet d'enregistrer la participation au défi même si la variation part en
          // attente d'approbation (voir upsertDraftRemixesForGeneration + decision/route.ts).
          ...(challengeId ? { challengeId } : {}),
        });
      } else if (mode === 'remix' && remixSource && !remixAsset) {
        result = await startAIRemix({
          ...payload,
          uploadUrl: remixSource.audio_url || remixSource.stream_audio_url || '',
          sourceDurationSec: remixSource.duration,
        });
      } else if (mode === 'remix' && remixAsset) {
        const uploaded = await uploadToCloudinaryMobile({
          uri: remixAsset.uri,
          name: remixAsset.name || `remix-${Date.now()}.mp3`,
          type: remixAsset.mimeType || 'audio/mpeg',
          size: remixAsset.size || null,
        }, 'video', 'ximam/ai-sources');
        result = await startAIRemix({ ...payload, uploadUrl: uploaded.secureUrl, sourceDurationSec: uploaded.duration });
      } else {
        result = await startAIGeneration(payload);
      }
      setLiveTaskId(result.taskId);
      setLiveStatus('pending');
      setLiveModel(result.model);
      if (result.modelAdjusted) {
        setModelNotice(`${formatModelLabel(String(result.requestedModel || model))} n'est pas inclus dans ton plan. La génération utilise réellement ${formatModelLabel(result.model)}.`);
        setModel(result.model);
      } else {
        setModelNotice(`Génération lancée avec ${formatModelLabel(result.model)}.`);
      }
      await AsyncStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify({ taskId: result.taskId, status: 'pending', title: title || description, model: result.model, startedAt: Date.now() }));
      if (result.credits?.balance != null) setCredits(Number(result.credits.balance));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (generationError) {
      setError(getSunoErrorMessage(generationError));
      if (/cr.dit|402/i.test(String(generationError))) setShowCredits(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGenerating(false);
    }
  };

  const play = (track: AIStatusTrack | NonNullable<AIStudioGeneration['tracks']>[number]) => {
    const playable = aiTrackToPlayer(track);
    if (playable) void player.playTrack(playable);
  };

  const currentTitle = mode === 'remix' ? 'Remixe un son existant.' : mode === 'custom' ? 'Dirige chaque détail.' : 'Décris. Synaura compose.';
  const availableModels = useMemo(() => quota?.availableModels?.length ? quota.availableModels : ['V4_5'], [quota?.availableModels]);
  const modelOptions = useMemo<Array<SelectionSheetOption<string>>>(() => {
    const ordered = Array.from(new Set([model, ...MODELS, ...availableModels]));
    return ordered.map((item) => {
      const unlocked = availableModels.includes(item);
      return {
        value: item,
        label: formatModelLabel(item),
        description: unlocked ? 'Disponible avec ton offre actuelle.' : 'Non disponible avec ton offre actuelle.',
        icon: unlocked ? 'sparkles-outline' : 'lock-closed-outline',
        disabled: !unlocked,
      };
    });
  }, [availableModels, model]);
  const generationReady = Boolean(
    (mode === 'simple' ? description.trim() : (style.trim() || selectedTags.length))
    && (mode !== 'remix' || synauraRemixSource || remixAsset || remixSource?.audio_url || remixSource?.stream_audio_url),
  );
  const composerBottom = Math.max(insets.bottom, 10) + 8;
  const libraryTracks = useMemo(() => {
    const rows = library.flatMap((generation) => (generation.tracks || []).map((track) => ({ generation, track })));
    if (liveTaskId && liveTracks.length) {
      const generation: AIStudioGeneration = {
        id: `live-${liveTaskId}`,
        task_id: liveTaskId,
        prompt: description,
        model: liveModel || model,
        status: 'pending',
        created_at: new Date().toISOString(),
        metadata: { title: title || description || 'Création en cours', style, instrumental },
        tracks: [],
      };
      liveTracks.forEach((raw) => {
        if (rows.some(({ track }) => track.id === raw.id)) return;
        rows.unshift({
          generation,
          track: {
            id: raw.id,
            title: raw.title || 'Preview en cours',
            audio_url: raw.audio || raw.stream || '',
            stream_audio_url: raw.stream,
            image_url: raw.image,
            duration: Number(raw.duration || 0),
            model_name: liveModel || model,
          },
        });
      });
    }
    return rows;
  }, [description, instrumental, library, liveModel, liveTaskId, liveTracks, model, style, title]);
  const visibleLibraryTracks = useMemo(() => libraryTracks.filter(({ generation, track }) => {
    const query = librarySearch.trim().toLowerCase();
    const haystack = `${track.title} ${track.style || ''} ${track.prompt || ''} ${generation.prompt || ''}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (libraryFilter === 'trashed') return Boolean(generation.is_trashed);
    if (generation.is_trashed) return false;
    if (libraryFolder && track.library_folder !== libraryFolder) return false;
    if (libraryFilter === 'instrumental') return Boolean(generation.metadata?.instrumental);
    if (libraryFilter === 'lyrics') return Boolean(track.lyrics || track.prompt);
    if (libraryFilter === 'liked') return Boolean(track.is_liked || track.is_favorite);
    return true;
  }).sort((a, b) => {
    if (librarySort === 'title') return a.track.title.localeCompare(b.track.title, 'fr');
    const aTime = new Date(a.track.created_at || a.generation.created_at).getTime();
    const bTime = new Date(b.track.created_at || b.generation.created_at).getTime();
    return librarySort === 'oldest' ? aTime - bTime : bTime - aTime;
  }), [libraryFilter, libraryFolder, librarySearch, librarySort, libraryTracks]);
  const libraryFolders = useMemo(() => Array.from(new Set(libraryTracks.map(({ track }) => track.library_folder).filter((folder): folder is string => Boolean(folder)))), [libraryTracks]);
  const pendingGenerations = useMemo(() => library.filter((generation) => !['completed', 'success', 'failed', 'error'].includes(String(generation.status).toLowerCase())), [library]);
  const groupedLibraryTracks = useMemo(() => {
    if (librarySort === 'title') return [{ key: 'title', label: 'Par titre', items: visibleLibraryTracks }];
    const groups = new Map<string, { key: string; label: string; items: typeof visibleLibraryTracks }>();
    visibleLibraryTracks.forEach((item) => {
      const rawDate = item.track.created_at || item.generation.created_at;
      const date = new Date(rawDate);
      const valid = !Number.isNaN(date.getTime());
      const key = valid ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : 'unknown';
      const group = groups.get(key) || { key, label: valid ? formatLibraryDateLabel(date) : 'Date inconnue', items: [] };
      group.items.push(item);
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [librarySort, visibleLibraryTracks]);
  const activeFilterLabel = LIBRARY_FILTER_OPTIONS.find((option) => option.value === libraryFilter)?.label || 'Toutes les créations';
  const activeSortLabel = LIBRARY_SORT_OPTIONS.find((option) => option.value === librarySort)?.label || 'Plus récentes';
  const libraryQueue = useMemo(
    () => visibleLibraryTracks
      .map(({ track }) => aiTrackToPlayer(track))
      .filter((track): track is Track => Boolean(track)),
    [visibleLibraryTracks],
  );

  const playLibraryTrack = useCallback(async (selected: AIStudioTrack) => {
    const selectedId = aiTrackToPlayer(selected)?._id;
    if (!selectedId) return;
    const index = libraryQueue.findIndex((track) => track._id === selectedId);
    if (index < 0) return;
    if (libraryPlaybackLockRef.current) return;
    libraryPlaybackLockRef.current = selectedId;
    setLibraryPlaybackPendingId(selectedId);
    try {
      if (player.current?._id === selectedId) {
        await player.togglePlayPause();
        return;
      }
      const queueAlreadyLoaded = player.queue.length === libraryQueue.length
        && player.queue.every((track, queueIndex) => track._id === libraryQueue[queueIndex]?._id);
      if (queueAlreadyLoaded) await player.playQueueIndex(index);
      else await player.setQueueAndPlay(libraryQueue, index);
    } catch (playbackError) {
      setError(playbackError instanceof Error ? playbackError.message : 'Impossible de lancer cette piste.');
    } finally {
      if (libraryPlaybackLockRef.current === selectedId) libraryPlaybackLockRef.current = null;
      setLibraryPlaybackPendingId((current) => current === selectedId ? null : current);
    }
  }, [libraryQueue, player]);

  const closeComposer = () => {
    setModelSheetOpen(false);
    setInspirationSheetOpen(false);
    setTab('library');
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const openComposer = () => {
    setTab('create');
    requestAnimationFrame(() => composerScrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const reuseTrack = (generation: AIStudioGeneration, track: AIStudioTrack) => {
    setMode('custom');
    setTitle(track.title || String(generation.metadata?.title || ''));
    setDescription(track.prompt || generation.prompt || '');
    setStyle(track.style || String(generation.metadata?.style || ''));
    setLyrics(track.lyrics || '');
    if (MODELS.includes(track.model_name || '')) setModel(String(track.model_name));
    setTab('create');
    setInspector(null);
    requestAnimationFrame(() => composerScrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const remixTrack = (generation: AIStudioGeneration, track: AIStudioTrack) => {
    setMode('remix');
    setRemixAsset(null);
    setRemixSource(track);
    setTitle(`${track.title || String(generation.metadata?.title || 'Création')} remix`);
    setDescription(track.prompt || generation.prompt || '');
    setStyle(track.style || String(generation.metadata?.style || ''));
    setTab('create');
    setInspector(null);
    requestAnimationFrame(() => composerScrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  if (!auth.user) {
    return (
      <View style={styles.root}>
        <SynauraBackground variant="warm">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.authGate,
            responsive.pageContent,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 92 },
          ]}
        >
          <View style={styles.authTop}>
            <View>
              <Text style={styles.authKicker}>Studio Synaura</Text>
              <Text style={styles.authPageTitle}>Crée sans casser ton élan.</Text>
            </View>
            <View style={styles.authIcon}><Ionicons name="sparkles" size={24} color={colors.paper} /></View>
          </View>
          <View style={styles.authPreview}>
            <View style={styles.authPreviewOrb}><Ionicons name="musical-notes" size={28} color={colors.paper} /></View>
            <Text style={styles.authPreviewTitle}>Une idée devient un morceau.</Text>
            <Text style={styles.authPreviewText}>Prompt, vibe, voix et durée dans un parcours simple pensé pour mobile.</Text>
            <View style={styles.authFeatures}>
              <AuthFeature icon="flash-outline" text="Générations et presets" />
              <AuthFeature icon="library-outline" text="Bibliothèque synchronisée" />
              <AuthFeature icon="cloud-upload-outline" text="Publication directe" />
            </View>
          </View>
          <View>
            <Text style={styles.authTitle}>Retrouve ton Studio</Text>
            <Text style={styles.authText}>Connecte-toi pour accéder à tes crédits, tes créations et ton historique.</Text>
            <Pressable
              onPress={() => navigation.getParent()?.navigate('Login', remixReturnTo ? { returnTo: remixReturnTo } : undefined)}
              style={styles.authButton}
            >
              <Text style={styles.authButtonText}>Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
        </SynauraBackground>
      </View>
    );
  }

  const studioView = (viewTab: StudioTab, drawer = false) => (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground variant="warm">
      <ScrollView
        ref={viewTab === 'create' ? composerScrollRef : scrollRef}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStudio(true)} tintColor={colors.violet} />}
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          {
            paddingTop: drawer ? 10 : insets.top + 10,
            paddingBottom: viewTab === 'create'
              ? Math.max(insets.bottom, 10) + 112
              : Math.max(insets.bottom + (player.current ? 205 : 125), player.current ? responsive.miniPlayerClearance : responsive.bottomDockClearance),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.top}>
          <Pressable accessibilityLabel={viewTab === 'create' ? 'Fermer la création' : 'Retour'} onPress={viewTab === 'create' ? closeComposer : () => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name={viewTab === 'create' ? 'close' : 'chevron-back'} size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setShowCredits(true)} style={styles.creditPill}><Ionicons name="sparkles" size={14} color={colors.coral} /><Text style={styles.creditText}>{credits} crédits</Text><Ionicons name="add-circle" size={16} color={colors.text} /></Pressable>
          <MobileAccountButton compact />
        </View>
        <View style={styles.studioHeading}>
          <View style={styles.studioHeadingCopy}>
            <Text style={styles.kicker}>Studio Synaura</Text>
            <Text style={[styles.title, viewTab === 'library' && styles.titleCompact]}>{viewTab === 'create' ? 'Créer un morceau' : 'Ma bibliothèque'}</Text>
            <Text style={styles.subtitle}>{viewTab === 'create' ? currentTitle : `${libraryTracks.length} projet${libraryTracks.length > 1 ? 's' : ''} dans ton espace créatif`}</Text>
          </View>
          {quota ? <View style={styles.quotaBadge}><Text style={styles.quotaValue}>{quota.remaining}</Text><Text style={styles.quotaLabel}>restants</Text></View> : null}
        </View>

        {viewTab === 'create' && (challengeId || synauraRemixSource) ? (
          <CreateArrivalBanner
            context={challengeId ? 'challenge' : (synauraRemixSource ? 'variation' : 'ai')}
            title={challengeId ? challengeTitle : synauraRemixSource?.title}
          />
        ) : null}

        {viewTab === 'library' ? (
          <>
            <MotionPressable onPress={openComposer} style={styles.createCallout} scaleTo={0.985}>
              <View style={styles.createCalloutIcon}><Ionicons name="add" size={25} color={colors.paper} /></View>
              <View style={styles.createCalloutCopy}>
                <Text style={styles.createCalloutTitle}>Nouvelle création</Text>
                <Text style={styles.createCalloutText}>Composer, remixer ou partir d’une inspiration</Text>
              </View>
              <Ionicons name="arrow-forward" size={19} color={colors.paper} />
            </MotionPressable>
            <View style={styles.librarySummary}>
              <View style={styles.summaryStat}><Text style={styles.summaryValue}>{libraryTracks.length}</Text><Text style={styles.summaryLabel}>Pistes</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}><Text style={styles.summaryValue}>{pendingGenerations.length}</Text><Text style={styles.summaryLabel}>En cours</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}><Text style={styles.summaryValue}>{credits}</Text><Text style={styles.summaryLabel}>Crédits</Text></View>
            </View>
          </>
        ) : null}

        {liveTaskId ? <StatusOrb status={liveStatus} /> : null}

        {error ? <Pressable onPress={() => loadStudio(true)} style={styles.error}><Ionicons name="refresh" size={17} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></Pressable> : null}
        {loading ? <ActivityIndicator color={colors.violet} style={{ marginTop: 30 }} /> : null}

        {viewTab === 'create' ? (
          <>
            <View style={styles.composerToolbar}>
              <SegmentedControl
                value={mode}
                compact
                style={styles.modeControl}
                options={[
                  { value: 'simple', label: 'Simple' },
                  { value: 'custom', label: 'Avancé' },
                  { value: 'remix', label: 'Remix' },
                ]}
                onChange={(nextMode) => {
                  setMode(nextMode);
                  if (nextMode === 'remix') setIdeaOpen(true);
                }}
              />
              <MotionPressable onPress={() => setModelSheetOpen(true)} style={styles.modelButton} scaleTo={0.94}>
                <Text style={styles.modelButtonText}>{formatModelLabel(model)}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.text} />
              </MotionPressable>
            </View>

            {mode === 'simple' ? (
              <View style={styles.simpleComposer}>
                <View style={styles.simpleComposerHead}>
                  <View style={styles.simpleComposerIcon}><Ionicons name="sparkles" size={17} color={colors.paper} /></View>
                  <Text style={styles.simpleComposerTitle}>Décris la musique que tu imagines</Text>
                </View>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Une ambiance, une histoire, une énergie, des instruments…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={800}
                  textAlignVertical="top"
                  style={styles.simplePromptInput}
                />
                <Text style={styles.simplePromptCount}>{description.length}/800</Text>
              </View>
            ) : (
              <>
            <StudioSourceBar
              audioSelected={Boolean(synauraRemixSource || remixAsset || remixSource)}
              voiceSelected={!instrumental}
              onAudio={() => void pickRemix()}
              onVoice={configureVoice}
              onInspiration={() => setInspirationSheetOpen(true)}
            />

            <DisclosureSection
              title={mode === 'remix' ? 'Source et variation' : 'Idée musicale'}
              summary={description.trim() || (mode === 'remix' ? 'Choisis le son puis décris la variation' : 'Décris ce que tu veux entendre')}
              icon={mode === 'remix' ? 'repeat-outline' : 'bulb-outline'}
              open={ideaOpen}
              onToggle={() => setIdeaOpen((current) => !current)}
            >
              {synauraRemixSource ? (
                <View style={styles.lockedSource}>
                  <View style={styles.lockedSourceTop}>
                    {synauraRemixSource.coverUrl ? <TrackCover track={{ _id: synauraRemixSource.sourceTrackId, title: synauraRemixSource.title, audioUrl: '', coverUrl: synauraRemixSource.coverUrl }} style={styles.lockedSourceCover} /> : <View style={styles.lockedSourceCover} />}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={2} style={styles.lockedSourceTitle}>Inspiré de {synauraRemixSource.title} — par @{synauraRemixSource.artistUsername || synauraRemixSource.artist}</Text>
                      <Text style={styles.lockedSourceText}>Le créateur original sera toujours crédité</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => { closeComposer(); navigation.navigate('TrackDetail', { trackId: synauraRemixSource.sourceTrackType === 'ai_track' ? `ai-${synauraRemixSource.sourceTrackId}` : synauraRemixSource.sourceTrackId }); }} style={styles.lockedSourceButton}>
                    <Ionicons name="open-outline" size={15} color={colors.violet} />
                    <Text style={styles.lockedSourceButtonText}>Voir le morceau original</Text>
                  </Pressable>
                </View>
              ) : null}
              {mode === 'remix' ? (
                <Pressable onPress={pickRemix} style={styles.remixPicker}>
                  <Ionicons name={remixAsset || remixSource ? 'checkmark-circle' : 'musical-notes-outline'} size={25} color={remixAsset || remixSource ? '#6EE7B7' : '#C7B8FF'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Source audio</Text>
                    <Text numberOfLines={1} style={styles.remixName}>{remixAsset?.name || remixSource?.title || 'Choisir un fichier à transformer'}</Text>
                  </View>
                </Pressable>
              ) : null}
              {mode === 'remix' ? (
                <RemixDirectionPicker
                  value={remixType}
                  onChange={setRemixType}
                  promptVisibility={remixPromptVisibility}
                  onPromptVisibilityChange={setRemixPromptVisibility}
                />
              ) : null}
              <Field label={mode === 'remix' ? 'Variation souhaitée' : 'Direction créative'} value={description} onChangeText={setDescription} placeholder={mode === 'remix' ? 'Ex : plus rapide, plus triste, acoustique, garder les paroles...' : 'Ambiance, histoire, énergie, structure...' } multiline />
            </DisclosureSection>

            <DisclosureSection
              title="Paroles et voix"
              summary={instrumental ? 'Instrumental' : lyrics.trim() ? 'Paroles ajoutées' : 'Voix activée, paroles optionnelles'}
              icon="mic-outline"
              open={lyricsOpen}
              onToggle={() => setLyricsOpen((current) => !current)}
            >
              <View style={styles.switchRow}>
                <View><Text style={styles.switchTitle}>Instrumental</Text><Text style={styles.switchText}>Génère sans voix ni paroles</Text></View>
                <Switch value={instrumental} onValueChange={setInstrumental} trackColor={{ false: '#3A3335', true: colors.violet }} thumbColor={colors.paper} />
              </View>
              {!instrumental ? (
                <>
                  <View style={styles.fieldHead}>
                    <Text style={styles.fieldLabel}>Paroles</Text>
                    <Pressable disabled={lyricsLoading} onPress={createLyrics} style={styles.magicButton}>
                      {lyricsLoading ? <ActivityIndicator color={colors.paper} size="small" /> : <Ionicons name="sparkles" size={14} color={colors.paper} />}
                      <Text style={styles.magicButtonText}>Écrire avec l’IA</Text>
                    </Pressable>
                  </View>
                  <TextInput value={lyrics} onChangeText={setLyrics} placeholder="Écris, colle ou génère les paroles..." placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" style={[styles.input, styles.inputMulti, styles.inputTall]} />
                </>
              ) : <Text style={styles.sectionHint}>La génération se concentrera sur l’instrumental.</Text>}
            </DisclosureSection>

            <DisclosureSection
              title="Styles"
              summary={style.trim() || selectedTags.join(', ') || 'Genres, ambiance et production'}
              icon="color-palette-outline"
              open={stylesOpen}
              onToggle={() => setStylesOpen((current) => !current)}
            >
              <Pressable onPress={() => setInspirationSheetOpen(true)} style={styles.inspirationButton}>
                <Ionicons name="sparkles-outline" size={17} color={colors.violet} />
                <View style={{ flex: 1 }}><Text style={styles.inspirationTitle}>Partir d’une inspiration</Text><Text style={styles.inspirationText}>Applique une direction préparée ou un event Synaura.</Text></View>
                <Ionicons name="arrow-forward" size={16} color={colors.violet} />
              </Pressable>
              <Field label="Style musical" value={style} onChangeText={setStyle} placeholder="Genres, voix, production, instruments..." multiline />
              <View style={styles.field}>
                <View style={styles.fieldHead}><Text style={styles.fieldLabel}>Couleurs musicales</Text><Text style={styles.tagCount}>{selectedTags.length} sélection</Text></View>
                <View style={styles.tagWrap}>
                  {STUDIO_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return <Pressable key={tag} onPress={() => setSelectedTags((current) => active ? current.filter((item) => item !== tag) : [...current, tag])} style={[styles.tag, active && styles.tagActive]}><Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text></Pressable>;
                  })}
                </View>
              </View>
            </DisclosureSection>

            <DisclosureSection
              title="Plus d’options"
              summary={`${formatModelLabel(model)} · ${duration} sec · ${instrumental ? 'instrumental' : 'voix possible'}`}
              icon="options-outline"
              open={advancedOpen}
              onToggle={() => setAdvancedOpen((current) => !current)}
            >
              <Pressable onPress={() => setModelSheetOpen(true)} style={styles.settingRow}>
                <View><Text style={styles.fieldLabel}>Modèle</Text><Text style={styles.settingValue}>{formatModelLabel(model)}</Text></View>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </Pressable>
              <ChoiceRow label="Durée cible" values={DURATIONS.map(String)} value={String(duration)} suffix=" sec" onChange={(value) => setDuration(Number(value))} />
              <ChoiceRow label="Voix" values={['', 'f', 'm']} value={vocalGender} onChange={(value) => setVocalGender(value as '' | 'f' | 'm')} />
              <Field label="À éviter" value={negativeTags} onChangeText={setNegativeTags} placeholder="Ex: autotune, guitare, voix grave..." />
              <Meter label="Influence du style" value={styleInfluence} onChange={setStyleInfluence} />
              <Meter label="Créativité" value={weirdness} onChange={setWeirdness} />
              {mode === 'remix' ? <Meter label="Poids audio" value={audioWeight} onChange={setAudioWeight} /> : null}
            </DisclosureSection>

            <DisclosureSection
              title="Titre et diffusion"
              summary={title.trim() || (selectedEventId ? 'Lié à un event Synaura' : 'Titre facultatif')}
              icon="folder-open-outline"
              open={titleOpen}
              onToggle={() => setTitleOpen((current) => !current)}
            >
              <Field label="Titre de la création" value={title} onChangeText={setTitle} placeholder="Facultatif" />
              <EventChoice events={city?.events || []} selectedId={selectedEventId} onSelect={selectEvent} />
            </DisclosureSection>
              </>
            )}

            {modelNotice ? (
              <View style={styles.modelNotice}>
                <Ionicons name="information-circle-outline" size={17} color={colors.violet} />
                <Text style={styles.modelNoticeText}>{modelNotice}</Text>
                {quota?.plan_type !== 'pro' ? <Pressable onPress={() => { closeComposer(); navigation.navigate('Subscriptions'); }}><Text style={styles.modelNoticeLink}>Voir Pro</Text></Pressable> : null}
              </View>
            ) : null}

            {liveTaskId ? (
              <View style={styles.livePanel}>
                <View style={styles.liveTop}><View style={styles.liveDot} /><Text style={styles.liveKicker}>Génération en direct</Text><Text style={styles.liveStatus}>{liveStatus || 'en attente'}</Text></View>
                <View style={styles.liveVisual}>
                  <MobileAnimatedLogo loading size={52} />
                  <View style={styles.liveVisualCopy}>
                    <Text style={styles.liveVisualKicker}>Composition en cours</Text>
                    <MobileWaveform active style={styles.liveWaveform} />
                  </View>
                </View>
                <Text style={styles.liveTitle}>{title || description || 'Création en cours'}</Text>
                <Text style={styles.liveTask}>{formatModelLabel(liveModel || model)} · #{liveTaskId.slice(-8)}</Text>
                <GenerationTimeline status={liveStatus} hasTracks={liveTracks.length > 0} />
                {liveTracks.map((track) => <StudioTrackRow key={track.id} title={track.title} image={track.image} playing={player.current?._id === `ai-${track.id}`} onPlay={() => play(track)} />)}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.libraryList}>
            <View style={styles.searchShell}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput value={librarySearch} onChangeText={setLibrarySearch} placeholder="Rechercher dans mes projets..." placeholderTextColor={colors.textTertiary} style={styles.searchInput} />
              {librarySearch ? <Pressable accessibilityLabel="Effacer la recherche" onPress={() => setLibrarySearch('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></Pressable> : null}
            </View>
            <View style={styles.libraryControls}>
              <Pressable onPress={() => setFilterSheetOpen(true)} style={[styles.libraryControl, libraryFilter !== 'all' && styles.libraryControlActive]}>
                <Ionicons name="filter" size={15} color={libraryFilter !== 'all' ? colors.white : colors.text} />
                <Text numberOfLines={1} style={[styles.libraryControlText, libraryFilter !== 'all' && styles.libraryControlTextActive]}>{activeFilterLabel}</Text>
              </Pressable>
              <Pressable onPress={() => setSortSheetOpen(true)} style={styles.libraryControl}>
                <Ionicons name="swap-vertical" size={15} color={colors.text} />
                <Text numberOfLines={1} style={styles.libraryControlText}>{activeSortLabel}</Text>
              </Pressable>
              <Pressable accessibilityLabel="Réparer les pochettes" disabled={repairingMedia} onPress={() => void repairMedia()} style={styles.libraryControlIcon}>
                {repairingMedia ? <ActivityIndicator size="small" color={colors.violet} /> : <Ionicons name="images-outline" size={17} color={colors.violet} />}
              </Pressable>
            </View>
            {libraryFolders.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}><Pressable onPress={() => setLibraryFolder('')} style={[styles.folderFilter, !libraryFolder && styles.folderFilterActive]}><Ionicons name="folder-open-outline" size={14} color={!libraryFolder ? colors.paper : colors.textTertiary} /><Text style={[styles.folderFilterText, !libraryFolder && styles.folderFilterTextActive]}>Tous les dossiers</Text></Pressable>{libraryFolders.map((folder) => <Pressable key={folder} onPress={() => setLibraryFolder(folder)} style={[styles.folderFilter, libraryFolder === folder && styles.folderFilterActive]}><Ionicons name="folder-outline" size={14} color={libraryFolder === folder ? colors.paper : colors.textTertiary} /><Text style={[styles.folderFilterText, libraryFolder === folder && styles.folderFilterTextActive]}>{folder}</Text></Pressable>)}</ScrollView> : null}
            <View style={styles.libraryToolbar}><Text style={styles.libraryCount}>{visibleLibraryTracks.length} piste{visibleLibraryTracks.length > 1 ? 's' : ''}</Text>{libraryFolder ? <Text numberOfLines={1} style={styles.libraryFolderLabel}>{libraryFolder}</Text> : null}</View>
            {repairMessage ? <Text style={styles.repairMessage}>{repairMessage}</Text> : null}
            {pendingGenerations.map((generation) => <GenerationStatusRow key={generation.id} generation={generation} active={generation.task_id === liveTaskId} />)}
            {visibleLibraryTracks.length ? groupedLibraryTracks.map((group) => (
              <View key={group.key} style={styles.libraryGroup}>
                <Text style={styles.libraryGroupTitle}>{group.label}</Text>
                <View style={styles.libraryGroupRows}>
                  {group.items.map(({ generation, track }) => (
                    <StudioTrackRow
                      key={`${generation.id}-${track.id}`}
                      title={track.title || generation.metadata?.title || 'Création Synaura'}
                      subtitle={`${generation.model} · ${generation.metadata?.style || generation.prompt || 'Studio IA'}`}
                      image={track.image_url}
                      playing={player.current?._id === `ai-${track.id}`}
                      loading={libraryPlaybackPendingId === `ai-${track.id}`}
                      disabled={Boolean(libraryPlaybackPendingId)}
                      onPlay={() => playLibraryTrack(track)}
                      onOpen={() => setInspector({ generation, track })}
                    />
                  ))}
                </View>
              </View>
            )) : <View style={styles.empty}><Ionicons name="sparkles-outline" size={28} color="#C7B8FF" /><Text style={styles.emptyTitle}>Aucun projet ici.</Text><Text style={styles.emptyText}>Change le filtre ou lance une génération pour remplir cet espace.</Text></View>}
          </View>
        )}
      </ScrollView>
      {viewTab === 'create' && keyboardHeight === 0 ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.generateDock,
            {
              bottom: composerBottom,
              left: responsive.insets.left + Math.max(responsive.gutter, (responsive.safeWidth - responsive.contentMaxWidth) / 2 + responsive.gutter),
              right: responsive.insets.right + Math.max(responsive.gutter, (responsive.safeWidth - responsive.contentMaxWidth) / 2 + responsive.gutter),
            },
          ]}
        >
          <MotionPressable
            accessibilityLabel={mode === 'remix' ? 'Créer une variation' : 'Générer deux versions'}
            disabled={generating}
            onPress={generate}
            style={[styles.generateButton, !generationReady && styles.generateButtonWaiting]}
            scaleTo={0.985}
          >
            {generating ? <ActivityIndicator color={colors.paper} /> : <Ionicons name={mode === 'remix' ? 'repeat' : 'sparkles'} size={19} color={colors.paper} />}
            <View style={styles.generateCopy}>
              <Text style={styles.generateText}>{generating ? 'Lancement...' : mode === 'remix' ? 'Créer une variation' : 'Générer 2 versions'}</Text>
              <Text style={styles.generateHint}>{generationReady ? `${formatModelLabel(model)} · prêt à créer` : 'Complète les sections nécessaires'}</Text>
            </View>
            <Text style={styles.generateCost}>{GENERATION_COST} crédits</Text>
          </MotionPressable>
        </View>
      ) : null}
      {viewTab === tab ? <>
      <SelectionSheet
        visible={modelSheetOpen}
        title="Choisir le modèle"
        subtitle="Seuls les modèles réellement autorisés par ton offre peuvent être sélectionnés."
        value={model}
        options={modelOptions}
        onChange={(nextModel) => {
          setModelNotice('');
          setModel(nextModel);
        }}
        onDisabledPress={() => {
          setModelSheetOpen(false);
          closeComposer();
          navigation.navigate('Subscriptions');
        }}
        onClose={() => setModelSheetOpen(false)}
      />
      <StudioInspirationSheet
        visible={inspirationSheetOpen}
        presets={aiStudioPresets}
        events={city?.events || []}
        selectedEventId={selectedEventId}
        onPreset={applyPreset}
        onSelectEvent={(eventId) => {
          selectEvent(eventId);
          setInspirationSheetOpen(false);
        }}
        onClose={() => setInspirationSheetOpen(false)}
      />
      <SelectionSheet
        visible={filterSheetOpen}
        title="Filtrer mes projets"
        value={libraryFilter}
        options={LIBRARY_FILTER_OPTIONS}
        onChange={setLibraryFilter}
        onClose={() => setFilterSheetOpen(false)}
      />
      <SelectionSheet
        visible={sortSheetOpen}
        title="Trier mes projets"
        value={librarySort}
        options={LIBRARY_SORT_OPTIONS}
        onChange={setLibrarySort}
        onClose={() => setSortSheetOpen(false)}
      />
      <TrackInspector visible={Boolean(inspector)} item={inspector} onClose={() => setInspector(null)} onPlay={playLibraryTrack} onRefresh={() => loadStudio(true)} challengeId={challengeId} onCreatePost={(track) => {
        const playable = aiTrackToPlayer(track);
        setInspector(null);
        if (playable) navigation.navigate('CreatePost', { track: playable });
      }} onShare={(track) => {
        const playable = aiTrackToPlayer(track);
        setInspector(null);
        if (playable) setShareTrackTarget(playable);
      }} onReuse={reuseTrack} onRemix={remixTrack} onCopyLyrics={async (track) => {
        const text = track.lyrics || track.prompt || '';
        if (text) await Clipboard.setStringAsync(text);
      }} />
      <ShareSheet visible={Boolean(shareTrackTarget)} track={shareTrackTarget} onClose={() => setShareTrackTarget(null)} />
      <CreditShopModal visible={showCredits} balance={credits} onClose={() => setShowCredits(false)} onComplete={() => loadStudio(true)} />
      </> : null}
      </SynauraBackground>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.root}>
      {studioView('library')}
      {tab === 'create' ? (
        <Modal
          visible
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={closeComposer}
        >
          <View style={styles.drawerLayer}>
            <Pressable accessibilityLabel="Fermer la création" onPress={closeComposer} style={[styles.drawerPeek, { height: Math.max(insets.top + 10, 30) }]} />
            <View style={styles.drawerPanel}>
              <Pressable accessibilityLabel="Fermer la création" onPress={closeComposer} style={styles.drawerHandleButton}>
                <View style={styles.drawerHandle} />
              </Pressable>
              <View style={styles.drawerContent}>{studioView('create', true)}</View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function formatLibraryDateLabel(date: Date) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((todayStart - dateStart) / 86_400_000);
  if (dayDifference === 0) return "Aujourd'hui";
  if (dayDifference === 1) return 'Hier';
  const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function StudioSourceBar({
  audioSelected,
  voiceSelected,
  onAudio,
  onVoice,
  onInspiration,
}: {
  audioSelected: boolean;
  voiceSelected: boolean;
  onAudio: () => void;
  onVoice: () => void;
  onInspiration: () => void;
}) {
  const sources = [
    { key: 'audio', label: 'Audio', detail: audioSelected ? 'Ajouté' : 'Importer', icon: audioSelected ? 'checkmark-circle' : 'musical-note-outline', selected: audioSelected, onPress: onAudio },
    { key: 'voice', label: 'Voix', detail: voiceSelected ? 'Activée' : 'Régler', icon: 'mic-outline', selected: voiceSelected, onPress: onVoice },
    { key: 'inspiration', label: 'Inspiration', detail: 'Explorer', icon: 'sparkles-outline', selected: false, onPress: onInspiration },
  ] as const;
  return (
    <View style={styles.sourceBar}>
      {sources.map((source) => (
        <MotionPressable key={source.key} onPress={source.onPress} style={[styles.sourceAction, source.selected && styles.sourceActionSelected]} scaleTo={0.97}>
          <View style={styles.sourceActionTop}>
            <Ionicons name={source.icon} size={17} color={source.selected ? colors.violet : colors.text} />
            <Text numberOfLines={1} style={styles.sourceActionLabel}>{source.label}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.sourceActionDetail, source.selected && styles.sourceActionDetailSelected]}>{source.detail}</Text>
        </MotionPressable>
      ))}
    </View>
  );
}

function StudioInspirationSheet({
  visible,
  presets,
  events,
  selectedEventId,
  onPreset,
  onSelectEvent,
  onClose,
}: {
  visible: boolean;
  presets: MobileAIStudioPreset[];
  events: SynauraCityData['events'];
  selectedEventId: string | null;
  onPreset: (preset: MobileAIStudioPreset) => void;
  onSelectEvent: (eventId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} title="Trouver une direction" subtitle="Une inspiration remplit de vrais réglages que tu peux ensuite modifier." onClose={onClose} maxHeight="90%">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inspirationSheet}>
        <Text style={styles.sheetSectionLabel}>Directions préparées</Text>
        <View style={styles.inspirationList}>
          {presets.map((preset) => (
            <MotionPressable key={preset.id} onPress={() => onPreset(preset)} style={styles.inspirationPreset} scaleTo={0.985}>
              <View style={[styles.inspirationPresetIcon, { backgroundColor: `${preset.tint}1F` }]}>
                <Ionicons name={preset.icon as any} size={19} color={preset.tint} />
              </View>
              <View style={styles.inspirationPresetCopy}>
                <Text style={styles.inspirationPresetTitle}>{preset.label}</Text>
                <Text numberOfLines={2} style={styles.inspirationPresetText}>{preset.description}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={20} color={colors.textTertiary} />
            </MotionPressable>
          ))}
        </View>
        {events.length ? <EventChoice events={events} selectedId={selectedEventId} onSelect={onSelectEvent} /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

function AuthFeature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.authFeature}><Ionicons name={icon} size={15} color={colors.text} /><Text style={styles.authFeatureText}>{text}</Text></View>;
}

function Field({ label, value, onChangeText, placeholder, multiline, tall }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; tall?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textTertiary} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.inputMulti, tall && styles.inputTall]} /></View>;
}

function ChoiceRow({ label, values, value, suffix = '', onChange }: { label: string; values: string[]; value: string; suffix?: string; onChange: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.choices}>{values.map((item) => <Pressable key={item || 'auto'} onPress={() => onChange(item)} style={[styles.choice, value === item && styles.choiceActive]}><Text style={[styles.choiceText, value === item && styles.choiceTextActive]}>{item === '' ? 'Auto' : item === 'f' ? 'Femme' : item === 'm' ? 'Homme' : item}{suffix}</Text></Pressable>)}</View></View>;
}

function RemixDirectionPicker({
  value,
  onChange,
  promptVisibility,
  onPromptVisibilityChange,
}: {
  value: RemixType;
  onChange: (value: RemixType) => void;
  promptVisibility: RemixPromptVisibility;
  onPromptVisibilityChange: (value: RemixPromptVisibility) => void;
}) {
  return (
    <View style={styles.remixDirection}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>Type de remix</Text>
        <Text style={styles.tagCount}>credit auto</Text>
      </View>
      <View style={styles.remixTypeWrap}>
        {REMIX_TYPE_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <Pressable key={option.id} onPress={() => onChange(option.id)} style={[styles.remixTypeChip, active && styles.remixTypeChipActive]}>
              <Text style={[styles.remixTypeText, active && styles.remixTypeTextActive]}>{option.shortLabel}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.promptVisibility}>
        {(['private', 'public'] as const).map((item) => {
          const active = promptVisibility === item;
          return (
            <Pressable key={item} onPress={() => onPromptVisibilityChange(item)} style={[styles.promptVisibilityOption, active && styles.promptVisibilityOptionActive]}>
              <Text style={[styles.promptVisibilityText, active && styles.promptVisibilityTextActive]}>{item === 'private' ? 'Prompt prive' : 'Prompt public'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Meter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <View style={styles.field}><View style={styles.meterHead}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.meterValue}>{value}%</Text></View><View style={styles.choices}>{[25, 50, 75, 100].map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.meterStep, value >= item && styles.meterStepActive]} />)}</View></View>;
}

function StudioTrackRow({ title, subtitle, image, playing, loading = false, disabled = false, onPlay, onOpen }: { title: string; subtitle?: string; image?: string; playing: boolean; loading?: boolean; disabled?: boolean; onPlay: () => void; onOpen?: () => void }) {
  const preview: Track = { _id: `preview-${title}`, title, audioUrl: '', coverUrl: image, artist: { name: 'Synaura Studio' } };
  return <View style={styles.trackRow}><View style={styles.trackCover}><TrackCover track={preview} /></View><Pressable disabled={!onOpen} onPress={onOpen} style={{ flex: 1 }}><Text numberOfLines={1} style={styles.trackTitle}>{title}</Text><Text numberOfLines={1} style={styles.trackText}>{loading ? 'Chargement de la piste…' : subtitle || 'Prête à écouter'}</Text></Pressable>{onOpen ? <Pressable onPress={onOpen} style={styles.trackMore}><Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} /></Pressable> : null}<Pressable disabled={disabled} onPress={onPlay} style={[styles.trackPlay, playing && styles.trackPlayActive, disabled && !loading && styles.trackPlayDisabled]}>{loading ? <ActivityIndicator size="small" color={colors.paper} /> : <Ionicons name={playing ? 'pause' : 'play'} size={17} color={playing ? colors.text : colors.paper} />}</Pressable></View>;
}

function StatusOrb({ status }: { status: string }) {
  const normalized = String(status || 'idle').toUpperCase();
  const pending = !['IDLE', 'SUCCESS', 'ERROR'].includes(normalized);
  const label = normalized === 'SUCCESS' ? 'Ton son est prêt' : normalized === 'ERROR' ? 'Erreur de génération' : pending ? 'Génération en cours' : 'Studio prêt';
  return <View style={styles.orbRow}><View style={[styles.orb, pending && styles.orbPending, normalized === 'SUCCESS' && styles.orbSuccess]}><Ionicons name={normalized === 'SUCCESS' ? 'checkmark' : pending ? 'pulse' : 'sparkles'} size={18} color={colors.paper} /></View><View><Text style={styles.orbKicker}>État du Studio</Text><Text style={styles.orbText}>{label}</Text></View></View>;
}

function GenerationTimeline({ status, hasTracks }: { status: string; hasTracks: boolean }) {
  const success = String(status).toUpperCase() === 'SUCCESS';
  const first = hasTracks || String(status).toUpperCase() === 'FIRST_SUCCESS';
  const steps = [{ label: 'Prompt envoyé', done: true }, { label: 'Génération lancée', done: true }, { label: 'Premier résultat', done: first }, { label: 'Audio sauvegardé', done: success }, { label: 'Prêt à écouter', done: success }];
  return <View style={styles.timeline}>{steps.map((step, index) => <View key={step.label} style={styles.timelineStep}><View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>{step.done ? <Ionicons name="checkmark" size={10} color={colors.text} /> : null}</View><Text style={[styles.timelineText, step.done && styles.timelineTextDone]}>{step.label}</Text>{index < steps.length - 1 ? <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} /> : null}</View>)}</View>;
}

function GenerationStatusRow({ generation, active }: { generation: AIStudioGeneration; active: boolean }) {
  const title = String(generation.metadata?.title || generation.prompt || 'Création en cours');
  return (
    <View style={[styles.generationRow, active && styles.generationRowActive]}>
      <View style={styles.generationPulse}><ActivityIndicator color={colors.paper} size="small" /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.generationTitle}>{title}</Text>
        <Text style={styles.generationMeta}>{generation.model} · génération en cours</Text>
      </View>
      <Text style={styles.generationStatus}>{String(generation.status || 'pending').toUpperCase()}</Text>
    </View>
  );
}

function TrackInspector({ visible, item, onClose, onPlay, onCreatePost, onShare, onReuse, onRemix, onCopyLyrics, onRefresh, challengeId }: { visible: boolean; item: { generation: AIStudioGeneration; track: AIStudioTrack } | null; onClose: () => void; onPlay: (track: AIStudioTrack) => void; onCreatePost: (track: AIStudioTrack) => void; onShare: (track: AIStudioTrack) => void; onReuse: (generation: AIStudioGeneration, track: AIStudioTrack) => void; onRemix: (generation: AIStudioGeneration, track: AIStudioTrack) => void; onCopyLyrics: (track: AIStudioTrack) => Promise<void>; onRefresh: () => void; challengeId?: string }) {
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState('');
  const [timedWords, setTimedWords] = useState<Array<{ word?: string }>>([]);
  const [remixPermissions, setRemixPermissions] = useState<RemixPermissionsValue>(DEFAULT_REMIX_PERMISSIONS);

  useEffect(() => {
    setBusy('');
    setFeedback('');
    setTimedWords([]);
    const t = item?.track;
    setRemixPermissions({
      allowClips: Boolean(t?.allow_clips),
      allowAudioRemix: Boolean(t?.allow_audio_remix),
      allowAiVariation: Boolean(t?.allow_ai_variation),
      remixApprovalRequired: Boolean(t?.remix_approval_required),
      remixVisibility: t?.remix_visibility || 'disabled',
    });
  }, [item?.track.id, visible]);

  if (!item) return null;
  const audioUrl = item.track.audio_url || item.track.stream_audio_url || '';
  const audioId = String(item.track.suno_id || item.track.id);
  const taskId = String(item.generation.task_id || '');
  const clipUrl = item.track.music_video_url || item.track.cover_video_url || '';

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    setFeedback('');
    try {
      await action();
      setFeedback(success);
    } catch (actionError) {
      setFeedback(getSunoErrorMessage(actionError));
    } finally {
      setBusy('');
    }
  };
  const toggleFavorite = () => run('favorite', async () => { await setAITrackFavorite(item.track.id, !item.track.is_favorite); onRefresh(); }, item.track.is_favorite ? 'Retiré des favoris.' : 'Ajouté aux favoris.');
  const togglePublic = () => run('public', async () => {
    const nextPublic = !item.track.is_public;
    const result = await setAITrackPublic(item.track.id, nextPublic, remixPermissions);
    if (challengeId && nextPublic && result.isPublic && result.remixStatus === 'published') {
      participateInChallenge(challengeId, { contentType: 'variation', contentId: `ai-${item.track.id}` }).catch(() => {});
    }
    onRefresh();
  }, item.track.is_public ? 'Création repassée en privé.' : 'Création rendue publique.');
  const toggleTrash = () => run('trash', async () => { await setAIGenerationTrashed(item.generation.id, !item.generation.is_trashed); onClose(); onRefresh(); }, 'Bibliothèque mise à jour.');
  const chooseFolder = (folder: string) => run('folder', async () => { await setAITrackFolder(item.track.id, item.track.library_folder === folder ? '' : folder); onRefresh(); }, item.track.library_folder === folder ? 'Dossier retiré.' : `Ajouté à « ${folder} ».`);
  const loadTimedLyrics = () => run('lyrics', async () => {
    const result = await getTimestampedAILyrics(taskId, audioId);
    setTimedWords(result.alignedWords || []);
  }, 'Paroles synchronisées récupérées.');
  const createVideo = () => run('video', async () => {
    await generateAIMusicVideo(item.track.id, taskId, audioId);
    onRefresh();
  }, 'Clip lancé. Il apparaîtra dans ta bibliothèque dès qu’il sera prêt.');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.inspector}>
          <View style={styles.inspectorHead}>
            <View style={styles.inspectorCover}>
              <TrackCover source={item.track.image_url} videoSource={item.track.music_video_url || item.track.cover_video_url} posterSource={item.track.music_video_poster_url || item.track.cover_video_poster_url} style={{ flex: 1 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectorKicker}>Détails du projet</Text>
              <Text numberOfLines={2} style={styles.inspectorTitle}>{item.track.title}</Text>
              <Text style={styles.inspectorMeta}>{item.generation.model} · {Math.round(item.track.duration || 0)} sec</Text>
            </View>
            <Pressable onPress={onClose} style={styles.inspectorClose}><Ionicons name="close" size={21} color={colors.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inspectorActions}>
            <Text style={styles.inspectorPrompt}>{item.track.style || item.generation.metadata?.style || item.generation.prompt || 'Création Synaura Studio'}</Text>
            <Pressable onPress={() => onPlay(item.track)} style={styles.inspectorPrimary}><Ionicons name="play" size={17} color={colors.paper} /><Text style={styles.inspectorPrimaryText}>Écouter dans le player</Text></Pressable>
            <View style={styles.inspectorGrid}>
              <Pressable onPress={() => onReuse(item.generation, item.track)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="copy-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Réutiliser</Text></Pressable>
              <Pressable onPress={() => onRemix(item.generation, item.track)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="repeat" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Remixer</Text></Pressable>
            </View>
            <View style={styles.inspectorGrid}>
              <Pressable disabled={Boolean(busy)} onPress={toggleFavorite} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name={item.track.is_favorite ? 'heart' : 'heart-outline'} size={17} color={item.track.is_favorite ? '#FF4B7A' : colors.text} /><Text style={styles.inspectorActionText}>{item.track.is_favorite ? 'Aimé' : 'Aimer'}</Text></Pressable>
              <Pressable disabled={Boolean(busy)} onPress={togglePublic} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name={item.track.is_public ? 'earth' : 'lock-closed-outline'} size={17} color={colors.text} /><Text style={styles.inspectorActionText}>{item.track.is_public ? 'Public' : 'Privé'}</Text></Pressable>
            </View>
            <View style={styles.inspectorSection}>
              <RemixPermissionsSection value={remixPermissions} onChange={setRemixPermissions} />
            </View>
            <View style={styles.inspectorSection}>
              <Text style={styles.inspectorSectionTitle}>Dossier</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inspectorFolderRow}>
                {STUDIO_FOLDERS.map((folder) => <Pressable disabled={Boolean(busy)} key={folder} onPress={() => chooseFolder(folder)} style={[styles.inspectorFolder, item.track.library_folder === folder && styles.inspectorFolderActive]}><Ionicons name={item.track.library_folder === folder ? 'folder-open' : 'folder-outline'} size={14} color={item.track.library_folder === folder ? colors.paper : colors.textSecondary} /><Text style={[styles.inspectorFolderText, item.track.library_folder === folder && styles.inspectorFolderTextActive]}>{folder}</Text></Pressable>)}
              </ScrollView>
            </View>
            {item.track.lyrics || item.track.prompt ? <Pressable onPress={() => onCopyLyrics(item.track)} style={styles.inspectorAction}><Ionicons name="copy-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Copier les paroles</Text></Pressable> : null}
            <Pressable disabled={Boolean(busy) || !taskId || !audioId} onPress={loadTimedLyrics} style={styles.inspectorAction}>{busy === 'lyrics' ? <ActivityIndicator color={colors.violet} /> : <Ionicons name="mic-outline" size={17} color={colors.violet} />}<Text style={styles.inspectorActionText}>Paroles synchronisées</Text></Pressable>
            {timedWords.length ? <View style={styles.timedLyrics}><Text style={styles.timedLyricsTitle}>Aperçu synchronisé</Text><Text style={styles.timedLyricsText}>{timedWords.slice(0, 80).map((entry) => entry.word || '').join(' ')}</Text></View> : null}
            {clipUrl ? <Pressable onPress={() => Linking.openURL(clipUrl)} style={styles.inspectorAction}><Ionicons name="videocam" size={17} color={colors.coral} /><Text style={styles.inspectorActionText}>Ouvrir le clip</Text></Pressable> : <Pressable disabled={Boolean(busy) || !taskId || !audioId} onPress={createVideo} style={styles.inspectorAction}>{busy === 'video' ? <ActivityIndicator color={colors.coral} /> : <Ionicons name="videocam-outline" size={17} color={colors.coral} />}<Text style={styles.inspectorActionText}>Créer un clip · 100 crédits</Text></Pressable>}
            <Pressable onPress={() => onCreatePost(item.track)} style={styles.inspectorAction}><Ionicons name="create-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Créer un post</Text></Pressable>
            <View style={styles.inspectorGrid}>
              <Pressable onPress={() => onShare(item.track)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="share-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Partager</Text></Pressable>
              <Pressable onPress={() => audioUrl && Linking.openURL(audioUrl)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="download-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Télécharger</Text></Pressable>
            </View>
            {feedback ? <Text style={styles.inspectorFeedback}>{feedback}</Text> : null}
            <Pressable disabled={Boolean(busy)} onPress={toggleTrash} style={styles.inspectorDanger}><Ionicons name={item.generation.is_trashed ? 'refresh' : 'trash-outline'} size={17} color={colors.danger} /><Text style={styles.inspectorDangerText}>{item.generation.is_trashed ? 'Restaurer la création' : 'Mettre à la corbeille'}</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreditShopModal({ visible, balance, onClose, onComplete }: { visible: boolean; balance: number; onClose: () => void; onComplete: () => void }) {
  const [selected, setSelected] = useState<CreditPackId>('populaire');
  const [loadingPack, setLoadingPack] = useState<CreditPackId | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  const checkout = async () => {
    setLoadingPack(selected);
    setCheckoutError('');
    try {
      const result = await createCreditsCheckout(selected);
      await Linking.openURL(result.checkoutUrl);
    } catch (error) {
      setCheckoutError(getSunoErrorMessage(error));
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.creditShop}>
          <View style={styles.shopHead}>
            <View>
              <Text style={styles.shopKicker}>Crédits Studio</Text>
              <Text style={styles.shopTitle}>{balance} crédits disponibles</Text>
            </View>
            <Pressable onPress={onClose} style={styles.inspectorClose}><Ionicons name="close" size={21} color={colors.text} /></Pressable>
          </View>
          <Text style={styles.shopText}>Chaque lancement coûte 12 crédits et crée deux variations.</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.packList}>
            {CREDIT_PACKS.map((pack) => {
              const active = pack.id === selected;
              return (
                <Pressable key={pack.id} onPress={() => setSelected(pack.id)} style={[styles.pack, active && styles.packActive]}>
                  <View style={[styles.packCheck, active && styles.packCheckActive]}><Ionicons name={active ? 'checkmark' : 'sparkles-outline'} size={17} color={active ? colors.paper : colors.textTertiary} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.packNameRow}><Text style={styles.packName}>{pack.label}</Text>{pack.badge ? <Text style={styles.packBadge}>{pack.badge}</Text> : null}</View>
                    <Text style={styles.packMeta}>{pack.credits.toLocaleString('fr-FR')} crédits · environ {Math.floor(pack.credits / 12) * 2} variations</Text>
                  </View>
                  <Text style={styles.packPrice}>{pack.price}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {checkoutError ? <Text style={styles.shopError}>{checkoutError}</Text> : null}
          <Pressable disabled={Boolean(loadingPack)} onPress={checkout} style={styles.shopCheckout}>
            {loadingPack ? <ActivityIndicator color={colors.paper} /> : <Ionicons name="card-outline" size={18} color={colors.paper} />}
            <Text style={styles.shopCheckoutText}>{loadingPack ? 'Ouverture du paiement...' : 'Continuer vers le paiement'}</Text>
          </Pressable>
          <Pressable onPress={() => { onComplete(); onClose(); }} style={styles.shopRefresh}><Ionicons name="refresh" size={15} color={colors.text} /><Text style={styles.shopRefreshText}>J’ai terminé, actualiser mon solde</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  drawerLayer: { flex: 1, backgroundColor: 'rgba(17,17,17,0.18)' },
  drawerPeek: { width: '100%' },
  drawerPanel: { flex: 1, overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.background, borderTopWidth: 1, borderColor: 'rgba(17,17,17,0.13)' },
  drawerHandleButton: { height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  drawerHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(17,17,17,0.22)' },
  drawerContent: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9, paddingHorizontal: 11, height: 36, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  creditText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  studioHeading: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  studioHeadingCopy: { flex: 1, minWidth: 0 },
  quotaBadge: { minWidth: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  quotaValue: { color: colors.paper, fontSize: 16, fontWeight: '900' },
  quotaLabel: { marginTop: 2, color: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: '900' },
  kicker: { marginTop: 9, color: colors.coral, fontSize: 10, fontWeight: '900' },
  title: { color: colors.text, fontSize: 26, lineHeight: 30, fontWeight: '900' },
  titleCompact: { fontSize: 24, lineHeight: 28 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  composerToolbar: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeControl: { flex: 1 },
  modelButton: { height: 42, minWidth: 82, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  modelButtonText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  simpleComposer: { minHeight: 300, overflow: 'hidden', borderRadius: 8, padding: 16, backgroundColor: colors.black, borderWidth: 1, borderColor: 'rgba(115,87,198,0.38)' },
  simpleComposerHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  simpleComposerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  simpleComposerTitle: { flex: 1, color: colors.paper, fontSize: 14, fontWeight: '900' },
  simplePromptInput: { minHeight: 206, paddingTop: 18, paddingHorizontal: 2, color: colors.paper, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  simplePromptCount: { alignSelf: 'flex-end', color: 'rgba(247,246,243,0.42)', fontSize: 9, fontWeight: '800' },
  createCallout: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.black },
  createCalloutIcon: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  createCalloutCopy: { flex: 1, minWidth: 0 },
  createCalloutTitle: { color: colors.paper, fontSize: 15, fontWeight: '900' },
  createCalloutText: { marginTop: 4, color: 'rgba(247,246,243,0.6)', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  sourceBar: { minHeight: 68, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sourceAction: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 5, paddingHorizontal: 9, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
  sourceActionSelected: { backgroundColor: colors.violetSoft },
  sourceActionTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceActionLabel: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '900' },
  sourceActionDetail: { color: colors.textTertiary, fontSize: 8, fontWeight: '800' },
  sourceActionDetailSelected: { color: colors.violet },
  librarySummary: { minHeight: 58, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryStat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontSize: 15, fontWeight: '900' },
  summaryLabel: { marginTop: 3, color: colors.textTertiary, fontSize: 8, fontWeight: '800' },
  summaryDivider: { width: 1, height: 24, backgroundColor: colors.border },
  summaryCreate: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 10, backgroundColor: colors.black },
  orbRow: { minHeight: 64, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: 'rgba(255,250,242,0.84)', borderWidth: 1, borderColor: colors.border },
  orb: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral },
  orbPending: { backgroundColor: '#7C5CFF', shadowColor: '#7C5CFF', shadowOpacity: 0.5, shadowRadius: 12, elevation: 7 },
  orbSuccess: { backgroundColor: '#059669' },
  orbKicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  orbText: { marginTop: 3, color: colors.text, fontSize: 12, fontWeight: '900' },
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  input: { minHeight: 44, borderRadius: 10, paddingHorizontal: 12, color: colors.text, backgroundColor: '#F4F3F0', borderWidth: 1, borderColor: colors.border, fontSize: 13, fontWeight: '700' },
  inputMulti: { minHeight: 88, paddingTop: 12, paddingBottom: 12 },
  inputTall: { minHeight: 150 },
  remixPicker: { minHeight: 66, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(124,92,255,0.09)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(124,92,255,0.34)' },
  remixName: { marginTop: 4, color: colors.text, fontSize: 12, fontWeight: '900' },
  remixDirection: { borderRadius: 18, padding: 12, gap: 10, backgroundColor: 'rgba(115,87,198,0.08)', borderWidth: 1, borderColor: 'rgba(115,87,198,0.18)' },
  remixTypeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  remixTypeChip: { minHeight: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, backgroundColor: 'rgba(255,250,242,0.86)', borderWidth: 1, borderColor: colors.border },
  remixTypeChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  remixTypeText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  remixTypeTextActive: { color: colors.paper },
  promptVisibility: { flexDirection: 'row', borderRadius: 18, padding: 2, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  promptVisibilityOption: { flex: 1, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  promptVisibilityOptionActive: { backgroundColor: colors.black },
  promptVisibilityText: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  promptVisibilityTextActive: { color: colors.paper },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, padding: 12, backgroundColor: 'rgba(244,239,230,0.82)' },
  switchTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  switchText: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  magicButton: { minHeight: 34, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, backgroundColor: colors.violet },
  magicButtonText: { color: colors.paper, fontSize: 9, fontWeight: '900' },
  tagCount: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { minHeight: 32, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: 'rgba(244,239,230,0.82)', borderWidth: 1, borderColor: colors.border },
  tagActive: { backgroundColor: 'rgba(255,111,97,0.13)', borderColor: 'rgba(255,111,97,0.38)' },
  tagText: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  tagTextActive: { color: colors.coral },
  choices: { flexDirection: 'row', gap: 7 },
  choice: { flex: 1, minHeight: 38, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,239,230,0.82)' },
  choiceActive: { backgroundColor: colors.black },
  choiceText: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  choiceTextActive: { color: colors.paper },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between' },
  meterValue: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  meterStep: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(23,19,19,0.08)' },
  meterStepActive: { backgroundColor: colors.coral },
  sectionHint: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  inspirationButton: { minHeight: 58, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, backgroundColor: colors.violetSoft, borderWidth: 1, borderColor: 'rgba(115,87,198,0.16)' },
  inspirationTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  inspirationText: { marginTop: 3, color: colors.textSecondary, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  settingRow: { minHeight: 54, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  settingValue: { marginTop: 4, color: colors.text, fontSize: 13, fontWeight: '900' },
  generateDock: { position: 'absolute', zIndex: 28 },
  generateButton: { minHeight: 60, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: colors.violet, shadowColor: colors.black, shadowOpacity: 0.16, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
  generateButtonWaiting: { backgroundColor: '#4D4851' },
  generateCopy: { flex: 1, minWidth: 0 },
  generateText: { color: colors.paper, fontSize: 13, fontWeight: '900' },
  generateHint: { marginTop: 3, color: 'rgba(255,255,255,0.55)', fontSize: 8, fontWeight: '800' },
  generateCost: { color: 'rgba(255,250,242,0.68)', fontSize: 9, fontWeight: '900' },
  lockedSource: { borderRadius: 18, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: 'rgba(115,87,198,0.18)', padding: 12, gap: 12 },
  lockedSourceTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockedSourceCover: { width: 58, height: 58, borderRadius: 14, backgroundColor: 'rgba(17,17,17,0.08)' },
  lockedSourceTitle: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  lockedSourceText: { marginTop: 3, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  lockedSourceButton: { height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(115,87,198,0.10)' },
  lockedSourceButtonText: { color: colors.violet, fontSize: 12, fontWeight: '900' },
  modelNotice: { minHeight: 46, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: 'rgba(124,92,255,0.09)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.2)' },
  modelNoticeText: { flex: 1, color: colors.textSecondary, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  modelNoticeLink: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  livePanel: { borderRadius: 24, padding: 14, gap: 9, backgroundColor: 'rgba(124,92,255,0.10)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.24)' },
  liveTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveVisual: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 20, padding: 10, backgroundColor: 'rgba(255,249,239,0.7)' },
  liveVisualCopy: { flex: 1, minWidth: 0 },
  liveVisualKicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  liveWaveform: { height: 24, marginTop: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  liveKicker: { flex: 1, color: colors.violet, fontSize: 9, fontWeight: '900' },
  liveStatus: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  liveTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  liveTask: { color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  timeline: { gap: 0, marginVertical: 5 },
  timelineStep: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)', borderWidth: 1, borderColor: colors.border },
  timelineDotDone: { backgroundColor: '#C7B8FF', borderColor: '#C7B8FF' },
  timelineText: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  timelineTextDone: { color: colors.textSecondary },
  timelineLine: { position: 'absolute', left: 8, top: 21, width: 2, height: 12, backgroundColor: 'rgba(23,19,19,0.08)' },
  timelineLineDone: { backgroundColor: 'rgba(199,184,255,0.55)' },
  libraryList: { gap: 10 },
  searchShell: { height: 48, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minWidth: 0, height: 46, paddingHorizontal: 0, color: colors.text, fontSize: 12, fontWeight: '800' },
  libraryControls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  libraryControl: { flex: 1, minWidth: 0, height: 40, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  libraryControlActive: { backgroundColor: colors.black, borderColor: colors.black },
  libraryControlText: { flexShrink: 1, color: colors.text, fontSize: 9, fontWeight: '900' },
  libraryControlTextActive: { color: colors.white },
  libraryControlIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  folderRow: { flexDirection: 'row', gap: 7, paddingRight: 15 },
  folderFilter: { minHeight: 36, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, backgroundColor: 'rgba(255,250,242,0.78)', borderWidth: 1, borderColor: colors.border },
  folderFilterActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  folderFilterText: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  folderFilterTextActive: { color: colors.paper },
  libraryToolbar: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  libraryCount: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  libraryFolderLabel: { maxWidth: '50%', color: colors.violet, fontSize: 9, fontWeight: '900' },
  libraryGroup: { gap: 8, marginTop: 4 },
  libraryGroupTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  libraryGroupRows: { gap: 7 },
  repairMessage: { color: colors.textSecondary, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  generationRow: { minHeight: 72, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: 'rgba(124,92,255,0.09)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.22)' },
  generationRowActive: { borderColor: 'rgba(255,111,97,0.5)', backgroundColor: 'rgba(255,111,97,0.09)' },
  generationPulse: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  generationTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  generationMeta: { marginTop: 4, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  generationStatus: { color: colors.violet, fontSize: 8, fontWeight: '900' },
  trackRow: { minHeight: 68, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  trackCover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(17,17,17,0.06)' },
  trackTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  trackText: { marginTop: 4, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  trackPlay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  trackPlayActive: { backgroundColor: colors.paper },
  trackPlayDisabled: { opacity: 0.38 },
  trackMore: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.05)' },
  error: { overflow: 'hidden', borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(217,45,32,0.09)', borderWidth: 1, borderColor: 'rgba(217,45,32,0.16)' },
  errorText: { flex: 1, color: colors.danger, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  empty: { alignItems: 'center', borderRadius: 24, padding: 28, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { marginTop: 12, color: colors.text, fontSize: 17, fontWeight: '900' },
  emptyText: { marginTop: 5, color: colors.textTertiary, textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  authGate: { flexGrow: 1, paddingHorizontal: 16, gap: 18 },
  authTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  authKicker: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  authPageTitle: { marginTop: 4, maxWidth: 250, color: colors.text, fontSize: 24, lineHeight: 27, fontWeight: '900' },
  authIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  authPreview: { overflow: 'hidden', borderRadius: 16, backgroundColor: colors.black, padding: 16 },
  authPreviewOrb: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  authPreviewTitle: { marginTop: 20, color: colors.paper, fontSize: 23, lineHeight: 26, fontWeight: '900' },
  authPreviewText: { marginTop: 7, color: 'rgba(255,255,255,0.58)', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  authFeatures: { marginTop: 18, gap: 8 },
  authFeature: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.88)', paddingHorizontal: 11 },
  authFeatureText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  authTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  authText: { marginTop: 5, color: colors.textSecondary, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  authButton: { marginTop: 13, height: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, backgroundColor: colors.black },
  authButtonText: { color: colors.paper, fontSize: 13, fontWeight: '900' },
  inspirationSheet: { gap: 14, padding: 14, paddingBottom: 28 },
  sheetSectionLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  inspirationList: { gap: 3 },
  inspirationPreset: { minHeight: 68, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, paddingVertical: 8 },
  inspirationPresetIcon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  inspirationPresetCopy: { flex: 1, minWidth: 0 },
  inspirationPresetTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  inspirationPresetText: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,6,8,0.72)' },
  inspector: { alignSelf: 'center', width: '100%', maxWidth: 640, maxHeight: '92%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: 24, backgroundColor: colors.paper },
  inspectorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inspectorCover: { width: 62, height: 62, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  inspectorKicker: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  inspectorTitle: { marginTop: 4, color: colors.text, fontSize: 22, fontWeight: '900' },
  inspectorClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  inspectorMeta: { marginTop: 10, color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  inspectorPrompt: { marginTop: 12, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  inspectorActions: { marginTop: 18, gap: 8 },
  inspectorSection: { gap: 8, borderRadius: 19, padding: 11, backgroundColor: 'rgba(23,19,19,0.035)' },
  inspectorSectionTitle: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  inspectorFolderRow: { flexDirection: 'row', gap: 7, paddingRight: 8 },
  inspectorFolder: { minHeight: 35, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  inspectorFolderActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  inspectorFolderText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  inspectorFolderTextActive: { color: colors.paper },
  timedLyrics: { borderRadius: 18, padding: 12, backgroundColor: 'rgba(124,92,255,0.08)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.18)' },
  timedLyricsTitle: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  timedLyricsText: { marginTop: 7, color: colors.textSecondary, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  inspectorFeedback: { color: colors.violet, fontSize: 10, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  inspectorPrimary: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black },
  inspectorPrimaryText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  inspectorGrid: { flexDirection: 'row', gap: 8 },
  inspectorHalf: { flex: 1 },
  inspectorAction: { height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(23,19,19,0.06)' },
  inspectorActionText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  inspectorDanger: { height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(217,45,32,0.07)' },
  inspectorDangerText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  creditShop: { alignSelf: 'center', width: '100%', maxWidth: 640, maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: 28, backgroundColor: colors.paper },
  shopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  shopKicker: { color: colors.coral, fontSize: 9, fontWeight: '900' },
  shopTitle: { marginTop: 5, color: colors.text, fontSize: 22, fontWeight: '900' },
  shopText: { marginTop: 9, color: colors.textSecondary, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  packList: { gap: 8, paddingVertical: 16 },
  pack: { minHeight: 76, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: 'rgba(244,239,230,0.8)', borderWidth: 1, borderColor: colors.border },
  packActive: { backgroundColor: 'rgba(255,111,97,0.09)', borderColor: 'rgba(255,111,97,0.42)' },
  packCheck: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.05)' },
  packCheckActive: { backgroundColor: colors.coral },
  packNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  packName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  packBadge: { color: colors.violet, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  packMeta: { marginTop: 4, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  packPrice: { color: colors.text, fontSize: 13, fontWeight: '900' },
  shopError: { marginBottom: 10, color: colors.danger, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  shopCheckout: { minHeight: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.black },
  shopCheckoutText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  shopRefresh: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  shopRefreshText: { color: colors.text, fontSize: 10, fontWeight: '900' },
});
