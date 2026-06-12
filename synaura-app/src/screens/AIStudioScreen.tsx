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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAIGenerationStatus,
  getAIStudioCredits,
  getAIStudioLibrary,
  getAIStudioQuota,
  getSynauraCity,
  getUserPreferences,
  createCreditsCheckout,
  generateAILyrics,
  generateAIMusicVideo,
  getTimestampedAILyrics,
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
import { EventChoice, EventTicker } from '@/components/events/SynauraEvents';
import { TrackCover } from '@/components/TrackCover';
import { aiStudioPresets, type MobileAIStudioPreset } from '@/constants/aiStudioPresets';
import { usePlayer } from '@/player/PlayerProvider';
import { colors } from '@/theme/tokens';
import { getSunoErrorMessage } from '@/utils/getSunoErrorMessage';
import type { SynauraCityData, Track } from '@/api/types';

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
const CREDIT_PACKS: Array<{ id: CreditPackId; label: string; credits: number; price: string; badge?: string }> = [
  { id: 'petit', label: 'Petit', credits: 120, price: '1,99 €' },
  { id: 'moyen', label: 'Moyen', credits: 500, price: '6,99 €' },
  { id: 'populaire', label: 'Populaire', credits: 1200, price: '14,99 €', badge: 'POPULAIRE' },
  { id: 'best_value', label: 'Best Value', credits: 3000, price: '29,99 €', badge: 'MEILLEURE VALEUR' },
];

function aiTrackToPlayer(track: AIStatusTrack | NonNullable<AIStudioGeneration['tracks']>[number]): Track | null {
  const raw = track as any;
  const audioUrl = raw.audio_url || raw.stream_audio_url || raw.audio || raw.stream;
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
  };
}

