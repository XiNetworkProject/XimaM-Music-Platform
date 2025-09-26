
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Music, Mic, Settings, Play, Download, Share2, Volume2, VolumeX, Plus, ChevronDown, Edit3, Type, Headphones, Zap, Star, X } from 'lucide-react';
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
        
        prompt = `Titre: "${title}". Style: ${style}`;
        if (lyrics.trim()) {
          prompt += `. Paroles: ${lyrics}`;
        }
        if (isInstrumental) {
          prompt += '. Musique instrumentale uniquement, sans voix';
        }
      } else {
        // Mode description : utiliser la description
        if (!description.trim()) {
          alert('Veuillez décrire la musique que vous souhaitez');
          return;
        }
        prompt = description;
      }

      const requestBody = {
        title: customMode ? title : 'Musique générée',
        style: customMode ? style : description,
        prompt: customMode ? (lyrics.trim() ? lyrics : '') : description,
        instrumental: isInstrumental,
        model: modelVersion
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
      {/* Header moderne style Suno */}
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Top bar avec crédits et mode */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button className="relative inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-all">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{quota.remaining}</span>
              </button>
              
              <div className="relative inline-flex items-center bg-transparent border border-[var(--border)] rounded-full h-10 p-1">
                <button
                  onClick={() => setCustomMode(false)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    !customMode 
                      ? 'bg-[var(--surface-2)] text-[var(--text)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setCustomMode(true)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    customMode 
                      ? 'bg-[var(--surface-2)] text-[var(--text)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="relative">
              <button className="relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-all">
                v5
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interface principale style Suno */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panneau gauche - Formulaire */}
            <div className="space-y-4">
              {/* Titre */}
              <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Edit3 className="w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a song title"
                    className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-muted)]">Workspace</span>
                  <button className="ml-auto flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    My Workspace
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Boutons d'ajout */}
              <div className="flex gap-2">
                <button className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-l-2xl p-3 text-sm text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Audio
                </button>
                <button className="bg-[var(--surface-2)] border border-[var(--border)] p-3 text-sm text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Persona
                </button>
                <button className="bg-[var(--surface-2)] border border-[var(--border)] rounded-r-2xl p-3 text-sm text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Inspo
                </button>
              </div>

              {/* Section Lyrics */}
              <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm font-medium text-[var(--text)]">Lyrics</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <Zap className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <Headphones className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Write some lyrics (leave empty for instrumental)"
                    className="w-full resize-none border-none bg-transparent text-base outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                    style={{ height: '100px' }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <Zap className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enhance lyrics (e.g. &quot;make it sound happier&quot;)"
                        className="bg-transparent border-none outline-none text-sm text-[var(--text-muted)] placeholder-[var(--text-muted)]"
                      />
                      <button className="w-8 h-8 rounded-full bg-[var(--text)] text-[var(--surface-1)] flex items-center justify-center hover:opacity-80 transition-opacity">
                        <Zap className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Styles */}
              <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm font-medium text-[var(--text)]">Styles</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <Zap className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <Headphones className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="Hip-hop, R&B, upbeat"
                    className="w-full resize-none border-none bg-transparent text-base outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                    style={{ height: '100px' }}
                    maxLength={1000}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['reggae', 'house', 'dramatic builds', 'malevocals', 'electronic', 'catchy beats', 'j-pop indie', 'afrobeat', 'pop', 'soviet post-punk', '1940s big band', 'deep focus', 'honor', 'female chorus', 'emotional crescendos', 'emotive groove', 'thunderous drums', 'drill bass', '75 bpm', 'breezy', 'yacht rock', 'war', 'fast guitar', 'trans'].map((styleTag) => (
                      <button
                        key={styleTag}
                        className="px-3 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-4)] transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {styleTag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Panneau droit - Options avancées et génération */}
            <div className="space-y-4">
              {/* Options avancées */}
              <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm font-medium text-[var(--text)]">Advanced Options</span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Exclude styles"
                      className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                      maxLength={1000}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Vocal Gender</span>
                      <Settings className="w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    </div>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 rounded-md text-sm bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        Male
                      </button>
                      <button className="px-2 py-1 rounded-md text-sm bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                        Female
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Weirdness</span>
                      <Settings className="w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-[var(--surface-3)] rounded-full">
                        <div className="h-2 bg-[var(--text)] rounded-full w-1/2"></div>
                      </div>
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                        <div className="w-4 h-4 bg-[var(--text)] rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-[var(--text-muted)]">50%</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Style Influence</span>
                      <Settings className="w-4 h-4 text-[var(--text-muted)] opacity-50" />
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-[var(--surface-3)] rounded-full">
                        <div className="h-2 bg-[var(--text)] rounded-full w-1/2"></div>
                      </div>
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                        <div className="w-4 h-4 bg-[var(--text)] rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-[var(--text-muted)]">50%</div>
                  </div>
                </div>
              </div>

              {/* Description de la chanson */}
              <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-1"></div>
                    <span className="text-sm font-medium text-[var(--text)]">Song Description</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors">
                      <Zap className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Hip-hop, R&B, upbeat"
                    className="w-full resize-none border-none bg-transparent text-base outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                    style={{ height: '100px' }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-4)] transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        rock
                      </button>
                      <button className="px-3 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-4)] transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        hip hop
                      </button>
                      <button className="px-3 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-4)] transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        intentional wrong notes
                      </button>
                    </div>
                    <button className="px-3 py-1 rounded-full text-xs bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      Instrumental
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de génération */}
          <div className="flex items-center justify-center gap-4 bg-[var(--surface-1)] p-4 mt-6">
            <button className="w-12 h-12 rounded-full bg-[var(--surface-3)] flex items-center justify-center hover:bg-[var(--surface-4)] transition-colors opacity-0 -ml-16" disabled>
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
            <motion.button
              onClick={generateMusic}
              disabled={isGenerating || quotaLoading || quota.remaining <= 0}
              className="flex-grow bg-[var(--surface-3)] text-[var(--text)] p-3 rounded-full transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-[var(--text)] rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Create</span>
                </>
              ) : (
                <>
                  <Music className="w-5 h-5" />
                  <span className="text-sm font-medium">Create</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Status Display */}
          {currentTaskId && (
            <div className="max-w-4xl mx-auto mt-6">
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-[var(--text)] rounded-full animate-spin"></div>
                  <span className="text-[var(--text)] font-medium">
                    {sunoState === 'pending' && 'Génération Suno en cours...'}
                    {sunoState === 'first' && 'Première piste terminée !'}
                    {sunoState === 'success' && 'Génération terminée !'}
                    {sunoState === 'error' && 'Erreur de génération'}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  Task ID: {currentTaskId.substring(0, 8)}... | Statut: {sunoState}
                </p>
                {sunoError && (
                  <p className="text-sm text-red-400 mt-2">Erreur: {sunoError}</p>
                )}
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  <p>Génération de 2 musiques en parallèle</p>
                  <p>Streaming disponible en 30-40 secondes</p>
                  <p>Téléchargement en 2-3 minutes</p>
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
            className="max-w-4xl mx-auto mt-8"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
                🎵 Générations récentes
              </h3>
              <p className="text-[var(--text-muted)]">
                Retrouvez vos dernières créations
              </p>
            </div>

            <div className="space-y-3">
              {generations.slice(0, 3).map((gen) => (
              <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] hover:border-[var(--border)]/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[var(--text)]">{gen.title}</h4>
                      <p className="text-[var(--text-muted)] text-sm">{gen.style}</p>
                      <p className="text-xs text-[var(--text-muted)]">
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
                        className="bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Écouter
                      </button>
                      <a
                        href="/ai-library"
                        className="bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
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
            className="max-w-4xl mx-auto mt-8"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
                🎵 Génération terminée !
              </h3>
              <p className="text-[var(--text-muted)]">
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
                  className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)] hover:border-[var(--border)]/60 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Music className="w-8 h-8 text-white" />
                </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--text)]">{track.title}</h3>
                      <p className="text-[var(--text-muted)] text-sm">{track.style}</p>
                      {track.isInstrumental && (
                        <span className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mt-1">
                          Instrumental
                        </span>
                      )}
                  </div>
                </div>

                  {track.lyrics && (
                    <div className="mb-4 p-4 bg-[var(--surface-3)] rounded-lg">
                      <h4 className="text-sm font-medium mb-2 text-[var(--text)]">Paroles générées :</h4>
                      <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{track.lyrics}</p>
                  </div>
                )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => playAITrack(track)}
                      className="flex-1 bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Écouter
                    </button>
                    <button
                      onClick={() => downloadTrack(track)}
                      className="bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => shareTrack(track)}
                      className="bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
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
            className="max-w-4xl mx-auto mt-8"
          >
            <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--text)]">{generatedTrack.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{generatedTrack.style}</p>
                  {generatedTrack.isInstrumental && (
                    <span className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mt-1">
                      Instrumental
                    </span>
                  )}
                </div>
              </div>

              {generatedTrack.lyrics && (
                <div className="mb-4 p-4 bg-[var(--surface-3)] rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-[var(--text)]">Paroles générées :</h4>
                  <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{generatedTrack.lyrics}</p>
                </div>
              )}

              <div className="flex gap-2">
                    <button
                  onClick={() => playAITrack(generatedTrack)}
                  className="flex-1 bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Écouter
                    </button>
                    <button
                  onClick={() => downloadTrack(generatedTrack)}
                  className="bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                    </button>
                <button
                  onClick={() => shareTrack(generatedTrack)}
                  className="bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
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
