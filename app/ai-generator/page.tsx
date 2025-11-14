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
import { useDropzone } from 'react-dropzone';
import StudioBackground from '@/components/StudioBackground';

interface GeneratedTrack {
  id: string;
  audioUrl: string;
  prompt: string;
  title: string;
  style: string;
  lyrics: string;
  isInstrumental: boolean;
  duration: number;
  createdAt: string;
  imageUrl?: string; // Cover image généré par Suno
}

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
  
  // Utiliser le nouveau hook Suno
  const { state: sunoState, tracks: sunoTracks, error: sunoError } = useSunoWaiter(currentTaskId || undefined);
  const [customMode, setCustomMode] = useState(false);
  const [modelVersion, setModelVersion] = useState('V4_5');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // États pour la bibliothèque des générations
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'instrumental' | 'with-lyrics'>('all');
  const [showRightPanel, setShowRightPanel] = useState(false);
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

  // Mise en page 3 colonnes (desktop)
  const [isDesktop, setIsDesktop] = useState(false);
  React.useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [leftWidth, setLeftWidth] = useState<number>(36);
  const [centerWidth, setCenterWidth] = useState<number>(28);
  const [rightWidth, setRightWidth] = useState<number>(36);
  const columnsRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{active: boolean; which: 'lc' | 'cr' | null; startX: number; startLeft: number; startCenter: number; startRight: number}>({
    active: false,
    which: null,
    startX: 0,
    startLeft: 36,
    startCenter: 28,
    startRight: 36,
  });

  React.useEffect(() => {
    if (!drag.active) return;
    const onMove = (e: MouseEvent) => {
      const container = columnsRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const totalPx = rect.width;
      const deltaPx = e.clientX - drag.startX;
      const deltaPct = (deltaPx / totalPx) * 100;
      const minPct = 20;
      const maxPct = 60;
      if (drag.which === 'lc') {
        let newLeft = Math.max(minPct, Math.min(maxPct, drag.startLeft + deltaPct));
        let newCenter = drag.startCenter - deltaPct;
        let clampedCenter = Math.max(minPct, Math.min(maxPct, newCenter));
        const adjust = clampedCenter - newCenter;
        newLeft -= adjust;
        if (newLeft < minPct) {
          const adj = minPct - newLeft;
          newLeft = minPct;
          clampedCenter -= adj;
        }
        setLeftWidth(newLeft);
        setCenterWidth(clampedCenter);
      } else if (drag.which === 'cr') {
        let newCenter = Math.max(minPct, Math.min(maxPct, drag.startCenter + deltaPct));
        let newRight = drag.startRight - deltaPct;
        let clampedRight = Math.max(minPct, Math.min(maxPct, newRight));
        const adjust = clampedRight - newRight;
        newCenter -= adjust;
        if (newCenter < minPct) {
          const adj = minPct - newCenter;
          newCenter = minPct;
          clampedRight -= adj;
        }
        setCenterWidth(newCenter);
        setRightWidth(clampedRight);
      }
    };
    const onUp = () => setDrag(prev => ({ ...prev, active: false, which: null }));
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [drag]);


  // Charger largeurs et visibilité depuis localStorage
  React.useEffect(() => {
    try {
      const sL = Number(localStorage.getItem('ai3.left') || '36');
      const sC = Number(localStorage.getItem('ai3.center') || '28');
      const sR = Number(localStorage.getItem('ai3.right') || '36');
      const sShow = localStorage.getItem('ai3.showRight');
      if (Number.isFinite(sL) && sL > 0 && sL < 100) setLeftWidth(sL);
      if (Number.isFinite(sC) && sC > 0 && sC < 100) setCenterWidth(sC);
      if (Number.isFinite(sR) && sR >= 0 && sR < 100) setRightWidth(sR);
      if (sShow === '1') setShowRightPanel(true);
    } catch {}
  }, []);

  // Persister paramètres
  React.useEffect(() => {
    try {
      localStorage.setItem('ai3.left', String(leftWidth));
      localStorage.setItem('ai3.center', String(centerWidth));
      localStorage.setItem('ai3.right', String(rightWidth));
      localStorage.setItem('ai3.showRight', showRightPanel ? '1' : '0');
    } catch {}
  }, [leftWidth, centerWidth, rightWidth, showRightPanel]);

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
    <div className="relative min-h-screen text-white" suppressHydrationWarning>
      <div className="relative z-10">
        {/* HEADER STUDIO */}
        <header className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center justify-between">
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
              <p className="text-xs text-white/55 max-w-sm">Créez, remixeZ et expérimentez avec la génération musicale par IA.</p>
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
        <main className="max-w-6xl mx-auto px-4 md:px-8 pb-10">

        {/* Layout 3 colonnes (desktop) */}
        <div
          ref={columnsRef}
          className={`w-full ${isDesktop ? 'grid gap-3' : ''}`}
          style={{
            position: 'relative',
            zIndex: 0,
            gridTemplateColumns: isDesktop
              ? (showRightPanel
                  ? `${leftWidth}% 6px ${centerWidth}% 6px ${rightWidth}%`
                  : `${leftWidth}% 6px calc(${100 - leftWidth}% - 6px)`)
              : undefined,
          }}
        >
          {/* Colonne gauche: Formulaire existant */}
          <div className={`${isDesktop ? '' : 'w-full'}`}>
            {/* Formulaire actif */}
            <div className="space-y-6">
              {/* le formulaire existant reste visible mais inactif */}
              {customMode ? (
                // Mode personnalisé
                <>
                  {/* Titre */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
                    <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-accent-brand" />
                      <span>Projet & sortie</span>
                    </h2>
                    <p className="text-[11px] text-white/55 mb-3">
                      Configurez le titre, le style et la durée de votre prochaine génération.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-2 text-white/80">Titre</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Entrez un titre"
                          disabled={isGenerationDisabled}
                          className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Style de musique */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
                    <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent-brand" />
                      <span>Style & ambiance</span>
                    </h2>
                    <p className="text-[11px] text-white/55 mb-3">
                      Définissez l'ambiance et les tags musicaux.
                    </p>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-white/80">Style de musique</label>
                      <textarea
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Entrez le style de musique"
                        rows={3}
                        maxLength={1000}
                        disabled={isGenerationDisabled}
                        className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 resize-none ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      <label className="block text-xs font-medium mb-2 text-white/80">Ajouter un audio source (optionnel, Remix)</label>
                      <RemixDropzone
                        remixFile={remixFile}
                        remixUploading={remixUploading}
                        onUploadStart={() => setRemixUploading(true)}
                        onUploadSuccess={async ({ url, publicId, duration }) => { 
                          setRemixUploading(false); 
                          setRemixUploadUrl(url);
                          try {
                            const res = await fetch('/api/ai/upload-source', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ audioUrl: url, publicId, title, duration })
                            });
                            if (res.ok) {
                              window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
                            }
                          } catch {}
                        }}
                        onUploadError={(msg) => { setRemixUploading(false); notify.error('Upload audio', msg); }}
                        onFileSelected={(f) => setRemixFile(f)}
                        disabled={isGenerationDisabled}
                      />
                      {remixUploadUrl && (
                        <p className="text-[10px] text-white/40 mt-2">Audio uploadé ✓ (prêt pour Remix)</p>
                      )}
                    </div>
                  </div>

                  {/* Paroles ou Description */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md space-y-4">
                    <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent-brand" />
                      <span>Paroles ou Description</span>
                    </h2>
                    <p className="text-[11px] text-white/55">
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
                          <label className="block text-xs font-medium mb-2 text-white/80">Paroles</label>
                          <textarea
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            placeholder="Écrivez vos propres paroles, deux couplets (8 lignes) pour un meilleur résultat."
                            rows={6}
                            maxLength={5000}
                            disabled={isGenerationDisabled}
                            className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50 resize-none ${isGenerationDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div className="text-[10px] text-white/40 mt-1 text-right">
                            {lyrics.length}/5000
                          </div>
                        </div>
                      </>
                    ) : (
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
                    )}
                  </div>
                  {/* Options avancées */}
                  {customMode && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md space-y-4">
                      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-accent-brand" />
                        <span>Options avancées</span>
                      </h2>
                      <p className="text-[11px] text-white/55">
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

          {/* Handle entre gauche et centre */}
          {isDesktop && (
            <div
              onMouseDown={(e) => setDrag({ active: true, which: 'lc', startX: e.clientX, startLeft: leftWidth, startCenter: centerWidth, startRight: rightWidth })}
              className="hidden md:block cursor-col-resize relative"
              aria-hidden
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-border-primary rounded" />
            </div>
          )}

          {/* COLONNE CENTRE : orbe + génération en cours */}
          <section className={`space-y-4 ${isDesktop ? '' : 'w-full mt-4'}`}>
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
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  isGenerationDisabled || isGenerating
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-accent-brand text-white shadow-[0_0_30px_rgba(129,140,248,0.8)] hover:scale-[1.01]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Lancer la génération</span>
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
            {generatedTracks.length > 0 && (
              <div className="space-y-3">
                {generatedTracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => openTrackPanel(track)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-accent-purple to-accent-blue rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {track.imageUrl ? (
                          <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{track.title}</h3>
                        <p className="text-[10px] text-white/50 truncate">{track.style || '—'} • {formatSec(track.duration || 0)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playGenerated(track);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-accent-brand/20 border border-accent-brand/50 text-white text-xs hover:bg-accent-brand/30 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3 h-3" />
                        Écouter
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadGenerated(track);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Handle entre centre et droite */}
          {isDesktop && showRightPanel && (
            <div
              onMouseDown={(e) => setDrag({ active: true, which: 'cr', startX: e.clientX, startLeft: leftWidth, startCenter: centerWidth, startRight: rightWidth })}
              className="hidden md:block cursor-col-resize relative"
              aria-hidden
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-border-primary rounded" />
            </div>
          )}

          {/* COLONNE DROITE : bibliothèque IA */}
          <section className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
              <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <Music className="w-4 h-4 text-accent-brand" />
                <span>Bibliothèque IA</span>
              </h2>
              <p className="text-[11px] text-white/55 mb-3">
                Retrouvez vos anciennes générations, filtrez par titre, date ou style.
              </p>
              <div className="space-y-3">
                {/* Barre de recherche */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-white/40">
                      <g><path d="M10.417 17.834q-3.11 0-5.263-2.154T3 10.417t2.154-5.263T10.417 3q3.11 0 5.263 2.154t2.154 5.263a6.95 6.95 0 0 1-1.484 4.336l4.336 4.336q.315.313.314.799 0 .485-.314.798-.313.315-.799.314-.485 0-.798-.314l-4.336-4.336a6.954 6.954 0 0 1-4.336 1.483m0-2.282q2.14 0 3.637-1.498t1.498-3.637-1.498-3.637q-1.497-1.498-3.637-1.498T6.78 6.78q-1.498 1.497-1.498 3.637t1.498 3.637 3.637 1.498"></path></g>
                    </svg>
                  </div>
                  <input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-accent-brand/50"
                  />
                </div>
                {/* Filtres rapides */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterBy('all')}
                    className={`px-2 py-1 rounded-full text-[10px] border transition-colors ${
                      filterBy === 'all' ? 'bg-accent-brand/20 border-accent-brand/50 text-white' : 'bg-transparent border-white/20 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Toutes
                  </button>
                  <button
                    onClick={() => setFilterBy('instrumental')}
                    className={`px-2 py-1 rounded-full text-[10px] border transition-colors ${
                      filterBy === 'instrumental' ? 'bg-accent-brand/20 border-accent-brand/50 text-white' : 'bg-transparent border-white/20 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Instrumentales
                  </button>
                  <button
                    onClick={() => setFilterBy('with-lyrics')}
                    className={`px-2 py-1 rounded-full text-[10px] border transition-colors ${
                      filterBy === 'with-lyrics' ? 'bg-accent-brand/20 border-accent-brand/50 text-white' : 'bg-transparent border-white/20 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Avec paroles
                  </button>
                </div>
                <button
                  onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                  className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60 hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>{sortBy === 'newest' ? 'Plus récent' : 'Plus ancien'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                    <g><path d="M4 18a.97.97 0 0 1-.712-.288A.97.97 0 0 1 3 17q0-.424.288-.712A.97.97 0 0 1 4 16h4q.424 0 .713.288Q9 16.575 9 17q0 .424-.287.712A.97.97 0 0 1 8 18zm0-5a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 12q0-.424.288-.713A.97.97 0 0 1 4 11h10q.424 0 .713.287.287.288.287.713 0 .424-.287.713A.97.97 0 0 1 14 13zm0-5a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 7q0-.424.288-.713A.97.97 0 0 1 4 6h16q.424 0 .712.287Q21 6.576 21 7q0 .424-.288.713A.97.97 0 0 1 20 8z"></path></g>
                  </svg>
                </button>
              </div>
            </div>
            {/* Liste des générations */}
            <div className="flex-1 overflow-y-auto max-h-[600px] space-y-2">
              {generationsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-xs text-white/50">Chargement...</div>
                </div>
              )}
              {generationsError && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-white mb-2 text-sm">Erreur lors du chargement</div>
                  <div className="text-xs text-white/50 mb-3">{generationsError}</div>
                  <button
                    onClick={refreshGenerations}
                    className="px-3 py-1.5 rounded-lg bg-accent-brand text-white text-xs hover:bg-accent-brand/90 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              )}
              {!generationsLoading && !generationsError && filteredAndSortedGenerations.length === 0 && allTracks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-white/60 text-sm mb-2">
                    {generations.length === 0 && allTracks.length === 0 ? 'Aucune génération trouvée' : 'Aucun résultat pour cette recherche'}
                  </div>
                </div>
              )}

              {/* Afficher les tracks individuelles */}
              {!generationsLoading && !generationsError && filteredAndSortedGenerations.length === 0 && allTracks.length > 0 && (
                <div className="space-y-2">
                  {allTracks.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => {
                        const generatedTrack = convertAITrackToGenerated(track);
                        openTrackPanel(generatedTrack);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-accent-purple to-accent-blue">
                          {track.image_url ? (
                            <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate">{track.title}</div>
                          <div className="text-[10px] text-white/50 truncate">
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const fakeGen: AIGeneration = {
                              id: track.generation_id || track.id,
                              user_id: session?.user?.id || '',
                              task_id: '',
                              prompt: track.prompt || '',
                              model: track.model_name || 'V4_5',
                              status: 'completed',
                              created_at: track.created_at,
                              is_favorite: track.is_favorite,
                              is_public: false,
                              play_count: track.play_count,
                              like_count: track.like_count,
                              share_count: 0,
                              metadata: {},
                              tracks: [track]
                            };
                            playAITrack(track, fakeGen);
                          }}
                          className="p-1.5 rounded-lg bg-accent-brand/20 border border-accent-brand/50 text-white hover:bg-accent-brand/30 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Afficher les générations */}
              {!generationsLoading && !generationsError && filteredAndSortedGenerations.length > 0 && (
                <div className="space-y-2">
                  {filteredAndSortedGenerations.map((generation) => (
                    <div
                      key={generation.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-white truncate mb-1">
                            {generation.tracks?.[0]?.title || 'Musique générée'}
                          </h3>
                          <p className="text-[10px] text-white/50 line-clamp-2">{generation.prompt}</p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(generation.id)}
                          className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                            generation.is_favorite ? 'text-red-400' : 'text-white/40 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${generation.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handlePlayGeneration(generation)}
                          className="flex-1 py-1 px-2 rounded-lg bg-accent-brand/20 border border-accent-brand/50 text-white text-[10px] hover:bg-accent-brand/30 transition-colors flex items-center justify-center gap-1"
                        >
                          <Play className="w-2.5 h-2.5" />
                          Écouter
                        </button>
                        <button
                          onClick={() => {
                            const firstTrack = generation.tracks?.[0];
                            if (firstTrack) downloadTrack(firstTrack);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                        >
                          <Download className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Handle entre centre et droite */}
          {isDesktop && showRightPanel && (
            <div
              onMouseDown={(e) => setDrag({ active: true, which: 'cr', startX: e.clientX, startLeft: leftWidth, startCenter: centerWidth, startRight: rightWidth })}
              className="hidden md:block cursor-col-resize relative"
              aria-hidden
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-border-primary rounded" />
            </div>
          )}

          {/* Colonne droite: Détails */}
          {showRightPanel && selectedGeneration && (
          <div className={`${isDesktop ? '' : 'w-full'} ${isDesktop ? '' : 'mt-4'}`}>
            <div className="bg-white-upload backdrop-blur-upload border border-upload rounded-xl p-4 h-full min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground-primary">Détails de la génération</h3>
                <button 
                  onClick={() => setShowRightPanel(false)}
                  className="p-1 rounded-full hover:bg-white-upload backdrop-blur-upload transition-colors"
                >
                  <svg className="w-4 h-4 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {/* Informations principales */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground-primary mb-2">
                    {selectedGeneration.tracks?.[0]?.title || 'Musique générée'}
                  </h4>
                  <p className="text-xs text-foreground-tertiary mb-2">{selectedGeneration.prompt}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full ${
                      selectedGeneration.status === 'completed' 
                        ? 'bg-accent-success/15 text-accent-success border border-accent-success/30'
                        : selectedGeneration.status === 'pending'
                        ? 'bg-accent-warning/15 text-accent-warning border border-accent-warning/30'
                        : 'bg-accent-error/15 text-accent-error border border-accent-error/30'
                    }`}>
                      {selectedGeneration.status === 'completed' ? 'Terminé' : selectedGeneration.status === 'pending' ? 'En cours' : 'Échec'}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white-upload backdrop-blur-upload text-foreground-tertiary border border-upload">
                      {new Date(selectedGeneration.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                      {selectedGeneration.model}
                    </span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePlayGeneration(selectedGeneration)}
                    disabled={selectedGeneration.status !== 'completed'}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-brand text-white rounded-lg hover:bg-accent-brand/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    Lire
                  </button>
                  <button 
                    onClick={() => {
                      const firstTrack = selectedGeneration.tracks?.[0];
                      if (firstTrack) {
                        downloadTrack(firstTrack);
                      }
                    }}
                    disabled={selectedGeneration.status !== 'completed'}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white-upload backdrop-blur-upload border border-upload text-foreground-primary rounded-lg hover:bg-white-upload/80 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Prompt utilisé */}
                <div>
                  <h5 className="text-xs font-medium text-foreground-primary mb-1">Prompt utilisé</h5>
                  <p className="text-xs text-foreground-tertiary bg-white-upload backdrop-blur-upload border border-upload rounded-lg p-2">
                    {selectedGeneration.prompt}
                  </p>
                </div>

                {/* Liste des pistes */}
                {selectedGeneration.tracks && selectedGeneration.tracks.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-foreground-primary mb-2">Pistes générées</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedGeneration.tracks.map((track, index) => (
                        <div key={track.id} className="flex items-center gap-2 p-2 rounded-lg bg-white-upload backdrop-blur-upload border border-upload">
                          <div className="w-8 h-8 rounded bg-background-primary flex items-center justify-center">
                            <Music className="w-4 h-4 text-foreground-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate text-foreground-primary">{track.title}</div>
                            <div className="text-[10px] text-foreground-tertiary">
                              {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </div>
                          </div>
                          <button 
                            onClick={() => playAITrack(track, selectedGeneration)}
                            disabled={selectedGeneration.status !== 'completed'}
                            className="text-xs border border-upload rounded px-2 py-1 hover:bg-white-upload backdrop-blur-upload text-foreground-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Lire
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Générations en arrière-plan */}
        {generations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-accent-blue mb-2">
                🎵 Générations récentes
              </h3>
              <p className="text-foreground-tertiary">
                Retrouvez vos dernières créations
              </p>
            </div>

            <div className="space-y-3">
              {generations.slice(0, 3).map((gen) => (
              <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white-upload backdrop-blur-upload rounded-lg p-4 border border-upload hover:border-accent-brand/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-foreground-primary">{gen.tracks?.[0]?.title || 'Musique générée'}</h4>
                      <p className="text-foreground-tertiary text-sm">{gen.metadata?.style || 'Custom'}</p>
                      <p className="text-xs text-foreground-tertiary">
                        {new Date(gen.created_at).toLocaleDateString('fr-FR')} - 
                        {gen.tracks?.length || 0} track{(gen.tracks?.length || 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const convertedTracks: GeneratedTrack[] = (gen.tracks || []).map((track: any, index) => ({
                            id: track.id,
                            audioUrl: track.audio_url || track.stream_audio_url || '',
                            prompt: '',
                            title: track.title,
                            style: gen.metadata?.style || 'Custom',
                            lyrics: '',
                            isInstrumental: false,
                            duration: track.duration,
                            createdAt: new Date().toISOString()
                          }));
                          setGeneratedTracks(convertedTracks);
                          setGeneratedTrack(convertedTracks[0]);
                        }}
                        className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer py-2 px-4 text-[15px] leading-[24px] rounded-lg text-foreground-primary bg-accent-success enabled:hover:before:bg-overlay-on-primary disabled:after:bg-background-primary disabled:after:opacity-50 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Écouter
                      </button>
                      <a
                        href="/ai-library"
                        className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer py-2 px-4 text-[15px] leading-[24px] rounded-lg text-foreground-primary bg-accent-blue enabled:hover:before:bg-overlay-on-primary disabled:after:bg-background-primary disabled:after:opacity-50 flex items-center gap-2"
                      >
                        <Music className="w-4 h-4" />
                        Voir tout
                      </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          </motion.div>
        )}

        {/* Generated Tracks Display */}
        {(() => {
          console.log('🎵 Rendu - generatedTracks:', {
            length: generatedTracks.length,
            tracks: generatedTracks.map(t => ({ id: t.id, title: t.title, audioUrl: t.audioUrl }))
          });
          console.log('🎵 Condition d\'affichage:', generatedTracks.length > 0);
          return generatedTracks.length > 0;
        })() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mt-8"
          >
            <div className="text-center mb-6">
              {generationStatus === 'completed' ? (
                <>
                  <h3 className="text-xl font-semibold text-accent-success mb-2">
                    🎵 Génération terminée !
                  </h3>
                  <p className="text-foreground-tertiary">
                    Suno a généré {generatedTracks.length} version{generatedTracks.length > 1 ? 's' : ''} de votre musique
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-accent-blue mb-2 flex items-center justify-center gap-2">
                    <div className="animate-pulse">🎵</div> Streaming disponible !
                  </h3>
                  <p className="text-foreground-tertiary">
                    {generatedTracks.length} piste{generatedTracks.length > 1 ? 's' : ''} en cours de génération • Vous pouvez déjà écouter
                  </p>
                </>
              )}
            </div>

            <div className="space-y-4">
              {generatedTracks.map((track, index) => (
              <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white-upload backdrop-blur-upload rounded-xl p-6 border border-upload hover:bg-white-upload backdrop-blur-upload transition-colors cursor-pointer"
                  onClick={() => {
                    console.log('🖱️ Clic sur la carte de track:', track.title);
                    console.log('🖱️ Track complète:', track);
                    openTrackPanel(track);
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-accent-purple to-accent-blue rounded-xl flex items-center justify-center overflow-hidden">
                      {track.imageUrl ? (
                        <img 
                          src={track.imageUrl} 
                          alt={track.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback si l'image ne charge pas
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>';
                          }}
                        />
                      ) : (
                        <Music className="w-8 h-8 text-foreground-primary" />
                      )}
                </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground-primary truncate">{track.title}</h3>
                      <p className="text-foreground-tertiary text-sm truncate">{track.style || '—'} • {formatSec(track.duration || 0)}</p>
                      <div className="flex gap-2 mt-1">
                        {track.isInstrumental && (
                          <span className="inline-block bg-accent-purple/20 text-accent-purple text-xs px-2 py-1 rounded-full border border-accent-purple/30">
                            Instrumental
                          </span>
                        )}
                        {generationStatus === 'pending' && currentTaskId && (
                          <span className="inline-flex items-center gap-1 bg-accent-blue/20 text-accent-blue text-xs px-2 py-1 rounded-full border border-accent-blue/30 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-ping"></div>
                            Streaming
                          </span>
                        )}
                      </div>
                  </div>
                </div>

                  {track.lyrics && (
                    <div className="mb-4 p-4 bg-background-primary/50 rounded-lg border border-upload">
                      <h4 className="text-sm font-medium mb-2 text-foreground-primary">Paroles générées :</h4>
                      <p className="text-sm text-foreground-primary whitespace-pre-line">{track.lyrics}</p>
                  </div>
                )}

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playGenerated(track);
                      }}
                      className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer flex-1 py-2 px-4 text-[15px] leading-[24px] rounded-full text-foreground-primary bg-transparent before:border-upload enabled:hover:before:bg-overlay-on-primary disabled:after:bg-background-primary disabled:after:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Écouter
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadGenerated(track);
                      }}
                      className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer py-2 px-4 text-[15px] leading-[24px] rounded-full text-foreground-primary bg-transparent before:border-upload enabled:hover:before:bg-overlay-on-primary disabled:after:bg-background-primary disabled:after:opacity-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareGenerated(track);
                      }}
                      className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer py-2 px-4 text-[15px] leading-[24px] rounded-full text-foreground-primary bg-transparent before:border-upload enabled:hover:before:bg-overlay-on-primary disabled:after:bg-background-primary disabled:after:opacity-50 flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
              </motion.div>
            ))}
          </div>
          </motion.div>
        )}

        {/* Single Generated Track Display (fallback) */}
        {generatedTrack && generatedTracks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mt-8"
          >
            <div className="bg-white-upload backdrop-blur-upload rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-accent-purple to-accent-blue rounded-lg flex items-center justify-center">
                  <Music className="w-8 h-8 text-foreground-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground-primary">{generatedTrack.title}</h3>
                  <p className="text-foreground-tertiary text-sm">{generatedTrack.style}</p>
                  {generatedTrack.isInstrumental && (
                    <span className="inline-block bg-accent-purple text-foreground-primary text-xs px-2 py-1 rounded-full mt-1">
                      Instrumental
                    </span>
                  )}
                </div>
              </div>

              {generatedTrack.lyrics && (
                <div className="mb-4 p-4 bg-background-primary/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-foreground-primary">Paroles générées :</h4>
                  <p className="text-sm text-foreground-primary whitespace-pre-line">{generatedTrack.lyrics}</p>
                </div>
              )}

              <div className="flex gap-2">
                    <button
                  onClick={() => {
                    const aiTrack: AITrack = {
                      id: generatedTrack.id,
                      generation_id: '',
                      title: generatedTrack.title,
                      audio_url: generatedTrack.audioUrl,
                      stream_audio_url: '',
                      image_url: '',
                      duration: generatedTrack.duration,
                      prompt: generatedTrack.prompt,
                      model_name: '',
                      tags: [],
                      style: generatedTrack.style,
                      lyrics: generatedTrack.lyrics,
                      source_links: null,
                      created_at: generatedTrack.createdAt,
                      is_favorite: false,
                      play_count: 0,
                      like_count: 0
                    };
                    const aiGeneration: AIGeneration = {
                      id: '',
                      user_id: '',
                      task_id: '',
                      prompt: generatedTrack.prompt,
                      model: '',
                      status: 'completed',
                      created_at: generatedTrack.createdAt,
                      is_favorite: false,
                      is_public: false,
                      play_count: 0,
                      like_count: 0,
                      share_count: 0,
                      metadata: { title: generatedTrack.title, style: generatedTrack.style },
                      tracks: [aiTrack]
                    };
                    playAITrack(aiTrack, aiGeneration);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Écouter
                    </button>
                    <button
                  onClick={() => {
                    const aiTrack: AITrack = {
                      id: generatedTrack.id,
                      generation_id: '',
                      title: generatedTrack.title,
                      audio_url: generatedTrack.audioUrl,
                      stream_audio_url: '',
                      image_url: '',
                      duration: generatedTrack.duration,
                      prompt: generatedTrack.prompt,
                      model_name: '',
                      tags: [],
                      style: generatedTrack.style,
                      lyrics: generatedTrack.lyrics,
                      source_links: null,
                      created_at: generatedTrack.createdAt,
                      is_favorite: false,
                      play_count: 0,
                      like_count: 0
                    };
                    downloadTrack(aiTrack);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                    </button>
                <button
                  onClick={() => shareTrack(generatedTrack)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </main>

        {/* Modale d'achat de crédits */}
        <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />

        {/* Panneau latéral pour les détails de la track */}
        <AnimatePresence>
        {(() => {
          console.log('🔍 État du panneau:', { showTrackPanel, selectedTrack: !!selectedTrack });
          return showTrackPanel && selectedTrack;
        })() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={closeTrackPanel}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-white-upload backdrop-blur-upload border border-upload h-full overflow-hidden flex flex-col"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header du panneau */}
              <div className="flex items-center justify-between p-4 border-b border-upload">
                <h2 className="text-sm font-semibold text-foreground-primary">Détails de la track</h2>
                <button
                  onClick={closeTrackPanel}
                  className="p-2 hover:bg-background-secondary rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-foreground-primary" />
                </button>
              </div>

              {/* Contenu du panneau */}
              <div className="flex-1 overflow-y-auto">
                {/* Image de couverture */}
                <div className="relative aspect-square bg-gradient-to-br from-accent-purple to-accent-blue">
                  {selectedTrack?.imageUrl ? (
                    <img 
                      src={selectedTrack.imageUrl} 
                      alt={selectedTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>

                {/* Informations principales */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-foreground-primary mb-1">{selectedTrack?.title}</h3>
                  <p className="text-foreground-secondary text-sm mb-3">{selectedTrack?.style || '—'} • {formatSec(selectedTrack?.duration || 0)}</p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedTrack?.isInstrumental && (
                      <span className="inline-block bg-accent-purple/20 text-accent-purple text-xs px-2 py-1 rounded-full border border-accent-purple/30">
                        Instrumental
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => selectedTrack && playGenerated(selectedTrack)}
                      className="flex-1 bg-accent-purple text-white py-2 px-3 rounded-full font-medium hover:bg-accent-purple/90 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Play className="w-3 h-3" />
                      Écouter
                    </button>
                    <button
                      onClick={() => selectedTrack && downloadGenerated(selectedTrack)}
                      className="p-2 bg-background-secondary text-foreground-primary rounded-full hover:bg-background-tertiary transition-colors"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => selectedTrack && shareGenerated(selectedTrack)}
                      className="p-2 bg-background-secondary text-foreground-primary rounded-full hover:bg-background-tertiary transition-colors"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Paroles */}
                  {selectedTrack?.lyrics && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-foreground-primary mb-2">Paroles :</h4>
                      <div className="text-xs text-foreground-primary bg-background-secondary p-3 rounded-lg whitespace-pre-line max-h-40 overflow-y-auto">
                        {selectedTrack.lyrics}
                      </div>
                    </div>
                  )}

                  {/* Informations techniques */}
                  <div className="border-t border-upload pt-3">
                    <h4 className="text-xs font-medium text-foreground-primary mb-2">Informations :</h4>
                    <div className="space-y-1 text-xs text-foreground-secondary">
                      <div className="flex justify-between">
                        <span>Durée :</span>
                        <span>{formatSec(selectedTrack?.duration || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Créé le :</span>
                        <span>{selectedTrack?.createdAt ? new Date(selectedTrack.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type :</span>
                        <span>{selectedTrack?.isInstrumental ? 'Instrumental' : 'Avec paroles'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Sous-composant: Dropzone pour Remix (upload audio -> Cloudinary -> url)
function RemixDropzone({
  remixFile,
  remixUploading,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onFileSelected,
  disabled,
}: {
  remixFile: File | null;
  remixUploading: boolean;
  onUploadStart: () => void;
  onUploadSuccess: (params: { url: string; publicId?: string; duration?: number }) => void;
  onUploadError: (message: string) => void;
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      onUploadError('Veuillez déposer un fichier audio valide');
      return;
    }
    onFileSelected(file);
    try {
      onUploadStart();
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
      onUploadSuccess({ url: secureUrl, publicId: uploadedPublicId, duration: uploadedDuration });
    } catch (e: any) {
      onUploadError(e?.message || 'Erreur upload');
    }
  }, [onUploadStart, onUploadSuccess, onUploadError, onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'audio/*': [] }, maxFiles: 1, disabled });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : isDragActive ? 'border-accent-brand bg-accent-brand/10' : 'border-upload hover:border-accent-brand/50'
      }`}
    >
      <input {...getInputProps()} />
      {remixUploading ? (
        <div className="text-sm">Upload en cours...</div>
      ) : remixFile ? (
        <div className="text-sm">
          {remixFile.name} • {Math.round(remixFile.size / 1024 / 1024)} MB
        </div>
      ) : (
        <div className="text-sm text-foreground-tertiary">Glissez-déposez un fichier audio, ou cliquez pour sélectionner</div>
      )}
    </div>
  );
}
