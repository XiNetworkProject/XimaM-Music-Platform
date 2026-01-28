'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from '@/components/NotificationCenter';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Music, Mic, Settings, Play, Pause, SkipBack, SkipForward, Zap, Download, Share2, Volume2, VolumeX, Coins, RefreshCw, ChevronRight, Heart, X, ThumbsUp, MessageCircle, ExternalLink, Trash2, Repeat, Search, SlidersHorizontal } from 'lucide-react';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { fetchCreditsBalance } from '@/lib/credits';
import { useAIQuota } from '@/hooks/useAIQuota';
import { useAudioPlayer } from '@/app/providers';
import { useSunoWaiter } from '@/hooks/useSunoWaiter';
import { AIGeneration, AITrack } from '@/lib/aiGenerationService';
import { useSession } from 'next-auth/react';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { PresetStrip } from '@/components/ai-studio/PresetStrip';
import { GenerationTimeline } from '@/components/ai-studio/GenerationTimeline';
import { TrackInspector } from '@/components/ai-studio/TrackInspector';
import { RemixDropzone } from '@/components/ai-studio/RemixDropzone';
import { LibraryClipsList } from '@/components/ai-studio/LibraryClipsList';
import { aiStudioPresets } from '@/lib/aiStudioPresets';
import StudioBackground from '@/components/StudioBackground';
import type { GeneratedTrack, AIStudioPreset } from '@/lib/aiStudioTypes';
import { SUNO_BTN_BASE, SUNO_FIELD, SUNO_SELECT, SUNO_TEXTAREA, SUNO_INPUT, SUNO_PILL_SOLID, SUNO_PANEL } from '@/components/ui/sunoClasses';
import { SunoAccordionSection } from '@/components/ui/SunoAccordionSection';
import { SunoSlider } from '@/components/ui/SunoSlider';

const DEBUG_AI_STUDIO = process.env.NODE_ENV !== 'production';

// Interface Track compatible avec le lecteur principal
interface PlayerTrack {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
}

