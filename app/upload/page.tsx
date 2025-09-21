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
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';
import { getEntitlements } from '@/lib/entitlements';

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
    const overStorage = usage.storage.percentage >= 100;
    return !(overTracks || overStorage);
  })();

  useEffect(() => {
    if (!usage) return;
    const msgs: string[] = [];
    if (usage.tracks.limit >= 0 && usage.tracks.used >= usage.tracks.limit) msgs.push('Limite de pistes atteinte');
    if (usage.storage.percentage >= 100) msgs.push('Stockage plein');
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
        toast.error('Veuillez sélectionner un fichier audio valide');
        return;
      }
      setAudioFile(file);
    }
  }, []);

  const onCoverDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image valide');
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
      toast.error("Limite atteinte. Passez au plan supérieur pour uploader plus.");
      return;
    }
    
    if (!audioFile) {
      toast.error('Veuillez sélectionner un fichier audio');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ audio: 0, cover: 0 });

    try {
      const audioLoadingToast = toast.loading('Upload audio en cours...');
      setUploadProgress(prev => ({ ...prev, audio: 25 }));
      
      const audioResult = await uploadToCloudinary(audioFile, 'video');
      setTempPublicIds(prev => ({ ...prev, audio: audioResult.public_id }));
      setUploadProgress(prev => ({ ...prev, audio: 75 }));
      toast.dismiss(audioLoadingToast);

      let coverResult: { public_id?: string; secure_url?: string } | null = null;
      if (coverFile) {
        const coverLoadingToast = toast.loading('Upload image de couverture...');
        setUploadProgress(prev => ({ ...prev, cover: 25 }));
        
        coverResult = await uploadToCloudinary(coverFile, 'image');
        setTempPublicIds(prev => ({ ...prev, cover: coverResult?.public_id }));
        setUploadProgress(prev => ({ ...prev, cover: 75 }));
        toast.dismiss(coverLoadingToast);
      }

      setUploadProgress({ audio: 100, cover: 100 });

      const saveLoadingToast = toast.loading('Sauvegarde en cours...');
      
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
        toast.dismiss(saveLoadingToast);
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      toast.dismiss(saveLoadingToast);
      toast.success('Musique uploadée avec succès !');
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fromUpload', 'true');
      }
      
      router.push('/');
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
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
            <h1 className="text-2xl max-md:text-base">Upload Track</h1>
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

          {/* Alertes quotas */}
          {blockedMsg && (
            <div className="mx-2 sm:mx-4 mt-1 rounded-lg p-2 sm:p-3 border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm">{blockedMsg}. Améliorez votre plan pour continuer.</span>
              <button onClick={() => router.push('/subscriptions')} className="text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-md bg-cyan-400/20 ring-1 ring-cyan-400/30 hover:bg-cyan-400/25">Voir les plans</button>
            </div>
          )}

          {/* Contenu principal */}
          <div className="flex flex-col">
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
                          Formats supportés: MP3, WAV, FLAC (max 50MB)
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
                    <label className="block text-sm font-medium text-white/80">Genre</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B',
                        'Reggae', 'Blues', 'Folk', 'Metal', 'Ambient', 'Trap', 'Dubstep', 'House',
                        'Techno', 'Trance', 'Drum & Bass', 'Acoustic', 'Instrumental'
                      ].map((genre) => (
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

                  {/* Prévisualisation impact stockage */}
                  {usage && (
                    <div className="bg-white/[0.02] border border-[var(--border)] rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white/80 mb-2">Impact sur votre stockage</h4>
                      <div className="space-y-2 text-xs text-white/70">
                        <div className="flex justify-between">
                          <span>Stockage actuel :</span>
                          <span>{usage.storage.used.toFixed(2)} / {usage.storage.limit} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taille audio :</span>
                          <span>+{((audioFile?.size || 0) / 1024 / 1024 / 1024).toFixed(3)} GB</span>
                        </div>
                        {coverFile && (
                          <div className="flex justify-between">
                            <span>Taille cover :</span>
                            <span>+{((coverFile?.size || 0) / 1024 / 1024 / 1024).toFixed(3)} GB</span>
                          </div>
                        )}
                        <div className="border-t border-white/10 pt-2 flex justify-between font-medium">
                          <span>Après upload :</span>
                          <span className={`${
                            (usage.storage.used + ((audioFile?.size || 0) + (coverFile?.size || 0)) / 1024 / 1024 / 1024) > usage.storage.limit 
                              ? 'text-red-400' 
                              : 'text-green-400'
                          }`}>
                            {(usage.storage.used + ((audioFile?.size || 0) + (coverFile?.size || 0)) / 1024 / 1024 / 1024).toFixed(2)} / {usage.storage.limit} GB
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              (usage.storage.used + ((audioFile?.size || 0) + (coverFile?.size || 0)) / 1024 / 1024 / 1024) > usage.storage.limit
                                ? 'bg-red-500'
                                : 'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, ((usage.storage.used + ((audioFile?.size || 0) + (coverFile?.size || 0)) / 1024 / 1024 / 1024) / usage.storage.limit) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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