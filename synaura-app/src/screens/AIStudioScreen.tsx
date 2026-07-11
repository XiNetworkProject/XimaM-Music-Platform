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
  Share,
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
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { EventChoice, EventTicker } from '@/components/events/SynauraEvents';
import { TrackCover } from '@/components/TrackCover';
import { RemixPermissionsSection, DEFAULT_REMIX_PERMISSIONS, type RemixPermissionsValue } from '@/components/upload/RemixPermissionsSection';
import { aiStudioPresets, type MobileAIStudioPreset } from '@/constants/aiStudioPresets';
import { buildRemixPrompt, DEFAULT_REMIX_PROMPT_VISIBILITY, DEFAULT_REMIX_TYPE, REMIX_TYPE_OPTIONS, type RemixPromptVisibility, type RemixType } from '@/constants/remixOptions';
import { usePlayer } from '@/player/PlayerProvider';
import { colors } from '@/theme/tokens';
import { getSunoErrorMessage } from '@/utils/getSunoErrorMessage';
import type { SynauraCityData, Track } from '@/api/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Reveal } from '@/components/motion/Motion';

type StudioTab = 'create' | 'library';
type StudioMode = 'simple' | 'custom' | 'remix';
const MODELS = ['V5_5', 'V5', 'V4_5PLUS', 'V4_5'];
const DURATIONS = [60, 120, 180];
const PREF_KEY = 'synaura.ai-studio.preferences';
const ACTIVE_TASK_KEY = 'synaura.ai-studio.active-task';
const MEDIA_REPAIR_KEY = 'synaura.ai-studio.media-repair.v2';
const MEDIA_REPAIR_INTERVAL = 12 * 60 * 60 * 1000;
const GENERATION_COST = 12;
const STUDIO_TAGS = ['Pop', 'Rap FR', 'Electronic', 'Club', 'CinÃ©matique', 'MÃ©lancolique', 'Ã‰pique', 'Viral', 'Acoustique', 'Nocturne', 'Ã‰nergique', 'Synaura'];
const STUDIO_FOLDERS = ['Favoris', 'Ã€ finir', 'Ã€ publier', 'Remix'];
const CREDIT_PACKS: Array<{ id: CreditPackId; label: string; credits: number; price: string; badge?: string }> = [
  { id: 'petit', label: 'Petit', credits: 120, price: '1,99 â‚¬' },
  { id: 'moyen', label: 'Moyen', credits: 500, price: '6,99 â‚¬' },
  { id: 'populaire', label: 'Populaire', credits: 1200, price: '14,99 â‚¬', badge: 'POPULAIRE' },
  { id: 'best_value', label: 'Best Value', credits: 3000, price: '29,99 â‚¬', badge: 'MEILLEURE VALEUR' },
];

function aiTrackToPlayer(track: AIStatusTrack | NonNullable<AIStudioGeneration['tracks']>[number]): Track | null {
  const raw = track as any;
  const audioUrl = raw.audio_url || raw.stream_audio_url || raw.audio || raw.stream;
  if (!audioUrl) return null;
  const id = String(track.id || ('suno_id' in track ? track.suno_id : '') || `ai-${Date.now()}`);
  const image = raw.image_url || raw.image;
  return {
    _id: `ai-${id}`,
    title: track.title || 'CrÃ©ation Synaura',
    audioUrl,
    coverUrl: image || undefined,
    duration: Number(track.duration || 0),
    artist: { name: 'Synaura Studio', artistName: 'Synaura Studio' },
    genre: ['AI Studio'],
    isAI: true,
  };
}