// Composant "Orb" de statut pour la génération
function StudioStatusOrb({
  isGenerating,
  generationStatus,
}: {
  isGenerating: boolean;
  generationStatus: 'idle' | 'pending' | 'completed' | 'failed';
}) {
  const isActive = isGenerating || generationStatus === 'pending';
  const isError = generationStatus === 'failed';
  return (
    <div className="relative flex items-center justify-center">
      {/* Anneau externe */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border border-white/10 bg-gradient-to-br from-white/8 via-transparent to-transparent"
        animate={{
          rotate: isActive ? [0, 180, 360] : 0,
        }}
        transition={{
          duration: 18,
          repeat: isActive ? Infinity : 0,
          ease: 'linear',
        }}
      />
      {/* Halo */}
      <motion.div
        className={`absolute w-48 h-48 rounded-full blur-3xl ${isError ? 'bg-red-400/50' : 'bg-accent-brand/50'}`}
        animate={{
          opacity: [0.3, 0.8, 0.3],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Noyau */}
      <motion.div
        className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-[#0f061f] via-[#150b2a] to-[#050111] border border-white/15 shadow-[0_0_40px_rgba(120,95,255,0.65)] flex items-center justify-center overflow-hidden"
        animate={{
          scale: isActive ? [0.98, 1.04, 0.98] : 1,
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* "Equalizer" radial */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[2px] rounded-full bg-gradient-to-b from-cyan-300 via-fuchsia-400 to-violet-500"
              style={{ height: 20, transformOrigin: 'bottom center' }}
              animate={{
                scaleY: isActive ? [0.4, 1.6, 0.6] : 0.7,
                opacity: [0.3, 1, 0.5],
                rotate: (360 / 14) * i,
              }}
              transition={{
                duration: 1.6,
                delay: i * 0.08,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-1">
          <Music className="w-6 h-6 text-accent-brand drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/60">
            {isError
              ? 'Erreur'
              : isActive
              ? 'Génération'
              : generationStatus === 'completed'
              ? 'Prêt'
              : 'Studio'}
          </span>
        </div>
        <motion.div
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 backdrop-blur"
          animate={{
            opacity: isActive ? [0.4, 1, 0.4] : 0.6,
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[9px] font-semibold tracking-[0.18em] text-white/80 uppercase">
            {isActive ? 'Live' : 'Idle'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function AIGenerator() {
  const { data: session } = useSession();
  const { quota, loading: quotaLoading } = useAIQuota();
  const { audioState, playTrack, play, pause, nextTrack, previousTrack, setQueueAndPlay } = useAudioPlayer();
  // États pour la bibliothèque des générations (même logique que ai-library)
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [allTracks, setAllTracks] = useState<AITrack[]>([]);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [generationsError, setGenerationsError] = useState<string | null>(null);
  const { generations: bgGenerations, activeGenerations, startBackgroundGeneration } = useBackgroundGeneration();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<GeneratedTrack | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  
  // Utiliser le nouveau hook Suno
  const { state: sunoState, tracks: sunoTracks, error: sunoError } = useSunoWaiter(currentTaskId || undefined);
  const [customMode, setCustomMode] = useState(false);
  const [modelVersion, setModelVersion] = useState('V4_5');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };
  
  // États pour la bibliothèque des générations
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'instrumental' | 'with-lyrics'>('all');
  const [selectedGeneration, setSelectedGeneration] = useState<AIGeneration | null>(null);
  const [showLibrarySortDropdown, setShowLibrarySortDropdown] = useState(false);
  
  // États pour le panneau de track sélectionnée
  const [selectedTrack, setSelectedTrack] = useState<GeneratedTrack | null>(null);
  const [showTrackPanel, setShowTrackPanel] = useState(false);
  
  // Remix (upload audio) pour upload-cover
  const [remixFile, setRemixFile] = useState<File | null>(null);
  const [remixUploadUrl, setRemixUploadUrl] = useState<string | null>(null);
  const [remixUploading, setRemixUploading] = useState<boolean>(false);
  
  // Génération IA activée
  const isGenerationDisabled = false;

  // Accordions (panneau gauche)
  const [openProjectSection, setOpenProjectSection] = useState(true);
  const [openStyleSection, setOpenStyleSection] = useState(true);
  const [openLyricsSection, setOpenLyricsSection] = useState(true);
  const [openAdvancedSection, setOpenAdvancedSection] = useState(false);
  const [openResultsSection, setOpenResultsSection] = useState(true);
  const [showInspo, setShowInspo] = useState(true);

  const remixSectionRef = useRef<HTMLDivElement | null>(null);
  const presetStripRef = useRef<HTMLDivElement | null>(null);

  // --- Layout resizable (desktop) ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [leftPx, setLeftPx] = useState(450);
  const [rightPx, setRightPx] = useState(420);
  const dragRef = useRef<{ mode: 'left' | 'right' | null; startX: number; startLeft: number; startRight: number }>({
    mode: null,
    startX: 0,
    startLeft: 450,
    startRight: 420,
  });

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const beginDrag = (mode: 'left' | 'right') => (e: React.PointerEvent<HTMLDivElement>) => {
    // Only meaningful on large screens; still safe otherwise.
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startLeft: leftPx, startRight: rightPx };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.mode) return;
      const delta = e.clientX - d.startX;

      if (d.mode === 'left') {
        setLeftPx(clamp(d.startLeft + delta, 368, 620));
      } else {
        setRightPx(clamp(d.startRight - delta, 320, 520));
      }
    };
    const onUp = () => {
      dragRef.current.mode = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [leftPx, rightPx]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.library-sort-dropdown-container')) return;
      setShowLibrarySortDropdown(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Charger la bibliothèque (même logique que ai-library)
  const loadLibrary = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setGenerationsLoading(true);
      setGenerationsError(null);

      const [genRes, trRes] = await Promise.all([
        fetch('/api/ai/library', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }),
        fetch('/api/ai/library/tracks', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }),
      ]);

      if (!genRes.ok) {
        const txt = await genRes.text().catch(() => '');
        setGenerationsError(txt ? `Erreur chargement: ${txt}` : 'Erreur chargement de la bibliothèque');
        return;
      }

      const data = await genRes.json().catch(() => ({}));
      setGenerations(data.generations || []);

      if (trRes.ok) {
        const trJson = await trRes.json().catch(() => ({}));
        setAllTracks(trJson.tracks || []);
      } else {
        setAllTracks([]);
      }
    } catch (error) {
      if (DEBUG_AI_STUDIO) console.error('[AI Studio] Erreur chargement bibliothèque:', error);
      setGenerationsError('Impossible de charger la bibliothèque');
    } finally {
      setGenerationsLoading(false);
    }
  }, [session?.user?.id]);

  // Rafraîchir la bibliothèque
  const refreshGenerations = () => {
    loadLibrary();
  };

  // Filtrer les générations (même logique que ai-library)
  const filteredAndSortedGenerations = React.useMemo(() => {
    let filtered = generations.filter(generation => {
      const matchesSearch = searchQuery === '' || 
        generation.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        generation.tracks?.some(track => 
          track.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'instrumental' && generation.tracks?.some(track => track.prompt?.toLowerCase().includes('instrumental'))) ||
        (filterBy === 'with-lyrics' && generation.tracks?.some(track => !track.prompt?.toLowerCase().includes('instrumental')));
      
      return matchesSearch && matchesFilter;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return (a.tracks?.[0]?.title || 'Musique générée').localeCompare(b.tracks?.[0]?.title || 'Musique générée');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [generations, searchQuery, sortBy, filterBy]);

  // Convertir les tracks individuelles en générations groupées par generation_id
  const generationsFromTracks = React.useMemo(() => {
    if (allTracks.length === 0) {
      return [];
    }
    
    // Grouper les tracks par generation_id
    const tracksByGeneration = new Map<string, AITrack[]>();
    const generationMap = new Map<string, Partial<AIGeneration>>();
    
    allTracks.forEach((track: any) => {
      // L'API retourne peut-être generation_id directement ou via generation.id
      const genId = track.generation_id || track.generation?.id;
      if (!genId) {
        if (DEBUG_AI_STUDIO) console.warn('[AI Studio] Track sans generation_id:', track.id);
        return;
      }
      
      // Ajouter la track au groupe
      if (!tracksByGeneration.has(genId)) {
        tracksByGeneration.set(genId, []);
      }
      tracksByGeneration.get(genId)!.push(track);
      
      // Créer une génération virtuelle si elle n'existe pas
      if (!generationMap.has(genId)) {
        // Utiliser les infos de génération si disponibles (via JOIN), sinon utiliser la track
        const genInfo = track.generation || {};
        const firstTrack = track;
        generationMap.set(genId, {
          id: genId,
          user_id: genInfo.user_id || session?.user?.id || '',
          task_id: genInfo.task_id || '',
          prompt: genInfo.prompt || firstTrack.prompt || '',
          model: genInfo.model || firstTrack.model_name || 'V4_5',
          status: (genInfo.status || 'completed') as 'pending' | 'completed' | 'failed',
          created_at: genInfo.created_at || firstTrack.created_at,
          is_favorite: firstTrack.is_favorite || false,
          is_public: false,
          play_count: firstTrack.play_count || 0,
          like_count: firstTrack.like_count || 0,
          share_count: 0,
          metadata: {
            title: firstTrack.title,
            style: firstTrack.style || '',
          },
        });
      }
    });
    
    // Créer les générations complètes avec leurs tracks
    const result: AIGeneration[] = Array.from(generationMap.entries()).map(([genId, gen]) => ({
      ...gen as AIGeneration,
      tracks: tracksByGeneration.get(genId) || [],
    }));
    
    return result;
  }, [allTracks, session?.user?.id]);

  const generationsById = React.useMemo(() => {
    const m = new Map<string, AIGeneration>();
    const source = generations.length > 0 ? generations : generationsFromTracks;
    source.forEach((g) => m.set(String(g.id), g));
    return m;
  }, [generations, generationsFromTracks]);

  // Générations triées par date (plus récentes en premier)
  // (gardé pour logique interne; l'affichage principal de la Library se fait au niveau des tracks)
  const recentGenerationsSorted = React.useMemo(() => {
    const allGenerations = generations.length > 0 ? generations : generationsFromTracks;
    return [...allGenerations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [generations, generationsFromTracks]);

  // Jouer une track IA (même logique que ai-library)
  const aiTrackToPlayerTrack = (track: AITrack, generation: AIGeneration): PlayerTrack | null => {
    const playableUrl = track.audio_url || track.stream_audio_url || '';
    if (!playableUrl) return null;

    return {
      _id: `ai-${track.id}`,
      title: track.title,
      artist: {
        _id: (session?.user?.id as string) || 'ai-generator',
        name: (session?.user as any)?.name || (session?.user as any)?.username || 'IA Synaura',
        username: (session?.user as any)?.username || (session?.user as any)?.name || 'ai-generator',
        avatar: (session?.user as any)?.avatar || (session?.user as any)?.image || '/logo.png'
      },
      duration: track.duration,
      audioUrl: playableUrl,
      coverUrl: track.image_url || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: track.play_count || 0,
      likes: [],
      comments: [],
      // @ts-ignore - player Track accepte lyrics via providers
      lyrics: (track.prompt || generation.prompt || '').trim()
    };
  };

  const playAITrack = (track: AITrack, generation: AIGeneration) => {
    const pt = aiTrackToPlayerTrack(track, generation);
    if (!pt) {
      notify.error('Lecture', 'Cette piste n’a pas d’URL audio disponible (audio/stream).');
      return;
    }
    playTrack(pt as any);
  };

  const playGenerationQueue = (generation: AIGeneration) => {
    const tracks = generation.tracks || [];
    if (!tracks.length) {
      notify.error('Lecture', 'Aucune piste trouvée pour cette génération.');
      return;
    }

    const playable = tracks
      .map((t) => aiTrackToPlayerTrack(t, generation))
      .filter(Boolean) as PlayerTrack[];

    if (!playable.length) {
      notify.error('Lecture', 'Aucune piste jouable (audio/stream) dans cette génération.');
      return;
    }

    // Queue + lecture (plus “bibliothèque” et plus pratique pour réécouter)
    setQueueAndPlay(playable as any, 0);
    notify.music('Lecture', `Lecture de ${playable.length} piste(s)`);
  };

  // Fonction pour jouer une génération
  const handlePlayGeneration = (generation: AIGeneration) => {
    playGenerationQueue(generation);
  };

  // Toggle favori (même logique que ai-library)
  const toggleFavorite = async (generationId: string) => {
    try {
      const response = await fetch(`/api/ai/generations/${generationId}/favorite`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Mettre à jour l'état local
        setGenerations(prev => prev.map(g => 
          g.id === generationId 
            ? { ...g, is_favorite: !g.is_favorite }
            : g
        ));
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  // Télécharger une track (même logique que ai-library)
  const downloadTrack = async (track: AITrack) => {
    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synaura-${track.title || track.id}.wav`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  // Charger la bibliothèque au montage (même logique que ai-library)
  useEffect(() => {
    loadLibrary();
    const onUpdated = () => loadLibrary();
    window.addEventListener('aiLibraryUpdated', onUpdated as EventListener);
    return () => window.removeEventListener('aiLibraryUpdated', onUpdated as EventListener);
  }, [loadLibrary]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showModelDropdown && !target.closest('.model-dropdown-container')) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [weirdness, setWeirdness] = useState<number>(50);
  const [styleInfluence, setStyleInfluence] = useState<number>(50);
  const [audioWeight, setAudioWeight] = useState<number>(50);

  useEffect(() => {
    (async () => {
      const data = await fetchCreditsBalance();
      if (data && typeof data.balance === 'number') setCreditsBalance(data.balance);
    })();
    // Vérifier si retour de Checkout Stripe
    try {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('session_id');
      if (sid) {
        // Petit délai pour laisser le webhook agir
        setTimeout(async () => {
          const refreshed = await fetchCreditsBalance();
          if (refreshed && typeof refreshed.balance === 'number') setCreditsBalance(refreshed.balance);
          // Si pas d'effet, tente une vérification côté serveur (secours)
          try {
            const res = await fetch('/api/billing/credits/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) });
            if (res.ok) {
              const j = await res.json();
              if (j?.added) {
                const b = await fetchCreditsBalance();
                if (b && typeof b.balance === 'number') setCreditsBalance(b.balance);
              }
            }
          } catch {}
          // Nettoyer l'URL
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        }, 1500);
      }
    } catch {}
  }, []);
  const [vocalGender, setVocalGender] = useState<string>(''); // 'm' | 'f' | ''
  const [negativeTags, setNegativeTags] = useState<string>('');

  const [styleSuggestions, setStyleSuggestions] = useState<string[]>(['rock','hip hop','electronic','pop','lo-fi','house','afrobeat','ambient']);
  const [vibeSuggestions, setVibeSuggestions] = useState<string[]>(['dramatic builds','catchy beats','emotional','fast guitar','breathy vocals']);


  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/tags/suggestions', { headers: { 'Cache-Control': 'no-store' } });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            if (Array.isArray(json.styles) && json.styles.length) setStyleSuggestions(json.styles);
            if (Array.isArray(json.tags) && json.tags.length) setVibeSuggestions(json.tags);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Mémoire locale des préférences (dev simple)
  const persistTagPref = (tag: string) => {
    try {
      const key = 'ai_tag_prefs';
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) as Record<string, number> : {};
      map[tag] = (map[tag] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  };

  const defaultStylesPool = ['pop','electronic','hip hop','lo-fi','house','ambient','rock','jazz','trap','edm'];
  const defaultVibesPool = ['catchy beats','emotional','dramatic builds','fast guitar','breathy vocals','dark','uplifting','moody','cinematic'];

  const pickNextCandidate = (pool: string[], exclude: Set<string>): string | null => {
    for (const p of pool) {
      if (!exclude.has(p)) return p;
    }
    return null;
  };

  const handleTagClick = (tag: string) => {
    const isActive = selectedTags.includes(tag);
    if (!isActive) {
      setSelectedTags(prev => [...prev, tag]);
      persistTagPref(tag);
      if (customMode) {
        setStyle(prev => {
          const parts = prev.split(',').map(s => s.trim()).filter(Boolean);
          if (parts.includes(tag)) return prev;
          return parts.length ? `${prev}, ${tag}` : tag;
        });
      } else {
        // En mode simple, injecter dans la description si non présent
        setDescription(prev => {
          const parts = prev.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
          if (parts.includes(tag)) return prev;
          return prev.trim().length ? `${prev}, ${tag}` : tag;
        });
      }
      // Remplacer la suggestion sélectionnée par une nouvelle
      const allShown = new Set<string>([...styleSuggestions, ...vibeSuggestions, ...selectedTags, tag]);
      if (styleSuggestions.includes(tag)) {
        const candidate = pickNextCandidate([...styleSuggestions, ...defaultStylesPool], allShown);
        setStyleSuggestions(prev => prev.filter(t => t !== tag).concat(candidate ? [candidate] : []));
      } else if (vibeSuggestions.includes(tag)) {
        const candidate = pickNextCandidate([...vibeSuggestions, ...defaultVibesPool], allShown);
        setVibeSuggestions(prev => prev.filter(t => t !== tag).concat(candidate ? [candidate] : []));
      }
    } else {
      // Désélection
      setSelectedTags(prev => prev.filter(t => t !== tag));
      // Réinsérer à la fin de la liste correspondante pour reproposer plus tard
      if (styleSuggestions.indexOf(tag) === -1 && vibeSuggestions.indexOf(tag) === -1) {
        // Réinjecter côté styles par défaut
        setStyleSuggestions(prev => prev.concat(tag));
      }
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatCreditsCompact = (n: number) => {
    if (!Number.isFinite(n)) return String((n as any) ?? 0);
    if (n >= 1000) {
      const k = n / 1000;
      return `${k.toFixed(1)}k`;
    }
    return String(n);
  };

  const handleApplyPreset = (preset: AIStudioPreset) => {
    const d = preset.defaults;

    setActivePresetId(preset.id);

    if (d.title !== undefined) setTitle(d.title);
    if (d.description !== undefined) setDescription(d.description);
    if (d.style !== undefined) setStyle(d.style);
    if (d.isInstrumental !== undefined) setIsInstrumental(d.isInstrumental);
    if (typeof d.weirdness === 'number') setWeirdness(d.weirdness);
    if (typeof d.styleInfluence === 'number') setStyleInfluence(d.styleInfluence);
    if (typeof d.audioWeight === 'number') setAudioWeight(d.audioWeight);
    if (d.tags && d.tags.length) setSelectedTags(d.tags);
  };

  const playGenerated = (gt: GeneratedTrack) => {
    const playerTrack: PlayerTrack = {
      _id: `gen-${gt.id}`,
      title: gt.title || 'Musique générée',
      artist: {
        _id: 'ai-generator',
        name: 'Synaura IA',
        username: 'synaura-ai'
      },
      audioUrl: gt.audioUrl,
      coverUrl: gt.imageUrl || '/synaura_symbol.svg',
      duration: gt.duration || 120,
      likes: [],
      comments: [],
      plays: 0,
      genre: ['IA']
    };
    playTrack(playerTrack as any);
  };

  const downloadGenerated = async (gt: GeneratedTrack) => {
    try {
      const res = await fetch(gt.audioUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gt.title || 'synaura-track'}.wav`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {}
  };

  const shareGenerated = async (gt: GeneratedTrack) => {
    try {
      const shareData = {
        title: gt.title || 'Musique générée',
        text: 'Écoutez ma musique générée par IA sur Synaura',
        url: typeof window !== 'undefined' ? window.location.href : ''
      } as any;
      if ((navigator as any).share) {
        await (navigator as any).share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        notify.success('Partage', 'Lien copié');
      }
    } catch {}
  };

  // Fonction pour ouvrir le panneau de track
  const openTrackPanel = (track: GeneratedTrack) => {
    console.log('🎵 Ouverture du panneau pour la track:', track);
    setSelectedTrack(track);
    setShowTrackPanel(true);
  };

  // Fonction pour fermer le panneau de track
  const closeTrackPanel = () => {
    setShowTrackPanel(false);
    setSelectedTrack(null);
  };

  // Fonction pour convertir AITrack en GeneratedTrack
  const convertAITrackToGenerated = (aiTrack: AITrack): GeneratedTrack => {
    return {
      id: aiTrack.id,
      audioUrl: aiTrack.audio_url || aiTrack.stream_audio_url || '',
      prompt: aiTrack.prompt || '',
      title: aiTrack.title,
      style: aiTrack.style || 'Custom',
      lyrics: aiTrack.lyrics || '',
      isInstrumental: aiTrack.prompt?.toLowerCase().includes('instrumental') || false,
      duration: aiTrack.duration || 120,
      createdAt: aiTrack.created_at,
      imageUrl: aiTrack.image_url
    };
  };

  // Synchroniser l'état Suno avec l'état local
  React.useEffect(() => {
    console.log('🔄 useEffect triggered:', { 
      sunoState, 
      sunoTracksLength: sunoTracks.length, 
      sunoError, 
      currentTaskId,
      customMode,
      title,
      style,
      lyrics
    });
    
    console.log('🎯 Condition check:', {
      sunoState,
      sunoTracksLength: sunoTracks.length,
      condition: sunoState === 'success' && sunoTracks.length > 0
    });
    
    // Afficher les pistes dès qu'elles sont disponibles (streaming)
    if ((sunoState === 'first' || sunoState === 'success') && sunoTracks.length > 0) {
      console.log('🎵 Suno tracks brutes:', sunoTracks);
      
      // Convertir les tracks Suno en format local
      const convertedTracks: GeneratedTrack[] = sunoTracks.map((track, index) => {
        // Priorité: audio final > stream > vide
        const audioUrl = track.audio || track.stream || '';
        console.log(`🎵 Track ${index} conversion:`, { 
          originalTrack: track, 
          audioUrl, 
          hasAudio: !!track.audio, 
          hasStream: !!track.stream,
          hasImage: !!track.image,
          title: track.title
        });
        
        return {
          id: track.id || `${currentTaskId}_${index}`,
          audioUrl,
          prompt: customMode ? (lyrics.trim() ? lyrics : '') : description,
          // Utiliser le titre généré par Suno en priorité
          title: track.title || title || `Musique générée ${index + 1}`,
          // Utiliser le style d'origine ou celui généré par Suno (via tags)
          style: track.raw?.tags || style || 'Custom',
          lyrics: customMode ? lyrics : '',
          isInstrumental,
          duration: track.duration || 120,
          createdAt: new Date().toISOString(),
          imageUrl: track.image // Cover généré par Suno
        };
      });

      console.log('🎵 Tracks converties:', convertedTracks);

      setGeneratedTracks(convertedTracks);
      setGeneratedTrack(convertedTracks[0]);
      
      // Marquer comme complété uniquement si toutes les pistes sont finales
      if (sunoState === 'success') {
        setGenerationStatus('completed');
        setCurrentTaskId(null);
        
        // Rafraîchir la bibliothèque IA après génération complète
        setTimeout(() => {
          refreshGenerations();
          console.log('🔄 Bibliothèque IA rafraîchie');
        }, 2000);
      } else {
        // État intermédiaire: streaming disponible
        setGenerationStatus('pending');
        console.log('🎵 Streaming disponible, génération en cours...');
      }
      
      console.log('✅ États mis à jour:', {
        generatedTracksLength: convertedTracks.length,
        generatedTrack: convertedTracks[0]?.title,
        generationStatus: sunoState === 'success' ? 'completed' : 'pending (streaming)'
      });
    } else if (sunoState === 'error') {
      console.error('❌ Suno error:', sunoError);
      setGenerationStatus('failed');
      setCurrentTaskId(null);
    }
  }, [sunoState, sunoTracks, sunoError, currentTaskId, description, style, lyrics, isInstrumental, customMode, title]);

  const generateMusic = async () => {
    // Plus de limitation de quota - accès libre

    setIsGenerating(true);
    setGenerationStatus('pending');
    setGeneratedTracks([]);
    
    try {
      let prompt = '';
      
      if (customMode) {
        // Mode personnalisé : le style est obligatoire, le titre est optionnel
        if (!style.trim()) {
          notify.error('Style manquant', 'Veuillez remplir le style de musique');
          setIsGenerating(false);
          setGenerationStatus('idle');
          return;
        }
        const styleFinal = [style, ...selectedTags].filter(Boolean).join(', ');
        prompt = `Titre: "${title}". Style: ${styleFinal}`;
        if (lyrics.trim()) {
          prompt += `. Paroles: ${lyrics}`;
        }
        if (isInstrumental) {
          prompt += '. Musique instrumentale uniquement, sans voix';
        }
        prompt += `. Weirdness: ${weirdness}%. Style influence: ${styleInfluence}%`;
      } else {
        // Mode description : utiliser la description
        if (!description.trim()) {
          notify.error('Description manquante', 'Veuillez décrire la musique que vous souhaitez');
          setIsGenerating(false);
          setGenerationStatus('idle');
          return;
        }
        const tags = selectedTags.length ? ` (tags: ${selectedTags.join(', ')})` : '';
        prompt = `${description}${tags}`;
      }

      // Convert sliders (0-100) to API expected 0.00–1.00 (step .01)
      const styleWeightVal = customMode ? Math.round(styleInfluence) / 100 : 0.5;
      const weirdnessVal = customMode ? Math.round(weirdness) / 100 : 0.5;
      const audioWeightVal = customMode ? Math.round(audioWeight) / 100 : 0.5;

      const requestBody: any = {
        customMode,
        instrumental: isInstrumental,
        model: modelVersion,
        callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined
      };

      if (customMode) {
        // Mode Custom : title, style, prompt (lyrics)
        // Validation : si non-instrumental, les paroles sont requises
        if (!isInstrumental && !lyrics.trim()) {
          notify.error('Paroles manquantes', 'Veuillez remplir les paroles ou cocher "Instrumental"');
          setIsGenerating(false);
          setGenerationStatus('idle');
          return;
        }
        requestBody.title = title.trim() ? title : undefined; // undefined = Suno génère
        requestBody.style = [style, ...selectedTags].filter(Boolean).join(', ');
        requestBody.prompt = isInstrumental ? undefined : (lyrics.trim() || undefined); // Lyrics si non-instrumental, undefined si instrumental
        requestBody.styleWeight = Number(styleWeightVal.toFixed(2));
        requestBody.weirdnessConstraint = Number(weirdnessVal.toFixed(2));
        requestBody.audioWeight = Number(audioWeightVal.toFixed(2));
        requestBody.negativeTags = negativeTags || undefined;
        requestBody.vocalGender = vocalGender || undefined;
      } else {
        // Mode Simple : seulement prompt (description générale)
        requestBody.prompt = [description, ...selectedTags].filter(Boolean).join(', ');
        // Pas de title, style, styleWeight, etc. en mode Simple selon la doc Suno
      }

      console.log('🎵 Requête génération:', requestBody);

      // Si un audio remix est fourni, utiliser le flux upload-cover
      const response = await fetch(remixUploadUrl ? '/api/suno/upload-cover' : '/api/suno/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          remixUploadUrl
            ? {
                uploadUrl: remixUploadUrl,
                customMode: true,
                instrumental: isInstrumental,
                model: modelVersion,
                // En mode Custom: title/style requis; prompt=lyrics si non-instrumental
                title: title.trim() ? title : 'Remix',
                style: [style, ...selectedTags].filter(Boolean).join(', '),
                prompt: isInstrumental ? undefined : (lyrics.trim() ? lyrics : undefined),
                negativeTags: negativeTags || undefined,
                vocalGender: vocalGender || undefined,
                styleWeight: Number((Math.round(styleInfluence) / 100).toFixed(2)),
                weirdnessConstraint: Number((Math.round(weirdness) / 100).toFixed(2)),
                audioWeight: Number((Math.round(audioWeight) / 100).toFixed(2)),
                callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined,
              }
            : requestBody
        ),
      });

      if (!response.ok) {
        // Crédit insuffisant → ouvrir le modal d'achat
        if (response.status === 402) {
          setShowBuyCredits(true);
        }
        throw new Error('Erreur lors de la génération');
      }

      const data = await response.json();
      if (data?.credits?.balance != null) {
        setCreditsBalance(data.credits.balance);
      }

      // Synchroniser le modèle effectif et informer en cas de downgrade
      if (data?.model) {
        if (data?.modelAdjusted) {
          notify.warning(
            'Modèle ajusté',
            `Le modèle ${data.requestedModel} n'est pas disponible sur votre plan. Utilisation de ${data.model}.`,
            7000
          );
        }
        setModelVersion(data.model);
      }
      
      console.log('🎵 Réponse API génération:', data);
      
      if (data.taskId) {
        // Génération Suno en cours - démarrer le suivi en arrière-plan
        const promptText = data.prompt || description || 'Musique générée';
        const customTitle = customMode ? title : promptText.substring(0, 50) + (promptText.length > 50 ? '...' : '');
        
        startBackgroundGeneration({
          id: data.id,
          taskId: data.taskId,
          status: 'pending',
          title: customTitle,
          style: customMode ? style : 'Custom',
          prompt: promptText,
          progress: 0,
          startTime: Date.now(),
          estimatedTime: 60000 // 60 secondes estimées
        });
        
        setCurrentTaskId(data.taskId);
        console.log('🎵 Génération Suno initiée en arrière-plan:', data.taskId);
        console.log('🎵 Mode:', customMode ? 'personnalisé' : 'simple');
      } else {
        // Génération simulée terminée
        const promptText = data.prompt || description || 'Musique générée';
        const track: GeneratedTrack = {
          id: data.id,
          audioUrl: data.audioUrl,
          prompt: promptText,
          title: customMode ? title : promptText.substring(0, 50) + (promptText.length > 50 ? '...' : ''),
          style: customMode ? style : 'Custom',
          lyrics: customMode ? lyrics : '',
          isInstrumental,
          duration: data.duration,
          createdAt: new Date().toISOString()
        };

        setGeneratedTrack(track);
        setGenerationStatus('completed');
      }
    } catch (error) {
      console.error('Erreur:', error);
      notify.error('Génération', 'Erreur lors de la génération');
      setGenerationStatus('failed');
    } finally {
      setIsGenerating(false);
    }
  };





  const shareTrack = async (track: GeneratedTrack) => {
    try {
      await navigator.share({
        title: 'Musique générée par Synaura',
        text: `Écoutez "${track.title}" généré par IA`,
        url: track.audioUrl
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(track.audioUrl);
      notify.success('Partage', 'Lien copié dans le presse-papiers');
    }
  };

  // Vérification d'authentification (même logique que ai-library)
  if (!session) {
    return (
      <div className="relative min-h-screen text-white" suppressHydrationWarning>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
            <p className="text-gray-400">Connectez-vous pour accéder à votre générateur IA</p>
        </div>
          </div>
    </div>
  );
}

  return (
    <div className="flex flex-col h-[100svh] bg-[#050505] text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      <StudioBackground />

      {/* --- HEADER : "TRANSPORT BAR" --- */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 text-indigo-400 min-w-0">
            <Zap className="w-5 h-5" fill="currentColor" />
            <span className="font-bold tracking-tight text-lg truncate">
              SYNAURA <span className="text-zinc-600 font-normal text-xs align-top">STUDIO</span>
            </span>
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          {/* Global Playback Controls */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => previousTrack()}
              className="p-1.5 hover:text-white text-zinc-500 transition-colors"
              aria-label="Piste précédente"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                if (audioState.isPlaying) {
                  pause();
                  return;
                }
                // si une piste est déjà chargée, reprendre; sinon jouer la dernière sélection IA si dispo
                const cur = (audioState.tracks || [])[audioState.currentTrackIndex || 0];
                if (cur) {
                  await play();
                  return;
                }
                if (generatedTrack) {
                  playGenerated(generatedTrack);
                }
              }}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-lg shadow-indigo-900/20 transition-all"
              aria-label={audioState.isPlaying ? 'Pause' : 'Lecture'}
            >
              {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              type="button"
              onClick={() => nextTrack()}
              className="p-1.5 hover:text-white text-zinc-500 transition-colors"
              aria-label="Piste suivante"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Time Display */}
          <div className="font-mono text-xs text-indigo-300 bg-indigo-950/30 px-3 py-1.5 rounded border border-indigo-500/10 hidden md:block">
            {formatTime(audioState.currentTime)} <span className="text-zinc-600">/ {formatTime(audioState.duration || 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBuyCredits(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5 hover:border-white/10 transition"
            aria-label="Acheter des crédits"
          >
            <Coins className="w-4 h-4 text-indigo-300" />
            <span className="text-[10px] font-semibold text-zinc-300 tabular-nums">{creditsBalance}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Crédits</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-indigo-500' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(99,102,241,0.4)]`} />
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {isGenerating ? 'Generating' : 'System Ready'}
            </span>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/10" aria-hidden />
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative z-10 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-5">
        {/* (ancien header: gardé SR-only pour accessibilité) */}
        <header className="sr-only">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-xl bg-accent-brand/70 opacity-60" />
              <div className="relative w-10 h-10 rounded-2xl bg-black/70 border border-white/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-brand" />
              </div>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Synaura</p>
              <h1 className="text-lg sm:text-xl font-semibold text-white title-suno">Studio IA</h1>
              <p className="text-[11px] text-white/55 hidden sm:block">
                Génère, remix et organise tes créations comme dans un vrai studio.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* Credits pill */}
            <button
              type="button"
              onClick={() => setShowBuyCredits(true)}
              className={`${SUNO_BTN_BASE} cursor-pointer py-2 rounded-full text-foreground-primary bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary disabled:after:bg-background-primary disabled:after:opacity-50 px-3 transition-all duration-200`}
              aria-label="Acheter des crédits"
            >
              <Coins className="w-4 h-4 text-accent-brand" />
              <span className="text-xs font-medium">{creditsBalance}</span>
              <span className="text-[11px] text-foreground-tertiary">crédits</span>
            </button>

            {/* Modèle */}
            <div className="relative model-dropdown-container">
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                disabled={isGenerationDisabled}
                className={SUNO_PILL_SOLID}
              >
                <span className="text-foreground-tertiary">Modèle</span>
                <span className="font-semibold">
                  {modelVersion === 'V5'
                    ? 'V5 (Beta)'
                    : modelVersion === 'V4_5PLUS'
                    ? 'V4.5+'
                    : modelVersion.replace('_', '.')}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                >
                  <path fill="currentColor" d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-56 bg-[#0a0812]/90 backdrop-blur-md border border-border-primary rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setModelVersion('V5');
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm ${
                          modelVersion === 'V5' ? 'bg-accent-blue/20 text-accent-blue' : 'text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">V5</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                            Beta
                          </span>
                          {modelVersion === 'V5' && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="ml-auto text-accent-blue"
                            >
                              <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
                            </svg>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModelVersion('V4_5PLUS');
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm ${
                          modelVersion === 'V4_5PLUS' ? 'bg-accent-purple/20 text-accent-purple' : 'text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">V4.5+</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                            Pro
                          </span>
                          {modelVersion === 'V4_5PLUS' && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="ml-auto text-accent-purple"
                            >
                              <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
                            </svg>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModelVersion('V4_5');
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm ${
                          modelVersion === 'V4_5' ? 'bg-accent-success/20 text-accent-success' : 'text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">V4.5</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-success/20 text-accent-success border border-accent-success/30">
                            Free
                          </span>
                          {modelVersion === 'V4_5' && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="ml-auto text-accent-success"
                            >
                              <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Switch de mode Simple / Custom */}
            <div className="inline-flex bg-background-tertiary border border-border-primary rounded-full p-1">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                disabled={isGenerationDisabled}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  !customMode ? 'bg-white text-black shadow' : 'text-foreground-tertiary hover:text-foreground-primary'
                } ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                disabled={isGenerationDisabled}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  customMode
                    ? 'bg-accent-brand text-white shadow-[0_0_25px_rgba(129,140,248,0.75)]'
                    : 'text-foreground-tertiary hover:text-foreground-primary'
                } ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Custom
              </button>
            </div>
          </div>
        </header>

        {/* LAYOUT "Studio Pro" : panneaux fixes (scroll interne uniquement) */}
        <div className="flex h-full overflow-hidden">
          {/* LEFT PANEL: Generator / Remixer */}
          <aside className="w-[360px] hidden lg:flex flex-col border-r border-white/5 bg-[#080808] overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Builder : création / presets (contenu existant) */}
              <section className="space-y-4 flex flex-col min-h-0">
                {/* Toolbar interne */}
                <div className="panel-suno p-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBuyCredits(true)}
                    className={`${SUNO_BTN_BASE} cursor-pointer py-2 rounded-full text-foreground-primary bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary px-3 transition-all duration-200`}
                    aria-label={`Credits remaining: ${creditsBalance}`}
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">
                      <Coins className="w-4 h-4" />
                      <span className="text-[12px] font-medium tracking-[0.5px] w-[4ch] inline-block text-center transition-[width] duration-200">
                        {formatCreditsCompact(creditsBalance)}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none text-[15px] leading-[24px] rounded-full text-foreground-primary bg-transparent before:border-border-primary h-[40px] p-[3px]">
                      <span className="relative flex flex-row items-center justify-center gap-2">
                        <span className="flex flex-1 items-center justify-stretch gap-0">
                          <button
                            type="button"
                            onClick={() => setCustomMode(false)}
                            disabled={isGenerationDisabled}
                            className={`px-3 h-[34px] rounded-full text-[12px] ${!customMode ? 'bg-background-primary' : ''} ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Simple
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomMode(true)}
                            disabled={isGenerationDisabled}
                            className={`px-3 h-[34px] rounded-full text-[12px] ${customMode ? 'bg-background-primary' : ''} ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Custom
                          </button>
                        </span>
                      </span>
                    </div>

                    <div className="relative model-dropdown-container">
                      <button
                        type="button"
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        disabled={isGenerationDisabled}
                        className={SUNO_PILL_SOLID}
                      >
                        <span className="relative flex flex-row items-center justify-center gap-2">
                          {modelVersion === 'V5' ? 'v5' : modelVersion === 'V4_5PLUS' ? 'v4.5+' : 'v4.5'}
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="-ml-1 h-4 w-4">
                            <g><path d="M16.657 9c.89 0 1.337 1.077.707 1.707l-4.657 4.657a1 1 0 0 1-1.414 0l-4.657-4.657C6.006 10.077 6.452 9 7.343 9z"></path></g>
                          </svg>
                        </span>
                      </button>

                      <AnimatePresence>
                        {showModelDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="absolute right-0 top-full mt-2 w-44 bg-[#0a0812]/90 backdrop-blur-md border border-border-primary rounded-xl shadow-2xl overflow-hidden z-50"
                          >
                            <div className="py-1">
                              <button type="button" onClick={() => { setModelVersion('V5'); setShowModelDropdown(false); }} className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-white">V5</button>
                              <button type="button" onClick={() => { setModelVersion('V4_5PLUS'); setShowModelDropdown(false); }} className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-white">V4.5+</button>
                              <button type="button" onClick={() => { setModelVersion('V4_5'); setShowModelDropdown(false); }} className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-white">V4.5</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Formulaire actif */}
                <div className="space-y-6 px-0">
                  {/* Bandeau de presets (Persona) */}
                  <div ref={presetStripRef}>
                    <PresetStrip
                      presets={aiStudioPresets}
                      activePresetId={activePresetId}
                      onPresetClick={handleApplyPreset}
                    />
                  </div>

                  {/* Rangée segmentée Audio / Persona / Inspo (structure existante) */}
                  <div className="panel-suno p-0 overflow-hidden">
                    <div className="grid grid-cols-3 h-[48px]">
                      <button
                        type="button"
                        onClick={() => {
                          remixSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setOpenStyleSection(true);
                        }}
                        className={`${SUNO_BTN_BASE} rounded-none rounded-l-full h-full w-full bg-background-fog-thin p-3 text-[14px]`}
                        aria-label="Audio"
                        title="Audio"
                      >
                        <span className="relative flex flex-row items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-0 my-1">
                            <g><path d="M12 4c-.631 0-1.143.512-1.143 1.143v5.714H5.143a1.143 1.143 0 0 0 0 2.286h5.714v5.714a1.143 1.143 0 0 0 2.286 0v-5.714h5.714a1.143 1.143 0 0 0 0-2.286h-5.714V5.143C13.143 4.512 12.63 4 12 4"></path></g>
                          </svg>
                          Audio
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => presetStripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className={`${SUNO_BTN_BASE} rounded-none h-full w-full bg-background-fog-thin p-3 text-[14px]`}
                        aria-label="Persona"
                        title="Persona"
                      >
                        <span className="relative flex flex-row items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-0 my-1">
                            <g><path d="M12 4c-.631 0-1.143.512-1.143 1.143v5.714H5.143a1.143 1.143 0 0 0 0 2.286h5.714v5.714a1.143 1.143 0 0 0 2.286 0v-5.714h5.714a1.143 1.143 0 0 0 0-2.286h-5.714V5.143C13.143 4.512 12.63 4 12 4"></path></g>
                          </svg>
                          Persona
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowInspo((v) => !v)}
                        className={`${SUNO_BTN_BASE} rounded-none rounded-r-full h-full w-full bg-background-fog-thin p-3 text-[14px]`}
                        aria-label="Inspo"
                        title="Inspo"
                      >
                        <span className="relative flex flex-row items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-0 my-1">
                            <g><path d="M12 4c-.631 0-1.143.512-1.143 1.143v5.714H5.143a1.143 1.143 0 0 0 0 2.286h5.714v5.714a1.143 1.143 0 0 0 2.286 0v-5.714h5.714a1.143 1.143 0 0 0 0-2.286h-5.714V5.143C13.143 4.512 12.63 4 12 4"></path></g>
                          </svg>
                          Inspo
                        </span>
                      </button>
                    </div>
                  </div>

                  {customMode ? (
                    <>
                  {/* Titre */}
                  <SunoAccordionSection
                    title="Projet & sortie"
                    description="Configure le titre et les infos de base."
                    isOpen={openProjectSection}
                    onToggle={() => setOpenProjectSection((v) => !v)}
                  >
                    <label className="block text-[10px] sm:text-xs font-medium mb-2 text-foreground-tertiary">
                      Titre
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Song Title (Optional)"
                      disabled={isGenerationDisabled}
                      className={`${SUNO_FIELD} ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </SunoAccordionSection>

                  {/* Style de musique */}
                  <SunoAccordionSection
                    title="Styles"
                    description="Définis l'ambiance et les tags musicaux."
                    isOpen={openStyleSection}
                    onToggle={() => setOpenStyleSection((v) => !v)}
                    rightActions={
                      <button
                        type="button"
                        className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer text-[15px] leading-[24px] rounded-full aspect-square text-foreground-primary bg-background-tertiary enabled:hover:before:bg-overlay-on-primary p-3"
                        aria-label="Clear styles"
                        title="Clear"
                        onClick={(e) => {
                          e.preventDefault();
                          setStyle('');
                        }}
                      >
                        <span className="relative flex flex-row items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1">
                            <g>
                              <path d="m9.4 16.5 2.6-2.6 2.6 2.6 1.4-1.4-2.6-2.6L16 9.9l-1.4-1.4-2.6 2.6-2.6-2.6L8 9.9l2.6 2.6L8 15.1zM7 21q-.824 0-1.412-.587A1.93 1.93 0 0 1 5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .824-.587 1.413A1.93 1.93 0 0 1 17 21zM17 6H7v13h10z" />
                            </g>
                          </svg>
                        </span>
                      </button>
                    }
                  >
                    <label className="block text-[10px] sm:text-xs font-medium mb-2 text-foreground-tertiary">
                      Styles
                    </label>
                    <textarea
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="indie, electronic, synths, 120bpm, distorted"
                      rows={3}
                      maxLength={1000}
                      disabled={isGenerationDisabled}
                      className={`${SUNO_TEXTAREA} ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div className="text-[10px] text-foreground-tertiary mt-1 text-right">
                      {style.length}/1000
                    </div>

                    {showInspo && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[...styleSuggestions, ...vibeSuggestions].map((tag, index) => {
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              key={`style-${tag}-${index}`}
                              type="button"
                              onClick={() => handleTagClick(tag)}
                              disabled={isGenerationDisabled}
                              className={`${SUNO_BTN_BASE} cursor-pointer px-3 py-1 rounded-full text-[11px] before:border-border-primary enabled:hover:before:bg-overlay-on-primary ${
                                active ? 'bg-background-tertiary' : 'bg-transparent'
                              } ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span className="relative">{tag}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4" ref={remixSectionRef}>
                      <label className="block text-[10px] sm:text-xs font-medium mb-2 text-foreground-tertiary">
                        Ajouter un audio source (Remix)
                      </label>
                      <RemixDropzone
                        file={remixFile}
                        uploading={remixUploading}
                        onFileSelected={async (file: File) => {
                          setRemixFile(file);
                          try {
                            setRemixUploading(true);
                            // Signature Cloudinary
                            const timestamp = Math.round(new Date().getTime() / 1000);
                            const publicId = `remix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                            const sigRes = await fetch('/api/upload/signature', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ timestamp, publicId, resourceType: 'video' })
                            });
                            if (!sigRes.ok) throw new Error('Erreur signature Cloudinary');
                            const { signature, apiKey, cloudName } = await sigRes.json();

                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('folder', 'ximam/audio');
                            formData.append('public_id', publicId);
                            formData.append('resource_type', 'video');
                            formData.append('timestamp', String(timestamp));
                            formData.append('api_key', apiKey);
                            formData.append('signature', signature);

                            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
                              method: 'POST',
                              body: formData,
                            });
                            if (!uploadResponse.ok) throw new Error('Erreur upload Cloudinary');
                            const uploaded = await uploadResponse.json();
                            const secureUrl = uploaded?.secure_url as string;
                            const uploadedPublicId = uploaded?.public_id as string | undefined;
                            const uploadedDuration = typeof uploaded?.duration === 'number' ? uploaded.duration : undefined;
                            if (!secureUrl) throw new Error('URL de fichier manquante');

                            setRemixUploading(false);
                            setRemixUploadUrl(secureUrl);
                            try {
                              const res = await fetch('/api/ai/upload-source', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ audioUrl: secureUrl, publicId: uploadedPublicId, title, duration: uploadedDuration })
                              });
                              if (res.ok) {
                                window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
                              }
                            } catch {}
                          } catch (e: any) {
                            setRemixUploading(false);
                            notify.error('Upload audio', e?.message || 'Erreur upload');
                          }
                        }}
                      />
                      {remixUploadUrl && (
                        <p className="text-[10px] text-foreground-tertiary mt-2">Audio uploadé ✓</p>
                      )}
                    </div>
                  </SunoAccordionSection>

                  {/* Paroles ou Description */}
                  <SunoAccordionSection
                    title="Lyrics"
                    description="Paroles exactes ou prompt."
                    isOpen={openLyricsSection}
                    onToggle={() => setOpenLyricsSection((v) => !v)}
                    rightActions={
                      <button
                        type="button"
                        className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer text-[15px] leading-[24px] rounded-full aspect-square text-foreground-primary bg-background-tertiary enabled:hover:before:bg-overlay-on-primary p-3"
                        aria-label="Clear lyrics"
                        title="Clear"
                        onClick={(e) => {
                          e.preventDefault();
                          setLyrics('');
                        }}
                      >
                        <span className="relative flex flex-row items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="text-current shrink-0 w-4 h-4 m-1">
                            <g>
                              <path d="m9.4 16.5 2.6-2.6 2.6 2.6 1.4-1.4-2.6-2.6L16 9.9l-1.4-1.4-2.6 2.6-2.6-2.6L8 9.9l2.6 2.6L8 15.1zM7 21q-.824 0-1.412-.587A1.93 1.93 0 0 1 5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .824-.587 1.413A1.93 1.93 0 0 1 17 21zM17 6H7v13h10z" />
                            </g>
                          </svg>
                        </span>
                      </button>
                    }
                  >
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={isInstrumental}
                        onChange={(e) => setIsInstrumental(e.target.checked)}
                        disabled={isGenerationDisabled}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isInstrumental ? 'bg-accent-brand' : 'bg-background-tertiary'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isInstrumental ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="text-xs font-medium text-foreground-secondary">Instrumental</span>
                    </label>

                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Write some lyrics — or leave blank for instrumental"
                      rows={6}
                      maxLength={5000}
                      disabled={isGenerationDisabled}
                      className={`${SUNO_TEXTAREA} ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div className="text-[10px] text-foreground-tertiary mt-1 text-right">
                      {lyrics.length}/5000
                    </div>
                  </SunoAccordionSection>
                  {/* Options avancées */}
                  <SunoAccordionSection
                    title="Advanced Options"
                    description="Weirdness, style influence, audio weight…"
                    isOpen={openAdvancedSection}
                    onToggle={() => setOpenAdvancedSection((v) => !v)}
                  >
                    <div className="space-y-4">
                      <SunoSlider
                        label="Weirdness"
                        value={weirdness}
                        onChange={setWeirdness}
                        disabled={isGenerationDisabled}
                        midLabel={weirdness < 35 ? 'Tame' : weirdness < 65 ? 'Expected results' : 'Wild'}
                      />
                      <SunoSlider
                        label="Style Influence"
                        value={styleInfluence}
                        onChange={setStyleInfluence}
                        disabled={isGenerationDisabled}
                        midLabel={styleInfluence < 35 ? 'Low' : styleInfluence < 65 ? 'Moderate' : 'High'}
                      />
                      <SunoSlider
                        label="Audio Weight"
                        value={audioWeight}
                        onChange={setAudioWeight}
                        disabled={isGenerationDisabled}
                        midLabel={audioWeight < 35 ? 'Low' : audioWeight < 65 ? 'Moderate' : 'High'}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-foreground-tertiary mb-1">Vocal gender</label>
                          <select
                            value={vocalGender}
                            onChange={(e) => setVocalGender(e.target.value)}
                            disabled={isGenerationDisabled}
                            className={`${SUNO_SELECT} ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <option value="">Auto</option>
                            <option value="m">Male</option>
                            <option value="f">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-foreground-tertiary mb-1">Exclude styles</label>
                          <input
                            value={negativeTags}
                            onChange={(e) => setNegativeTags(e.target.value)}
                            placeholder="Exclude styles"
                            disabled={isGenerationDisabled}
                            className={`${SUNO_FIELD} ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </SunoAccordionSection>

                  {/* Results (timeline) */}
                  {generatedTracks.length > 0 && (
                    <SunoAccordionSection
                      title="Results"
                      description="Pistes générées (timeline)"
                      isOpen={openResultsSection}
                      onToggle={() => setOpenResultsSection((v) => !v)}
                    >
                      <GenerationTimeline
                        generatedTracks={generatedTracks}
                        generationStatus={generationStatus}
                        currentTaskId={currentTaskId}
                        sunoState={sunoState}
                        sunoError={sunoError}
                        onOpenTrack={openTrackPanel}
                        onPlayTrack={playGenerated}
                        onDownloadTrack={downloadGenerated}
                        onShareTrack={shareGenerated}
                      />
                    </SunoAccordionSection>
                  )}
                </>
              ) : (
                // Mode description
                <div className={`${SUNO_PANEL} p-4 md:p-5 space-y-4`}>
                  <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent-brand" />
                    <span>Paroles ou Description</span>
                  </h2>
                  <p className="text-[11px] text-white/55">
                    Saisissez les paroles exactes ou décrivez simplement l'ambiance souhaitée.
                  </p>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-white/80">Description de la chanson</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez le style de musique et le sujet que vous souhaitez, l'IA générera les paroles pour vous."
                      rows={4}
                      maxLength={199}
                      disabled={isGenerationDisabled}
                      className={`${SUNO_TEXTAREA} text-sm ${isGenerationDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div className="text-[10px] text-white/40 mt-1 text-right">
                      {description.length}/199
                    </div>
                    <div className="mt-2">
                      <div className="text-[10px] text-white/50 mb-2">Inspiration (tags)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...styleSuggestions, ...vibeSuggestions].map((tag, index) => {
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              key={`vibe-${tag}-${index}`}
                              type="button"
                              onClick={() => handleTagClick(tag)}
                              disabled={isGenerationDisabled}
                              className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${active ? 'bg-accent-brand/20 border-accent-brand/50 text-white' : 'bg-transparent border-white/20 text-white/60 hover:bg-white/10'} ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Pas d'options avancées en mode simple */}
                </div>
              )}
                </div>

                {/* Bottom create bar */}
                <div className="sticky bottom-0 pt-3">
                  <div className="panel-suno p-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={generateMusic}
                      disabled={isGenerationDisabled || isGenerating}
                      className={`${SUNO_BTN_BASE} cursor-pointer flex-1 px-4 py-3 rounded-full text-foreground-primary bg-background-tertiary enabled:hover:before:bg-overlay-on-primary text-[15px] ${
                        isGenerationDisabled || isGenerating ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      aria-label="Create song"
                    >
                      <span className="relative flex items-center justify-center gap-2">
                        {isGenerating ? (
                          <span className="w-4 h-4 rounded-full border-2 border-foreground-tertiary border-t-transparent animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        Create
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </aside>

          {/* CENTER PANEL: Library */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
            <div className="flex-1 overflow-y-auto pl-1 space-y-3 min-h-0">
              <div className="panel-suno p-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 px-4 py-2 rounded-full bg-background-tertiary">
                  <Search className="w-4 h-4 text-foreground-tertiary" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    aria-label="Search clips"
                    className={SUNO_INPUT}
                  />
                  {searchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 rounded-full hover:bg-overlay-on-primary text-foreground-tertiary"
                      aria-label="Effacer la recherche"
                      title="Effacer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={refreshGenerations}
                  className={SUNO_PILL_SOLID}
                  title="Rafraîchir"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterBy('all')}
                    className={`${SUNO_BTN_BASE} cursor-pointer rounded-full text-foreground-primary bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary px-3 py-1.5 text-[11px] ${
                      filterBy === 'all' ? 'bg-background-tertiary' : ''
                    }`}
                  >
                    <span className="relative">Tout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterBy('instrumental')}
                    className={`${SUNO_BTN_BASE} cursor-pointer rounded-full text-foreground-primary bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary px-3 py-1.5 text-[11px] ${
                      filterBy === 'instrumental' ? 'bg-background-tertiary' : ''
                    }`}
                  >
                    <span className="relative">Instrumental</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterBy('with-lyrics')}
                    className={`${SUNO_BTN_BASE} cursor-pointer rounded-full text-foreground-primary bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary px-3 py-1.5 text-[11px] ${
                      filterBy === 'with-lyrics' ? 'bg-background-tertiary' : ''
                    }`}
                  >
                    <span className="relative">Voix</span>
                  </button>
                </div>

                <div className="relative library-sort-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setShowLibrarySortDropdown((v) => !v)}
                    className={`${SUNO_PILL_SOLID} px-4 py-2`}
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Title'}
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="-mx-1 h-5 w-5">
                        <g><path d="M16.657 9c.89 0 1.337 1.077.707 1.707l-4.657 4.657a1 1 0 0 1-1.414 0l-4.657-4.657C6.006 10.077 6.452 9 7.343 9z"></path></g>
                      </svg>
                    </span>
                  </button>

                  <AnimatePresence>
                    {showLibrarySortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-44 bg-[#0a0812]/90 backdrop-blur-md border border-border-primary rounded-xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSortBy('newest');
                              setShowLibrarySortDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-white"
                          >
                            Newest
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSortBy('oldest');
                              setShowLibrarySortDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-white"
                          >
                            Oldest
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSortBy('title');
                              setShowLibrarySortDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-white"
                          >
                            Title
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {generations.length > 0 &&
              !generationsLoading &&
              filteredAndSortedGenerations.length === 0 && (
                <div className="panel-suno p-3">
                  <p className="text-[12px] text-foreground-secondary">
                    Aucune génération ne correspond à tes filtres.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterBy('all');
                      setSortBy('newest');
                    }}
                    className={`${SUNO_PILL_SOLID} mt-3 w-full`}
                  >
                    <span className="relative">Réinitialiser les filtres</span>
                  </button>
                </div>
              )}

            <LibraryClipsList
              tracks={allTracks}
              generationsById={generationsById}
              searchQuery={searchQuery}
              sortBy={sortBy}
              filterBy={filterBy}
              loading={generationsLoading}
              error={generationsError}
              onResetFilters={() => {
                setSearchQuery('');
                setFilterBy('all');
                setSortBy('newest');
              }}
              onPickTrack={(track, gen) => {
                const converted = convertAITrackToGenerated(track as any);
                setSelectedTrack(converted);
                setGeneratedTrack(converted);
                setShowTrackPanel(true);
                if (gen) setSelectedGeneration(gen);
              }}
              onPlayTrack={(track, gen) => {
                if (gen) {
                  playAITrack(track as any, gen);
                  return;
                }
                // fallback: play without generation context
                const fakeGen = {
                  id: (track as any).generation_id || (track as any).generation?.id || 'unknown',
                  prompt: (track as any).prompt || '',
                  created_at: (track as any).created_at || new Date().toISOString(),
                  status: 'completed',
                  model: (track as any).model_name || 'V4_5',
                  user_id: (session?.user?.id as string) || '',
                  task_id: '',
                  tracks: [],
                } as any as AIGeneration;
                playAITrack(track as any, fakeGen);
              }}
            />
            </div>
          </main>

          {/* RIGHT PANEL: Inspector */}
          <aside className="w-[300px] hidden lg:flex flex-col border-l border-white/5 bg-[#080808] overflow-hidden">
            {/* Visualizer placeholder (studio feel) */}
            <div className="h-40 bg-black/60 border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-300 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/20">
                  <Volume2 className="w-3 h-3" /> -6.2dB
                </span>
              </div>
              <div className="absolute inset-x-3 bottom-3 flex items-end justify-center gap-[2px] h-[80px]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-indigo-600 to-cyan-400 opacity-70 rounded-t-sm"
                    style={{ height: `${20 + ((i * 7) % 60)}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <TrackInspector
                track={selectedTrack}
                isOpen={showTrackPanel}
                onClose={closeTrackPanel}
                onPlay={playGenerated}
                onDownload={downloadGenerated}
                onShare={shareGenerated}
                variant="docked"
              />
            </div>
          </aside>
        </div>

        {/* Modale d'achat de crédits */}
        <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />

        {/* TrackInspector overlay (mobile) */}
        <div className="lg:hidden">
          <TrackInspector
            track={selectedTrack}
            isOpen={showTrackPanel}
            onClose={closeTrackPanel}
            onPlay={playGenerated}
            onDownload={downloadGenerated}
            onShare={shareGenerated}
            variant="overlay"
          />
        </div>
      </div>
    </div>
  );
}

