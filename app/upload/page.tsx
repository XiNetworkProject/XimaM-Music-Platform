'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Music, 
  Image, 
  X, 
  Play, 
  Pause, 
  Volume2,
  ArrowLeft,
  Check,
  FileText,
  Calendar,
  Settings,
  Disc3,
  Plus,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { notify } from '@/components/NotificationCenter';
import BottomNav from '@/components/BottomNav';
import { getEntitlements } from '@/lib/entitlements';
import { MUSIC_GENRES } from '@/lib/genres';

interface UploadFormData {
  title: string;
  artist: string;
  album?: string;
  genre: string[];
  description: string;
  lyrics?: string;
  isExplicit: boolean;
  isPublic: boolean;
  copyright: {
    owner: string;
    year: number;
    rights: string;
  };
}

interface AlbumTrack {
  id: string;
  audioFile: File | null;
  title: string;
  trackNumber: number;
  duration: number;
}

interface AlbumFormData {
  title: string;
  artist: string;
  releaseDate: string;
  genre: string[];
  description: string;
  isExplicit: boolean;
  isPublic: boolean;
  tracks: AlbumTrack[];
  copyright: {
    owner: string;
    year: number;
    rights: string;
  };
}

interface UploadProgress {
  audio: number;
  cover: number;
}

