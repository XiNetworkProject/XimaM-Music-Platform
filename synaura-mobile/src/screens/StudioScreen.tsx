import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api, type AILibraryTrack, type ApiTrack } from '../services/api';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { SynauraLogotype } from '../components/SynauraLogo';
import { ENV } from '../config/env';

const { width } = Dimensions.get('window');

const MODELS = ['V4_5', 'V4_5PLUS', 'V5'] as const;
const POLL_INTERVAL_MS = 4000;

// Presets alignés web (aiStudioPresets)
const PRESETS = [
  { id: 'edm', label: 'EDM Banger', desc: 'Drop puissant, lead agressif', style: 'EDM, festival, punchy', tags: ['edm', 'festival', 'drop'], instrumental: false },
  { id: 'lofi', label: 'Lo-fi Chill', desc: 'Guitares détendues, ambiance cosy', style: 'Lo-fi, chill, cosy, vinyle', tags: ['lofi', 'chill', 'study'], instrumental: true },
  { id: 'synaura', label: 'Synaura Signature', desc: 'EDM émotionnel, néon', style: 'EDM émotionnel, néon, futuriste', tags: ['edm', 'emotional', 'anthem'], instrumental: false },
  { id: 'cinematic', label: 'Ciné / Trailer', desc: 'Cordes, percussions épiques', style: 'Cinématique, bande-annonce, cordes', tags: ['epic', 'orchestral'], instrumental: true },
  { id: 'weird', label: 'Weird / Expérimental', desc: 'Glitch, sound design', style: 'Expérimental, glitch, textures', tags: ['weird', 'glitch'], instrumental: true },
];

// Catégories de tags (alignées web)
const TAG_CATEGORIES: { id: string; label: string; tags: string[] }[] = [
  { id: 'genre', label: 'Genre', tags: ['pop', 'rock', 'electronic', 'hip hop', 'lo-fi', 'house', 'ambient', 'jazz', 'trap', 'edm', 'folk', 'R&B', 'indie', 'synthwave'] },
  { id: 'mood', label: 'Ambiance', tags: ['emotional', 'dark', 'uplifting', 'moody', 'cinematic', 'nostalgic', 'dreamy', 'euphoric', 'powerful', 'melancholic'] },
  { id: 'production', label: 'Production', tags: ['lo-fi', 'polished', 'vintage', 'warm', 'minimal', 'atmospheric', 'crisp', 'modern'] },
  { id: 'vocal', label: 'Voix / Instrument', tags: ['breathy vocals', 'synth-driven', 'acoustic guitar', 'ethereal vocals', 'piano', 'strings'] },
];

function aiTrackToApiTrack(t: AILibraryTrack, index: number): ApiTrack {
  const audioUrl = t.audio_url || t.stream_audio_url || '';
  const coverUrl = t.image_url ? (t.image_url.startsWith('http') ? t.image_url : `${ENV.API_BASE_URL}${t.image_url}`) : undefined;
  return {
    _id: `ai-${t.id}`,
    title: t.title || 'Sans titre',
    artist: { _id: 'ai', name: 'Synaura IA', username: 'synaura-ia' },
    audioUrl,
    coverUrl: coverUrl || undefined,
    duration: typeof t.duration === 'number' ? t.duration : 120,
    lyrics: t.lyrics || t.prompt || undefined,
  };
}