export function AIStudioScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const player = usePlayer();
  const [tab, setTab] = useState<StudioTab>('create');
  const [mode, setMode] = useState<StudioMode>('simple');
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
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    void getSynauraCity().then((next) => active && setCity(next)).catch(() => {});
    return () => { active = false; };
  }, []);

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
      navigation.getParent()?.navigate('Login', { message: 'Connecte-toi pour créer avec le Studio IA.' });
      return;
    }
    if (!description.trim() && mode === 'simple') {
      setError('Décris le morceau que tu veux créer.');
      return;
    }
    if (mode !== 'simple' && !style.trim()) {
      setError('Ajoute un style musical ou choisis un preset.');
      return;
    }
    if (mode === 'remix' && !remixAsset && !remixSource?.audio_url && !remixSource?.stream_audio_url) {
      setError('Choisis un fichier audio à remixer.');
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
      const prompt = mode === 'simple' ? `${description.trim()}. ${tagPrompt}. Durée cible ${duration} secondes.` : lyrics.trim() || description.trim();
      const payload = {
        customMode: mode !== 'simple',
        instrumental,
        model,
        title: title.trim() || undefined,
        style: [style.trim(), tagPrompt].filter(Boolean).join(', ') || undefined,
        prompt,
        negativeTags: negativeTags.trim() || undefined,
        vocalGender: vocalGender || undefined,
        styleWeight: styleInfluence / 100,
        weirdnessConstraint: weirdness / 100,
        audioWeight: audioWeight / 100,
        durationHint: `${duration} seconds`,
      };
      let result;
      if (mode === 'remix' && remixSource && !remixAsset) {
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
      await AsyncStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify({ taskId: result.taskId, status: 'pending', title: title || description, startedAt: Date.now() }));
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
  const libraryTracks = useMemo(() => {
    const rows = library.flatMap((generation) => (generation.tracks || []).map((track) => ({ generation, track })));
    if (liveTaskId && liveTracks.length) {
      const generation: AIStudioGeneration = {
        id: `live-${liveTaskId}`,
        task_id: liveTaskId,
        prompt: description,
        model,
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
            model_name: model,
          },
        });
      });
    }
    return rows;
  }, [description, instrumental, library, liveTaskId, liveTracks, model, style, title]);
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
    setTitle(`${track.title || String(generation.metadata?.title || 'Création')} remix`);
    setDescription(track.prompt || generation.prompt || '');
    setStyle(track.style || String(generation.metadata?.style || ''));
    setTab('create');
    setInspector(null);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  if (!auth.user) {
    return (
      <View style={styles.root}>
        <SynauraBackground variant="warm" />
        <View style={[styles.authGate, { paddingTop: insets.top }]}>
          <View style={styles.authIcon}><Ionicons name="sparkles" size={32} color={colors.paper} /></View>
          <Text style={styles.authTitle}>Ton Studio IA t’attend</Text>
          <Text style={styles.authText}>Connecte-toi pour retrouver tes crédits, tes presets et ta bibliothèque.</Text>
          <Pressable onPress={() => navigation.getParent()?.navigate('Login')} style={styles.authButton}><Text style={styles.authButtonText}>Se connecter</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SynauraBackground variant="warm" />
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
          <Pressable onPress={() => setShowCredits(true)} style={styles.creditPill}><Ionicons name="sparkles" size={14} color={colors.coral} /><Text style={styles.creditText}>{credits} crédits</Text><Ionicons name="add-circle" size={16} color={colors.text} /></Pressable>
          <Pressable onPress={() => navigation.navigate('CreateHub')} style={styles.iconButton}><Ionicons name="apps-outline" size={20} color={colors.text} /></Pressable>
        </View>
        <Text style={styles.kicker}>{tab === 'create' ? 'SYNAURA AI STUDIO' : 'BIBLIOTHÈQUE IA'}</Text>
        <Text style={[styles.title, tab === 'library' && styles.titleCompact]}>{tab === 'create' ? currentTitle : 'Tes créations'}</Text>
        <Text style={styles.subtitle}>{quota ? `${quota.plan_type.toUpperCase()} · ${quota.used_this_month}/${quota.monthly_limit} générations ce mois` : 'Génération et bibliothèque synchronisées avec le web.'}</Text>

        <View style={styles.tabs}>
          <Segment active={tab === 'create'} label="Créer" icon="sparkles-outline" onPress={() => switchTab('create')} />
          <Segment active={tab === 'library'} label={`Bibliothèque ${libraryTracks.length}`} icon="library-outline" onPress={() => switchTab('library')} />
        </View>

        <EventTicker city={city} onPress={() => navigation.navigate('City')} tone="violet" text="Crée pour le challenge actuel · transforme une idée Studio en moment Synaura Live" />

        <View style={styles.studioConsole}>
          <View style={styles.consoleBrand}><View style={styles.consoleDot} /><Text style={styles.consoleBrandText}>STUDIO CONNECTÉ</Text></View>
          <View style={styles.consoleMetrics}>
            <View><Text style={styles.consoleValue}>{model.replace('_', '.')}</Text><Text style={styles.consoleLabel}>MODÈLE</Text></View>
            <View><Text style={styles.consoleValue}>{mode.toUpperCase()}</Text><Text style={styles.consoleLabel}>MODE</Text></View>
            <View><Text style={styles.consoleValue}>{credits}</Text><Text style={styles.consoleLabel}>CRÉDITS</Text></View>
          </View>
        </View>

        {tab === 'library' ? (
          <View style={styles.librarySummary}>
            <View style={styles.summaryStat}><Text style={styles.summaryValue}>{libraryTracks.length}</Text><Text style={styles.summaryLabel}>PISTES</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}><Text style={styles.summaryValue}>{pendingGenerations.length}</Text><Text style={styles.summaryLabel}>EN COURS</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}><Text style={styles.summaryValue}>{credits}</Text><Text style={styles.summaryLabel}>CRÉDITS</Text></View>
            <Pressable onPress={() => switchTab('create')} style={styles.summaryCreate}><Ionicons name="add" size={20} color={colors.paper} /></Pressable>
          </View>
        ) : null}

        {liveTaskId ? <StatusOrb status={liveStatus} /> : null}

        {error ? <Pressable onPress={() => loadStudio(true)} style={styles.error}><Ionicons name="refresh" size={17} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></Pressable> : null}
        {loading ? <ActivityIndicator color={colors.violet} style={{ marginTop: 30 }} /> : null}

        {tab === 'create' ? (
          <>
            <EventChoice events={city?.events || []} selectedId={selectedEventId} onSelect={selectEvent} />
            <View style={styles.modeRow}>
              {(['simple', 'custom', 'remix'] as StudioMode[]).map((item) => (
                <Pressable key={item} onPress={() => setMode(item)} style={[styles.mode, mode === item && styles.modeActive]}>
                  <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item === 'simple' ? 'Simple' : item === 'custom' ? 'Custom' : 'Remix'}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={styles.panelKicker}>INTENTIONS PRÊTES</Text>
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
              {mode === 'remix' ? (
                <Pressable onPress={pickRemix} style={styles.remixPicker}>
                  <Ionicons name={remixAsset || remixSource ? 'checkmark-circle' : 'musical-notes-outline'} size={25} color={remixAsset || remixSource ? '#6EE7B7' : '#C7B8FF'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>SOURCE AUDIO</Text>
                    <Text numberOfLines={1} style={styles.remixName}>{remixAsset?.name || remixSource?.title || 'Choisir un fichier à transformer'}</Text>
                  </View>
                </Pressable>
              ) : null}
              {mode !== 'simple' ? <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Nom de la création" /> : null}
              <Field label={mode === 'simple' ? 'Décris ton morceau' : 'Direction créative'} value={description} onChangeText={setDescription} placeholder="Ambiance, histoire, énergie, structure..." multiline />
              {mode !== 'simple' ? <Field label="Style musical" value={style} onChangeText={setStyle} placeholder="Genres, voix, production, instruments..." multiline /> : null}
              <View style={styles.field}>
                <View style={styles.fieldHead}><Text style={styles.fieldLabel}>COULEURS MUSICALES</Text><Text style={styles.tagCount}>{selectedTags.length} sélection</Text></View>
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
                      <Text style={styles.magicButtonText}>Écrire avec l’IA</Text>
                    </Pressable>
                  </View>
                  <TextInput value={lyrics} onChangeText={setLyrics} placeholder="Écris ou colle les paroles..." placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" style={[styles.input, styles.inputMulti, styles.inputTall]} />
                </>
              ) : null}
              <View style={styles.switchRow}>
                <View><Text style={styles.switchTitle}>Instrumental</Text><Text style={styles.switchText}>Génère sans voix ni paroles</Text></View>
                <Switch value={instrumental} onValueChange={setInstrumental} trackColor={{ false: '#3A3335', true: '#7C5CFF' }} thumbColor={colors.paper} />
              </View>
            </View>

            <Pressable onPress={() => setAdvancedOpen((current) => !current)} style={styles.advancedSummary}>
              <View style={styles.advancedIcon}><Ionicons name="options-outline" size={18} color={colors.paper} /></View>
              <View style={{ flex: 1 }}><Text style={styles.advancedTitle}>Réglages de génération</Text><Text style={styles.advancedText}>{model.replace('_', '.')} · {duration} sec · {instrumental ? 'instrumental' : 'avec voix possible'}</Text></View>
              <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </Pressable>
            {advancedOpen ? (
              <View style={styles.panel}>
                <ChoiceRow label="Modèle" values={MODELS} value={model} onChange={setModel} />
                <ChoiceRow label="Durée cible" values={DURATIONS.map(String)} value={String(duration)} suffix=" sec" onChange={(value) => setDuration(Number(value))} />
                {mode !== 'simple' ? (
                  <>
                    <ChoiceRow label="Voix" values={['', 'f', 'm']} value={vocalGender} onChange={(value) => setVocalGender(value as '' | 'f' | 'm')} />
                    <Field label="À éviter" value={negativeTags} onChangeText={setNegativeTags} placeholder="Ex: autotune, guitare, voix grave..." />
                    <Meter label="Influence du style" value={styleInfluence} onChange={setStyleInfluence} />
                    <Meter label="Créativité" value={weirdness} onChange={setWeirdness} />
                    <Meter label="Poids audio" value={audioWeight} onChange={setAudioWeight} />
                  </>
                ) : null}
              </View>
            ) : null}

            <Pressable disabled={generating} onPress={generate} style={[styles.generateButton, generating && { opacity: 0.55 }]}>
              {generating ? <ActivityIndicator color={colors.paper} /> : <Ionicons name={mode === 'remix' ? 'repeat' : 'sparkles'} size={20} color={colors.paper} />}
              <Text style={styles.generateText}>{generating ? 'Lancement...' : mode === 'remix' ? 'Lancer le remix' : 'Générer 2 versions'}</Text>
              <Text style={styles.generateCost}>{GENERATION_COST} crédits</Text>
            </Pressable>
            <Pressable onPress={() => setShowCredits(true)} style={styles.buyButton}><Ionicons name="sparkles-outline" size={16} color={colors.violet} /><Text style={styles.buyText}>Acheter des crédits</Text><Ionicons name="arrow-forward" size={16} color={colors.violet} /></Pressable>

            {liveTaskId ? (
              <View style={styles.livePanel}>
                <View style={styles.liveTop}><View style={styles.liveDot} /><Text style={styles.liveKicker}>GÉNÉRATION LIVE</Text><Text style={styles.liveStatus}>{liveStatus || 'pending'}</Text></View>
                <Text style={styles.liveTitle}>{title || description || 'Création en cours'}</Text>
                <Text style={styles.liveTask}>#{liveTaskId.slice(-8)}</Text>
                <GenerationTimeline status={liveStatus} hasTracks={liveTracks.length > 0} />
                {liveTracks.map((track) => <StudioTrackRow key={track.id} title={track.title} image={track.image} playing={player.current?._id === `ai-${track.id}`} onPlay={() => play(track)} />)}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.libraryList}>
            <TextInput value={librarySearch} onChangeText={setLibrarySearch} placeholder="Rechercher titre, style ou prompt..." placeholderTextColor={colors.textTertiary} style={styles.searchInput} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{(['all', 'instrumental', 'lyrics', 'liked', 'trashed'] as const).map((filter) => <Pressable key={filter} onPress={() => setLibraryFilter(filter)} style={[styles.filter, libraryFilter === filter && styles.filterActive]}><Text style={[styles.filterText, libraryFilter === filter && styles.filterTextActive]}>{filter === 'all' ? 'Tout' : filter === 'instrumental' ? 'Instrumental' : filter === 'lyrics' ? 'Avec paroles' : filter === 'liked' ? 'Aimés' : 'Corbeille'}</Text></Pressable>)}</ScrollView>
            {libraryFolders.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}><Pressable onPress={() => setLibraryFolder('')} style={[styles.folderFilter, !libraryFolder && styles.folderFilterActive]}><Ionicons name="folder-open-outline" size={14} color={!libraryFolder ? colors.paper : colors.textTertiary} /><Text style={[styles.folderFilterText, !libraryFolder && styles.folderFilterTextActive]}>Tous les dossiers</Text></Pressable>{libraryFolders.map((folder) => <Pressable key={folder} onPress={() => setLibraryFolder(folder)} style={[styles.folderFilter, libraryFolder === folder && styles.folderFilterActive]}><Ionicons name="folder-outline" size={14} color={libraryFolder === folder ? colors.paper : colors.textTertiary} /><Text style={[styles.folderFilterText, libraryFolder === folder && styles.folderFilterTextActive]}>{folder}</Text></Pressable>)}</ScrollView> : null}
            <View style={styles.libraryToolbar}><Text style={styles.libraryCount}>{visibleLibraryTracks.length} piste{visibleLibraryTracks.length > 1 ? 's' : ''}</Text><View style={styles.toolbarActions}><Pressable disabled={repairingMedia} onPress={() => void repairMedia()} style={styles.sortButton}>{repairingMedia ? <ActivityIndicator size="small" color={colors.violet} /> : <Ionicons name="images-outline" size={15} color={colors.violet} />}<Text style={[styles.sortText, { color: colors.violet }]}>Réparer</Text></Pressable><Pressable onPress={() => setLibrarySort((current) => current === 'newest' ? 'oldest' : current === 'oldest' ? 'title' : 'newest')} style={styles.sortButton}><Ionicons name="swap-vertical" size={15} color={colors.text} /><Text style={styles.sortText}>{librarySort === 'newest' ? 'Récentes' : librarySort === 'oldest' ? 'Anciennes' : 'Titre'}</Text></Pressable></View></View>
            {repairMessage ? <Text style={styles.repairMessage}>{repairMessage}</Text> : null}
            {pendingGenerations.map((generation) => <GenerationStatusRow key={generation.id} generation={generation} active={generation.task_id === liveTaskId} />)}
            {visibleLibraryTracks.length ? visibleLibraryTracks.map(({ generation, track }) => (
              <StudioTrackRow
                key={`${generation.id}-${track.id}`}
                title={track.title || generation.metadata?.title || 'Création Synaura'}
                subtitle={`${generation.model} · ${generation.metadata?.style || generation.prompt || 'Studio IA'}`}
                image={track.image_url}
                playing={player.current?._id === `ai-${track.id}`}
                onPlay={() => playLibraryTrack(track)}
                onOpen={() => setInspector({ generation, track })}
              />
            )) : <View style={styles.empty}><Ionicons name="sparkles-outline" size={28} color="#C7B8FF" /><Text style={styles.emptyTitle}>Ta bibliothèque est prête.</Text><Text style={styles.emptyText}>Lance une génération pour voir apparaître tes créations ici.</Text></View>}
          </View>
        )}
      </ScrollView>
      <TrackInspector visible={Boolean(inspector)} item={inspector} onClose={() => setInspector(null)} onPlay={playLibraryTrack} onRefresh={() => loadStudio(true)} onCreatePost={(track) => {
        const playable = aiTrackToPlayer(track);
        setInspector(null);
        if (playable) navigation.navigate('CreatePost', { track: playable });
      }} onReuse={reuseTrack} onRemix={remixTrack} onCopyLyrics={async (track) => {
        const text = track.lyrics || track.prompt || '';
        if (text) await Clipboard.setStringAsync(text);
      }} />
      <CreditShopModal visible={showCredits} balance={credits} onClose={() => setShowCredits(false)} onComplete={() => loadStudio(true)} />
    </KeyboardAvoidingView>
  );
}