// Fonction pour upload direct vers Cloudinary
const uploadToCloudinary = async (file: File, resourceType: 'video' | 'image' = 'video') => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const publicId = `${resourceType === 'video' ? 'track' : 'cover'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const signatureResponse = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp, publicId, resourceType }),
  });

  if (!signatureResponse.ok) {
    throw new Error('Erreur lors de la génération de la signature');
  }

  const { signature, apiKey, cloudName } = await signatureResponse.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', resourceType === 'video' ? 'ximam/audio' : 'ximam/images');
  formData.append('public_id', publicId);
  formData.append('resource_type', resourceType);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  if (resourceType === 'image') {
    formData.append('width', '800');
    formData.append('height', '800');
    formData.append('crop', 'fill');
  }

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error('Erreur lors de l\'upload vers Cloudinary');
  }

  return await uploadResponse.json();
};

// Composant Waveform réelle avec seek
function WaveformDisplay({ audioFile, currentTime = 0, duration = 0, onSeek }: { audioFile: File | null; currentTime?: number; duration?: number; onSeek?: (time: number) => void }) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioFile) return;
    
    // Générer waveform à partir du fichier audio
    const generateWaveform = async () => {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        setWaveformData(filteredData.map(n => n * multiplier));
      } catch (error) {
        // Fallback: waveform simulée
        const fallback = Array.from({ length: 200 }, (_, i) => {
          const progress = i / 200;
          const amplitude = Math.sin(progress * Math.PI * 8) * 0.4 + 0.6;
          const variation = Math.random() * 0.3;
          return Math.max(0.1, amplitude + variation);
        });
        setWaveformData(fallback);
      }
    };
    
    generateWaveform();
  }, [audioFile]);

  const handleClick = (e: React.MouseEvent) => {
    if (!onSeek || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative h-12 w-full text-white/80 cursor-pointer" onClick={handleClick}>
      <div className="absolute inset-x-6 inset-y-0">
        <div className="absolute inset-y-0 left-0 w-full overflow-clip rounded-md bg-white/5">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 32" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d={waveformData.map((amp, i) => {
              const x = (i / 200) * 200;
              const y1 = 16 - (amp * 12);
              const y2 = 16 + (amp * 12);
              return `M${x} ${y1}l0 ${y2 - y1}`;
            }).join('')} />
          </svg>
          {/* Barre de progression */}
          <div 
            className="absolute inset-y-0 left-0 bg-purple-400/30 rounded-md"
            style={{ width: `${progress}%` }}
          />
          {/* Curseur de position */}
          <div 
            className="absolute inset-y-0 w-0.5 bg-white rounded-full"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Composant Preview Audio/Video avec contrôles réels
function MediaPreview({ 
  file, 
  coverFile, 
  type, 
  isPlaying, 
  onTogglePlay, 
  currentTime, 
  duration, 
  onSeek 
}: { 
  file: File | null; 
  coverFile?: File | null;
  type: 'audio' | 'video'; 
  isPlaying: boolean; 
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!file) return null;

  return (
    <div className="relative flex w-full flex-row justify-center gap-2 sm:gap-4 overflow-clip px-2 sm:px-4 h-48 sm:h-64">
      <div className="relative aspect-[9/16] h-full max-w-sm">
        <div className="absolute inset-0 h-full w-full overflow-clip rounded-xl bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-white/10 flex items-center justify-center">
          {coverPreview ? (
            <div className="relative w-full h-full">
              <img 
                src={coverPreview} 
                alt="Cover preview" 
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-center text-white">
                  <Music size={48} className="mx-auto mb-4" />
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm opacity-80">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Music size={48} className="mx-auto mb-4 text-white/60" />
              <div className="text-white/80 font-medium">{file.name}</div>
              <div className="text-white/50 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

export default function UploadPage() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  
  // Type d'upload: 'single' ou 'album'
  const [uploadType, setUploadType] = useState<'single' | 'album'>('single');
  
  // États pour single track
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ audio: 0, cover: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [usage, setUsage] = useState<any | null>(null);
  const [planKey, setPlanKey] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free');
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const [tempPublicIds, setTempPublicIds] = useState<{ audio?: string; cover?: string }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // États pour album
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumTracks, setAlbumTracks] = useState<AlbumTrack[]>([]);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>({
    title: '',
    artist: user?.name || '',
    releaseDate: new Date().toISOString().split('T')[0],
    genre: [],
    description: '',
    isExplicit: false,
    isPublic: true,
    tracks: [],
    copyright: {
      owner: user?.name || '',
      year: new Date().getFullYear(),
      rights: 'Tous droits réservés'
    }
  });
  
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    artist: user?.name || '',
    album: '',
    genre: [],
    description: '',
    lyrics: '',
    isExplicit: false,
    isPublic: true,
    copyright: {
      owner: user?.name || '',
      year: new Date().getFullYear(),
      rights: 'Tous droits réservés'
    }
  });

  requireAuth();

  // Mettre à jour le formData quand user change
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({
        ...prev,
        artist: user.name || '',
        copyright: {
          ...prev.copyright,
          owner: user.name || ''
        }
      }));
    }
  }, [user?.name]);

  // Charger usage + plan pour afficher les CTA/limitations
  useEffect(() => {
    (async () => {
      try {
        const [u, c] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (u) setUsage(u);
        const name = (c?.subscription?.name || 'Free').toLowerCase();
        if (['free','starter','pro','enterprise'].includes(name)) setPlanKey(name as any);
      } catch {}
    })();
  }, []);

  const canUpload = (() => {
    if (!usage) return true;
    const overTracks = usage.tracks.limit >= 0 && usage.tracks.used >= usage.tracks.limit;
    return !overTracks;
  })();

  useEffect(() => {
    if (!usage) return;
    const msgs: string[] = [];
    if (usage.tracks.limit >= 0 && usage.tracks.used >= usage.tracks.limit) msgs.push('Limite de pistes atteinte');
    setBlockedMsg(msgs.length ? msgs.join(' • ') : null);
  }, [usage]);

  // Gestion audio réelle avec HTMLAudioElement
  useEffect(() => {
    if (!audioFile) {
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }
    
    const url = URL.createObjectURL(audioFile);
    const audio = new Audio(url);
    
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    audioRef.current = audio;
    
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }, [audioFile]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Synchroniser artiste et copyright avec le profil utilisateur
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({
        ...prev,
        artist: user.name || '',
        copyright: {
          ...prev.copyright,
          owner: user.name || ''
        }
      }));
    }
  }, [user?.name]);

  const onAudioDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        notify.error('Fichier invalide', 'Veuillez sélectionner un fichier audio valide');
        return;
      }
      // Validation taille par plan
      const planMaxMb = (planKey === 'starter' ? 200 : planKey === 'pro' ? 500 : planKey === 'enterprise' ? 1000 : 80);
      const sizeMb = file.size / 1024 / 1024;
      if (sizeMb > planMaxMb) {
        notify.error('Fichier trop volumineux', `Fichier trop volumineux pour votre plan (${sizeMb.toFixed(1)} MB). Limite: ${planMaxMb} MB.`);
        return;
      }
      setAudioFile(file);
    }
  }, []);

  const onCoverDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        notify.error('Image invalide', 'Veuillez sélectionner une image valide');
        return;
      }
      setCoverFile(file);
    }
  }, []);

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onAudioDrop,
    accept: { 'audio/*': [] },
    maxFiles: 1
  });

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps, isDragActive: isCoverDragActive } = useDropzone({
    onDrop: onCoverDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const handleInputChange = (field: keyof UploadFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyrightChange = (field: keyof UploadFormData['copyright'], value: any) => {
    setFormData(prev => ({
      ...prev,
      copyright: { ...prev.copyright, [field]: value }
    }));
  };

  const addGenre = (genre: string) => {
    if (genre && !formData.genre.includes(genre)) {
      setFormData(prev => ({ ...prev, genre: [...prev.genre, genre] }));
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({ ...prev, genre: prev.genre.filter(g => g !== genre) }));
  };


  const handleSubmit = async () => {
    if (!canUpload) {
      notify.error("Limite atteinte", "Passez au plan supérieur pour uploader plus.");
      return;
    }
    
    if (!audioFile) {
      notify.error('Fichier requis', 'Veuillez sélectionner un fichier audio');
      return;
    }

    if (!formData.title.trim()) {
      notify.error('Titre requis', 'Veuillez saisir un titre');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ audio: 0, cover: 0 });

    try {
      notify.info('Upload en cours', 'Upload audio en cours...', 0);
      setUploadProgress(prev => ({ ...prev, audio: 25 }));
      
      const audioResult = await uploadToCloudinary(audioFile, 'video');
      setTempPublicIds(prev => ({ ...prev, audio: audioResult.public_id }));
      setUploadProgress(prev => ({ ...prev, audio: 75 }));
      // Audio upload terminé

      // Vérification droits d'auteur (AudD) — no-op si token manquant
      try {
        const checkResp = await fetch('/api/upload/copyright-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioResult.secure_url,
            title: formData.title,
            artist: formData.artist,
          })
        });
        if (checkResp.ok) {
          const check = await checkResp.json();
          if (check?.matched && check?.details) {
            // Logique minimale: si le titre/artiste détectés ne correspondent pas à l'utilisateur → bloquer
            const detectedTitle = (check.details.title || '').toLowerCase();
            const detectedArtist = (check.details.artist || '').toLowerCase();
            const inputTitle = (formData.title || '').toLowerCase();
            const inputArtist = (formData.artist || '').toLowerCase();
            const likelyDifferentWork = detectedTitle && detectedArtist && (
              !inputTitle || detectedTitle !== inputTitle || (inputArtist && detectedArtist !== inputArtist)
            );
            if (likelyDifferentWork) {
              throw new Error("Conflit potentiel de droits d'auteur détecté. Veuillez vérifier vos droits ou modifier votre contenu.");
            }
          }
        }
      } catch (e: any) {
        // En cas de conflit, rollback l'upload audio temporaire
        if (tempPublicIds.audio || audioResult.public_id) {
          try { await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: audioResult.public_id }) }); } catch {}
        }
        throw e;
      }

      let coverResult: { public_id?: string; secure_url?: string } | null = null;
      if (coverFile) {
        notify.info('Upload image', 'Upload image de couverture...', 0);
        setUploadProgress(prev => ({ ...prev, cover: 25 }));
        
        coverResult = await uploadToCloudinary(coverFile, 'image');
        setTempPublicIds(prev => ({ ...prev, cover: coverResult?.public_id }));
        setUploadProgress(prev => ({ ...prev, cover: 75 }));
        // Cover upload terminé
      }

      setUploadProgress({ audio: 100, cover: 100 });

      notify.info('Sauvegarde', 'Sauvegarde en cours...', 0);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioResult.secure_url,
          audioPublicId: audioResult.public_id,
          coverUrl: (coverResult && coverResult.secure_url) ? coverResult.secure_url : null,
          coverPublicId: (coverResult && coverResult.public_id) ? coverResult.public_id : null,
          trackData: formData,
          duration: audioResult.duration || 0,
          audioBytes: Math.round((audioFile?.size || 0)),
          coverBytes: Math.round((coverFile?.size || 0)),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Sauvegarde terminée
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      notify.success('Upload réussi !', 'Musique uploadée avec succès !');
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fromUpload', 'true');
      }
      
      router.push('/');
    } catch (error) {
      notify.error('Erreur upload', error instanceof Error ? error.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      setUploadProgress({ audio: 0, cover: 0 });
    }
  };

  // Nettoyage Cloudinary si l'utilisateur quitte la page avant la sauvegarde
  useEffect(() => {
    const handler = async () => {
      if (!tempPublicIds.audio && !tempPublicIds.cover) return;
      try {
        await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover }) });
      } catch {}
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!tempPublicIds.audio && !tempPublicIds.cover) return;
      const payload = new Blob([JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover })], { type: 'application/json' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/upload/cleanup', payload);
    };
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [tempPublicIds]);

  const cancelUpload = async () => {
    if (tempPublicIds.audio || tempPublicIds.cover) {
      try {
        await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover }) });
      } catch {}
    }
    setTempPublicIds({});
    router.push('/');
  };

  return (
    <div className="min-h-screen w-full text-[var(--text)] pb-20">
      <div className="w-full p-2 sm:p-3">
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] backdrop-blur-xl max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex h-fit w-full flex-row items-center justify-between p-4 text-[var(--text)] max-md:p-2 border-b border-[var(--border)]">
            <h1 className="text-2xl max-md:text-base">
              {uploadType === 'single' ? 'Upload Track' : 'Upload Album'}
            </h1>
            <div className="flex flex-row gap-2">
              {audioFile && (
                <button 
                  type="button" 
                  {...getAudioRootProps()}
                  className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-[var(--bg-tertiary)] enabled:hover:before:bg-white/10"
                >
                  <input {...getAudioInputProps()} />
                  <span className="relative flex flex-row items-center justify-center gap-2">Replace Audio</span>
                </button>
              )}
              {coverFile && (
                <button 
                  type="button"
                  {...getCoverRootProps()}
                  className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-[var(--bg-tertiary)] enabled:hover:before:bg-white/10"
                >
                  <input {...getCoverInputProps()} />
                  <span className="relative flex flex-row items-center justify-center gap-2">Replace Cover</span>
                </button>
                  )}
                </div>
          </div>

          {/* Tabs - Single Track vs Album */}
          <div className="px-4 pt-3 pb-0">
            <div className="flex gap-2 border-b border-[var(--border)]">
              <button
                onClick={() => {
                  setUploadType('single');
                  setCurrentStep(1);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all relative ${
                  uploadType === 'single'
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Single Track</span>
                {uploadType === 'single' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              
              <button
                onClick={() => {
                  setUploadType('album');
                  setCurrentStep(1);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all relative ${
                  uploadType === 'album'
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Disc3 className="w-4 h-4" />
                <span>Album</span>
                {uploadType === 'album' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Alertes quotas */}
          {blockedMsg && (
            <div className="mx-2 sm:mx-4 mt-1 rounded-lg p-2 sm:p-3 border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm">{blockedMsg}. Améliorez votre plan pour continuer.</span>
              <button onClick={() => router.push('/subscriptions')} className="text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-md bg-cyan-400/20 ring-1 ring-cyan-400/30 hover:bg-cyan-400/25">Voir les plans</button>
        </div>
          )}

          {/* Contenu principal */}
          <div className="flex flex-col">
            {/* Mode Single Track */}
            {uploadType === 'single' && (
              <AnimatePresence mode="wait">
              {currentStep === 1 && (
              <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex w-full flex-col items-stretch justify-start gap-3 p-3 sm:p-4"
                >
                  {!audioFile ? (
                  <div
                    {...getAudioRootProps()}
                      className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors cursor-pointer ${
                      isAudioDragActive
                          ? 'border-purple-400 bg-purple-500/10'
                          : 'border-[var(--border)] hover:border-purple-400/50'
                    }`}
                  >
                    <input {...getAudioInputProps()} />
                      <div className="space-y-3">
                        <Upload size={40} className="mx-auto text-white/40 sm:w-16 sm:h-16" />
                        <div>
                          <p className="text-lg sm:text-xl font-medium">Glissez votre fichier audio ici</p>
                          <p className="text-white/60 text-sm">ou cliquez pour sélectionner</p>
                        </div>
                        <p className="text-xs sm:text-sm text-white/40">
                          Formats supportés: MP3, WAV, FLAC — limites: Free 80 MB · Starter 200 MB · Pro 500 MB
                        </p>
                      </div>
                      </div>
                    ) : (
                    <MediaPreview 
                      file={audioFile} 
                      coverFile={coverFile}
                      type="audio" 
                      isPlaying={isPlaying} 
                      onTogglePlay={() => setIsPlaying(!isPlaying)}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={(time) => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = time;
                          setCurrentTime(time);
                        }
                      }}
                    />
                  )}

                  {/* Contrôles audio compacts */}
                  {audioFile && (
                    <div className="flex flex-row items-center justify-center gap-3 px-2 sm:px-4 py-2">
                  <button
                    type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                        {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                      <div className="font-mono text-xs sm:text-sm tracking-tight text-white/80 tabular-nums">
                        <span className="text-[var(--text)]">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span> / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                </div>
                    </div>
                  )}

                  {/* Waveform */}
                  {audioFile && (
                    <WaveformDisplay 
                      audioFile={audioFile}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={(time) => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = time;
                          setCurrentTime(time);
                        }
                      }}
                    />
                  )}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-4 p-3 sm:p-4"
                >
                  <h2 className="text-xl font-semibold">Informations de la piste</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-white/80">Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-purple-400 transition-colors text-[var(--text)] text-sm"
                    placeholder="Titre de votre musique"
                    required
                  />
                </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-white/80">Artiste</label>
                      <input
                        type="text"
                        value={formData.artist}
                        disabled
                        className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)]/50 border border-[var(--border)] rounded-lg text-[var(--text)]/70 cursor-not-allowed text-sm"
                        placeholder="Synchronisé avec votre profil"
                      />
                      <p className="text-xs text-white/50">Modifiez votre nom de profil pour changer l'artiste</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-white/80">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-purple-400 transition-colors resize-none text-[var(--text)] text-sm"
                    placeholder="Décrivez votre musique..."
                  />
                </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-white/80">Paroles (optionnel)</label>
                    <textarea
                      value={formData.lyrics || ''}
                      onChange={(e) => handleInputChange('lyrics', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-purple-400 transition-colors resize-none text-[var(--text)] text-sm"
                      placeholder="Ajoutez les paroles de votre musique..."
                    />
                    <p className="text-xs text-white/50">Les paroles sont optionnelles et peuvent être ajoutées plus tard</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-white/80">Genre</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MUSIC_GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => formData.genre.includes(genre) ? removeGenre(genre) : addGenre(genre)}
                          className={`px-2.5 py-1 rounded-full text-xs sm:text-sm transition-colors ${
                          formData.genre.includes(genre)
                              ? 'bg-purple-500 text-white'
                              : 'bg-[var(--bg-tertiary)] text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-white/80">Image de couverture</label>
                    <div
                      {...getCoverRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                        isCoverDragActive
                          ? 'border-purple-400 bg-purple-500/10'
                          : coverFile
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-[var(--border)] hover:border-purple-400/50'
                      }`}
                    >
                      <input {...getCoverInputProps()} />
                      {coverFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <img 
                            src={URL.createObjectURL(coverFile)} 
                            alt="Cover preview" 
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div className="text-left">
                            <div className="text-sm font-medium text-green-400">{coverFile.name}</div>
                            <div className="text-xs text-white/60">{(coverFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                  </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <Image size={24} className="text-white/40" />
                          <div className="text-left">
                            <p className="text-sm font-medium">Ajouter une image de couverture</p>
                            <p className="text-xs text-white/60">JPG, PNG, WebP (max 5MB)</p>
                </div>
                        </div>
                      )}
                    </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-4 p-3 sm:p-4"
                >
                  <h2 className="text-xl font-semibold">Paramètres de publication</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic}
                        onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                        className="w-4 h-4 text-purple-500 bg-[var(--bg-tertiary)] border-[var(--border)] rounded focus:ring-purple-500"
                      />
                      <label htmlFor="isPublic" className="text-sm text-[var(--text)] cursor-pointer">Rendre public</label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isExplicit"
                        checked={formData.isExplicit}
                        onChange={(e) => handleInputChange('isExplicit', e.target.checked)}
                        className="w-4 h-4 text-purple-500 bg-[var(--bg-tertiary)] border-[var(--border)] rounded focus:ring-purple-500"
                      />
                      <label htmlFor="isExplicit" className="text-sm text-[var(--text)] cursor-pointer">Contenu explicite</label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">Copyright</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-white/80">Propriétaire</label>
                      <input
                        type="text"
                        value={formData.copyright.owner}
                          disabled
                          className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)]/50 border border-[var(--border)] rounded-lg text-[var(--text)]/70 cursor-not-allowed text-sm"
                          placeholder="Synchronisé avec votre profil"
                        />
                        <p className="text-xs text-white/50">Automatiquement synchronisé avec votre nom de profil</p>
                    </div>
                    
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-white/80">Année</label>
                      <input
                        type="number"
                        value={formData.copyright.year}
                        onChange={(e) => handleCopyrightChange('year', parseInt(e.target.value))}
                          className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-purple-400 transition-colors text-[var(--text)] text-sm"
                        placeholder="2024"
                      />
                    </div>
                  </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-4 p-3 sm:p-4"
                >
                  <h2 className="text-xl font-semibold">Prévisualisation finale</h2>
                  
                  {/* Rendu final comme une TrackCard compacte */}
                  <div className="bg-white/[0.04] backdrop-blur-md border border-[var(--border)] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-cyan-500 flex-shrink-0">
                        {coverFile ? (
                          <img 
                            src={URL.createObjectURL(coverFile)} 
                            alt="Cover" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                        )}
                </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--text)] truncate text-sm sm:text-base">{formData.title || 'Sans titre'}</h3>
                        <p className="text-xs sm:text-sm text-white/70">{formData.artist}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {formData.genre.slice(0, 2).map(g => (
                            <span key={g} className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{g}</span>
                          ))}
                          {formData.genre.length > 2 && (
                            <span className="text-xs text-white/50">+{formData.genre.length - 2}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Mini waveform dans la preview */}
                    {audioFile && (
                      <div className="mt-3">
                        <WaveformDisplay 
                          audioFile={audioFile}
                          currentTime={currentTime}
                          duration={duration}
                          onSeek={(time) => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = time;
                              setCurrentTime(time);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-white/70">
                    <div className="flex justify-between">
                      <span>Durée :</span>
                      <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taille :</span>
                      <span>{((audioFile?.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Visibilité :</span>
                      <span>{formData.isPublic ? 'Public' : 'Privé'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contenu :</span>
                      <span>{formData.isExplicit ? 'Explicite' : 'Tout public'}</span>
                    </div>
                  </div>

                  {/* Prévisualisation des paroles */}
                  {formData.lyrics && (
                    <div className="bg-white/[0.02] border border-[var(--border)] rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Paroles
                      </h4>
                      <div className="text-xs text-white/70 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {formData.lyrics}
                      </div>
                    </div>
                  )}

                  {/* Section impact stockage supprimée */}
                </motion.div>
              )}
              </AnimatePresence>
            )}
            
            {/* Mode Album */}
            {uploadType === 'album' && (
              <div className="p-4 space-y-6">
                {/* Informations de l'album */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Disc3 className="w-5 h-5" />
                    Informations de l'album
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Titre de l'album *</label>
                      <input
                        type="text"
                        value={albumFormData.title}
                        onChange={(e) => setAlbumFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Mon premier album"
                        className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Artiste *</label>
                      <input
                        type="text"
                        value={albumFormData.artist}
                        onChange={(e) => setAlbumFormData(prev => ({ ...prev, artist: e.target.value }))}
                        placeholder="Nom de l'artiste"
                        className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Date de sortie</label>
                      <input
                        type="date"
                        value={albumFormData.releaseDate}
                        onChange={(e) => setAlbumFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Genres</label>
                      <select
                        multiple
                        value={albumFormData.genre}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setAlbumFormData(prev => ({ ...prev, genre: selected }));
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none min-h-[100px]"
                      >
                        {MUSIC_GENRES.map(genre => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={albumFormData.description}
                      onChange={(e) => setAlbumFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Décrivez votre album..."
                      className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                      rows={4}
                    />
                  </div>
                </div>
                
                {/* Cover de l'album */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Cover de l'album
                  </h3>
                  
                  {!albumCoverFile ? (
                    <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-purple-400/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Compresser si > 5MB
                            if (file.size > 5 * 1024 * 1024) {
                              const canvas = document.createElement('canvas');
                              const ctx = canvas.getContext('2d');
                              const img = new window.Image();
                              
                              img.onload = () => {
                                canvas.width = 800;
                                canvas.height = 800;
                                ctx?.drawImage(img, 0, 0, 800, 800);
                                canvas.toBlob((blob) => {
                                  if (blob) {
                                    const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                                    setAlbumCoverFile(compressedFile);
                                    notify.info('Image compressée', 'L\'image a été compressée pour optimiser l\'upload');
                                  }
                                }, 'image/jpeg', 0.85);
                              };
                              img.src = URL.createObjectURL(file);
                            } else {
                              setAlbumCoverFile(file);
                            }
                          }
                        }}
                        className="hidden"
                        id="album-cover-input"
                      />
                      <label htmlFor="album-cover-input" className="cursor-pointer">
                        <Image size={40} className="mx-auto text-white/40 mb-2" />
                        <p className="text-sm font-medium">Ajouter une cover</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Format carré recommandé (1:1) • Max 10MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative w-48 h-48 mx-auto rounded-lg overflow-hidden border border-[var(--border)]">
                      <img
                        src={URL.createObjectURL(albumCoverFile)}
                        alt="Album cover"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setAlbumCoverFile(null)}
                        className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Liste des pistes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Pistes ({albumTracks.length})
                    </h3>
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'audio/*';
                        input.multiple = true;
                        input.onchange = (e) => {
                          const files = Array.from((e.target as HTMLInputElement).files || []);
                          files.forEach((file, index) => {
                            const audio = new Audio();
                            audio.src = URL.createObjectURL(file);
                            audio.onloadedmetadata = () => {
                              const newTrack: AlbumTrack = {
                                id: `track-${Date.now()}-${index}`,
                                audioFile: file,
                                title: file.name.replace(/\.[^/.]+$/, ''),
                                trackNumber: albumTracks.length + index + 1,
                                duration: audio.duration
                              };
                              setAlbumTracks(prev => [...prev, newTrack]);
                            };
                          });
                        };
                        input.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter des pistes
                    </button>
                  </div>
                  
                  {albumTracks.length === 0 ? (
                    <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-12 text-center text-[var(--text-muted)]">
                      <Music size={48} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Aucune piste ajoutée</p>
                      <p className="text-xs mt-1">Cliquez sur "Ajouter des pistes" pour commencer</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {albumTracks.map((track, index) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-sm font-bold">
                            {track.trackNumber}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={track.title}
                              onChange={(e) => {
                                const newTracks = [...albumTracks];
                                newTracks[index].title = e.target.value;
                                setAlbumTracks(newTracks);
                              }}
                              placeholder="Titre de la piste"
                              className="w-full bg-transparent border-none outline-none text-sm font-medium"
                            />
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              {track.audioFile?.name} • {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => {
                              setAlbumTracks(prev => prev.filter(t => t.id !== track.id));
                            }}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Boutons d'action pour l'album */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Annuler
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!albumFormData.title || albumTracks.length === 0) {
                        notify.error('Veuillez remplir tous les champs requis et ajouter au moins une piste');
                        return;
                      }
                      
                      setIsUploading(true);
                      
                      try {
                        // Étape 1: Créer l'album avec la cover
                        const albumData = new FormData();
                        albumData.append('title', albumFormData.title);
                        albumData.append('artist', albumFormData.artist);
                        albumData.append('releaseDate', albumFormData.releaseDate);
                        albumData.append('genre', JSON.stringify(albumFormData.genre));
                        albumData.append('description', albumFormData.description);
                        albumData.append('isExplicit', String(albumFormData.isExplicit));
                        albumData.append('isPublic', String(albumFormData.isPublic));
                        
                        if (albumCoverFile) {
                          albumData.append('cover', albumCoverFile);
                        }
                        
                        const createResponse = await fetch('/api/albums/create', {
                          method: 'POST',
                          body: albumData
                        });
                        
                        if (!createResponse.ok) {
                          const error = await createResponse.json();
                          throw new Error(error.details || error.error || 'Erreur lors de la création de l\'album');
                        }
                        
                        const { album } = await createResponse.json();
                        
                        // Étape 2: Uploader chaque piste une par une
                        let uploadedCount = 0;
                        const trackErrors: string[] = [];
                        
                        for (let i = 0; i < albumTracks.length; i++) {
                          const track = albumTracks[i];
                          if (!track.audioFile) continue;
                          
                          try {
                            setUploadProgress({ 
                              audio: Math.round(((i + 1) / albumTracks.length) * 100), 
                              cover: 100 
                            });
                            
                            const trackFormData = new FormData();
                            trackFormData.append('albumId', album.id);
                            trackFormData.append('trackFile', track.audioFile);
                            trackFormData.append('trackTitle', track.title);
                            trackFormData.append('trackNumber', String(track.trackNumber));
                            trackFormData.append('genre', JSON.stringify(albumFormData.genre));
                            trackFormData.append('isExplicit', String(albumFormData.isExplicit));
                            trackFormData.append('isPublic', String(albumFormData.isPublic));
                            trackFormData.append('coverUrl', album.cover_url || '');
                            trackFormData.append('coverPublicId', album.cover_public_id || '');
                            
                            const trackResponse = await fetch('/api/albums/add-track', {
                              method: 'POST',
                              body: trackFormData
                            });
                            
                            if (trackResponse.ok) {
                              uploadedCount++;
                            } else {
                              const error = await trackResponse.json();
                              trackErrors.push(`${track.title}: ${error.error}`);
                            }
                          } catch (error) {
                            trackErrors.push(`${track.title}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                          }
                        }
                        
                        if (uploadedCount === 0) {
                          throw new Error('Aucune piste n\'a pu être uploadée');
                        }
                        
                        notify.success(
                          'Album publié avec succès !',
                          `${uploadedCount} piste(s) uploadée(s)${trackErrors.length > 0 ? ` (${trackErrors.length} erreur(s))` : ''}`
                        );
                        
                        // Rediriger vers la page d'accueil
                        sessionStorage.setItem('fromUpload', 'true');
                        router.push('/');
                        
                      } catch (error) {
                        console.error('❌ Erreur publication album:', error);
                        notify.error(
                          'Erreur lors de la publication',
                          error instanceof Error ? error.message : 'Une erreur est survenue'
                        );
                      } finally {
                        setIsUploading(false);
                        setUploadProgress({ audio: 0, cover: 0 });
                      }
                    }}
                    disabled={!albumFormData.title || albumTracks.length === 0 || isUploading}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Publication...' : `Publier l'album (${albumTracks.length} piste${albumTracks.length > 1 ? 's' : ''})`}
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bars compactes */}
            {(uploadProgress.audio > 0 || uploadProgress.cover > 0) && (
              <div className="space-y-2 p-3">
                {uploadProgress.audio > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Upload Audio</span>
                      <span>{uploadProgress.audio}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.audio}%` }}
                      />
                  </div>
                </div>
                )}
                
                {uploadProgress.cover > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Upload Image</span>
                      <span>{uploadProgress.cover}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.cover}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer avec navigation compacte */}
          <div className="flex h-fit flex-col justify-end gap-2 p-3 sm:p-4 border-t border-[var(--border)]">
            <div className="flex flex-row justify-between sm:justify-end gap-2 sm:gap-4">
              {currentStep > 1 && (
                  <button
                    type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
                  >
                  ← Retour
                  </button>
              )}
              
              <div className="flex gap-2">
                  <button
                  type="button"
                  onClick={cancelUpload}
                  className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full text-[var(--text)] bg-[var(--bg-tertiary)] enabled:hover:before:bg-white/10"
                >
                  <span className="relative flex flex-row items-center justify-center gap-2">Cancel</span>
                </button>
                
                {currentStep < totalSteps ? (
                  <button 
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={
                      (currentStep === 1 && !audioFile) || 
                      (currentStep === 2 && !formData.title.trim()) || 
                      !canUpload
                    }
                    className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full text-black bg-white enabled:hover:before:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">Next</span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSubmit}
                    disabled={isUploading || !canUpload}
                    className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full text-black bg-white enabled:hover:before:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">
                    {isUploading ? 'Upload en cours...' : 'Publier'}
                    </span>
                  </button>
            )}
        </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
} 