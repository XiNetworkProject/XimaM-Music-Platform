'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  ArrowUp,
  ArrowDown,
  Check,
  FileText,
  Calendar,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { notify } from '@/components/NotificationCenter';
import BottomNav from '@/components/BottomNav';
import { getEntitlements } from '@/lib/entitlements';
import { MUSIC_GENRES } from '@/lib/genres';
import { SynauraWaveform } from '@/components/audio/SynauraWaveform';

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

type AlbumTrackMeta = {
  file: File;
  title: string;
  duration: number;
  // Overrides (null = héritage de l’album)
  genreOverride?: string[] | null;
  isExplicitOverride?: boolean | null;
  lyricsOverride?: string | null;
};

// Compression côté client pour images > 10MB (Cloudinary refuse les fichiers trop volumineux)
async function compressImageIfNeeded(file: File, maxBytes: number = 10 * 1024 * 1024): Promise<File> {
  try {
    if (!file || file.size <= maxBytes) return file;

    // Charger l'image
    const imageBitmap = await createImageBitmap(file).catch(async () => {
      // Fallback via HTMLImageElement
      return new Promise<ImageBitmap>(async (resolve, reject) => {
        try {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = async () => {
            try {
              const bm = await createImageBitmap(img);
              URL.revokeObjectURL(url);
              resolve(bm);
            } catch (e) {
              URL.revokeObjectURL(url);
              reject(e);
            }
          };
          img.onerror = (_e: any) => { URL.revokeObjectURL(url); reject(new Error('image load error')); };
          img.src = url;
        } catch (e) {
          reject(e);
        }
      });
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Dimension cible initiale: limiter le plus grand côté à ~1600px
    const maxDim = 1600;
    let { width, height } = imageBitmap;
    const ratio = width > height ? maxDim / width : maxDim / height;
    const scale = Math.min(1, ratio);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

    // Essayer différentes qualités jusqu'à passer sous la limite
    let quality = 0.85;
    let outBlob: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      outBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (outBlob && outBlob.size <= maxBytes) break;
      // Baisser la qualité, puis réduire un peu la taille si nécessaire
      if (quality > 0.5) quality -= 0.1; else {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.85));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.85));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
      }
    }

    if (!outBlob) return file;

    // Créer un nouveau File JPEG compressé
    const newName = file.name.replace(/\.[^/.]+$/, '') + '-compressed.jpg';
    return new File([outBlob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file; // En cas d'erreur de compression, utiliser l'original
  }
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
  let fileToUpload = file;
  if (resourceType === 'image' && file.size > 10 * 1024 * 1024) {
    // Compresser automatiquement les images > 10MB
    try { fileToUpload = await compressImageIfNeeded(file); } catch {}
  }
  formData.append('file', fileToUpload);
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
    // Note: la transformation côté Cloudinary n'affecte pas la taille uploadée. La compression est faite côté client ci-dessus.
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

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="w-full max-w-full px-6">
      <SynauraWaveform
        waveformData={waveformData}
        progress={progress}
        onSeek={(ratio) => duration > 0 && onSeek?.(ratio * duration)}
        variant="upload"
        heightClass="h-12"
        idPrefix="upload-wave"
      />
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
        <div className="absolute inset-0 h-full w-full overflow-clip rounded-3xl bg-gradient-to-br from-overlay-on-primary/18 via-background-tertiary to-overlay-on-primary/10 border border-border-secondary flex items-center justify-center">
          {coverPreview ? (
            <div className="relative w-full h-full">
              <img 
                src={coverPreview} 
                alt="Cover preview" 
                className="w-full h-full object-cover rounded-3xl"
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
              <Music size={48} className="mx-auto mb-4 text-foreground-inactive" />
              <div className="text-foreground-primary font-medium">{file.name}</div>
              <div className="text-foreground-tertiary text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
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
  const [albumFiles, setAlbumFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'album'>('single');
  const [albumTrackMetas, setAlbumTrackMetas] = useState<AlbumTrackMeta[]>([]);
  const albumTrackMetasRef = useRef<AlbumTrackMeta[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ audio: 0, cover: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
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

  useEffect(() => {
    albumTrackMetasRef.current = albumTrackMetas;
  }, [albumTrackMetas]);

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
    if (uploadMode === 'album') {
      const valid: File[] = [];
      const planMaxMb = (planKey === 'starter' ? 200 : planKey === 'pro' ? 500 : planKey === 'enterprise' ? 1000 : 80);
      for (const file of acceptedFiles) {
        if (!file.type.startsWith('audio/')) continue;
        const sizeMb = file.size / 1024 / 1024;
        if (sizeMb > planMaxMb) {
          notify.error('Fichier trop volumineux', `${file.name} dépasse la limite (${sizeMb.toFixed(1)} MB > ${planMaxMb} MB)`);
          continue;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;
      setAlbumFiles(prev => [...prev, ...valid]);
      if (!audioFile) setAudioFile(valid[0]);
    } else {
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
    }
  }, [uploadMode, planKey, audioFile]);

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

  // Construire les métadonnées des pistes d'album (titres + durées) quand les fichiers changent
  useEffect(() => {
    if (uploadMode !== 'album') return;
    let isCancelled = false;
    (async () => {
      const metas: AlbumTrackMeta[] = [];
      const prev = albumTrackMetasRef.current || [];
      for (const f of albumFiles) {
        // Titre par défaut depuis le nom de fichier sans extension
        const baseTitle = f.name.replace(/\.[^/.]+$/, '');
        const existing = prev.find((m) => m.file === f);
        const title = (existing?.title || '').trim() ? (existing?.title || '').trim() : baseTitle;
        // Calculer la durée via Audio
        let duration = existing?.duration || 0;
        try {
          if (!duration) {
            const url = URL.createObjectURL(f);
            duration = await new Promise<number>((resolve) => {
              const a = new Audio(url);
              const cleanup = () => {
                a.removeEventListener('loadedmetadata', onLoaded);
                a.removeEventListener('error', onError);
                URL.revokeObjectURL(url);
              };
              const onLoaded = () => { const d = isFinite(a.duration) ? a.duration : 0; cleanup(); resolve(d || 0); };
              const onError = () => { cleanup(); resolve(0); };
              a.addEventListener('loadedmetadata', onLoaded);
              a.addEventListener('error', onError);
            });
          }
        } catch {}
        metas.push({
          file: f,
          title,
          duration: Math.round(duration || 0),
          genreOverride: existing?.genreOverride ?? null,
          isExplicitOverride: existing?.isExplicitOverride ?? null,
          lyricsOverride: existing?.lyricsOverride ?? null,
        });
      }
      if (!isCancelled) setAlbumTrackMetas(metas);
    })();
    return () => { isCancelled = true; };
  }, [albumFiles, uploadMode]);

  const handleAlbumTrackTitleChange = (index: number, value: string) => {
    setAlbumTrackMetas(prev => prev.map((m, i) => i === index ? { ...m, title: value } : m));
  };

  const handleAlbumTrackExplicitChange = (index: number, value: boolean | null) => {
    setAlbumTrackMetas((prev) => prev.map((m, i) => (i === index ? { ...m, isExplicitOverride: value } : m)));
  };

  const handleAlbumTrackLyricsChange = (index: number, value: string | null) => {
    setAlbumTrackMetas((prev) => prev.map((m, i) => (i === index ? { ...m, lyricsOverride: value } : m)));
  };

  const addAlbumTrackGenreOverride = (index: number, genre: string) => {
    setAlbumTrackMetas((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const base = Array.isArray(m.genreOverride) ? m.genreOverride : [];
        if (!genre) return m;
        if (base.includes(genre)) return m;
        return { ...m, genreOverride: [...base, genre] };
      }),
    );
  };

  const removeAlbumTrackGenreOverride = (index: number, genre: string) => {
    setAlbumTrackMetas((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const base = Array.isArray(m.genreOverride) ? m.genreOverride : [];
        return { ...m, genreOverride: base.filter((g) => g !== genre) };
      }),
    );
  };

  const resetAlbumTrackOverrides = (index: number) => {
    setAlbumTrackMetas((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, genreOverride: null, isExplicitOverride: null, lyricsOverride: null } : m,
      ),
    );
  };

  const moveAlbumTrack = useCallback((from: number, to: number) => {
    setAlbumFiles((prev) => {
      const arr = [...prev];
      if (from < 0 || from >= arr.length) return prev;
      if (to < 0 || to >= arr.length) return prev;
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return arr;
    });
    setAlbumTrackMetas((prev) => {
      const arr = [...prev];
      if (from < 0 || from >= arr.length) return prev;
      if (to < 0 || to >= arr.length) return prev;
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return arr;
    });
  }, []);

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onAudioDrop,
    accept: { 'audio/*': [] },
    maxFiles: uploadMode === 'album' ? 50 : 1
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
    
    if (uploadMode === 'single' && !audioFile) {
      notify.error('Fichier requis', 'Veuillez sélectionner un fichier audio');
      return;
    }
    if (uploadMode === 'album' && albumFiles.length === 0) {
      notify.error('Fichiers requis', 'Veuillez ajouter au moins une piste pour l\'album');
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
      
      // Mode SINGLE: upload une seule piste
      let uploadedTracks: { secure_url: string; public_id: string; duration?: number; file?: File }[] = [];
      if (uploadMode === 'single' && audioFile) {
      const audioResult = await uploadToCloudinary(audioFile, 'video');
        setTempPublicIds(prev => ({ ...prev, audio: audioResult.public_id }));
      setUploadProgress(prev => ({ ...prev, audio: 75 }));
        uploadedTracks.push({ secure_url: audioResult.secure_url, public_id: audioResult.public_id, duration: audioResult.duration, file: audioFile });
      }
      // Mode ALBUM: uploader toutes les pistes
      if (uploadMode === 'album' && albumFiles.length > 0) {
        for (let i = 0; i < albumFiles.length; i++) {
          const f = albumFiles[i];
          notify.info('Upload piste', `${f.name} (${i+1}/${albumFiles.length})`, 0);
          const res = await uploadToCloudinary(f, 'video');
          uploadedTracks.push({ secure_url: res.secure_url, public_id: res.public_id, duration: res.duration, file: f });
          setTempPublicIds(prev => ({ ...prev, audio: res.public_id }));
          setUploadProgress(prev => ({ ...prev, audio: Math.min(95, Math.round(((i+1)/albumFiles.length)*90)+5) }));
        }
      }

      // Vérification droits d'auteur (AudD) — no-op si token manquant (sur la première piste)
      try {
        const mainAudio = uploadedTracks[0];
        if (!mainAudio) throw new Error('Aucune piste uploadée');
        const checkResp = await fetch('/api/upload/copyright-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: mainAudio.secure_url,
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
        const mainAudio = uploadedTracks[0];
        if (tempPublicIds.audio || mainAudio?.public_id) {
          try { await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: mainAudio?.public_id }) }); } catch {}
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
      
      if (uploadMode === 'single') {
        const tr = uploadedTracks[0]!;
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            audioUrl: tr.secure_url,
            audioPublicId: tr.public_id,
            coverUrl: (coverResult && coverResult.secure_url) ? coverResult.secure_url : null,
            coverPublicId: (coverResult && coverResult.public_id) ? coverResult.public_id : null,
            trackData: { ...formData, album: (formData.album || '').trim() ? formData.album : null },
            duration: tr.duration || 0,
            audioBytes: Math.round((tr.file?.size || 0)),
            coverBytes: Math.round((coverFile?.size || 0)),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }
        notify.success('Upload réussi !', 'Musique uploadée avec succès !');
      } else {
        // Créer une playlist comme album
        const albumName = formData.title || `Album ${new Date().toLocaleDateString()}`;
        const plRes = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: albumName, description: formData.description || '', isPublic: formData.isPublic, coverUrl: coverResult?.secure_url || null })
        });
        if (!plRes.ok) {
          const e = await plRes.json();
          throw new Error(e.error || 'Erreur création album');
        }
        const playlist = await plRes.json();

        // Enregistrer chaque piste comme track puis l'ajouter à la playlist
        for (let i = 0; i < uploadedTracks.length; i++) {
          const tr = uploadedTracks[i];
          // Utiliser le titre saisi pour chaque piste (albumTrackMetas), fallback nom de fichier
          const custom = albumTrackMetas[i]?.title?.trim();
          const fallbackFromFile = (tr.file?.name || '').replace(/\.[^/.]+$/, '') || `Piste ${i+1}`;
          const metaTitle = custom || fallbackFromFile;
          const perTrack = albumTrackMetas[i];
          const perTrackGenre = Array.isArray(perTrack?.genreOverride) && perTrack?.genreOverride?.length ? perTrack.genreOverride : formData.genre;
          const perTrackExplicit = typeof perTrack?.isExplicitOverride === 'boolean' ? perTrack.isExplicitOverride : formData.isExplicit;
          const perTrackLyrics =
            typeof perTrack?.lyricsOverride === 'string' && perTrack.lyricsOverride.trim()
              ? perTrack.lyricsOverride
              : (formData.lyrics || '');
          const tRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioUrl: tr.secure_url,
              audioPublicId: tr.public_id,
              coverUrl: (coverResult && coverResult.secure_url) ? coverResult.secure_url : null,
              coverPublicId: (coverResult && coverResult.public_id) ? coverResult.public_id : null,
              trackData: {
                ...formData,
                title: metaTitle,
                album: (formData.title || '').trim() || null,
                genre: perTrackGenre,
                isExplicit: perTrackExplicit,
                lyrics: perTrackLyrics || null,
              },
              duration: tr.duration || 0,
              audioBytes: Math.round((tr.file?.size || 0)),
              coverBytes: Math.round((coverFile?.size || 0)),
            }),
          });
          if (!tRes.ok) {
            const e = await tRes.json();
            throw new Error(e.error || `Erreur sauvegarde piste ${i+1}`);
          }
          const tJson = await tRes.json();
          const trackId = tJson.trackId;
          // Ajouter à la playlist
          await fetch(`/api/playlists/${encodeURIComponent(playlist._id)}/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId })
          });
        }
        notify.success('Album publié !', `${uploadedTracks.length} piste(s) ajoutée(s) à l'album ${albumName}.`);
      }
      
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
    <div className="min-h-screen bg-background-primary text-foreground-primary pb-20">
      <div className="mx-auto max-w-7xl px-3 md:px-4 py-3 md:py-4">
        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background-primary border-b border-border-secondary/60">
            <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push('/', { scroll: false })}
                  className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                  aria-label="Retour"
                >
                  <ArrowLeft className="h-4 w-4 text-foreground-secondary" />
                </button>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-foreground-primary leading-tight">Uploader</div>
                  <div className="text-xs text-foreground-tertiary">
                    {uploadMode === 'album' ? 'Album' : 'Titre'} • Simple • Rapide • Propre
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 rounded-full border border-border-secondary bg-background-fog-thin p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('single');
                      setCurrentStep(1);
                    }}
                    className={[
                      'h-9 px-3 rounded-full text-sm transition',
                      uploadMode === 'single' ? 'bg-overlay-on-primary text-foreground-primary' : 'text-foreground-secondary hover:bg-overlay-on-primary',
                    ].join(' ')}
                  >
                    Titre
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('album');
                      setCurrentStep(1);
                    }}
                    className={[
                      'h-9 px-3 rounded-full text-sm transition',
                      uploadMode === 'album' ? 'bg-overlay-on-primary text-foreground-primary' : 'text-foreground-secondary hover:bg-overlay-on-primary',
                    ].join(' ')}
                  >
                    Album
                  </button>
                </div>
              </div>
            </div>

            <div className="px-3 sm:px-4 pb-3 flex items-center gap-2 text-xs">
              {[
                { k: 1, label: 'Fichiers' },
                { k: 2, label: 'Infos' },
                { k: 3, label: 'Publier' },
              ].map((s) => (
                <div
                  key={s.k}
                  className={[
                    'px-3 py-1 rounded-full border border-border-secondary',
                    currentStep === s.k ? 'bg-overlay-on-primary text-foreground-primary' : 'bg-background-fog-thin text-foreground-tertiary',
                  ].join(' ')}
                >
                  {s.k}. {s.label}
                </div>
              ))}
            </div>

            {/* Toggle mobile */}
            <div className="px-3 sm:px-4 pb-3 sm:hidden">
              <div className="flex items-center gap-1 rounded-full border border-border-secondary bg-background-fog-thin p-1 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('single');
                    setCurrentStep(1);
                  }}
                  className={[
                    'h-9 px-3 rounded-full text-sm transition',
                    uploadMode === 'single' ? 'bg-overlay-on-primary text-foreground-primary' : 'text-foreground-secondary hover:bg-overlay-on-primary',
                  ].join(' ')}
                >
                  Titre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('album');
                    setCurrentStep(1);
                  }}
                  className={[
                    'h-9 px-3 rounded-full text-sm transition',
                    uploadMode === 'album' ? 'bg-overlay-on-primary text-foreground-primary' : 'text-foreground-secondary hover:bg-overlay-on-primary',
                  ].join(' ')}
                >
                  Album
                </button>
              </div>
            </div>
          </div>

          {/* Alertes quotas */}
          {blockedMsg && (
            <div className="mx-3 sm:mx-4 mt-3 rounded-2xl p-3 border border-border-secondary bg-background-tertiary flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-foreground-secondary">
                {blockedMsg}. Passe à un plan supérieur pour continuer.
              </span>
              <button
                onClick={() => router.push('/subscriptions', { scroll: false })}
                className="h-9 px-3 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-xs"
              >
                Voir les plans
              </button>
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
                  {!audioFile && uploadMode === 'single' ? (
                  <div
                    {...getAudioRootProps()}
                      className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-colors cursor-pointer ${
                      isAudioDragActive
                          ? 'border-overlay-on-primary bg-overlay-on-primary/10'
                          : 'border-border-secondary hover:border-overlay-on-primary/60'
                    }`}
                  >
                    <input {...getAudioInputProps()} />
                      <div className="space-y-3">
                        <Upload size={40} className="mx-auto text-foreground-inactive sm:w-16 sm:h-16" />
                        <div>
                          <p className="text-lg sm:text-xl font-medium">Glissez votre fichier audio ici</p>
                          <p className="text-foreground-tertiary text-sm">ou cliquez pour sélectionner</p>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground-tertiary">
                          Formats supportés: MP3, WAV, FLAC — limites: Free 80 MB · Starter 200 MB · Pro 500 MB
                        </p>
                      </div>
                  </div>
                    ) : uploadMode === 'single' ? (
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
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div
                        {...getAudioRootProps()}
                        className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-colors cursor-pointer ${
                          isAudioDragActive
                            ? 'border-overlay-on-primary bg-overlay-on-primary/10'
                            : 'border-border-secondary hover:border-overlay-on-primary/60'
                        }`}
                      >
                        <input {...getAudioInputProps()} />
                        <div className="space-y-3">
                          <Upload size={40} className="mx-auto text-foreground-inactive sm:w-16 sm:h-16" />
                        <div>
                            <p className="text-lg sm:text-xl font-medium">Glissez vos fichiers audio ici</p>
                            <p className="text-foreground-tertiary text-sm">ou cliquez pour sélectionner (jusqu'à 50)</p>
                        </div>
                          <p className="text-xs sm:text-sm text-foreground-tertiary">
                            Formats supportés: MP3, WAV, FLAC — limites par fichier: Free 80 MB · Starter 200 MB · Pro 500 MB
                        </p>
                  </div>
                </div>

                      {albumFiles.length > 0 && (
                        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin divide-y divide-border-secondary/60 overflow-hidden">
                          {albumTrackMetas.map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    // Lecture preview avec audioRef partagé
                                    try {
                                      if (audioRef.current && !audioRef.current.paused) {
                                        audioRef.current.pause();
                                      }
                                      const url = URL.createObjectURL(m.file);
                                      const a = new Audio(url);
                                      audioRef.current = a;
                                      a.addEventListener('ended', () => { try { URL.revokeObjectURL(url); } catch {} });
                                      await a.play();
                                    } catch {}
                                  }}
                                  className="w-10 h-10 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary flex items-center justify-center transition"
                                  aria-label="Pré-écouter"
                                >
                                  <Play className="w-4 h-4 text-foreground-primary" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <input
                                    type="text"
                                    value={m.title}
                                    onChange={(e) => handleAlbumTrackTitleChange(idx, e.target.value)}
                                    className="w-full h-11 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary"
                                    placeholder={`Titre #${idx+1}`}
                                  />
                                  <div className="text-xs text-foreground-tertiary mt-1">
                                    {(m.file.size/1024/1024).toFixed(2)} MB • {Math.floor((m.duration||0)/60)}:{String(Math.floor((m.duration||0)%60)).padStart(2,'0')}
                                  </div>

                                  {/* Options par piste */}
                                  <div className="mt-2 rounded-2xl border border-border-secondary bg-background-tertiary p-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-xs text-foreground-tertiary">
                                        Options piste (hérite de l’album si vide)
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => resetAlbumTrackOverrides(idx)}
                                        className="h-8 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-xs text-foreground-secondary"
                                      >
                                        Réinitialiser
                                      </button>
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <label className="flex items-center gap-3 text-sm text-foreground-secondary">
                                        <input
                                          type="checkbox"
                                          checked={(m.isExplicitOverride ?? formData.isExplicit) === true}
                                          onChange={(e) => handleAlbumTrackExplicitChange(idx, e.target.checked)}
                                          className="h-4 w-4 rounded border-border-secondary"
                                        />
                                        Explicite (piste)
                                      </label>

                                      <div className="flex items-center gap-2">
                                        <select
                                          className="h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary outline-none"
                                          defaultValue=""
                                          onChange={(e) => {
                                            const g = e.target.value;
                                            if (g) addAlbumTrackGenreOverride(idx, g);
                                            e.currentTarget.value = '';
                                          }}
                                        >
                                          <option value="">+ Ajouter un genre</option>
                                          {MUSIC_GENRES.map((g) => (
                                            <option key={g} value={g}>
                                              {g}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {Array.isArray(m.genreOverride) && m.genreOverride.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {m.genreOverride.map((g) => (
                                          <button
                                            key={g}
                                            type="button"
                                            onClick={() => removeAlbumTrackGenreOverride(idx, g)}
                                            className="px-3 py-1 rounded-full border border-border-secondary bg-background-fog-thin hover:bg-red-500/15 hover:border-red-500/30 transition text-xs text-foreground-secondary"
                                            title="Retirer"
                                          >
                                            {g} <span className="text-foreground-tertiary">×</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    <div className="mt-2">
                                      <textarea
                                        value={m.lyricsOverride ?? ''}
                                        onChange={(e) => handleAlbumTrackLyricsChange(idx, e.target.value || null)}
                                        rows={2}
                                        className="w-full min-h-[64px] px-3 py-2 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary resize-none"
                                        placeholder="Paroles spécifiques à cette piste (optionnel)"
                                      />
                                    </div>
                                  </div>
                        </div>
                      </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => moveAlbumTrack(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary transition grid place-items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Monter"
                                >
                                  <ArrowUp className="h-4 w-4 text-foreground-secondary" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveAlbumTrack(idx, idx + 1)}
                                  disabled={idx === albumTrackMetas.length - 1}
                                  className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary transition grid place-items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Descendre"
                                >
                                  <ArrowDown className="h-4 w-4 text-foreground-secondary" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setAlbumFiles(prev => prev.filter((_, i) => i !== idx)); setAlbumTrackMetas(prev => prev.filter((_, i) => i !== idx)); }}
                                  className="h-10 px-3 text-xs rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-red-500/15 hover:border-red-500/30 transition"
                                >
                                  Retirer
                                </button>
                              </div>
                        </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                  {/* Contrôles audio compacts */}
                  {audioFile && (
                    <div className="flex flex-row items-center justify-center gap-3 px-2 sm:px-4 py-2">
                  <button
                    type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary flex items-center justify-center transition"
                  >
                        {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                      <div className="font-mono text-xs sm:text-sm tracking-tight text-foreground-secondary tabular-nums">
                        <span className="text-foreground-primary">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span> / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
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
                  <h2 className="text-xl font-semibold text-foreground-primary">{uploadMode === 'album' ? 'Infos de l’album' : 'Infos du titre'}</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-foreground-secondary">{uploadMode === 'album' ? 'Nom de l’album *' : 'Titre *'}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full h-11 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary"
                        placeholder={uploadMode === 'album' ? "Nom de l'album" : "Titre de votre musique"}
                    required
                  />
                </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-foreground-secondary">Artiste</label>
                      <input
                        type="text"
                        value={formData.artist}
                        disabled
                        className="w-full h-11 px-3 rounded-2xl border border-border-secondary bg-background-tertiary text-sm text-foreground-tertiary cursor-not-allowed"
                        placeholder="Synchronisé avec votre profil"
                      />
                      <p className="text-xs text-foreground-tertiary">Modifie ton nom de profil pour changer l’artiste</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground-secondary">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={2}
                      className="w-full min-h-[72px] px-3 py-2 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary resize-none"
                    placeholder="Décrivez votre musique..."
                  />
                </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground-secondary">Paroles (optionnel)</label>
                    <textarea
                      value={formData.lyrics || ''}
                      onChange={(e) => handleInputChange('lyrics', e.target.value)}
                      rows={6}
                      className="w-full min-h-[140px] px-3 py-2 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary resize-none"
                      placeholder="Ajoutez les paroles de votre musique..."
                    />
                    <p className="text-xs text-foreground-tertiary">Tu peux les ajouter plus tard.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground-secondary">Genres</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MUSIC_GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => formData.genre.includes(genre) ? removeGenre(genre) : addGenre(genre)}
                          className={`px-2.5 py-1 rounded-full text-xs sm:text-sm transition-colors ${
                          formData.genre.includes(genre)
                              ? 'bg-overlay-on-primary text-foreground-primary'
                              : 'bg-background-tertiary border border-border-secondary text-foreground-secondary hover:bg-overlay-on-primary'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground-secondary">{uploadMode === 'album' ? 'Cover de l’album' : 'Image de couverture'}</label>
                    <div
                      {...getCoverRootProps()}
                      className={`border-2 border-dashed rounded-3xl p-4 text-center transition-colors cursor-pointer ${
                        isCoverDragActive
                          ? 'border-overlay-on-primary bg-overlay-on-primary/10'
                          : coverFile
                          ? 'border-border-secondary bg-background-tertiary'
                          : 'border-border-secondary hover:border-overlay-on-primary/60'
                      }`}
                    >
                      <input {...getCoverInputProps()} />
                      {coverFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <img 
                            src={URL.createObjectURL(coverFile)} 
                            alt="Cover preview" 
                            className="w-12 h-12 object-cover rounded-2xl border border-border-secondary"
                          />
                          <div className="text-left">
                            <div className="text-sm font-medium text-foreground-primary">{coverFile.name}</div>
                            <div className="text-xs text-foreground-tertiary">{(coverFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                  </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <Image size={24} className="text-foreground-inactive" />
                          <div className="text-left">
                            <p className="text-sm font-medium">Ajouter une image de couverture</p>
                            <p className="text-xs text-foreground-tertiary">JPG, PNG, WebP (max 10MB, compressé si besoin)</p>
                </div>
                        </div>
                      )}
                    </div>
                </div>

                  {/* Publication (fusion de l’étape 3) */}
                  <div className="mt-2 rounded-3xl border border-border-secondary bg-background-tertiary p-3">
                    <div className="text-sm font-semibold text-foreground-primary">Publication</div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 text-sm text-foreground-secondary">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                          className="h-4 w-4 rounded border-border-secondary"
                        />
                        Rendre public
                      </label>
                      <label className="flex items-center gap-3 text-sm text-foreground-secondary">
                        <input
                          type="checkbox"
                          checked={formData.isExplicit}
                          onChange={(e) => handleInputChange('isExplicit', e.target.checked)}
                          className="h-4 w-4 rounded border-border-secondary"
                        />
                        Contenu explicite
                      </label>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="text-xs text-foreground-tertiary">Copyright (propriétaire)</div>
                        <input
                          type="text"
                          value={formData.copyright.owner}
                          disabled
                          className="w-full h-11 px-3 rounded-2xl border border-border-secondary bg-background-tertiary text-sm text-foreground-tertiary cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs text-foreground-tertiary">Année</div>
                        <input
                          type="number"
                          value={formData.copyright.year}
                          onChange={(e) => handleCopyrightChange('year', parseInt(e.target.value))}
                          className="w-full h-11 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary outline-none focus:ring-2 focus:ring-overlay-on-primary"
                        />
                      </div>
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
                  <h2 className="text-xl font-semibold text-foreground-primary">Prévisualisation finale</h2>
                  
                  {uploadMode === 'single' ? (
                    // Preview d'une piste
                    <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-overlay-on-primary/25 to-overlay-on-primary/10 border border-border-secondary flex-shrink-0">
                          {coverFile ? (
                            <img src={URL.createObjectURL(coverFile)} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-6 h-6 sm:w-7 sm:h-7 text-foreground-secondary" />
                  </div>
                          )}
                </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground-primary truncate text-sm sm:text-base">{formData.title || 'Sans titre'}</h3>
                          <p className="text-xs sm:text-sm text-foreground-tertiary">{formData.artist}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {formData.genre.slice(0, 2).map(g => (
                              <span key={g} className="text-xs px-2 py-0.5 bg-overlay-on-primary/15 border border-border-secondary rounded-full text-foreground-secondary">{g}</span>
                            ))}
                            {formData.genre.length > 2 && (
                              <span className="text-xs text-foreground-tertiary">+{formData.genre.length - 2}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary flex items-center justify-center transition">
                            {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                      </div>
                      {audioFile && (
                        <div className="mt-3">
                          <WaveformDisplay audioFile={audioFile} currentTime={currentTime} duration={duration} onSeek={(time) => { if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); } }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    // Preview d'album (style playlist)
                    <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                      <div className="p-3 flex items-center gap-3 border-b border-border-secondary/60">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-overlay-on-primary/25 to-overlay-on-primary/10 border border-border-secondary flex-shrink-0">
                          {coverFile ? (
                            <img src={URL.createObjectURL(coverFile)} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-7 h-7 text-foreground-secondary" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-foreground-primary truncate">{formData.title || 'Nouvel album'}</div>
                          <div className="text-sm text-foreground-tertiary truncate">{formData.artist}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {formData.genre.slice(0, 3).map(g => (
                              <span key={g} className="text-[10px] px-2 py-0.5 bg-overlay-on-primary/15 border border-border-secondary rounded-full text-foreground-secondary">{g}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-border-secondary/60">
                        {albumTrackMetas.map((m, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2">
                            <div className="w-6 text-center text-foreground-tertiary text-xs">{idx+1}</div>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
                                  const url = URL.createObjectURL(m.file);
                                  const a = new Audio(url);
                                  audioRef.current = a;
                                  a.addEventListener('ended', () => { try { URL.revokeObjectURL(url); } catch {} });
                                  await a.play();
                                } catch {}
                              }}
                              className="w-10 h-10 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary flex items-center justify-center transition"
                              aria-label="Pré-écouter"
                            >
                              <Play className="w-4 h-4 text-foreground-primary" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-foreground-primary truncate">{m.title}</div>
                              <div className="text-xs text-foreground-tertiary truncate">{formData.artist}</div>
                            </div>
                            <div className="text-xs text-foreground-tertiary w-12 text-right">{Math.floor(m.duration/60)}:{String(Math.floor(m.duration%60)).padStart(2,'0')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-foreground-secondary">
                    <div className="flex justify-between">
                      <span>Durée :</span>
                      <span className="text-foreground-primary">
                        {uploadMode === 'album'
                          ? (() => {
                              const total = (albumTrackMetas || []).reduce((s, m) => s + (m.duration || 0), 0);
                              return `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`;
                            })()
                          : `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taille :</span>
                      <span className="text-foreground-primary">
                        {uploadMode === 'album'
                          ? `${(((albumFiles || []).reduce((s, f) => s + (f.size || 0), 0)) / 1024 / 1024).toFixed(2)} MB`
                          : `${(((audioFile?.size || 0)) / 1024 / 1024).toFixed(2)} MB`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Visibilité :</span>
                      <span className="text-foreground-primary">{formData.isPublic ? 'Public' : 'Privé'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contenu :</span>
                      <span className="text-foreground-primary">{formData.isExplicit ? 'Explicite' : 'Tout public'}</span>
                    </div>
                  </div>

                  {/* Prévisualisation des paroles */}
                  {formData.lyrics && (
                    <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-3">
                      <h4 className="text-sm font-medium text-foreground-primary mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Paroles
                      </h4>
                      <div className="text-xs text-foreground-secondary max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {formData.lyrics}
                      </div>
                    </div>
                  )}

                  {/* Section impact stockage supprimée */}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Bars compactes */}
            {(uploadProgress.audio > 0 || uploadProgress.cover > 0) && (
              <div className="space-y-2 p-3">
                {uploadProgress.audio > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground-secondary">Upload audio</span>
                      <span>{uploadProgress.audio}%</span>
                    </div>
                    <div className="w-full bg-background-tertiary border border-border-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-overlay-on-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.audio}%` }}
                      />
                  </div>
                </div>
                )}
                
                {uploadProgress.cover > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground-secondary">Upload cover</span>
                      <span>{uploadProgress.cover}%</span>
                    </div>
                    <div className="w-full bg-background-tertiary border border-border-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-overlay-on-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.cover}%` }}
                      />
                  </div>
                  </div>
                )}
              </div>
            )}
                </div>

          {/* Footer avec navigation compacte */}
          <div className="flex h-fit flex-col justify-end gap-2 p-3 sm:p-4 border-t border-border-secondary/60 bg-background-primary">
            <div className="flex flex-row justify-between sm:justify-end gap-2 sm:gap-4">
              {currentStep > 1 && (
                  <button
                    type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="h-10 px-4 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-sm text-foreground-secondary"
                  >
                  Retour
                  </button>
              )}
              
              <div className="flex gap-2">
                  <button
                  type="button"
                  onClick={cancelUpload}
                  className="h-10 px-4 sm:px-6 rounded-2xl border border-border-secondary bg-background-tertiary hover:bg-red-500/15 hover:border-red-500/30 transition text-sm text-foreground-secondary"
                >
                  Annuler
                </button>
                
                {currentStep < totalSteps ? (
                  <button 
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={
                      (currentStep === 1 && uploadMode === 'single' && !audioFile) ||
                      (currentStep === 1 && uploadMode === 'album' && albumFiles.length === 0) ||
                      (currentStep === 2 && !formData.title.trim()) ||
                      !canUpload
                    }
                    className="h-10 px-4 sm:px-6 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSubmit}
                    disabled={isUploading || !canUpload}
                    className="h-10 px-4 sm:px-6 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Upload en cours...' : 'Publier'}
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