export default function StudioScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, token } = useAuth();
  const { playTrack } = usePlayer();

  const [tab, setTab] = useState<'create' | 'library' | 'ab'>('create');
  const [createMode, setCreateMode] = useState<'simple' | 'custom' | 'remix'>('simple');
  const [credits, setCredits] = useState<number>(0);
  const [libraryTracks, setLibraryTracks] = useState<AILibraryTrack[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryRefreshing, setLibraryRefreshing] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Formulaire
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<string>(MODELS[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [remixSourceTrack, setRemixSourceTrack] = useState<AILibraryTrack | null>(null);

  // A/B compare (comme web)
  const [slotA, setSlotA] = useState<AILibraryTrack | null>(null);
  const [slotB, setSlotB] = useState<AILibraryTrack | null>(null);

  // Génération en cours
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generateStatus, setGenerateStatus] = useState<string>('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCredits = useCallback(async (authToken?: string | null) => {
    setCreditsLoading(true);
    setApiError(null);
    const t = authToken ?? token;
    api.setToken(t ?? null);
    const r = await api.getAICredits(t);
    if (r.success) {
      setCredits(r.data.balance ?? 0);
    } else {
      setApiError(r.error || 'Erreur chargement crédits');
    }
    setCreditsLoading(false);
  }, [token]);

  const loadLibrary = useCallback(async (isRefresh = false, authToken?: string | null) => {
    if (isRefresh) setLibraryRefreshing(true);
    else setLibraryLoading(true);
    const t = authToken ?? token;
    api.setToken(t ?? null);
    const r = await api.getAILibraryTracks(100, 0, '', t);
    if (r.success) {
      setLibraryTracks(r.data.tracks ?? []);
      setApiError(null);
    } else if (!r.success && r.error) {
      setApiError(r.error);
    }
    if (isRefresh) setLibraryRefreshing(false);
    else setLibraryLoading(false);
  }, [token]);

  // Charger crédits et bibliothèque avec le token du contexte (comme le web avec les cookies)
  useEffect(() => {
    if (user && token) {
      loadCredits(token);
      loadLibrary(false, token);
    }
  }, [user, token, loadCredits, loadLibrary]);

  useEffect(() => {
    if (user && (tab === 'library' || tab === 'ab')) loadLibrary();
  }, [user, tab, loadLibrary]);

  useEffect(() => {
    if (user && createMode === 'remix' && libraryTracks.length === 0 && !libraryLoading) loadLibrary();
  }, [user, createMode, libraryTracks.length, libraryLoading, loadLibrary]);

  const applyPreset = useCallback((p: typeof PRESETS[0]) => {
    setTitle(p.label);
    setStyle(p.style);
    setSelectedTags(p.tags);
    setInstrumental(p.instrumental);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(-20)));
  }, []);

  const pollStatus = useCallback(async (taskId: string) => {
    const r = await api.getAIGenerationStatus(taskId);
    if (!r.success) {
      setGenerateStatus('Erreur statut');
      return;
    }
    const status = (r.data as any).status?.toUpperCase?.() || '';
    if (status === 'SUCCESS' || status === 'COMPLETE') {
      setGenerateStatus('Terminé !');
      setCurrentTaskId(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setCredits((prev) => Math.max(0, prev - 1));
      loadCredits();
      loadLibrary();
      return;
    }
    if (status === 'ERROR' || status === 'FAILED' || status.includes('FAILED')) {
      setGenerateStatus('Échec');
      setCurrentTaskId(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      loadCredits();
      return;
    }
    setGenerateStatus(status === 'PENDING' || status === 'TEXT_SUCCESS' ? 'Préparation…' : 'Génération…');
  }, [loadCredits, loadLibrary]);

  useEffect(() => {
    if (!currentTaskId) return;
    pollStatus(currentTaskId);
    pollRef.current = setInterval(() => pollStatus(currentTaskId), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentTaskId, pollStatus]);

  const styleWithTags = [style.trim(), ...selectedTags].filter(Boolean).join(', ') || undefined;

  const onGenerate = useCallback(async () => {
    setGenerateError(null);
    const isCustom = createMode === 'custom' || createMode === 'remix';
    const promptText = isCustom ? prompt.trim() : description.trim();
    if (createMode === 'remix') {
      if (!remixSourceTrack) {
        setGenerateError('Choisis une piste source dans ta bibliothèque.');
        return;
      }
      const uploadUrl = remixSourceTrack.audio_url || remixSourceTrack.stream_audio_url;
      if (!uploadUrl) {
        setGenerateError('Cette piste n’a pas d’URL audio.');
        return;
      }
      if (!promptText && !instrumental) {
        setGenerateError('Saisis les paroles ou active Instrumental.');
        return;
      }
      if (!title.trim()) {
        setGenerateError('Donne un titre.');
        return;
      }
      setGenerateLoading(true);
      const r = await api.startAIRemix({
        uploadUrl,
        title: title.trim(),
        style: styleWithTags || '',
        prompt: promptText || undefined,
        instrumental,
        model: model || MODELS[0],
        customMode: true,
        sourceDurationSec: typeof remixSourceTrack.duration === 'number' ? remixSourceTrack.duration : undefined,
      });
      setGenerateLoading(false);
      if (!r.success) {
        setGenerateError((r as any).error || 'Erreur');
        if ((r as any).insufficientCredits) setGenerateError('Crédits insuffisants.');
        return;
      }
      const data = r.data as any;
      if (data.insufficientCredits || data.error) {
        setGenerateError(data.error || 'Crédits insuffisants.');
        return;
      }
      if (data.taskId) {
        setCurrentTaskId(data.taskId);
        setGenerateStatus('Remix en cours…');
      }
      if (typeof data.credits?.balance === 'number') setCredits(data.credits.balance);
      return;
    }
    if (!promptText && !instrumental) {
      setGenerateError(isCustom ? 'Saisis les paroles ou active Instrumental.' : 'Décris le son souhaité.');
      return;
    }
    if (isCustom && !title.trim()) {
      setGenerateError('Donne un titre.');
      return;
    }

    setGenerateLoading(true);
    const r = await api.startAIGeneration({
      customMode: isCustom,
      title: isCustom ? title.trim() : undefined,
      style: styleWithTags || (isCustom ? style.trim() || undefined : undefined),
      prompt: promptText || undefined,
      instrumental,
      model: model || MODELS[0],
    });

    setGenerateLoading(false);
    if (!r.success) {
      setGenerateError(r.error || 'Erreur');
      const data = r as any;
      if (data.insufficientCredits) setGenerateError('Crédits insuffisants.');
      return;
    }

    const data = r.data as any;
    if (data.insufficientCredits || data.error) {
      setGenerateError(data.error || 'Crédits insuffisants.');
      return;
    }

    const taskId = data.taskId;
    if (taskId) {
      setCurrentTaskId(taskId);
      setGenerateStatus('Lancement…');
    }
    if (typeof data.credits?.balance === 'number') setCredits(data.credits.balance);
  }, [createMode, description, title, style, styleWithTags, prompt, instrumental, model, remixSourceTrack, selectedTags]);

  const onPlayTrack = useCallback(
    (t: AILibraryTrack, index: number) => {
      const apiTrack = aiTrackToApiTrack(t, index);
      playTrack(apiTrack);
    },
    [playTrack]
  );

  const renderLibraryItem = useCallback(
    ({ item, index }: { item: AILibraryTrack; index: number }) => {
      const coverUrl = item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${ENV.API_BASE_URL}${item.image_url}`) : null;
      const dur = typeof item.duration === 'number' ? item.duration : 0;
      const min = Math.floor(dur / 60);
      const sec = dur % 60;
      const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

      return (
        <Pressable style={({ pressed }) => [styles.libraryCard, pressed && { opacity: 0.96 }]} onPress={() => onPlayTrack(item, index)}>
          <View style={styles.libraryCardCover}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['rgba(139,92,246,0.7)', 'rgba(56,189,248,0.7)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
          </View>
          <View style={styles.libraryCardInfo}>
            <Text style={styles.libraryCardTitle} numberOfLines={1}>{item.title || 'Sans titre'}</Text>
            <Text style={styles.libraryCardMeta}>{timeStr} · {item.model_name || 'IA'}</Text>
          </View>
          <Pressable style={styles.libraryCardPlay} onPress={(e) => { (e as any)?.stopPropagation?.(); onPlayTrack(item, index); }}>
            <Ionicons name="play" size={18} color="#fff" />
          </Pressable>
        </Pressable>
      );
    },
    [onPlayTrack]
  );

  if (!user) {
    const root = navigation.getParent();
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#020017', '#05010b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.backgroundGrid} />
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowBottom} />
        <View style={[styles.safeArea, { paddingTop: Math.max(12, insets.top) }]}>
          <View style={styles.topBar}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerLabel}>Studio</Text>
                <SynauraLogotype height={22} />
              </View>
            </View>
          </View>
          <View style={styles.authGateCard}>
            <View style={styles.authGateIcon}>
              <LinearGradient colors={['#8b5cf6', '#d946ef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="sparkles" size={40} color="#fff" />
            </View>
            <Text style={styles.authGateTitle}>Connecte-toi pour accéder au Studio IA</Text>
            <Text style={styles.authGateSubtitle}>
              Génère des morceaux, gère ta bibliothèque et compare tes pistes avec un compte Synaura.
            </Text>
            <Pressable style={({ pressed }) => [styles.authGateBtn, pressed && { opacity: 0.95 }]} onPress={() => root?.navigate('Login')}>
              <LinearGradient colors={['#8b5cf6', '#d946ef', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.authGateBtnGrad}>
                <Text style={styles.authGateBtnText}>Se connecter</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.authGateBtnSecondary, pressed && { opacity: 0.9 }]} onPress={() => root?.navigate('SignUp')}>
              <Text style={styles.authGateBtnSecondaryText}>Créer un compte</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#020017', '#05010b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.backgroundGrid} />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <View style={[styles.safeArea, { paddingTop: Math.max(12, insets.top) }]}>
          <View style={styles.topBar}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerLabel}>Studio</Text>
              <SynauraLogotype height={22} />
            </View>
            <Pressable style={styles.headerButton}>
              <Ionicons name="diamond-outline" size={12} color="#e9d5ff" />
              <Text style={styles.headerButtonText}>{creditsLoading ? '…' : credits}</Text>
            </Pressable>
          </View>
          {apiError ? (
            <View style={styles.apiErrorBanner}>
              <Ionicons name="warning" size={18} color="#f87171" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
                <Text style={styles.apiErrorHint}>Déconnecte-toi puis reconnecte-toi. Si ça persiste, vérifie que l’app pointe vers le bon serveur.</Text>
                <Pressable
                  style={{ marginTop: 8, paddingVertical: 4 }}
                  onPress={async () => {
                    const r = await api.getAuthDebug();
                    const msg = r.success
                      ? `Diagnostic: verify=${r.data?.verify}${r.data?.userId ? ` userId=${r.data.userId}` : ''}`
                      : `Diagnostic erreur: ${r.error}`;
                    const details = r.success ? JSON.stringify(r.data, null, 2) : r.error;
                    Alert.alert('Diagnostic API', msg + '\n\n' + details);
                  }}
                >
                  <Text style={{ color: '#93c5fd', fontSize: 12 }}>Voir diagnostic</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {currentTaskId ? (
            <LinearGradient
              colors={['rgba(79,70,229,0.35)', 'rgba(139,92,246,0.3)', 'rgba(56,189,248,0.25)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generatingBanner}
            >
              <ActivityIndicator size="small" color="#f9fafb" />
              <Text style={styles.generatingText}>{generateStatus}</Text>
            </LinearGradient>
          ) : null}
          <View style={styles.pillsWrap}>
            <Pressable style={[styles.pill, tab === 'create' && styles.pillActive]} onPress={() => setTab('create')}>
              <Ionicons name="add-circle-outline" size={14} color={tab === 'create' ? '#f9fafb' : '#94a3b8'} />
              <Text style={[styles.pillText, tab === 'create' && styles.pillTextActive]}>Créer</Text>
            </Pressable>
            <Pressable style={[styles.pill, tab === 'library' && styles.pillActive]} onPress={() => setTab('library')}>
              <Ionicons name="library-outline" size={14} color={tab === 'library' ? '#f9fafb' : '#94a3b8'} />
              <Text style={[styles.pillText, tab === 'library' && styles.pillTextActive]}>Bibliothèque</Text>
            </Pressable>
            <Pressable style={[styles.pill, tab === 'ab' && styles.pillActive]} onPress={() => setTab('ab')}>
              <Ionicons name="git-compare-outline" size={14} color={tab === 'ab' ? '#f9fafb' : '#94a3b8'} />
              <Text style={[styles.pillText, tab === 'ab' && styles.pillTextActive]}>A/B</Text>
            </Pressable>
          </View>
        </View>

      {tab === 'create' ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.tabContent}>
          <ScrollView
            style={styles.createScroll}
            contentContainerStyle={styles.createScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="sparkles-outline" size={16} color="#bfdbfe" />
                  <Text style={styles.sectionHeaderTitle}>Presets</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll} contentContainerStyle={styles.presetsScrollContent}>
                {PRESETS.map((p) => (
                  <Pressable key={p.id} style={({ pressed }) => [styles.presetCard, pressed && { opacity: 0.9 }]} onPress={() => applyPreset(p)}>
                    <Text style={styles.presetCardLabel}>{p.label}</Text>
                    <Text style={styles.presetCardDesc} numberOfLines={1}>{p.desc}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="options-outline" size={16} color="#bfdbfe" />
                  <Text style={styles.sectionHeaderTitle}>Mode & Modèle</Text>
                </View>
              </View>
              <View style={styles.card}>
                <View style={styles.modeWrapper}>
                  <Pressable style={[styles.modeBtn, createMode === 'simple' && styles.modeBtnActive]} onPress={() => { setCreateMode('simple'); setRemixSourceTrack(null); }}>
                    <Text style={[styles.modeBtnText, createMode === 'simple' && styles.modeBtnTextActive]}>Simple</Text>
                  </Pressable>
                  <Pressable style={[styles.modeBtn, createMode === 'custom' && styles.modeBtnActive]} onPress={() => { setCreateMode('custom'); setRemixSourceTrack(null); }}>
                    <Text style={[styles.modeBtnText, createMode === 'custom' && styles.modeBtnTextActive]}>Custom</Text>
                  </Pressable>
                  <Pressable style={[styles.modeBtn, createMode === 'remix' && styles.modeBtnRemixActive]} onPress={() => setCreateMode('remix')}>
                    <Text style={[styles.modeBtnText, createMode === 'remix' && styles.modeBtnTextRemix]}>Remix</Text>
                  </Pressable>
                </View>
                <View style={styles.modelRow}>
                  {MODELS.map((m) => (
                    <Pressable key={m} style={[styles.modelChip, model === m && styles.modelChipActive]} onPress={() => setModel(m)}>
                      <Text style={[styles.modelChipText, model === m && styles.modelChipTextActive]}>{m === 'V4_5PLUS' ? 'v4.5+' : m === 'V5' ? 'v5' : 'v4.5'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {createMode === 'remix' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="musical-notes-outline" size={16} color="#bfdbfe" />
                    <Text style={styles.sectionHeaderTitle}>Source audio (obligatoire)</Text>
                  </View>
                </View>
                <View style={[styles.card, styles.remixCard]}>
                  {remixSourceTrack ? (
                    <View style={styles.remixSourceRow}>
                      <View style={styles.remixSourceInfo}>
                        <Text style={styles.remixSourceTitle} numberOfLines={1}>{remixSourceTrack.title}</Text>
                        <Text style={styles.remixSourceMeta}>Piste bibliothèque</Text>
                      </View>
                      <Pressable style={styles.remixSourceClear} onPress={() => setRemixSourceTrack(null)}>
                        <Ionicons name="close-circle" size={24} color="#94a3b8" />
                      </Pressable>
                    </View>
                  ) : null}
                  {!remixSourceTrack && libraryTracks.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.remixPicksScroll}>
                      {libraryTracks.slice(0, 15).map((t) => (
                        <Pressable key={t.id} style={styles.remixPickChip} onPress={() => setRemixSourceTrack(t)}>
                          <Text style={styles.remixPickLabel} numberOfLines={1}>{t.title || 'Sans titre'}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                  {!remixSourceTrack && libraryTracks.length === 0 && (
                    <Text style={styles.fieldHint}>Ouvre l’onglet Bibliothèque puis reviens choisir une piste.</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name={createMode === 'simple' ? 'chatbox-outline' : 'document-text-outline'} size={16} color="#bfdbfe" />
                  <Text style={styles.sectionHeaderTitle}>{createMode === 'simple' ? 'Description' : 'Titre, style & paroles'}</Text>
                </View>
              </View>
              <View style={styles.card}>
                {createMode === 'simple' ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: une ballade piano mélancolique, voix douce"
                      placeholderTextColor="#94a3b8"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      maxLength={500}
                    />
                    <Text style={styles.fieldHint}>{description.length}/500</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Titre</Text>
                    <TextInput style={styles.input} placeholder="Ex: Summer Vibes" placeholderTextColor="#94a3b8" value={title} onChangeText={setTitle} maxLength={100} />
                    <Text style={styles.fieldHint}>{title.length}/100</Text>
                    <Text style={styles.fieldLabel}>Style</Text>
                    <TextInput style={styles.input} placeholder="Ex: Pop, RnB, Lo-fi" placeholderTextColor="#94a3b8" value={style} onChangeText={setStyle} maxLength={200} />
                    <Text style={styles.fieldHint}>{style.length}/200</Text>
                    <Text style={styles.fieldLabel}>Paroles</Text>
                    <TextInput style={[styles.input, styles.inputLyrics]} placeholder="[Verse] ... [Chorus] ..." placeholderTextColor="#94a3b8" value={prompt} onChangeText={setPrompt} multiline maxLength={5000} />
                    <Text style={styles.fieldHint}>{prompt.length}/5000</Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="pricetag-outline" size={16} color="#bfdbfe" />
                  <Text style={styles.sectionHeaderTitle}>Tags (optionnel)</Text>
                </View>
                {selectedTags.length > 0 && (
                  <Pressable onPress={() => setSelectedTags([])}>
                    <Text style={styles.sectionHeaderAction}>Effacer</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.card}>
                {TAG_CATEGORIES.map((cat) => (
                  <View key={cat.id} style={styles.tagCategory}>
                    <Text style={styles.tagCategoryLabel}>{cat.label}</Text>
                    <View style={styles.tagChipsRow}>
                      {cat.tags.slice(0, 12).map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                          <Pressable key={tag} style={[styles.tagChip, active && styles.tagChipActive]} onPress={() => toggleTag(tag)}>
                            <Text style={[styles.tagChipText, active && styles.tagChipTextActive]} numberOfLines={1}>{tag}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <Pressable style={styles.instrumentalRow} onPress={() => setInstrumental(!instrumental)}>
                  <Ionicons name={instrumental ? 'checkbox' : 'square-outline'} size={22} color="#e5e7eb" />
                  <Text style={styles.instrumentalLabel}>Instrumental (sans paroles)</Text>
                </Pressable>
                {generateError ? <Text style={styles.errorText}>{generateError}</Text> : null}
                <Pressable
                  style={[styles.generateBtn, (generateLoading || credits < 1 || (createMode === 'remix' && !remixSourceTrack)) && styles.generateBtnDisabled]}
                  onPress={onGenerate}
                  disabled={generateLoading || credits < 1 || (createMode === 'remix' && !remixSourceTrack)}
                >
                  {generateLoading ? (
                    <ActivityIndicator size="small" color="#f9fafb" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color="#f9fafb" />
                      <Text style={styles.generateBtnText}>{createMode === 'remix' ? 'Remix (1 crédit)' : 'Générer (1 crédit)'}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : tab === 'ab' ? (
        <View style={styles.tabContent}>
        <ScrollView style={styles.abPanel} contentContainerStyle={styles.abPanelContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="git-compare-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sectionHeaderTitle}>Comparer A / B</Text>
              </View>
            </View>
            <View style={styles.abSlots}>
              <View style={styles.abSlot}>
                <Text style={styles.abSlotLabel}>A</Text>
                <Text style={styles.abSlotTitle} numberOfLines={1}>{slotA?.title || '—'}</Text>
                <Pressable style={[styles.abSlotPlayBtn, !slotA && styles.abPlayBtnDisabled]} onPress={() => slotA && onPlayTrack(slotA, 0)} disabled={!slotA}>
                  <Ionicons name="play" size={18} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.abSlot}>
                <Text style={styles.abSlotLabel}>B</Text>
                <Text style={styles.abSlotTitle} numberOfLines={1}>{slotB?.title || '—'}</Text>
                <Pressable style={[styles.abSlotPlayBtn, !slotB && styles.abPlayBtnDisabled]} onPress={() => slotB && onPlayTrack(slotB, 0)} disabled={!slotB}>
                  <Ionicons name="play" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="library-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sectionHeaderTitle}>Choisir une piste</Text>
              </View>
            </View>
            {libraryTracks.slice(0, 30).map((t) => (
              <View key={t.id} style={styles.abLibraryRow}>
                <Text style={styles.abLibraryTitle} numberOfLines={1}>{t.title || 'Sans titre'}</Text>
                <View style={styles.abLibraryActions}>
                  <Pressable style={styles.abSetBtn} onPress={() => setSlotA(t)}><Text style={styles.abSetBtnText}>A</Text></Pressable>
                  <Pressable style={styles.abSetBtn} onPress={() => setSlotB(t)}><Text style={styles.abSetBtnText}>B</Text></Pressable>
                  <Pressable style={styles.abSlotPlayBtn} onPress={() => onPlayTrack(t, 0)}><Ionicons name="play" size={16} color="#fff" /></Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        </View>
      ) : (
        <View style={styles.tabContent}>
        <FlatList
          data={libraryTracks}
          keyExtractor={(item) => item.id}
          renderItem={renderLibraryItem}
          contentContainerStyle={[styles.libraryList, libraryTracks.length === 0 && styles.libraryListEmpty]}
          ListHeaderComponent={
            libraryTracks.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="library-outline" size={16} color="#bfdbfe" />
                    <Text style={styles.sectionHeaderTitle}>Vos pistes IA</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            libraryLoading ? (
              <View style={styles.emptyCenter}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.emptyText}>Chargement…</Text>
              </View>
            ) : (
              <View style={styles.emptyCenter}>
                <Ionicons name="musical-notes-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyText}>Aucun morceau encore</Text>
                <Text style={styles.emptySubtext}>Génère ton premier son dans l’onglet Créer</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={libraryRefreshing} onRefresh={() => loadLibrary(true)} tintColor="#8b5cf6" />
          }
        />
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020017' },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  backgroundGrid: {
    position: 'absolute',
    inset: 0,
    opacity: 0.14,
    backgroundColor: 'transparent',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.55)',
    opacity: 0.7,
    filter: 'blur(60px)' as any,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.5)',
    opacity: 0.7,
    filter: 'blur(60px)' as any,
  },
  topBar: {
    flexDirection: 'column',
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {},
  headerLabel: { fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase', color: '#94a3b8' },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.2)',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  headerButtonText: { fontSize: 11, color: '#f9fafb', fontWeight: '600' },
  apiErrorBanner: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  apiErrorText: { color: '#fca5a5', fontSize: 13, flex: 1 },
  apiErrorHint: { color: '#94a3b8', fontSize: 11, flex: 1 },
  generatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 0,
    borderRadius: 10,
    overflow: 'hidden',
  },
  generatingText: { color: '#f9fafb', fontWeight: '600', fontSize: 13 },
  pillsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  pillActive: { backgroundColor: 'rgba(139,92,246,0.35)', borderColor: 'rgba(139,92,246,0.5)' },
  pillText: { fontSize: 11, color: '#e5e7eb' },
  pillTextActive: { color: '#f9fafb', fontWeight: '600' },
  tabContent: { flex: 1, minHeight: 0 },
  createPanel: { flex: 1, minHeight: 0 },
  createScroll: { flex: 1 },
  createScrollContent: { paddingTop: 0, paddingBottom: 24 },
  section: { marginBottom: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '600', color: '#e5e7eb' },
  sectionHeaderAction: { fontSize: 11, color: '#94a3b8' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
  },
  presetsScroll: { marginTop: 0 },
  presetsScrollContent: { gap: 6, paddingRight: 16 },
  presetCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    minWidth: 120,
  },
  presetCardLabel: { fontSize: 13, fontWeight: '700', color: '#f9fafb' },
  presetCardDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  modeWrapper: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 4,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnRemixActive: { backgroundColor: 'rgba(34,211,238,0.2)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)' },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  modeBtnTextActive: { color: '#000' },
  modeBtnTextRemix: { color: '#a5f3fc' },
  modelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  remixCard: { borderColor: 'rgba(34,211,238,0.3)', backgroundColor: 'rgba(34,211,238,0.06)' },
  remixSourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.9)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.4)', marginBottom: 12 },
  remixSourceInfo: { flex: 1, minWidth: 0 },
  remixSourceTitle: { fontSize: 14, fontWeight: '600', color: '#f9fafb' },
  remixSourceMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  remixSourceClear: { padding: 4 },
  remixPicksScroll: { marginBottom: 12, maxHeight: 44 },
  remixPickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.5)', marginRight: 8 },
  remixPickLabel: { fontSize: 12, color: '#e5e7eb', maxWidth: 100 },
  tagCategory: { marginBottom: 8 },
  tagCategoryLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginBottom: 4 },
  tagChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.5)' },
  tagChipActive: { backgroundColor: 'rgba(251,191,36,0.3)', borderColor: 'rgba(251,191,36,0.5)' },
  tagChipText: { fontSize: 11, color: '#e5e7eb' },
  tagChipTextActive: { color: '#fbbf24' },
  clearTagsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  clearTagsText: { fontSize: 12, color: '#94a3b8' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#e5e7eb', marginBottom: 4 },
  fieldHint: { fontSize: 10, color: '#94a3b8', marginTop: 2, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f9fafb',
    marginBottom: 6,
  },
  inputLyrics: { minHeight: 80, textAlignVertical: 'top' },
  modelChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  modelChipActive: { backgroundColor: 'rgba(139,92,246,0.4)', borderColor: 'rgba(139,92,246,0.5)' },
  modelChipText: { fontSize: 13, color: '#94a3b8' },
  modelChipTextActive: { color: '#f9fafb' },
  instrumentalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  instrumentalLabel: { fontSize: 14, color: '#e5e7eb' },
  errorText: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.25)',
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: 16, fontWeight: '800', color: '#f9fafb' },
  libraryList: { paddingBottom: 80, gap: 8 },
  libraryListEmpty: { flexGrow: 1, paddingBottom: 80 },
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.12)',
    backgroundColor: 'rgba(15,23,42,0.7)',
    gap: 10,
  },
  libraryCardCover: {
    width: 46,
    height: 46,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  libraryCardInfo: { flex: 1, minWidth: 0 },
  libraryCardTitle: { fontSize: 14, fontWeight: '700', color: '#f9fafb' },
  libraryCardMeta: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  libraryCardPlay: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCenter: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#e5e7eb', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  abPanel: { flex: 1 },
  abPanelContent: { paddingBottom: 24, flexGrow: 1 },
  abSlots: { flexDirection: 'row', gap: 10, marginTop: 2 },
  abSlot: {
    flex: 1,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.12)',
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  abSlotLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#a78bfa', marginBottom: 4 },
  abSlotTitle: { fontSize: 13, color: '#e5e7eb', flex: 1 },
  abSlotPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  abPlayBtnDisabled: { opacity: 0.4 },
  abLibraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginBottom: 4,
  },
  abLibraryTitle: { flex: 1, fontSize: 14, color: '#f9fafb' },
  abLibraryActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  abSetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  abSetBtnText: { fontSize: 12, fontWeight: '700', color: '#e5e7eb' },
  authGateCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  authGateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  authGateTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 10 },
  authGateSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  authGateBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  authGateBtnGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  authGateBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  authGateBtnSecondary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    alignItems: 'center',
  },
  authGateBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#e5e7eb' },
});
