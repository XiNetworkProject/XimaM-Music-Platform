'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notify } from '@/components/NotificationCenter';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Music, Mic, Settings, Play, Download, Share2, Volume2, VolumeX, Coins, RefreshCw, ChevronRight, Heart, X, ThumbsUp, MessageCircle, ExternalLink, Trash2, Repeat } from 'lucide-react';
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
import { RecentGenerations } from '@/components/ai-studio/RecentGenerations';
import { RemixDropzone } from '@/components/ai-studio/RemixDropzone';
import { aiStudioPresets } from '@/lib/aiStudioPresets';
import StudioBackground from '@/components/StudioBackground';
import type { GeneratedTrack, AIStudioPreset } from '@/lib/aiStudioTypes';

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
  const { playTrack } = useAudioPlayer();
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
  
  // États pour la bibliothèque des générations
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'instrumental' | 'with-lyrics'>('all');
  const [selectedGeneration, setSelectedGeneration] = useState<AIGeneration | null>(null);
  
  // États pour le panneau de track sélectionnée
  const [selectedTrack, setSelectedTrack] = useState<GeneratedTrack | null>(null);
  const [showTrackPanel, setShowTrackPanel] = useState(false);
  
  // Remix (upload audio) pour upload-cover
  const [remixFile, setRemixFile] = useState<File | null>(null);
  const [remixUploadUrl, setRemixUploadUrl] = useState<string | null>(null);
  const [remixUploading, setRemixUploading] = useState<boolean>(false);
  
  // Génération IA activée
  const isGenerationDisabled = false;

  // Charger la bibliothèque (même logique que ai-library)
  const loadLibrary = async () => {
    if (!session?.user?.id) {
      console.log('🔍 AI Generator: Pas de session utilisateur');
      return;
    }

    console.log('🔍 AI Generator: Chargement de la bibliothèque pour userId:', session.user.id);

    try {
      setGenerationsLoading(true);
      setGenerationsError(null);
      const response = await fetch('/api/ai/library', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      console.log('🔍 AI Generator: Réponse API library:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 AI Generator: Données reçues:', data);
        console.log('🔍 AI Generator: Nombre de générations:', data.generations?.length || 0);
        setGenerations(data.generations || []);

        // Charger toutes les pistes de l'utilisateur
        const trRes = await fetch('/api/ai/library/tracks', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
        console.log('🔍 AI Generator: Réponse API tracks:', trRes.status, trRes.statusText);
        
        if (trRes.ok) {
          const trJson = await trRes.json();
          console.log('🔍 AI Generator: Tracks reçues:', trJson.tracks?.length || 0);
          console.log('🔍 AI Generator: Première track (structure):', trJson.tracks?.[0]);
          setAllTracks(trJson.tracks || []);
        }
      } else {
        const txt = await response.text();
        console.error('🔍 AI Generator: Erreur API:', txt);
        setGenerationsError(`Erreur chargement: ${txt}`);
      }
    } catch (error) {
      console.error('🔍 AI Generator: Erreur chargement bibliothèque:', error);
      setGenerationsError('Impossible de charger la bibliothèque');
    } finally {
      setGenerationsLoading(false);
    }
  };

  // Rafraîchir la bibliothèque
  const refreshGenerations = () => {
    loadLibrary();
  };

  // Filtrer les générations (même logique que ai-library)
  const filteredAndSortedGenerations = React.useMemo(() => {
    console.log('🔍 AI Generator: Filtrage des générations. Total:', generations.length);
    console.log('🔍 AI Generator: Recherche:', searchQuery, 'Filtre:', filterBy, 'Tri:', sortBy);
    
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

    console.log('🔍 AI Generator: Générations après filtrage:', filtered.length);

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
    
    console.log('🔍 AI Generator: Générations finales après tri:', filtered.length);
    return filtered;
  }, [generations, searchQuery, sortBy, filterBy]);

  // Convertir les tracks individuelles en générations groupées par generation_id
  const generationsFromTracks = React.useMemo(() => {
    if (allTracks.length === 0) {
      console.log('[generationsFromTracks] allTracks est vide');
      return [];
    }
    
    console.log('[generationsFromTracks] Traitement de', allTracks.length, 'tracks');
    
    // Grouper les tracks par generation_id
    const tracksByGeneration = new Map<string, AITrack[]>();
    const generationMap = new Map<string, Partial<AIGeneration>>();
    
    allTracks.forEach((track: any) => {
      // L'API retourne peut-être generation_id directement ou via generation.id
      const genId = track.generation_id || track.generation?.id;
      if (!genId) {
        console.warn('[generationsFromTracks] Track sans generation_id:', track.id);
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
    
    console.log('[generationsFromTracks] Créé', result.length, 'générations à partir des tracks');
    return result;
  }, [allTracks, session?.user?.id]);

  // Générations triées par date (plus récentes en premier) pour RecentGenerations
  // Utiliser les générations de l'API si disponibles, sinon utiliser celles créées à partir des tracks
  const recentGenerationsSorted = React.useMemo(() => {
    const allGenerations = generations.length > 0 ? generations : generationsFromTracks;
    return [...allGenerations].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [generations, generationsFromTracks]);

  // Jouer une track IA (même logique que ai-library)
  const playAITrack = (track: AITrack, generation: AIGeneration) => {
    const aiTrack: PlayerTrack = {
      _id: `ai-${track.id}`,
      title: track.title,
      artist: {
        _id: (session?.user?.id as string) || 'ai-generator',
        name: (session?.user as any)?.name || (session?.user as any)?.username || 'IA Synaura',
        username: (session?.user as any)?.username || (session?.user as any)?.name || 'ai-generator',
        avatar: (session?.user as any)?.avatar || (session?.user as any)?.image || '/logo.png'
      },
      duration: track.duration,
      audioUrl: track.audio_url,
      coverUrl: track.image_url || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: track.play_count || 0,
      likes: [],
      comments: [],
      // @ts-ignore - player Track accepte lyrics via providers
      lyrics: (track.prompt || generation.prompt || '').trim()
    };

    playTrack(aiTrack as any);
  };

  // Fonction pour jouer une génération
  const handlePlayGeneration = (generation: AIGeneration) => {
    const firstTrack = generation.tracks?.[0];
    if (!firstTrack) return;
    playAITrack(firstTrack, generation);
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
  }, [session?.user?.id]);

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
        alert('Lien copié');
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
      duration: aiTrack.duration,
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
          alert('Veuillez remplir le style de musique');
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
          alert('Veuillez décrire la musique que vous souhaitez');
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
          alert('Veuillez remplir les paroles ou cocher "Instrumental"');
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
      alert('Erreur lors de la génération');
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
      alert('Lien copié dans le presse-papiers');
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
    <div className="relative min-h-screen text-white overflow-hidden">
      <StudioBackground />
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8">
        {/* HEADER STUDIO */}
        <header className="mb-4 sm:mb-6 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-xl bg-accent-brand/70 opacity-60" />
              <div className="relative w-11 h-11 rounded-2xl bg-black/70 border border-white/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-brand" />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Synaura</p>
              <h1 className="text-xl md:text-2xl font-semibold text-white">AI Studio</h1>
              <p className="text-[10px] sm:text-xs text-white/55 max-w-sm hidden sm:block">Créez, remixeZ et expérimentez avec la génération musicale par IA.</p>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
            {/* Crédits + modèle */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBuyCredits(true)}
                className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md text-xs md:text-sm hover:bg-white/10 transition-colors"
                aria-label="Acheter des crédits"
              >
                <Coins className="w-4 h-4 text-accent-brand" />
                <span className="font-medium">{creditsBalance} crédits</span>
                <span className="text-white/60">(≈ {Math.floor(creditsBalance / 12)} gen)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                disabled={isGenerationDisabled}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs md:text-sm backdrop-blur-md ${
                  isGenerationDisabled
                    ? 'opacity-50 cursor-not-allowed border-white/15 bg-white/0 text-white/40'
                    : 'border-accent-brand/50 bg-accent-brand/10 hover:bg-accent-brand/20 text-white'
                }`}
              >
                <span className="text-white/70">Modèle</span>
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
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute mt-2 w-48 bg-white/10 backdrop-blur-md border border-white/15 rounded-lg shadow-lg overflow-hidden z-50"
                    style={{ marginTop: '2.5rem' }}
                  >
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setModelVersion('V5');
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm ${modelVersion === 'V5' ? 'bg-accent-blue/20 text-accent-blue' : 'text-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">V5</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-blue/20 text-accent-blue border border-accent-blue/30">Beta</span>
                          {modelVersion === 'V5' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-auto text-accent-blue">
                              <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z"/>
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
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm ${modelVersion === 'V4_5PLUS' ? 'bg-accent-purple/20 text-accent-purple' : 'text-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">V4.5+</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/30">Pro</span>
                          {modelVersion === 'V4_5PLUS' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-auto text-accent-purple">
                              <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z"/>
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
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm ${modelVersion === 'V4_5' ? 'bg-accent-success/20 text-accent-success' : 'text-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">V4.5</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-success/20 text-accent-success border border-accent-success/30">Free</span>
                          {modelVersion === 'V4_5' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-auto text-accent-success">
                              <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z"/>
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
            <div className="inline-flex bg-white/5 border border-white/15 rounded-full p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                disabled={isGenerationDisabled}
                className={`px-3 py-1 rounded-full text-[11px] md:text-xs font-medium transition-all ${
                  !customMode
                    ? 'bg-white text-black shadow'
                    : 'text-white/60 hover:text-white'
                } ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                disabled={isGenerationDisabled}
                className={`px-3 py-1 rounded-full text-[11px] md:text-xs font-medium transition-all ${
                  customMode
                    ? 'bg-accent-brand text-white shadow-[0_0_25px_rgba(129,140,248,0.75)]'
                    : 'text-white/60 hover:text-white'
                } ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Custom
              </button>
            </div>
          </div>
        </header>

        {/* Grid 3 colonnes */}
        <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start">
          {/* Colonne 1 : création / presets */}
          <div className="space-y-4">
            {/* Formulaire actif */}
            <div className="space-y-6">
              {/* Bandeau de presets */}
              <PresetStrip
                presets={aiStudioPresets}
                activePresetId={activePresetId}
                onPresetClick={handleApplyPreset}
              />
              {/* le formulaire existant reste visible mais inactif */}
              {customMode ? (
                // Mode personnalisé
                <>
                  {/* Titre */}
                  <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 backdrop-blur-md">
                    <h2 className="text-xs sm:text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-brand" />
                      <span>Projet & sortie</span>
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-white/55 mb-2 sm:mb-3 hidden sm:block">
                      Configurez le titre, le style et la durée de votre prochaine génération.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 text-white/80">Titre</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Entrez un titre"
                          disabled={isGenerationDisabled}
                          className={`w-full bg-black/30 border border-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Style de musique */}
                  <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 backdrop-blur-md">
                    <h2 className="text-xs sm:text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-brand" />
                      <span>Style & ambiance</span>
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-white/55 mb-2 sm:mb-3 hidden sm:block">
                      Définissez l'ambiance et les tags musicaux.
                    </p>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 text-white/80">Style de musique</label>
                      <textarea
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Entrez le style de musique"
                        rows={3}
                        maxLength={1000}
                        disabled={isGenerationDisabled}
                        className={`w-full bg-black/30 border border-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 resize-none ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <div className="text-[10px] text-white/40 mt-1 text-right">
                        {style.length}/1000
                      </div>
                      {/* Tags suggestions */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[...styleSuggestions, ...vibeSuggestions].map((tag, index) => {
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              key={`style-${tag}-${index}`}
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

                    {/* Remix: Drag & Drop d'un audio (upload-cover) */}
                    <div className="mt-3">
                      <label className="block text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 text-white/80">Ajouter un audio source (optionnel, Remix)</label>
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
                            if (!uploadResponse.ok) throw new Error("Erreur upload Cloudinary");
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
                        <p className="text-[10px] text-white/40 mt-2">Audio uploadé ✓ (prêt pour Remix)</p>
                      )}
                    </div>
                  </div>

                  {/* Paroles ou Description */}
                  <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 backdrop-blur-md space-y-3 sm:space-y-4">
                    <h2 className="text-xs sm:text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-brand" />
                      <span>Paroles ou Description</span>
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-white/55 hidden sm:block">
                      Saisissez les paroles exactes ou décrivez simplement l'ambiance souhaitée.
                    </p>
                    {customMode ? (
                      <>
                        {/* Instrumental Toggle */}
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isInstrumental}
                              onChange={(e) => setIsInstrumental(e.target.checked)}
                              disabled={isGenerationDisabled}
                              className="sr-only"
                            />
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isInstrumental ? 'bg-accent-brand' : 'bg-white/10'
                            }`}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isInstrumental ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </div>
                            <span className="text-xs font-medium text-white/80">Instrumental</span>
                          </label>
                        </div>
                        {/* Paroles */}
                        <div>
                          <label className="block text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 text-white/80">Paroles</label>
                          <textarea
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            placeholder="Écrivez vos propres paroles, deux couplets (8 lignes) pour un meilleur résultat."
                            rows={6}
                            maxLength={5000}
                            disabled={isGenerationDisabled}
                            className={`w-full bg-black/30 border border-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 resize-none ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div className="text-[10px] text-white/40 mt-1 text-right">
                            {lyrics.length}/5000
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 text-white/80">Description de la chanson</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Décrivez le style de musique et le sujet que vous souhaitez, l'IA générera les paroles pour vous."
                          rows={4}
                          maxLength={199}
                          disabled={isGenerationDisabled}
                          className={`w-full bg-black/30 border border-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 resize-none ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    )}
                  </div>
                  {/* Options avancées */}
                  {customMode && (
                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 backdrop-blur-md space-y-3 sm:space-y-4">
                      <h2 className="text-xs sm:text-sm font-semibold text-white mb-1 flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-brand" />
                        <span>Options avancées</span>
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-white/55 hidden sm:block">
                        Ajustez le weirdness, le poids du style, les tags négatifs, etc.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-white/50 mb-1"><span>Weirdness</span><span>{weirdness}%</span></div>
                          <input type="range" min={0} max={100} value={weirdness} onChange={(e) => setWeirdness(parseInt(e.target.value))} disabled={isGenerationDisabled} className={`w-full ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-white/50 mb-1"><span>Style influence</span><span>{styleInfluence}%</span></div>
                          <input type="range" min={0} max={100} value={styleInfluence} onChange={(e) => setStyleInfluence(parseInt(e.target.value))} disabled={isGenerationDisabled} className={`w-full ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-white/50 mb-1"><span>Audio weight</span><span>{audioWeight}%</span></div>
                          <input type="range" min={0} max={100} value={audioWeight} onChange={(e) => setAudioWeight(parseInt(e.target.value))} disabled={isGenerationDisabled} className={`w-full ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-white/50 mb-1">Vocal gender</label>
                            <select value={vocalGender} onChange={(e) => setVocalGender(e.target.value)} disabled={isGenerationDisabled} className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <option value="">Auto</option>
                              <option value="m">Male</option>
                              <option value="f">Female</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/50 mb-1">Negative tags</label>
                            <input value={negativeTags} onChange={(e) => setNegativeTags(e.target.value)} placeholder="Ex: Heavy Metal, Upbeat Drums" disabled={isGenerationDisabled} className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Mode description
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md space-y-4">
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
                      className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 resize-none ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          </div>

          {/* Colonne 2 : orbe + timeline */}
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-md flex flex-col items-center gap-4">
              <StudioStatusOrb
                isGenerating={isGenerating}
                generationStatus={generationStatus}
              />
              <div className="text-center text-[12px] text-white/60 max-w-xs">
                {isGenerating || generationStatus === 'pending'
                  ? 'Nous générons votre musique. Vous pouvez déjà voir les pistes se remplir ci-dessous dès que le streaming est disponible.'
                  : 'Cliquez sur "Générer" pour lancer une nouvelle création IA. Les résultats apparaîtront ici.'}
              </div>
              {/* Bouton principal de génération */}
              <button
                type="button"
                onClick={generateMusic}
                disabled={isGenerationDisabled || isGenerating}
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all w-full sm:w-auto justify-center ${
                  isGenerationDisabled || isGenerating
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-accent-brand text-white shadow-[0_0_30px_rgba(129,140,248,0.8)] hover:scale-[1.01]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                    <span className="hidden sm:inline">Génération en cours...</span>
                    <span className="sm:hidden">En cours...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Lancer la génération</span>
                    <span className="sm:hidden">Générer</span>
                  </>
                )}
              </button>
            </div>
            {/* Status Display */}
            {currentTaskId && (
              <div className="bg-accent-blue/20 border border-accent-blue/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue"></div>
                  <span className="text-accent-blue font-medium text-sm">
                    {sunoState === 'pending' && 'Génération Suno en cours...'}
                    {sunoState === 'first' && 'Première piste terminée !'}
                    {sunoState === 'success' && 'Génération terminée !'}
                    {sunoState === 'error' && 'Erreur de génération'}
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Task ID: {currentTaskId.substring(0, 8)}... | Statut: {sunoState}
                </p>
                {sunoError && (
                  <p className="text-xs text-red-400 mt-2">Erreur: {sunoError}</p>
                )}
                <div className="mt-2 text-[10px] text-white/40">
                  <p>Génération de 2 musiques en parallèle</p>
                  <p>Streaming disponible en 30-40 secondes</p>
                  <p>Téléchargement en 2-3 minutes</p>
                </div>
              </div>
            )}
            {/* Generated Tracks Display */}
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
          </div>

          {/* Colonne 3 : bibliothèque / historique */}
          <div className="space-y-4">
            <RecentGenerations
              generations={recentGenerationsSorted}
              loading={generationsLoading}
              error={generationsError}
              onReload={refreshGenerations}
              onUseGeneration={(gen) => {
                const convertedTracks: GeneratedTrack[] = (gen.tracks || []).map(convertAITrackToGenerated);
                setGeneratedTracks(convertedTracks);
                if (convertedTracks[0]) {
                  setSelectedTrack(convertedTracks[0]);
                }
                setSelectedGeneration(gen);
              }}
              onPlayGeneration={handlePlayGeneration}
            />
          </div>
        </div>

        {/* Modale d'achat de crédits */}
        <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />

        {/* Panneau latéral pour les détails de la track */}
        <TrackInspector
          track={selectedTrack}
          isOpen={showTrackPanel}
          onClose={closeTrackPanel}
          onPlay={playGenerated}
          onDownload={downloadGenerated}
          onShare={shareGenerated}
        />
      </div>
    </div>
  );
}

