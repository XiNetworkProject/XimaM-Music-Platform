
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Music, Mic, Settings, Play, Download, Share2, Volume2, VolumeX } from 'lucide-react';
import { useAIQuota } from '@/hooks/useAIQuota';
import { useAudioPlayer } from '@/app/providers';
import { useSunoWaiter } from '@/hooks/useSunoWaiter';
import { useAIGenerations } from '@/hooks/useAIGenerations';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';

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

export default function AIGenerator() {
  const { quota, loading: quotaLoading } = useAIQuota();
  const { playTrack } = useAudioPlayer();
  const { generations, loading: generationsLoading, refreshGenerations } = useAIGenerations();
  const { generations: bgGenerations, activeGenerations, startBackgroundGeneration } = useBackgroundGeneration();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<GeneratedTrack | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  
  // Utiliser le nouveau hook Suno
  const { state: sunoState, tracks: sunoTracks, error: sunoError } = useSunoWaiter(currentTaskId || undefined);
  const [customMode, setCustomMode] = useState(false);
  const [modelVersion, setModelVersion] = useState('V4_5');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [weirdness, setWeirdness] = useState<number>(50);
  const [styleInfluence, setStyleInfluence] = useState<number>(50);
  const [audioWeight, setAudioWeight] = useState<number>(50);
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
      coverUrl: undefined,
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
    
    if (sunoState === 'success' && sunoTracks.length > 0) {
      console.log('🎵 Suno tracks brutes:', sunoTracks);
      
      // Convertir les tracks Suno en format local
      const convertedTracks: GeneratedTrack[] = sunoTracks.map((track, index) => {
        const audioUrl = track.audio || track.stream || '';
        console.log(`🎵 Track ${index} conversion:`, { 
          originalTrack: track, 
          audioUrl, 
          hasAudio: !!track.audio, 
          hasStream: !!track.stream 
        });
        
        return {
          id: track.id || `${currentTaskId}_${index}`,
          audioUrl,
          prompt: customMode ? (lyrics.trim() ? lyrics : '') : description,
          title: customMode ? (track.title || title) : (track.title || `Musique générée ${index + 1}`),
          style: customMode ? style : (style || 'Custom'),
          lyrics: customMode ? lyrics : '',
          isInstrumental,
          duration: track.duration || 120,
          createdAt: new Date().toISOString()
        };
      });

      console.log('🎵 Tracks converties:', convertedTracks);

      setGeneratedTracks(convertedTracks);
      setGeneratedTrack(convertedTracks[0]);
      setGenerationStatus('completed');
      setCurrentTaskId(null);
      
      console.log('✅ États mis à jour:', {
        generatedTracksLength: convertedTracks.length,
        generatedTrack: convertedTracks[0]?.title,
        generationStatus: 'completed'
      });
      
      // Rafraîchir la bibliothèque IA après génération
      setTimeout(() => {
        refreshGenerations();
        console.log('🔄 Bibliothèque IA rafraîchie');
      }, 2000);
    } else if (sunoState === 'error') {
      console.error('❌ Suno error:', sunoError);
      setGenerationStatus('failed');
      setCurrentTaskId(null);
    } else if (sunoState === 'first') {
      // Première piste terminée
      console.log('🎵 Première piste terminée !');
    }
  }, [sunoState, sunoTracks, sunoError, currentTaskId, description, style, lyrics, isInstrumental, customMode, title]);

  const generateMusic = async () => {
    if (quotaLoading || quota.remaining <= 0) {
      alert('Quota épuisé. Améliorez votre plan pour continuer.');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('pending');
    setGeneratedTracks([]);
    
    try {
      let prompt = '';
      
      if (customMode) {
        // Mode personnalisé : utiliser titre, style, paroles
        if (!title.trim() || !style.trim()) {
          alert('Veuillez remplir le titre et le style de musique');
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
          return;
        }
        const tags = selectedTags.length ? ` (tags: ${selectedTags.join(', ')})` : '';
        prompt = `${description}${tags}`;
      }

      // Convert sliders (0-100) to API expected 0.00–1.00 (step .01)
      const styleWeightVal = customMode ? Math.round(styleInfluence) / 100 : 0.5;
      const weirdnessVal = customMode ? Math.round(weirdness) / 100 : 0.5;
      const audioWeightVal = customMode ? Math.round(audioWeight) / 100 : 0.5;

      const requestBody = {
        title: customMode ? title : 'Musique générée',
        style: customMode ? [style, ...selectedTags].filter(Boolean).join(', ') : [description, ...selectedTags].filter(Boolean).join(', '),
        prompt: customMode ? (lyrics.trim() ? lyrics : '') : description,
        instrumental: isInstrumental,
        model: modelVersion,
        styleWeight: Number(styleWeightVal.toFixed(2)),
        weirdnessConstraint: Number(weirdnessVal.toFixed(2)),
        audioWeight: Number(audioWeightVal.toFixed(2)),
        customMode,
        negativeTags: negativeTags || undefined,
        vocalGender: vocalGender || undefined,
        callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined
      };

      console.log('🎵 Requête génération:', requestBody);

      const response = await fetch('/api/suno/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const data = await response.json();
      
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



  const playAITrack = (track: GeneratedTrack) => {
    console.log('🎵 Playing AI track:', track);
    
    // Convertir la génération IA en Track compatible avec le lecteur principal
    const aiTrack: PlayerTrack = {
      _id: `ai-${track.id}`,
      title: track.title,
      artist: {
        _id: 'ai-generator',
        name: 'Synaura IA',
        username: 'synaura-ai'
      },
      duration: track.duration,
      audioUrl: track.audioUrl, // Cette propriété contient maintenant l'URL normalisée
      coverUrl: '/synaura_symbol.svg', // Logo Synaura comme cover
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: []
    };

    console.log('🎵 Converted AI track:', aiTrack);

    // Jouer avec le lecteur principal
    playTrack(aiTrack as any);
  };

  const downloadTrack = async (track: GeneratedTrack) => {
    try {
      const response = await fetch(track.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synaura-${track.title || track.id}.wav`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
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

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)]">
      {/* Header */}
      <div className="container mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Sparkles className="w-7 h-7 text-yellow-400" />
            <h1 className="text-3xl md:text-4xl font-extrabold title-suno">
              Générateur IA
            </h1>
          </motion.div>
          <p className="text-[var(--text-muted)] text-base mb-4">
            Créez de la musique unique avec l'intelligence artificielle
          </p>
          {/* Bandeau Aperçu limité */}
          <div className="max-w-3xl mx-auto">
            <div className="panel-suno border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="relative p-6 md:p-8 text-center">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Aperçu limité
                </span>
                <h2 className="mt-4 text-2xl md:text-3xl font-bold">
                  V4.5 (aperçu) — générez quelques titres, testez l’IA
                </h2>
                <p className="mt-2 text-[var(--text-muted)]">
                  Votre plan actuel vous donne accès à un petit nombre de générations chaque mois. Passez au plan supérieur pour plus.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3 text-sm">
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-[var(--border)]">
                    Plan: {quota.plan_type}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-[var(--border)]">
                    Restant: {quota.remaining}/{quota.monthly_limit}
                  </div>
                  {!quotaLoading && quota.remaining <= 0 && (
                    <a href="/subscriptions" className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white">
                      Augmenter mon quota
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Display (pills) */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="relative inline-flex items-center gap-2 px-3 py-1 text-[12px] leading-[20px] rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="font-medium tracking-wide">{quota.remaining} / {quota.monthly_limit} restants</span>
            </span>
            <span className="relative inline-flex items-center gap-2 px-3 py-1 text-[12px] leading-[20px] rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Plan: {quota.plan_type}
            </span>
            <span className="relative inline-flex items-center gap-2 px-3 py-1 text-[12px] leading-[20px] rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
              Modèle: {modelVersion.replace('_', '.')}
            </span>
          </div>
        </div>

        {/* Segmented control Simple / Custom + Select modèle */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between panel-suno border border-[var(--border)] rounded-full p-1">
            <div className="relative inline-flex items-center gap-0 h-10 p-1">
              <button
                onClick={() => setCustomMode(false)}
                className={`relative px-4 py-1 rounded-full text-[13px] transition-all ${
                  !customMode ? 'bg-[var(--surface-3)] text-white shadow-sm' : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setCustomMode(true)}
                className={`relative px-4 py-1 rounded-full text-[13px] transition-all ${
                  customMode ? 'bg-[var(--surface-3)] text-white shadow-sm' : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                Custom
              </button>
            </div>
            <div className="flex items-center gap-2 pr-2">
              <select
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                className="h-10 bg-transparent border border-[var(--border)] rounded-full px-3 text-[12px] focus:outline-none"
              >
                <option value="V4_5">V4.5</option>
                <option value="V5">V5</option>
              </select>
            </div>
          </div>
        </div>

        {/* Formulaire actif, style page Upload */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* le formulaire existant reste visible mais inactif */}
          {customMode ? (
            // Mode personnalisé
            <>
              {/* Titre */}
              <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
                <label className="block text-sm font-medium mb-2">Titre</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entrez un titre"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Style de musique */}
              <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
                <label className="block text-sm font-medium mb-2">Style de musique</label>
                <textarea
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Entrez le style de musique"
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
                <div className="text-xs text-gray-400 mt-2 text-right">
                  {style.length}/1000
                </div>
                {/* Tags suggestions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...styleSuggestions, ...vibeSuggestions].map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagClick(tag)}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-[var(--surface-3)] border-[var(--border)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]'}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instrumental Toggle */}
              <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInstrumental}
                    onChange={(e) => setIsInstrumental(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isInstrumental ? 'bg-purple-600' : 'bg-gray-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isInstrumental ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="text-sm font-medium">Instrumental</span>
                </label>
              </div>

              {/* Paroles */}
              <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
                <label className="block text-sm font-medium mb-2">Paroles</label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Écrivez vos propres paroles, deux couplets (8 lignes) pour un meilleur résultat."
                  rows={6}
                  maxLength={5000}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
                <div className="text-xs text-gray-400 mt-2 text-right">
                  {lyrics.length}/5000
                </div>
              </div>
              {/* Options avancées */}
              <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
                <label className="block text-sm font-medium mb-3">Options avancées</label>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-300 mb-1"><span>Weirdness</span><span>{weirdness}%</span></div>
                    <input type="range" min={0} max={100} value={weirdness} onChange={(e) => setWeirdness(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-300 mb-1"><span>Style influence</span><span>{styleInfluence}%</span></div>
                    <input type="range" min={0} max={100} value={styleInfluence} onChange={(e) => setStyleInfluence(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-300 mb-1"><span>Audio weight</span><span>{audioWeight}%</span></div>
                    <input type="range" min={0} max={100} value={audioWeight} onChange={(e) => setAudioWeight(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Vocal gender</label>
                      <select value={vocalGender} onChange={(e) => setVocalGender(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)]">
                        <option value="">Auto</option>
                        <option value="m">Male</option>
                        <option value="f">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Negative tags</label>
                      <input value={negativeTags} onChange={(e) => setNegativeTags(e.target.value)} placeholder="Ex: Heavy Metal, Upbeat Drums" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] placeholder-[var(--text-muted)]" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Mode description
            <div className="panel-suno border border-[var(--border)] rounded-xl p-6 space-y-4">
              <label className="block text-sm font-medium mb-2">Description de la chanson</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le style de musique et le sujet que vous souhaitez, l'IA générera les paroles pour vous."
                rows={4}
                maxLength={199}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
              <div className="text-xs text-gray-400 mt-2 text-right">
                {description.length}/199
              </div>
              <div>
                <div className="text-xs text-gray-300 mb-2">Inspiration (tags)</div>
                <div className="flex flex-wrap gap-2">
                  {[...styleSuggestions, ...vibeSuggestions].map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagClick(tag)}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-[var(--surface-3)] border-[var(--border)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]'}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Pas d'options avancées en mode simple */}
            </div>
          )}

          {/* Generate Button + contrôle quota */}
            <motion.button
            onClick={generateMusic}
            disabled={isGenerating || quotaLoading || quota.remaining <= 0}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            >
              {isGenerating ? (
                <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {generationStatus === 'pending' ? 'Génération en cours...' : 'Génération en cours...'}
                </>
              ) : (
                <>
                <Music className="w-5 h-5" />
                Générer de la musique
                </>
              )}
            </motion.button>
            {!quotaLoading && quota.remaining <= 0 && (
              <div className="mt-3 text-center text-sm text-white/70">
                Quota épuisé. <a href="/subscriptions" className="text-purple-400 underline">Améliorer mon plan</a>
              </div>
            )}

          {/* Status Display */}
          {currentTaskId && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-blue-400 font-medium">
                  {sunoState === 'pending' && 'Génération Suno en cours...'}
                  {sunoState === 'first' && 'Première piste terminée !'}
                  {sunoState === 'success' && 'Génération terminée !'}
                  {sunoState === 'error' && 'Erreur de génération'}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Task ID: {currentTaskId.substring(0, 8)}... | Statut: {sunoState}
              </p>
              {sunoError && (
                <p className="text-sm text-red-400 mt-2">Erreur: {sunoError}</p>
              )}
              <div className="mt-2 text-xs text-gray-500">
                <p>Génération de 2 musiques en parallèle</p>
                <p>Streaming disponible en 30-40 secondes</p>
                <p>Téléchargement en 2-3 minutes</p>
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
              <h3 className="text-xl font-semibold text-blue-400 mb-2">
                🎵 Générations récentes
              </h3>
              <p className="text-gray-400">
                Retrouvez vos dernières créations
              </p>
            </div>

            <div className="space-y-3">
              {generations.slice(0, 3).map((gen) => (
              <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold">{gen.title}</h4>
                      <p className="text-gray-400 text-sm">{gen.style}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(gen.createdAt).toLocaleDateString('fr-FR')} - 
                        {gen.tracks.length} track{gen.tracks.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const convertedTracks: GeneratedTrack[] = gen.tracks.map((track: any, index) => ({
                            id: track.id,
                            audioUrl: track.audio_url || track.stream_audio_url || '',
                            prompt: '',
                            title: track.title,
                            style: gen.style,
                            lyrics: '',
                            isInstrumental: false,
                            duration: track.duration,
                            createdAt: new Date().toISOString()
                          }));
                          setGeneratedTracks(convertedTracks);
                          setGeneratedTrack(convertedTracks[0]);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Écouter
                      </button>
                      <a
                        href="/ai-library"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
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
          return generatedTracks.length > 0;
        })() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mt-8"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-green-400 mb-2">
                🎵 Génération terminée !
              </h3>
              <p className="text-gray-400">
                Suno a généré {generatedTracks.length} version{generatedTracks.length > 1 ? 's' : ''} de votre musique
              </p>
            </div>

            <div className="space-y-4">
              {generatedTracks.map((track, index) => (
              <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="panel-suno rounded-xl p-6 border border-[var(--border)] hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <Music className="w-8 h-8 text-white" />
                </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold title-suno truncate">{track.title}</h3>
                      <p className="text-[var(--text-muted)] text-sm truncate">{track.style || '—'} • {formatSec(track.duration || 0)}</p>
                      {track.isInstrumental && (
                        <span className="inline-block bg-purple-600/20 text-purple-300 text-xs px-2 py-1 rounded-full mt-1 border border-purple-500/30">
                          Instrumental
                        </span>
                      )}
                  </div>
                </div>

                  {track.lyrics && (
                    <div className="mb-4 p-4 bg-white/5 rounded-lg border border-[var(--border)]">
                      <h4 className="text-sm font-medium mb-2">Paroles générées :</h4>
                      <p className="text-sm text-[var(--text)] whitespace-pre-line">{track.lyrics}</p>
                  </div>
                )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => playGenerated(track)}
                      className="flex-1 border border-[var(--border)] hover:bg-[var(--surface-2)] text-white font-medium py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Écouter
                    </button>
                    <button
                      onClick={() => downloadGenerated(track)}
                      className="border border-[var(--border)] hover:bg-[var(--surface-2)] text-white font-medium py-2 px-4 rounded-full transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => shareGenerated(track)}
                      className="border border-[var(--border)] hover:bg-[var(--surface-2)] text-white font-medium py-2 px-4 rounded-full transition-colors flex items-center gap-2"
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
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{generatedTrack.title}</h3>
                  <p className="text-gray-400 text-sm">{generatedTrack.style}</p>
                  {generatedTrack.isInstrumental && (
                    <span className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mt-1">
                      Instrumental
                    </span>
                  )}
                </div>
              </div>

              {generatedTrack.lyrics && (
                <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Paroles générées :</h4>
                  <p className="text-sm text-gray-300 whitespace-pre-line">{generatedTrack.lyrics}</p>
                </div>
              )}

              <div className="flex gap-2">
                    <button
                  onClick={() => playAITrack(generatedTrack)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Écouter
                    </button>
                    <button
                  onClick={() => downloadTrack(generatedTrack)}
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
          </div>
    </div>
  );
}