function Segment({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}><Ionicons name={icon} size={16} color={active ? colors.paper : colors.textTertiary} /><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></Pressable>;
}

function Field({ label, value, onChangeText, placeholder, multiline, tall }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; tall?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textTertiary} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.inputMulti, tall && styles.inputTall]} /></View>;
}

function ChoiceRow({ label, values, value, suffix = '', onChange }: { label: string; values: string[]; value: string; suffix?: string; onChange: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.choices}>{values.map((item) => <Pressable key={item || 'auto'} onPress={() => onChange(item)} style={[styles.choice, value === item && styles.choiceActive]}><Text style={[styles.choiceText, value === item && styles.choiceTextActive]}>{item === '' ? 'Auto' : item === 'f' ? 'Femme' : item === 'm' ? 'Homme' : item}{suffix}</Text></Pressable>)}</View></View>;
}

function Meter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <View style={styles.field}><View style={styles.meterHead}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.meterValue}>{value}%</Text></View><View style={styles.choices}>{[25, 50, 75, 100].map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.meterStep, value >= item && styles.meterStepActive]} />)}</View></View>;
}

function StudioTrackRow({ title, subtitle, image, playing, onPlay, onOpen }: { title: string; subtitle?: string; image?: string; playing: boolean; onPlay: () => void; onOpen?: () => void }) {
  const preview: Track = { _id: `preview-${title}`, title, audioUrl: '', coverUrl: image, artist: { name: 'Synaura Studio' } };
  return <View style={styles.trackRow}><View style={styles.trackCover}><TrackCover track={preview} /></View><Pressable disabled={!onOpen} onPress={onOpen} style={{ flex: 1 }}><Text numberOfLines={1} style={styles.trackTitle}>{title}</Text><Text numberOfLines={1} style={styles.trackText}>{subtitle || 'Prête à écouter'}</Text></Pressable>{onOpen ? <Pressable onPress={onOpen} style={styles.trackMore}><Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} /></Pressable> : null}<Pressable onPress={onPlay} style={[styles.trackPlay, playing && styles.trackPlayActive]}><Ionicons name={playing ? 'pause' : 'play'} size={17} color={playing ? colors.text : colors.paper} /></Pressable></View>;
}