export function AIStudioScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
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
  const [showCredits, setShowCredits] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [negativeTags, setNegativeTags] = useState('');
  const [vocalGender, setVocalGender] = useState<'' | 'f' | 'm'>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [repairingMedia, setRepairingMedia] = useState(false);
  const [repairMessage, setRepairMessage] = useState('');
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const challengeId: string = route.params?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

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
    setDescription((current) => current.trim() ? current : `CrÃ©er pour ${event.title}: ${event.description}`);
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
      if (!silent) setRepairMessage(result.updatedTracks ? `${result.updatedTracks} mÃ©dia(s) rÃ©parÃ©(s).` : 'Toutes les pochettes sont Ã  jour.');
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
  };

  const pickRemix = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      setRemixAsset(result.assets[0]);
      setRemixSource(null);
    }
  };

  const createLyrics = async () => {
    const prompt = [title, description, style].filter(Boolean).join('. ').trim();
    if (!prompt) {
      setError('Ajoute une idÃ©e ou un style avant de gÃ©nÃ©rer les paroles.');
      return;
    }
    setLyricsLoading(true);
    setError('');
    try {
      const result = await generateAILyrics(prompt);
      if (result.best) setLyrics(result.best);
      else setError('Les paroles sont encore en prÃ©paration. RÃ©essaie dans un instant.');
    } catch (lyricsError) {
      setError(getSunoErrorMessage(lyricsError));
    } finally {
      setLyricsLoading(false);
    }
  };

  const generate = async () => {
    if (!auth.requireAuth()) {
      navigation.getParent()?.navigate('Login', {
        message: 'Connecte-toi pour crÃ©er avec le Studio IA.',
        ...(remixReturnTo ? { returnTo: remixReturnTo } : null),
      });
      return;
    }
    if (!description.trim() && mode === 'simple') {
      setError('DÃ©cris le morceau que tu veux crÃ©er.');
      return;
    }
    if (mode !== 'simple' && !style.trim()) {
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
        ? `${description.trim()}. ${tagPrompt}. DurÃ©e cible ${duration} secondes.`
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
        setModelNotice(`${String(result.requestedModel || model).replace('_', '.')} n'est pas inclus dans ton plan. La gÃ©nÃ©ration utilise rÃ©ellement ${result.model.replace('_', '.')}.`);
        setModel(result.model);
      } else {
        setModelNotice(`GÃ©nÃ©ration lancÃ©e avec ${result.model.replace('_', '.')}.`);
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

  const currentTitle = mode === 'remix' ? 'Remixe un son existant.' : mode === 'custom' ? 'Dirige chaque dÃ©tail.' : 'DÃ©cris. Synaura compose.';
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
        metadata: { title: title || description || 'CrÃ©ation en cours', style, instrumental },
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

  const playLibraryTrack = (selected: AIStudioTrack) => {
    const queue = visibleLibraryTracks
      .map(({ track }) => aiTrackToPlayer(track))
      .filter((track): track is Track => Boolean(track));
    const selectedId = aiTrackToPlayer(selected)?._id;
    const index = selectedId ? queue.findIndex((track) => track._id === selectedId) : -1;
    if (index < 0) return;
    if (player.current?._id === selectedId) void player.togglePlayPause();
    else void player.setQueueAndPlay(queue, index);
  };

  const switchTab = (next: StudioTab) => {
    setTab(next);
    if (next === 'library') void loadStudio(true);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
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
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const remixTrack = (generation: AIStudioGeneration, track: AIStudioTrack) => {
    setMode('remix');
    setRemixAsset(null);
    setRemixSource(track);
    setTitle(`${track.title || String(generation.metadata?.title || 'CrÃ©ation')} remix`);
    setDescription(track.prompt || generation.prompt || '');
    setStyle(track.style || String(generation.metadata?.style || ''));
    setTab('create');
    setInspector(null);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  if (!auth.user) {
    return (
      <View style={styles.root}>
        <SynauraBackground variant="warm">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.authGate, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 92 }]}>
          <View style={styles.authTop}>
            <View>
              <Text style={styles.authKicker}>STUDIO SYNAURA</Text>
              <Text style={styles.authPageTitle}>CrÃ©e sans casser ton Ã©lan.</Text>
            </View>
            <View style={styles.authIcon}><Ionicons name="sparkles" size={24} color={colors.paper} /></View>
          </View>
          <View style={styles.authPreview}>
            <View style={styles.authPreviewOrb}><Ionicons name="musical-notes" size={28} color={colors.paper} /></View>
            <Text style={styles.authPreviewTitle}>Une idÃ©e devient un morceau.</Text>
            <Text style={styles.authPreviewText}>Prompt, vibe, voix et durÃ©e dans un parcours simple pensÃ© pour mobile.</Text>
            <View style={styles.authFeatures}>
              <AuthFeature icon="flash-outline" text="GÃ©nÃ©rations et presets" />
              <AuthFeature icon="library-outline" text="BibliothÃ¨que synchronisÃ©e" />
              <AuthFeature icon="cloud-upload-outline" text="Publication directe" />
            </View>
          </View>
          <View>
            <Text style={styles.authTitle}>Retrouve ton Studio</Text>
            <Text style={styles.authText}>Connecte-toi pour accÃ©der Ã  tes crÃ©dits, tes crÃ©ations et ton historique.</Text>
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

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground variant="warm">
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStudio(true)} tintColor={colors.violet} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + (player.current ? 205 : 125) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
          <Pressable onPress={() => setShowCredits(true)} style={styles.creditPill}><Ionicons name="sparkles" size={14} color={colors.coral} /><Text style={styles.creditText}>{credits} crÃ©dits</Text><Ionicons name="add-circle" size={16} color={colors.text} /></Pressable>
          <MobileAccountButton compact />
        </View>
        <Text style={styles.kicker}>{tab === 'create' ? 'SYNAURA AI STUDIO' : 'BIBLIOTHÃˆQUE IA'}</Text>
        <Text style={[styles.title, tab === 'library' && styles.titleCompact]}>{tab === 'create' ? currentTitle : 'Tes crÃ©ations'}</Text>
        <Text style={styles.subtitle}>{quota ? `${quota.plan_type.toUpperCase()} Â· ${quota.used_this_month}/${quota.monthly_limit} gÃ©nÃ©rations ce mois` : 'GÃ©nÃ©ration et bibliothÃ¨que synchronisÃ©es avec le web.'}</Text>

        {tab === 'create' ? (
          <CreateArrivalBanner
            context={challengeId ? 'challenge' : (synauraRemixSource ? 'variation' : 'ai')}
            title={challengeId ? challengeTitle : synauraRemixSource?.title}
          />
        ) : null}

        <SegmentedControl
          value={tab}
          options={[
            { value: 'create', label: 'Créer', icon: 'sparkles-outline' },
            { value: 'library', label: `Bibliothèque ${libraryTracks.length}`, icon: 'library-outline' },
          ]}
          onChange={switchTab}
        />

        <EventTicker city={city} onPress={() => navigation.navigate('City')} tone="violet" text="CrÃ©e pour le challenge actuel Â· transforme une idÃ©e Studio en moment Synaura Live" />

        <Reveal distance={7} style={styles.studioConsole}>
          <View style={styles.consoleBrand}><View style={styles.consoleDot} /><Text style={styles.consoleBrandText}>STUDIO CONNECTÃ‰</Text></View>
          <View style={styles.consoleMetrics}>
            <View><Text style={styles.consoleValue}>{model.replace('_', '.')}</Text><Text style={styles.consoleLabel}>MODÃˆLE</Text></View>
            <View><Text style={styles.consoleValue}>{mode.toUpperCase()}</Text><Text style={styles.consoleLabel}>MODE</Text></View>
            <View><Text style={styles.consoleValue}>{credits}</Text><Text style={styles.consoleLabel}>CRÃ‰DITS</Text></View>
          </View>
        </Reveal>

        {tab === 'library' ? (
          <View style={styles.librarySummary}>
            <View style={styles.summaryStat}><Text style={styles.summaryValue}>{libraryTracks.length}</Text><Text style={styles.summaryLabel}>PISTES</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}><Text style={styles.summaryValue}>{pendingGenerations.length}</Text><Text style={styles.summaryLabel}>EN COURS</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}><Text style={styles.summaryValue}>{credits}</Text><Text style={styles.summaryLabel}>CRÃ‰DITS</Text></View>
            <Pressable onPress={() => switchTab('create')} style={styles.summaryCreate}><Ionicons name="add" size={20} color={colors.paper} /></Pressable>
          </View>
        ) : null}

        {liveTaskId ? <StatusOrb status={liveStatus} /> : null}

        {error ? <Pressable onPress={() => loadStudio(true)} style={styles.error}><Ionicons name="refresh" size={17} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></Pressable> : null}
        {loading ? <ActivityIndicator color={colors.violet} style={{ marginTop: 30 }} /> : null}

        {tab === 'create' ? (
          <>
            <EventChoice events={city?.events || []} selectedId={selectedEventId} onSelect={selectEvent} />
            <Text style={styles.blockEyebrow}>1 · Idee musicale</Text>
            <SegmentedControl
              value={mode}
              compact
              options={[
                { value: 'simple', label: 'Simple', icon: 'flash-outline' },
                { value: 'custom', label: 'Sur mesure', icon: 'options-outline' },
                { value: 'remix', label: 'Remix', icon: 'repeat-outline' },
              ]}
              onChange={setMode}
            />

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>INTENTIONS PRÃŠTES</Text>
                <Text style={styles.panelCount}>{aiStudioPresets.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {aiStudioPresets.map((preset) => (
                  <Pressable key={preset.id} onPress={() => applyPreset(preset)} style={styles.preset}>
                    <View style={[styles.presetIcon, { backgroundColor: `${preset.tint}28` }]}><Ionicons name={preset.icon as any} size={19} color={preset.tint} /></View>
                    <Text style={styles.presetTitle}>{preset.label}</Text>
                    <Text style={styles.presetText}>{preset.description}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.panel}>
              {synauraRemixSource ? (
                <View style={styles.lockedSource}>
                  <View style={styles.lockedSourceTop}>
                    {synauraRemixSource.coverUrl ? <TrackCover track={{ _id: synauraRemixSource.sourceTrackId, title: synauraRemixSource.title, audioUrl: '', coverUrl: synauraRemixSource.coverUrl }} style={styles.lockedSourceCover} /> : <View style={styles.lockedSourceCover} />}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={2} style={styles.lockedSourceTitle}>Inspiré de {synauraRemixSource.title} — par @{synauraRemixSource.artistUsername || synauraRemixSource.artist}</Text>
                      <Text style={styles.lockedSourceText}>Le créateur original sera toujours crédité</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => navigation.navigate('TrackDetail', { trackId: synauraRemixSource.sourceTrackType === 'ai_track' ? `ai-${synauraRemixSource.sourceTrackId}` : synauraRemixSource.sourceTrackId })} style={styles.lockedSourceButton}>
                    <Ionicons name="open-outline" size={15} color={colors.violet} />
                    <Text style={styles.lockedSourceButtonText}>Voir le morceau original</Text>
                  </Pressable>
                </View>
              ) : null}
              {mode === 'remix' ? (
                <Pressable onPress={pickRemix} style={styles.remixPicker}>
                  <Ionicons name={remixAsset || remixSource ? 'checkmark-circle' : 'musical-notes-outline'} size={25} color={remixAsset || remixSource ? '#6EE7B7' : '#C7B8FF'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>SOURCE AUDIO</Text>
                    <Text numberOfLines={1} style={styles.remixName}>{remixAsset?.name || remixSource?.title || 'Choisir un fichier Ã  transformer'}</Text>
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
              {mode !== 'simple' ? <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Nom de la crÃ©ation" /> : null}
              <Field label={mode === 'simple' ? 'DÃ©cris ton morceau' : mode === 'remix' ? 'Variation souhaitee' : 'Direction crÃ©ative'} value={description} onChangeText={setDescription} placeholder={mode === 'remix' ? 'Ex: plus rapide, plus triste, acoustique, garder les paroles...' : 'Ambiance, histoire, Ã©nergie, structure...'} multiline />
              {mode !== 'simple' ? <Field label="Style musical" value={style} onChangeText={setStyle} placeholder="Genres, voix, production, instruments..." multiline /> : null}
              <View style={styles.field}>
                <View style={styles.fieldHead}><Text style={styles.fieldLabel}>COULEURS MUSICALES</Text><Text style={styles.tagCount}>{selectedTags.length} sÃ©lection</Text></View>
                <View style={styles.tagWrap}>
                  {STUDIO_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return <Pressable key={tag} onPress={() => setSelectedTags((current) => active ? current.filter((item) => item !== tag) : [...current, tag])} style={[styles.tag, active && styles.tagActive]}><Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text></Pressable>;
                  })}
                </View>
              </View>
              {mode !== 'simple' && !instrumental ? (
                <>
                  <View style={styles.fieldHead}>
                    <Text style={styles.fieldLabel}>PAROLES</Text>
                    <Pressable disabled={lyricsLoading} onPress={createLyrics} style={styles.magicButton}>
                      {lyricsLoading ? <ActivityIndicator color={colors.paper} size="small" /> : <Ionicons name="sparkles" size={14} color={colors.paper} />}
                      <Text style={styles.magicButtonText}>Ã‰crire avec lâ€™IA</Text>
                    </Pressable>
                  </View>
                  <TextInput value={lyrics} onChangeText={setLyrics} placeholder="Ã‰cris ou colle les paroles..." placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" style={[styles.input, styles.inputMulti, styles.inputTall]} />
                </>
              ) : null}
              <View style={styles.switchRow}>
                <View><Text style={styles.switchTitle}>Instrumental</Text><Text style={styles.switchText}>GÃ©nÃ¨re sans voix ni paroles</Text></View>
                <Switch value={instrumental} onValueChange={setInstrumental} trackColor={{ false: '#3A3335', true: '#7C5CFF' }} thumbColor={colors.paper} />
              </View>
            </View>

            <Text style={styles.blockEyebrowInfo}>2 · Reglages</Text>
            <Pressable onPress={() => setAdvancedOpen((current) => !current)} style={styles.advancedSummary}>
              <View style={styles.advancedIcon}><Ionicons name="options-outline" size={18} color={colors.paper} /></View>
              <View style={{ flex: 1 }}><Text style={styles.advancedTitle}>RÃ©glages de gÃ©nÃ©ration</Text><Text style={styles.advancedText}>{model.replace('_', '.')} Â· {duration} sec Â· {instrumental ? 'instrumental' : 'avec voix possible'}</Text></View>
              <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </Pressable>
            {advancedOpen ? (
              <View style={styles.panel}>
                <ModelChoiceRow
                  available={quota?.availableModels || ['V4_5']}
                  value={model}
                  onChange={(nextModel) => {
                    setModelNotice('');
                    setModel(nextModel);
                  }}
                  onUpgrade={() => navigation.navigate('Subscriptions')}
                />
                <ChoiceRow label="DurÃ©e cible" values={DURATIONS.map(String)} value={String(duration)} suffix=" sec" onChange={(value) => setDuration(Number(value))} />
                {mode !== 'simple' ? (
                  <>
                    <ChoiceRow label="Voix" values={['', 'f', 'm']} value={vocalGender} onChange={(value) => setVocalGender(value as '' | 'f' | 'm')} />
                    <Field label="Ã€ Ã©viter" value={negativeTags} onChangeText={setNegativeTags} placeholder="Ex: autotune, guitare, voix grave..." />
                    <Meter label="Influence du style" value={styleInfluence} onChange={setStyleInfluence} />
                    <Meter label="CrÃ©ativitÃ©" value={weirdness} onChange={setWeirdness} />
                    <Meter label="Poids audio" value={audioWeight} onChange={setAudioWeight} />
                  </>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.blockEyebrow}>3 · Publication</Text>
            <Pressable disabled={generating} onPress={generate} style={[styles.generateButton, generating && { opacity: 0.55 }]}>
              {generating ? <ActivityIndicator color={colors.paper} /> : <Ionicons name={mode === 'remix' ? 'repeat' : 'sparkles'} size={20} color={colors.paper} />}
              <Text style={styles.generateText}>{generating ? 'Lancement...' : mode === 'remix' ? 'Creer une variation' : 'Generer 2 versions'}</Text>
              <Text style={styles.generateCost}>{GENERATION_COST} crÃ©dits</Text>
            </Pressable>
            <Pressable onPress={() => setShowCredits(true)} style={styles.buyButton}><Ionicons name="sparkles-outline" size={16} color={colors.violet} /><Text style={styles.buyText}>Acheter des crÃ©dits</Text><Ionicons name="arrow-forward" size={16} color={colors.violet} /></Pressable>
            {modelNotice ? (
              <View style={styles.modelNotice}>
                <Ionicons name="information-circle-outline" size={17} color={colors.violet} />
                <Text style={styles.modelNoticeText}>{modelNotice}</Text>
                {quota?.plan_type !== 'pro' ? <Pressable onPress={() => navigation.navigate('Subscriptions')}><Text style={styles.modelNoticeLink}>Voir Pro</Text></Pressable> : null}
              </View>
            ) : null}

            {liveTaskId ? (
              <View style={styles.livePanel}>
                <View style={styles.liveTop}><View style={styles.liveDot} /><Text style={styles.liveKicker}>GÃ‰NÃ‰RATION LIVE</Text><Text style={styles.liveStatus}>{liveStatus || 'pending'}</Text></View>
                <View style={styles.liveVisual}>
                  <MobileAnimatedLogo loading size={52} />
                  <View style={styles.liveVisualCopy}>
                    <Text style={styles.liveVisualKicker}>COMPOSITION EN COURS</Text>
                    <MobileWaveform active style={styles.liveWaveform} />
                  </View>
                </View>
                <Text style={styles.liveTitle}>{title || description || 'CrÃ©ation en cours'}</Text>
                <Text style={styles.liveTask}>{(liveModel || model).replace('_', '.')} Â· #{liveTaskId.slice(-8)}</Text>
                <GenerationTimeline status={liveStatus} hasTracks={liveTracks.length > 0} />
                {liveTracks.map((track) => <StudioTrackRow key={track.id} title={track.title} image={track.image} playing={player.current?._id === `ai-${track.id}`} onPlay={() => play(track)} />)}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.libraryList}>
            <TextInput value={librarySearch} onChangeText={setLibrarySearch} placeholder="Rechercher titre, style ou prompt..." placeholderTextColor={colors.textTertiary} style={styles.searchInput} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{(['all', 'instrumental', 'lyrics', 'liked', 'trashed'] as const).map((filter) => <Pressable key={filter} onPress={() => setLibraryFilter(filter)} style={[styles.filter, libraryFilter === filter && styles.filterActive]}><Text style={[styles.filterText, libraryFilter === filter && styles.filterTextActive]}>{filter === 'all' ? 'Tout' : filter === 'instrumental' ? 'Instrumental' : filter === 'lyrics' ? 'Avec paroles' : filter === 'liked' ? 'AimÃ©s' : 'Corbeille'}</Text></Pressable>)}</ScrollView>
            {libraryFolders.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}><Pressable onPress={() => setLibraryFolder('')} style={[styles.folderFilter, !libraryFolder && styles.folderFilterActive]}><Ionicons name="folder-open-outline" size={14} color={!libraryFolder ? colors.paper : colors.textTertiary} /><Text style={[styles.folderFilterText, !libraryFolder && styles.folderFilterTextActive]}>Tous les dossiers</Text></Pressable>{libraryFolders.map((folder) => <Pressable key={folder} onPress={() => setLibraryFolder(folder)} style={[styles.folderFilter, libraryFolder === folder && styles.folderFilterActive]}><Ionicons name="folder-outline" size={14} color={libraryFolder === folder ? colors.paper : colors.textTertiary} /><Text style={[styles.folderFilterText, libraryFolder === folder && styles.folderFilterTextActive]}>{folder}</Text></Pressable>)}</ScrollView> : null}
            <View style={styles.libraryToolbar}><Text style={styles.libraryCount}>{visibleLibraryTracks.length} piste{visibleLibraryTracks.length > 1 ? 's' : ''}</Text><View style={styles.toolbarActions}><Pressable disabled={repairingMedia} onPress={() => void repairMedia()} style={styles.sortButton}>{repairingMedia ? <ActivityIndicator size="small" color={colors.violet} /> : <Ionicons name="images-outline" size={15} color={colors.violet} />}<Text style={[styles.sortText, { color: colors.violet }]}>RÃ©parer</Text></Pressable><Pressable onPress={() => setLibrarySort((current) => current === 'newest' ? 'oldest' : current === 'oldest' ? 'title' : 'newest')} style={styles.sortButton}><Ionicons name="swap-vertical" size={15} color={colors.text} /><Text style={styles.sortText}>{librarySort === 'newest' ? 'RÃ©centes' : librarySort === 'oldest' ? 'Anciennes' : 'Titre'}</Text></Pressable></View></View>
            {repairMessage ? <Text style={styles.repairMessage}>{repairMessage}</Text> : null}
            {pendingGenerations.map((generation) => <GenerationStatusRow key={generation.id} generation={generation} active={generation.task_id === liveTaskId} />)}
            {visibleLibraryTracks.length ? visibleLibraryTracks.map(({ generation, track }) => (
              <StudioTrackRow
                key={`${generation.id}-${track.id}`}
                title={track.title || generation.metadata?.title || 'CrÃ©ation Synaura'}
                subtitle={`${generation.model} Â· ${generation.metadata?.style || generation.prompt || 'Studio IA'}`}
                image={track.image_url}
                playing={player.current?._id === `ai-${track.id}`}
                onPlay={() => playLibraryTrack(track)}
                onOpen={() => setInspector({ generation, track })}
              />
            )) : <View style={styles.empty}><Ionicons name="sparkles-outline" size={28} color="#C7B8FF" /><Text style={styles.emptyTitle}>Ta bibliothÃ¨que est prÃªte.</Text><Text style={styles.emptyText}>Lance une gÃ©nÃ©ration pour voir apparaÃ®tre tes crÃ©ations ici.</Text></View>}
          </View>
        )}
      </ScrollView>
      <TrackInspector visible={Boolean(inspector)} item={inspector} onClose={() => setInspector(null)} onPlay={playLibraryTrack} onRefresh={() => loadStudio(true)} challengeId={challengeId} onCreatePost={(track) => {
        const playable = aiTrackToPlayer(track);
        setInspector(null);
        if (playable) navigation.navigate('CreatePost', { track: playable });
      }} onReuse={reuseTrack} onRemix={remixTrack} onCopyLyrics={async (track) => {
        const text = track.lyrics || track.prompt || '';
        if (text) await Clipboard.setStringAsync(text);
      }} />
      <CreditShopModal visible={showCredits} balance={credits} onClose={() => setShowCredits(false)} onComplete={() => loadStudio(true)} />
      </SynauraBackground>
    </KeyboardAvoidingView>
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
        <Text style={styles.fieldLabel}>TYPE DE REMIX</Text>
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

function ModelChoiceRow({ available, value, onChange, onUpgrade }: { available: string[]; value: string; onChange: (value: string) => void; onUpgrade: () => void }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}><Text style={styles.fieldLabel}>MODÃˆLE</Text><Text style={styles.tagCount}>modÃ¨le rÃ©ellement utilisÃ©</Text></View>
      <View style={styles.choices}>
        {MODELS.map((item) => {
          const unlocked = available.includes(item);
          return (
            <Pressable key={item} onPress={() => unlocked ? onChange(item) : onUpgrade()} style={[styles.choice, value === item && styles.choiceActive, !unlocked && styles.choiceLocked]}>
              <Text style={[styles.choiceText, value === item && styles.choiceTextActive]}>{item.replace('_', '.')}</Text>
              {!unlocked ? <Ionicons name="lock-closed" size={9} color={colors.textTertiary} /> : null}
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

function StudioTrackRow({ title, subtitle, image, playing, onPlay, onOpen }: { title: string; subtitle?: string; image?: string; playing: boolean; onPlay: () => void; onOpen?: () => void }) {
  const preview: Track = { _id: `preview-${title}`, title, audioUrl: '', coverUrl: image, artist: { name: 'Synaura Studio' } };
  return <View style={styles.trackRow}><View style={styles.trackCover}><TrackCover track={preview} /></View><Pressable disabled={!onOpen} onPress={onOpen} style={{ flex: 1 }}><Text numberOfLines={1} style={styles.trackTitle}>{title}</Text><Text numberOfLines={1} style={styles.trackText}>{subtitle || 'PrÃªte Ã  Ã©couter'}</Text></Pressable>{onOpen ? <Pressable onPress={onOpen} style={styles.trackMore}><Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} /></Pressable> : null}<Pressable onPress={onPlay} style={[styles.trackPlay, playing && styles.trackPlayActive]}><Ionicons name={playing ? 'pause' : 'play'} size={17} color={playing ? colors.text : colors.paper} /></Pressable></View>;
}

function StatusOrb({ status }: { status: string }) {
  const normalized = String(status || 'idle').toUpperCase();
  const pending = !['IDLE', 'SUCCESS', 'ERROR'].includes(normalized);
  const label = normalized === 'SUCCESS' ? 'Ton son est prÃªt' : normalized === 'ERROR' ? 'Erreur de gÃ©nÃ©ration' : pending ? 'GÃ©nÃ©ration en cours' : 'Studio prÃªt';
  return <View style={styles.orbRow}><View style={[styles.orb, pending && styles.orbPending, normalized === 'SUCCESS' && styles.orbSuccess]}><Ionicons name={normalized === 'SUCCESS' ? 'checkmark' : pending ? 'pulse' : 'sparkles'} size={18} color={colors.paper} /></View><View><Text style={styles.orbKicker}>Ã‰TAT DU STUDIO</Text><Text style={styles.orbText}>{label}</Text></View></View>;
}

function GenerationTimeline({ status, hasTracks }: { status: string; hasTracks: boolean }) {
  const success = String(status).toUpperCase() === 'SUCCESS';
  const first = hasTracks || String(status).toUpperCase() === 'FIRST_SUCCESS';
  const steps = [{ label: 'Prompt envoyÃ©', done: true }, { label: 'GÃ©nÃ©ration lancÃ©e', done: true }, { label: 'Premier rÃ©sultat', done: first }, { label: 'Audio sauvegardÃ©', done: success }, { label: 'PrÃªt Ã  Ã©couter', done: success }];
  return <View style={styles.timeline}>{steps.map((step, index) => <View key={step.label} style={styles.timelineStep}><View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>{step.done ? <Ionicons name="checkmark" size={10} color={colors.text} /> : null}</View><Text style={[styles.timelineText, step.done && styles.timelineTextDone]}>{step.label}</Text>{index < steps.length - 1 ? <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} /> : null}</View>)}</View>;
}

function GenerationStatusRow({ generation, active }: { generation: AIStudioGeneration; active: boolean }) {
  const title = String(generation.metadata?.title || generation.prompt || 'CrÃ©ation en cours');
  return (
    <View style={[styles.generationRow, active && styles.generationRowActive]}>
      <View style={styles.generationPulse}><ActivityIndicator color={colors.paper} size="small" /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.generationTitle}>{title}</Text>
        <Text style={styles.generationMeta}>{generation.model} Â· gÃ©nÃ©ration en cours</Text>
      </View>
      <Text style={styles.generationStatus}>{String(generation.status || 'pending').toUpperCase()}</Text>
    </View>
  );
}

function TrackInspector({ visible, item, onClose, onPlay, onCreatePost, onReuse, onRemix, onCopyLyrics, onRefresh, challengeId }: { visible: boolean; item: { generation: AIStudioGeneration; track: AIStudioTrack } | null; onClose: () => void; onPlay: (track: AIStudioTrack) => void; onCreatePost: (track: AIStudioTrack) => void; onReuse: (generation: AIStudioGeneration, track: AIStudioTrack) => void; onRemix: (generation: AIStudioGeneration, track: AIStudioTrack) => void; onCopyLyrics: (track: AIStudioTrack) => Promise<void>; onRefresh: () => void; challengeId?: string }) {
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
  const toggleFavorite = () => run('favorite', async () => { await setAITrackFavorite(item.track.id, !item.track.is_favorite); onRefresh(); }, item.track.is_favorite ? 'RetirÃ© des favoris.' : 'AjoutÃ© aux favoris.');
  const togglePublic = () => run('public', async () => {
    const nextPublic = !item.track.is_public;
    const result = await setAITrackPublic(item.track.id, nextPublic, remixPermissions);
    if (challengeId && nextPublic && result.isPublic && result.remixStatus === 'published') {
      participateInChallenge(challengeId, { contentType: 'variation', contentId: `ai-${item.track.id}` }).catch(() => {});
    }
    onRefresh();
  }, item.track.is_public ? 'CrÃ©ation repassÃ©e en privÃ©.' : 'CrÃ©ation rendue publique.');
  const toggleTrash = () => run('trash', async () => { await setAIGenerationTrashed(item.generation.id, !item.generation.is_trashed); onClose(); onRefresh(); }, 'BibliothÃ¨que mise Ã  jour.');
  const chooseFolder = (folder: string) => run('folder', async () => { await setAITrackFolder(item.track.id, item.track.library_folder === folder ? '' : folder); onRefresh(); }, item.track.library_folder === folder ? 'Dossier retirÃ©.' : `AjoutÃ© Ã  Â« ${folder} Â».`);
  const loadTimedLyrics = () => run('lyrics', async () => {
    const result = await getTimestampedAILyrics(taskId, audioId);
    setTimedWords(result.alignedWords || []);
  }, 'Paroles synchronisÃ©es rÃ©cupÃ©rÃ©es.');
  const createVideo = () => run('video', async () => {
    await generateAIMusicVideo(item.track.id, taskId, audioId);
    onRefresh();
  }, 'Clip lancÃ©. Il apparaÃ®tra dans ta bibliothÃ¨que dÃ¨s quâ€™il sera prÃªt.');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.inspector}>
          <View style={styles.inspectorHead}>
            <View style={styles.inspectorCover}>
              <TrackCover source={item.track.image_url} videoSource={item.track.music_video_url || item.track.cover_video_url} posterSource={item.track.music_video_poster_url || item.track.cover_video_poster_url} style={{ flex: 1 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectorKicker}>INSPECTEUR STUDIO</Text>
              <Text numberOfLines={2} style={styles.inspectorTitle}>{item.track.title}</Text>
              <Text style={styles.inspectorMeta}>{item.generation.model} Â· {Math.round(item.track.duration || 0)} sec</Text>
            </View>
            <Pressable onPress={onClose} style={styles.inspectorClose}><Ionicons name="close" size={21} color={colors.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inspectorActions}>
            <Text style={styles.inspectorPrompt}>{item.track.style || item.generation.metadata?.style || item.generation.prompt || 'CrÃ©ation Synaura Studio'}</Text>
            <Pressable onPress={() => onPlay(item.track)} style={styles.inspectorPrimary}><Ionicons name="play" size={17} color={colors.paper} /><Text style={styles.inspectorPrimaryText}>Ã‰couter dans le player</Text></Pressable>
            <View style={styles.inspectorGrid}>
              <Pressable onPress={() => onReuse(item.generation, item.track)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="copy-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>RÃ©utiliser</Text></Pressable>
              <Pressable onPress={() => onRemix(item.generation, item.track)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="repeat" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Remixer</Text></Pressable>
            </View>
            <View style={styles.inspectorGrid}>
              <Pressable disabled={Boolean(busy)} onPress={toggleFavorite} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name={item.track.is_favorite ? 'heart' : 'heart-outline'} size={17} color={item.track.is_favorite ? '#FF4B7A' : colors.text} /><Text style={styles.inspectorActionText}>{item.track.is_favorite ? 'AimÃ©' : 'Aimer'}</Text></Pressable>
              <Pressable disabled={Boolean(busy)} onPress={togglePublic} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name={item.track.is_public ? 'earth' : 'lock-closed-outline'} size={17} color={colors.text} /><Text style={styles.inspectorActionText}>{item.track.is_public ? 'Public' : 'PrivÃ©'}</Text></Pressable>
            </View>
            <View style={styles.inspectorSection}>
              <RemixPermissionsSection value={remixPermissions} onChange={setRemixPermissions} />
            </View>
            <View style={styles.inspectorSection}>
              <Text style={styles.inspectorSectionTitle}>DOSSIER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inspectorFolderRow}>
                {STUDIO_FOLDERS.map((folder) => <Pressable disabled={Boolean(busy)} key={folder} onPress={() => chooseFolder(folder)} style={[styles.inspectorFolder, item.track.library_folder === folder && styles.inspectorFolderActive]}><Ionicons name={item.track.library_folder === folder ? 'folder-open' : 'folder-outline'} size={14} color={item.track.library_folder === folder ? colors.paper : colors.textSecondary} /><Text style={[styles.inspectorFolderText, item.track.library_folder === folder && styles.inspectorFolderTextActive]}>{folder}</Text></Pressable>)}
              </ScrollView>
            </View>
            {item.track.lyrics || item.track.prompt ? <Pressable onPress={() => onCopyLyrics(item.track)} style={styles.inspectorAction}><Ionicons name="copy-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Copier les paroles</Text></Pressable> : null}
            <Pressable disabled={Boolean(busy) || !taskId || !audioId} onPress={loadTimedLyrics} style={styles.inspectorAction}>{busy === 'lyrics' ? <ActivityIndicator color={colors.violet} /> : <Ionicons name="mic-outline" size={17} color={colors.violet} />}<Text style={styles.inspectorActionText}>Paroles synchronisÃ©es</Text></Pressable>
            {timedWords.length ? <View style={styles.timedLyrics}><Text style={styles.timedLyricsTitle}>APERÃ‡U SYNCHRONISÃ‰</Text><Text style={styles.timedLyricsText}>{timedWords.slice(0, 80).map((entry) => entry.word || '').join(' ')}</Text></View> : null}
            {clipUrl ? <Pressable onPress={() => Linking.openURL(clipUrl)} style={styles.inspectorAction}><Ionicons name="videocam" size={17} color={colors.coral} /><Text style={styles.inspectorActionText}>Ouvrir le clip</Text></Pressable> : <Pressable disabled={Boolean(busy) || !taskId || !audioId} onPress={createVideo} style={styles.inspectorAction}>{busy === 'video' ? <ActivityIndicator color={colors.coral} /> : <Ionicons name="videocam-outline" size={17} color={colors.coral} />}<Text style={styles.inspectorActionText}>CrÃ©er un clip Â· 100 crÃ©dits</Text></Pressable>}
            <Pressable onPress={() => onCreatePost(item.track)} style={styles.inspectorAction}><Ionicons name="create-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>CrÃ©er un post</Text></Pressable>
            <View style={styles.inspectorGrid}>
              <Pressable onPress={() => Share.share({ message: `${item.track.title} Â· Synaura\n${audioUrl}` })} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="share-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Partager</Text></Pressable>
              <Pressable onPress={() => audioUrl && Linking.openURL(audioUrl)} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="download-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>TÃ©lÃ©charger</Text></Pressable>
            </View>
            {feedback ? <Text style={styles.inspectorFeedback}>{feedback}</Text> : null}
            <Pressable disabled={Boolean(busy)} onPress={toggleTrash} style={styles.inspectorDanger}><Ionicons name={item.generation.is_trashed ? 'refresh' : 'trash-outline'} size={17} color={colors.danger} /><Text style={styles.inspectorDangerText}>{item.generation.is_trashed ? 'Restaurer la crÃ©ation' : 'Mettre Ã  la corbeille'}</Text></Pressable>
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
              <Text style={styles.shopKicker}>CRÃ‰DITS STUDIO</Text>
              <Text style={styles.shopTitle}>{balance} crÃ©dits disponibles</Text>
            </View>
            <Pressable onPress={onClose} style={styles.inspectorClose}><Ionicons name="close" size={21} color={colors.text} /></Pressable>
          </View>
          <Text style={styles.shopText}>Chaque lancement coÃ»te 12 crÃ©dits et crÃ©e deux variations.</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.packList}>
            {CREDIT_PACKS.map((pack) => {
              const active = pack.id === selected;
              return (
                <Pressable key={pack.id} onPress={() => setSelected(pack.id)} style={[styles.pack, active && styles.packActive]}>
                  <View style={[styles.packCheck, active && styles.packCheckActive]}><Ionicons name={active ? 'checkmark' : 'sparkles-outline'} size={17} color={active ? colors.paper : colors.textTertiary} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.packNameRow}><Text style={styles.packName}>{pack.label}</Text>{pack.badge ? <Text style={styles.packBadge}>{pack.badge}</Text> : null}</View>
                    <Text style={styles.packMeta}>{pack.credits.toLocaleString('fr-FR')} crÃ©dits Â· environ {Math.floor(pack.credits / 12) * 2} variations</Text>
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
          <Pressable onPress={() => { onComplete(); onClose(); }} style={styles.shopRefresh}><Ionicons name="refresh" size={15} color={colors.text} /><Text style={styles.shopRefreshText}>Jâ€™ai terminÃ©, actualiser mon solde</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9, paddingHorizontal: 11, height: 36, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  creditText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  kicker: { marginTop: 9, color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 26, lineHeight: 30, fontWeight: '900' },
  titleCompact: { fontSize: 24, lineHeight: 28 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: '#EDEBE7', borderWidth: 1, borderColor: colors.border },
  studioConsole: { borderRadius: 10, padding: 12, gap: 11, backgroundColor: colors.black },
  consoleBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  consoleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  consoleBrandText: { color: 'rgba(255,250,242,0.58)', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  consoleMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  consoleValue: { color: colors.paper, fontSize: 13, fontWeight: '900' },
  consoleLabel: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  librarySummary: { minHeight: 58, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryStat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontSize: 15, fontWeight: '900' },
  summaryLabel: { marginTop: 3, color: colors.textTertiary, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  summaryDivider: { width: 1, height: 24, backgroundColor: colors.border },
  summaryCreate: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 10, backgroundColor: colors.black },
  orbRow: { minHeight: 64, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: 'rgba(255,250,242,0.84)', borderWidth: 1, borderColor: colors.border },
  orb: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral },
  orbPending: { backgroundColor: '#7C5CFF', shadowColor: '#7C5CFF', shadowOpacity: 0.5, shadowRadius: 12, elevation: 7 },
  orbSuccess: { backgroundColor: '#059669' },
  orbKicker: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  orbText: { marginTop: 3, color: colors.text, fontSize: 12, fontWeight: '900' },
  segment: { flex: 1, minHeight: 38, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.black },
  segmentText: { color: colors.textTertiary, fontSize: 11, fontWeight: '900' },
  segmentTextActive: { color: colors.paper },
  modeRow: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeActive: { backgroundColor: colors.black, borderColor: colors.black },
  modeText: { color: colors.textTertiary, fontSize: 11, fontWeight: '900' },
  modeTextActive: { color: colors.paper },
  panel: { borderRadius: 10, padding: 12, gap: 12, backgroundColor: 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: colors.border },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockEyebrow: { marginTop: 4, marginBottom: -4, color: colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  blockEyebrowInfo: { marginTop: 4, marginBottom: -4, color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  panelKicker: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  panelCount: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  presetRow: { gap: 9, paddingRight: 14 },
  preset: { width: 132, minHeight: 106, borderRadius: 12, padding: 10, backgroundColor: '#F3F1EE', borderWidth: 1, borderColor: colors.border },
  presetIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  presetTitle: { marginTop: 11, color: colors.text, fontSize: 13, lineHeight: 16, fontWeight: '900' },
  presetText: { marginTop: 4, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
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
  choiceLocked: { opacity: 0.46, borderWidth: 1, borderColor: colors.border },
  choiceText: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  choiceTextActive: { color: colors.paper },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between' },
  meterValue: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  meterStep: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(23,19,19,0.08)' },
  meterStepActive: { backgroundColor: colors.coral },
  advancedSummary: { minHeight: 66, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  advancedIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  advancedTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  advancedText: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  generateButton: { minHeight: 52, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15, backgroundColor: colors.violet },
  generateText: { flex: 1, color: colors.paper, fontSize: 14, fontWeight: '900' },
  generateCost: { color: 'rgba(255,250,242,0.56)', fontSize: 10, fontWeight: '900' },
  lockedSource: { borderRadius: 18, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: 'rgba(115,87,198,0.18)', padding: 12, gap: 12 },
  lockedSourceTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockedSourceCover: { width: 58, height: 58, borderRadius: 14, backgroundColor: 'rgba(17,17,17,0.08)' },
  lockedSourceTitle: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  lockedSourceText: { marginTop: 3, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  lockedSourceButton: { height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(115,87,198,0.10)' },
  lockedSourceButtonText: { color: colors.violet, fontSize: 12, fontWeight: '900' },
  buyButton: { height: 45, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  buyText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  modelNotice: { minHeight: 46, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: 'rgba(124,92,255,0.09)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.2)' },
  modelNoticeText: { flex: 1, color: colors.textSecondary, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  modelNoticeLink: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  livePanel: { borderRadius: 24, padding: 14, gap: 9, backgroundColor: 'rgba(124,92,255,0.10)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.24)' },
  liveTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveVisual: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 20, padding: 10, backgroundColor: 'rgba(255,249,239,0.7)' },
  liveVisualCopy: { flex: 1, minWidth: 0 },
  liveVisualKicker: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  liveWaveform: { height: 24, marginTop: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  liveKicker: { flex: 1, color: colors.violet, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  liveStatus: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
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
  searchInput: { height: 48, borderRadius: 20, paddingHorizontal: 14, color: colors.text, backgroundColor: 'rgba(255,250,242,0.86)', borderWidth: 1, borderColor: colors.border, fontSize: 12, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 7, paddingRight: 15 },
  filter: { minHeight: 38, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(255,250,242,0.78)' },
  filterActive: { backgroundColor: colors.black },
  filterText: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  filterTextActive: { color: colors.paper },
  folderRow: { flexDirection: 'row', gap: 7, paddingRight: 15 },
  folderFilter: { minHeight: 36, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, backgroundColor: 'rgba(255,250,242,0.78)', borderWidth: 1, borderColor: colors.border },
  folderFilterActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  folderFilterText: { color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  folderFilterTextActive: { color: colors.paper },
  libraryToolbar: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  libraryCount: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  sortButton: { minHeight: 34, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  sortText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  repairMessage: { color: colors.textSecondary, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  generationRow: { minHeight: 72, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: 'rgba(124,92,255,0.09)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.22)' },
  generationRowActive: { borderColor: 'rgba(255,111,97,0.5)', backgroundColor: 'rgba(255,111,97,0.09)' },
  generationPulse: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  generationTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  generationMeta: { marginTop: 4, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  generationStatus: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  trackRow: { minHeight: 68, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  trackCover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(17,17,17,0.06)' },
  trackTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  trackText: { marginTop: 4, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  trackPlay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  trackPlayActive: { backgroundColor: colors.paper },
  trackMore: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.05)' },
  error: { overflow: 'hidden', borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(217,45,32,0.09)', borderWidth: 1, borderColor: 'rgba(217,45,32,0.16)' },
  errorText: { flex: 1, color: colors.danger, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  empty: { alignItems: 'center', borderRadius: 24, padding: 28, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { marginTop: 12, color: colors.text, fontSize: 17, fontWeight: '900' },
  emptyText: { marginTop: 5, color: colors.textTertiary, textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  authGate: { flexGrow: 1, paddingHorizontal: 16, gap: 18 },
  authTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  authKicker: { color: colors.violet, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
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
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,6,8,0.72)' },
  inspector: { maxHeight: '92%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: 24, backgroundColor: colors.paper },
  inspectorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inspectorCover: { width: 62, height: 62, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  inspectorKicker: { color: colors.violet, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  inspectorTitle: { marginTop: 4, color: colors.text, fontSize: 22, fontWeight: '900' },
  inspectorClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  inspectorMeta: { marginTop: 10, color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  inspectorPrompt: { marginTop: 12, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  inspectorActions: { marginTop: 18, gap: 8 },
  inspectorSection: { gap: 8, borderRadius: 19, padding: 11, backgroundColor: 'rgba(23,19,19,0.035)' },
  inspectorSectionTitle: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  inspectorFolderRow: { flexDirection: 'row', gap: 7, paddingRight: 8 },
  inspectorFolder: { minHeight: 35, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  inspectorFolderActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  inspectorFolderText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  inspectorFolderTextActive: { color: colors.paper },
  timedLyrics: { borderRadius: 18, padding: 12, backgroundColor: 'rgba(124,92,255,0.08)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.18)' },
  timedLyricsTitle: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
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
  creditShop: { maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: 28, backgroundColor: colors.paper },
  shopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  shopKicker: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
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