function StatusOrb({ status }: { status: string }) {
  const normalized = String(status || 'idle').toUpperCase();
  const pending = !['IDLE', 'SUCCESS', 'ERROR'].includes(normalized);
  const label = normalized === 'SUCCESS' ? 'Ton son est prêt' : normalized === 'ERROR' ? 'Erreur de génération' : pending ? 'Génération en cours' : 'Studio prêt';
  return <View style={styles.orbRow}><View style={[styles.orb, pending && styles.orbPending, normalized === 'SUCCESS' && styles.orbSuccess]}><Ionicons name={normalized === 'SUCCESS' ? 'checkmark' : pending ? 'pulse' : 'sparkles'} size={18} color={colors.paper} /></View><View><Text style={styles.orbKicker}>ÉTAT DU STUDIO</Text><Text style={styles.orbText}>{label}</Text></View></View>;
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

function TrackInspector({ visible, item, onClose, onPlay, onCreatePost, onReuse, onRemix, onCopyLyrics, onRefresh }: { visible: boolean; item: { generation: AIStudioGeneration; track: AIStudioTrack } | null; onClose: () => void; onPlay: (track: AIStudioTrack) => void; onCreatePost: (track: AIStudioTrack) => void; onReuse: (generation: AIStudioGeneration, track: AIStudioTrack) => void; onRemix: (generation: AIStudioGeneration, track: AIStudioTrack) => void; onCopyLyrics: (track: AIStudioTrack) => Promise<void>; onRefresh: () => void }) {
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState('');
  const [timedWords, setTimedWords] = useState<Array<{ word?: string }>>([]);

  useEffect(() => {
    setBusy('');
    setFeedback('');
    setTimedWords([]);
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
  const togglePublic = () => run('public', async () => { await setAITrackPublic(item.track.id, !item.track.is_public); onRefresh(); }, item.track.is_public ? 'Création repassée en privé.' : 'Création rendue publique.');
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
              <Text style={styles.inspectorKicker}>INSPECTEUR STUDIO</Text>
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
              <Text style={styles.inspectorSectionTitle}>DOSSIER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inspectorFolderRow}>
                {STUDIO_FOLDERS.map((folder) => <Pressable disabled={Boolean(busy)} key={folder} onPress={() => chooseFolder(folder)} style={[styles.inspectorFolder, item.track.library_folder === folder && styles.inspectorFolderActive]}><Ionicons name={item.track.library_folder === folder ? 'folder-open' : 'folder-outline'} size={14} color={item.track.library_folder === folder ? colors.paper : colors.textSecondary} /><Text style={[styles.inspectorFolderText, item.track.library_folder === folder && styles.inspectorFolderTextActive]}>{folder}</Text></Pressable>)}
              </ScrollView>
            </View>
            {item.track.lyrics || item.track.prompt ? <Pressable onPress={() => onCopyLyrics(item.track)} style={styles.inspectorAction}><Ionicons name="copy-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Copier les paroles</Text></Pressable> : null}
            <Pressable disabled={Boolean(busy) || !taskId || !audioId} onPress={loadTimedLyrics} style={styles.inspectorAction}>{busy === 'lyrics' ? <ActivityIndicator color={colors.violet} /> : <Ionicons name="mic-outline" size={17} color={colors.violet} />}<Text style={styles.inspectorActionText}>Paroles synchronisées</Text></Pressable>
            {timedWords.length ? <View style={styles.timedLyrics}><Text style={styles.timedLyricsTitle}>APERÇU SYNCHRONISÉ</Text><Text style={styles.timedLyricsText}>{timedWords.slice(0, 80).map((entry) => entry.word || '').join(' ')}</Text></View> : null}
            {clipUrl ? <Pressable onPress={() => Linking.openURL(clipUrl)} style={styles.inspectorAction}><Ionicons name="videocam" size={17} color={colors.coral} /><Text style={styles.inspectorActionText}>Ouvrir le clip</Text></Pressable> : <Pressable disabled={Boolean(busy) || !taskId || !audioId} onPress={createVideo} style={styles.inspectorAction}>{busy === 'video' ? <ActivityIndicator color={colors.coral} /> : <Ionicons name="videocam-outline" size={17} color={colors.coral} />}<Text style={styles.inspectorActionText}>Créer un clip · 100 crédits</Text></Pressable>}
            <Pressable onPress={() => onCreatePost(item.track)} style={styles.inspectorAction}><Ionicons name="create-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Créer un post</Text></Pressable>
            <View style={styles.inspectorGrid}>
              <Pressable onPress={() => Share.share({ message: `${item.track.title} · Synaura\n${audioUrl}` })} style={[styles.inspectorAction, styles.inspectorHalf]}><Ionicons name="share-outline" size={17} color={colors.text} /><Text style={styles.inspectorActionText}>Partager</Text></Pressable>
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
              <Text style={styles.shopKicker}>CRÉDITS STUDIO</Text>
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
  content: { paddingHorizontal: 15, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 45, height: 45, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingHorizontal: 13, height: 40, backgroundColor: 'rgba(255,250,242,0.9)', borderWidth: 1, borderColor: 'rgba(255,111,97,0.26)' },
  creditText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  kicker: { marginTop: 9, color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 37, lineHeight: 39, fontWeight: '900' },
  titleCompact: { fontSize: 30, lineHeight: 33 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 22, backgroundColor: 'rgba(255,250,242,0.72)', borderWidth: 1, borderColor: colors.border },
  studioConsole: { borderRadius: 22, padding: 14, gap: 14, backgroundColor: colors.black, shadowColor: colors.black, shadowOpacity: 0.18, shadowRadius: 14, elevation: 6 },
  consoleBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  consoleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  consoleBrandText: { color: 'rgba(255,250,242,0.58)', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  consoleMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  consoleValue: { color: colors.paper, fontSize: 13, fontWeight: '900' },
  consoleLabel: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  librarySummary: { minHeight: 66, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: 'rgba(255,250,242,0.86)', borderWidth: 1, borderColor: colors.border },
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
  segment: { flex: 1, minHeight: 43, borderRadius: 18, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.black },
  segmentText: { color: colors.textTertiary, fontSize: 11, fontWeight: '900' },
  segmentTextActive: { color: colors.paper },
  modeRow: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, height: 42, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.76)', borderWidth: 1, borderColor: colors.border },
  modeActive: { backgroundColor: colors.black, borderColor: colors.black },
  modeText: { color: colors.textTertiary, fontSize: 11, fontWeight: '900' },
  modeTextActive: { color: colors.paper },
  panel: { borderRadius: 24, padding: 14, gap: 14, backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelKicker: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  panelCount: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  presetRow: { gap: 9, paddingRight: 14 },
  preset: { width: 144, minHeight: 118, borderRadius: 18, padding: 11, backgroundColor: 'rgba(244,239,230,0.92)', borderWidth: 1, borderColor: colors.border },
  presetIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  presetTitle: { marginTop: 11, color: colors.text, fontSize: 13, lineHeight: 16, fontWeight: '900' },
  presetText: { marginTop: 4, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  input: { minHeight: 46, borderRadius: 16, paddingHorizontal: 13, color: colors.text, backgroundColor: 'rgba(244,239,230,0.82)', borderWidth: 1, borderColor: colors.border, fontSize: 13, fontWeight: '700' },
  inputMulti: { minHeight: 88, paddingTop: 12, paddingBottom: 12 },
  inputTall: { minHeight: 150 },
  remixPicker: { minHeight: 66, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(124,92,255,0.09)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(124,92,255,0.34)' },
  remixName: { marginTop: 4, color: colors.text, fontSize: 12, fontWeight: '900' },
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
  advancedSummary: { minHeight: 66, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  advancedIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  advancedTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  advancedText: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  generateButton: { minHeight: 58, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 17, backgroundColor: colors.black, shadowColor: colors.black, shadowOpacity: 0.2, shadowRadius: 14, elevation: 7 },
  generateText: { flex: 1, color: colors.paper, fontSize: 14, fontWeight: '900' },
  generateCost: { color: 'rgba(255,250,242,0.56)', fontSize: 10, fontWeight: '900' },
  buyButton: { height: 45, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,250,242,0.82)', borderWidth: 1, borderColor: colors.border },
  buyText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  livePanel: { borderRadius: 24, padding: 14, gap: 9, backgroundColor: 'rgba(124,92,255,0.10)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.24)' },
  liveTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
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
  trackRow: { minHeight: 76, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: colors.border },
  trackCover: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.06)' },
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
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  authIcon: { width: 70, height: 70, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  authTitle: { marginTop: 16, color: colors.text, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  authText: { marginTop: 7, color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  authButton: { marginTop: 18, height: 48, borderRadius: 24, justifyContent: 'center', paddingHorizontal: 22, backgroundColor: colors.black },
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
