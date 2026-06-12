'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, Music, Image, X, Play, Pause, Video,
  ArrowLeft, Check, FileText, ChevronDown, ChevronRight, Sparkles, Clock3, Disc3, Library, ShieldCheck, Wand2, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { notify } from '@/components/NotificationCenter';
import {
  SynauraAnnouncementStrip,
  SynauraAppShell,
  SynauraHero,
  SynauraInkPanel,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';
import { getEntitlements } from '@/lib/entitlements';
import { MUSIC_GENRES, type MoodKey } from '@/lib/genres';
import { SynauraWaveform } from '@/components/audio/SynauraWaveform';
import ReleaseTypeSelector, { type ReleaseType } from '@/components/upload/ReleaseTypeSelector';
import GenrePicker from '@/components/upload/GenrePicker';
import MoodSelector from '@/components/upload/MoodSelector';
import TagsInput from '@/components/upload/TagsInput';
import CreditsEditor, { type Credits } from '@/components/upload/CreditsEditor';
import FeaturingSearch, { type FeaturingArtist } from '@/components/upload/FeaturingSearch';
import ScheduleSelector from '@/components/upload/ScheduleSelector';
import TrackListEditor, { type TrackMeta } from '@/components/upload/TrackListEditor';
import UploadPreview from '@/components/upload/UploadPreview';
import SynauraEventsRail from '@/components/synaura/SynauraEventsRail';
import SynauraEventEntryPanel from '@/components/synaura/SynauraEventEntryPanel';

// ─── Compression image ────────────────────────────────────
const MAX_COVER_VIDEO_SECONDS = 7;

function isCoverVideoFile(file: File | null) {
  return Boolean(file && (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)));
}

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('video metadata error'));
    };
    video.src = url;
  });
}

async function compressImageIfNeeded(file: File, maxBytes = 10 * 1024 * 1024): Promise<File> {
  try {
    if (!file || file.size <= maxBytes) return file;
    const imageBitmap = await createImageBitmap(file).catch(async () => {
      return new Promise<ImageBitmap>(async (resolve, reject) => {
        try {
          const url = URL.createObjectURL(file);
          const img = new window.Image();
          img.onload = async () => { try { const bm = await createImageBitmap(img); URL.revokeObjectURL(url); resolve(bm); } catch (e) { URL.revokeObjectURL(url); reject(e); } };
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load error')); };
          img.src = url;
        } catch (e) { reject(e); }
      });
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    const maxDim = 1600;
    const { width, height } = imageBitmap;
    const scale = Math.min(1, (width > height ? maxDim / width : maxDim / height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    let quality = 0.85;
    let outBlob: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      outBlob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
      if (outBlob && outBlob.size <= maxBytes) break;
      if (quality > 0.5) quality -= 0.1;
      else { canvas.width = Math.max(1, Math.round(canvas.width * 0.85)); canvas.height = Math.max(1, Math.round(canvas.height * 0.85)); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height); }
    }
    if (!outBlob) return file;
    return new File([outBlob], file.name.replace(/\.[^/.]+$/, '') + '-compressed.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } catch { return file; }
}

// ─── Upload vers Cloudinary ──────────────────────────────
const uploadToCloudinary = async (file: File, resourceType: 'video' | 'image' = 'video', folder?: string) => {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${resourceType === 'video' ? 'track' : 'cover'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const uploadFolder = folder || (resourceType === 'video' ? 'ximam/audio' : 'ximam/images');
  const sigRes = await fetch('/api/upload/signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp, publicId, resourceType, folder: uploadFolder }) });
  if (!sigRes.ok) throw new Error('Erreur signature');
  const { signature, apiKey, cloudName } = await sigRes.json();
  let fileToUpload = file;
  if (resourceType === 'image' && file.size > 10 * 1024 * 1024) { try { fileToUpload = await compressImageIfNeeded(file); } catch {} }
  const fd = new FormData();
  fd.append('file', fileToUpload);
  fd.append('folder', uploadFolder);
  fd.append('public_id', publicId);
  fd.append('resource_type', resourceType);
  fd.append('timestamp', timestamp.toString());
  fd.append('api_key', apiKey);
  fd.append('signature', signature);
  if (resourceType === 'image') { fd.append('width', '800'); fd.append('height', '800'); fd.append('crop', 'fill'); }
  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: fd });
  if (!upRes.ok) throw new Error('Erreur upload Cloudinary');
  return upRes.json();
};

function cloudinaryVideoPosterUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;
  const withTransform = videoUrl.replace('/video/upload/', '/video/upload/so_0,f_jpg/');
  return withTransform.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '.jpg$2');
}

// ─── Waveform display ────────────────────────────────────
function WaveformDisplay({ audioFile, currentTime = 0, duration = 0, onSeek }: { audioFile: File | null; currentTime?: number; duration?: number; onSeek?: (t: number) => void }) {
  const [data, setData] = useState<number[]>([]);
  useEffect(() => {
    if (!audioFile) return;
    (async () => {
      try {
        const ab = await audioFile.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buf = await ctx.decodeAudioData(ab);
        const raw = buf.getChannelData(0);
        const samples = 200, block = Math.floor(raw.length / samples), out: number[] = [];
        for (let i = 0; i < samples; i++) { let sum = 0; for (let j = 0; j < block; j++) sum += Math.abs(raw[block * i + j]); out.push(sum / block); }
        const mx = Math.max(...out);
        setData(out.map((n) => n / mx));
      } catch {
        setData(Array.from({ length: 200 }, (_, i) => Math.max(0.1, Math.sin((i / 200) * Math.PI * 8) * 0.4 + 0.6 + Math.random() * 0.3)));
      }
    })();
  }, [audioFile]);
  const progress = duration > 0 ? currentTime / duration : 0;
  return (
    <div className="w-full max-w-full px-4">
      <SynauraWaveform waveformData={data} progress={progress} onSeek={(r) => duration > 0 && onSeek?.(r * duration)} variant="upload" heightClass="h-12" idPrefix="upload-wave" />
    </div>
  );
}

// ─── Sections collapsibles ───────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: typeof Music; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-white/[0.09] bg-white/[0.03] shadow-[0_18px_50px_rgba(5,4,12,0.18)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-white/[0.06]">
          <Icon className="h-4 w-4 text-violet-300" />
        </div>
        <span className="flex-1 text-sm font-semibold text-white/86">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────
export default function UploadPage() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  
  // Release type
  const [releaseType, setReleaseType] = useState<ReleaseType>('single');

  // Files
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverVideoDuration, setCoverVideoDuration] = useState<number | null>(null);
  const [trackMetas, setTrackMetas] = useState<TrackMeta[]>([]);

  // Player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [language, setLanguage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isExplicit, setIsExplicit] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [featuring, setFeaturing] = useState<FeaturingArtist[]>([]);
  const [credits, setCredits] = useState<Credits>({});
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [copyrightYear, setCopyrightYear] = useState(new Date().getFullYear());

  // Upload state
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ audio: 0, cover: 0 });
  const [tempPublicIds, setTempPublicIds] = useState<{ audio?: string; cover?: string; coverVideo?: string }>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Plan
  const [planKey, setPlanKey] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free');
  const [usage, setUsage] = useState<any>(null);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  const totalSteps = 3;

  requireAuth();

  // Load plan/usage
  useEffect(() => {
    (async () => {
      try {
        const [u, c] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (u) setUsage(u);
        const name = (c?.subscription?.name || 'Free').toLowerCase();
        if (['free', 'starter', 'pro', 'enterprise'].includes(name)) setPlanKey(name as any);
      } catch {}
    })();
  }, []);

  const canUpload = !usage || !(usage.tracks?.limit >= 0 && usage.tracks?.used >= usage.tracks?.limit);

  useEffect(() => {
    if (!usage) return;
    if (usage.tracks?.limit >= 0 && usage.tracks?.used >= usage.tracks?.limit) {
      setBlockedMsg('Limite de pistes atteinte');
    } else {
      setBlockedMsg(null);
    }
  }, [usage]);

  // Audio player
  useEffect(() => {
    if (!audioFile) { setDuration(0); setCurrentTime(0); setIsPlaying(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } return; }
    const url = URL.createObjectURL(audioFile);
    const a = new Audio(url);
    a.addEventListener('loadedmetadata', () => setDuration(a.duration));
    a.addEventListener('timeupdate', () => setCurrentTime(a.currentTime));
    a.addEventListener('ended', () => setIsPlaying(false));
    audioRef.current = a;
    return () => { a.pause(); URL.revokeObjectURL(url); };
  }, [audioFile]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
    else audioRef.current.pause();
  }, [isPlaying]);

  // Build track metas from files when release != single
  const addAudioFiles = useCallback((files: File[]) => {
    const maxMb = planKey === 'starter' ? 200 : planKey === 'pro' ? 500 : planKey === 'enterprise' ? 1000 : 80;
    const valid = files.filter((f) => {
      const isAudio = f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|aiff|opus|wma)$/i.test(f.name);
      if (!isAudio) return false;
      if (f.size / 1024 / 1024 > maxMb) { notify.error('Fichier trop volumineux', `${f.name} depasse ${maxMb} MB`); return false; }
      return true;
    });
    if (!valid.length) return;

    if (releaseType === 'single') {
      setAudioFile(valid[0]);
    } else {
      setTrackMetas((prev) => {
        const existing = prev.map((m) => m.file.name);
        const newMetas: TrackMeta[] = valid.filter((f) => !existing.includes(f.name)).map((f) => ({
          file: f,
          title: f.name.replace(/\.[^/.]+$/, ''),
          duration: 0,
          genreOverride: null,
          isExplicitOverride: null,
          lyricsOverride: null,
        }));
        return [...prev, ...newMetas];
      });
      if (!audioFile && valid[0]) setAudioFile(valid[0]);

      // Compute durations async
      valid.forEach((f) => {
            const url = URL.createObjectURL(f);
              const a = new Audio(url);
        a.addEventListener('loadedmetadata', () => {
          const d = isFinite(a.duration) ? Math.round(a.duration) : 0;
                URL.revokeObjectURL(url);
          setTrackMetas((prev) => prev.map((m) => m.file === f ? { ...m, duration: d } : m));
        });
        a.addEventListener('error', () => URL.revokeObjectURL(url));
      });
    }
  }, [releaseType, planKey, audioFile]);

  const onAudioDrop = useCallback((accepted: File[]) => addAudioFiles(accepted), [addAudioFiles]);
  const onCoverDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;

    if (f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|avif)$/i.test(f.name)) {
      setCoverVideoDuration(null);
      setCoverFile(f);
      return;
    }

    if (isCoverVideoFile(f)) {
      try {
        const videoDuration = await getVideoDuration(f);
        if (!videoDuration || videoDuration > MAX_COVER_VIDEO_SECONDS + 0.25) {
          notify.error('Video trop longue', `La cover video doit durer ${MAX_COVER_VIDEO_SECONDS} secondes maximum.`);
          return;
        }
        setCoverVideoDuration(videoDuration);
        setCoverFile(f);
      } catch {
        notify.error('Video invalide', 'Impossible de lire la duree de cette video.');
      }
      return;
    }

    notify.error('Cover invalide', 'Ajoute une image ou une video MP4/WebM/MOV de 7 secondes max.');
  }, []);

  const { getRootProps: getAudioRP, getInputProps: getAudioIP, isDragActive: isAudioDrag } = useDropzone({
    onDrop: onAudioDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.aiff', '.opus'] },
    maxFiles: releaseType === 'single' ? 1 : 50,
  });

  const { getRootProps: getCoverRP, getInputProps: getCoverIP, isDragActive: isCoverDrag } = useDropzone({
    onDrop: onCoverDrop,
    accept: { 'image/*': [], 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] },
    maxFiles: 1,
  });

  // Track limits validation
  const trackCountValid = releaseType === 'single' ? !!audioFile : releaseType === 'ep' ? trackMetas.length >= 2 && trackMetas.length <= 6 : trackMetas.length >= 7;

  // ─── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canUpload) { notify.error('Limite atteinte', 'Passe au plan superieur.'); return; }
    if (releaseType === 'single' && !audioFile) { notify.error('Fichier requis', 'Ajoute un fichier audio'); return; }
    if (releaseType !== 'single' && trackMetas.length === 0) { notify.error('Fichiers requis', 'Ajoute au moins une piste'); return; }
    if (!title.trim()) { notify.error('Titre requis', 'Donne un titre a ta sortie'); return; }
    if (!coverFile) { notify.error('Cover requise', 'Ajoute une image ou une video de couverture'); return; }
    if (isCoverVideoFile(coverFile) && (!coverVideoDuration || coverVideoDuration > MAX_COVER_VIDEO_SECONDS + 0.25)) {
      notify.error('Video trop longue', `La cover video doit durer ${MAX_COVER_VIDEO_SECONDS} secondes maximum.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress({ audio: 0, cover: 0 });

    try {
      notify.info('Upload en cours', 'Upload audio...', 0);
      setUploadProgress({ audio: 5, cover: 0 });

      const uploadedTracks: { secure_url: string; public_id: string; duration?: number; file?: File }[] = [];

      if (releaseType === 'single' && audioFile) {
        const r = await uploadToCloudinary(audioFile, 'video');
        setTempPublicIds((p) => ({ ...p, audio: r.public_id }));
        setUploadProgress((p) => ({ ...p, audio: 75 }));
        uploadedTracks.push({ secure_url: r.secure_url, public_id: r.public_id, duration: r.duration, file: audioFile });
      } else {
        for (let i = 0; i < trackMetas.length; i++) {
          notify.info('Upload piste', `${trackMetas[i].title} (${i + 1}/${trackMetas.length})`, 0);
          const r = await uploadToCloudinary(trackMetas[i].file, 'video');
          uploadedTracks.push({ secure_url: r.secure_url, public_id: r.public_id, duration: r.duration, file: trackMetas[i].file });
          setUploadProgress((p) => ({ ...p, audio: Math.min(90, Math.round(((i + 1) / trackMetas.length) * 85) + 5) }));
        }
      }

      // Copyright check (best-effort)
      try {
        const main = uploadedTracks[0];
        if (main) {
          const ck = await fetch('/api/upload/copyright-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl: main.secure_url, title, artist: user?.name || '' }) });
          if (ck.ok) {
            const c = await ck.json();
            if (c?.matched && c?.details) {
              const dt = (c.details.title || '').toLowerCase(), da = (c.details.artist || '').toLowerCase();
              const it = title.toLowerCase(), ia = (user?.name || '').toLowerCase();
              if (dt && da && (!it || dt !== it || (ia && da !== ia))) {
                throw new Error("Conflit potentiel de droits d'auteur detecte.");
              }
            }
          }
        }
      } catch (e: any) {
        const main = uploadedTracks[0];
        if (main?.public_id) { try { await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: main.public_id }) }); } catch {} }
        throw e;
      }

      // Upload cover
      let coverResult: { public_id?: string; secure_url?: string } | null = null;
      let coverVideoResult: { public_id?: string; secure_url?: string; duration?: number } | null = null;
      let coverVideoPosterUrl: string | null = null;
      if (coverFile) {
        const coverIsVideo = isCoverVideoFile(coverFile);
        notify.info(coverIsVideo ? 'Upload video' : 'Upload image', coverIsVideo ? 'Upload cover video...' : 'Upload pochette...', 0);
        setUploadProgress((p) => ({ ...p, cover: 25 }));
        if (coverIsVideo) {
          coverVideoResult = await uploadToCloudinary(coverFile, 'video', 'ximam/cover-videos');
          coverVideoPosterUrl = cloudinaryVideoPosterUrl(coverVideoResult?.secure_url);
          coverResult = { public_id: undefined, secure_url: coverVideoPosterUrl || coverVideoResult?.secure_url };
          setTempPublicIds((p) => ({ ...p, coverVideo: coverVideoResult?.public_id }));
        } else {
          coverResult = await uploadToCloudinary(coverFile, 'image');
          setTempPublicIds((p) => ({ ...p, cover: coverResult?.public_id }));
        }
        setUploadProgress((p) => ({ ...p, cover: 75 }));
      }
      setUploadProgress({ audio: 100, cover: 100 });

      notify.info('Sauvegarde', 'Enregistrement...', 0);

      const isPublic = visibility === 'public';
      const featuringData = featuring.map((f) => ({ id: f.id, name: f.name, isExternal: f.isExternal || false }));
      const extraFields = { mood, language, tags, featuring: featuringData, credits, release_type: releaseType, visibility, scheduled_at: scheduleMode === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null };
      const publishedTrackIds: string[] = [];

      if (releaseType === 'single') {
        const tr = uploadedTracks[0]!;
        const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            audioUrl: tr.secure_url, audioPublicId: tr.public_id,
            coverUrl: coverResult?.secure_url || null, coverPublicId: coverResult?.public_id || null,
            coverVideoUrl: coverVideoResult?.secure_url || null,
            coverVideoPublicId: coverVideoResult?.public_id || null,
            coverVideoPosterUrl: coverVideoPosterUrl || null,
            trackData: { title, description, lyrics, genre: genres, isExplicit, isPublic, copyright: { owner: user?.name || '', year: copyrightYear, rights: 'Tous droits reserves' }, album: null },
            duration: tr.duration || 0,
            audioBytes: tr.file?.size || 0, coverBytes: coverFile?.size || 0,
            ...extraFields,
        }),
      });
        const savedTrack = await res.json().catch(() => null);
        if (!res.ok) { throw new Error(savedTrack?.error || 'Erreur sauvegarde'); }
        if (savedTrack?.trackId) publishedTrackIds.push(String(savedTrack.trackId));
        notify.success('Publie !', 'Ton titre a ete publie avec succes !');
      } else {
        const albumName = title || `Album ${new Date().toLocaleDateString()}`;
        const plRes = await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: albumName, description, isPublic, coverUrl: coverResult?.secure_url || null, is_album: true }) });
        if (!plRes.ok) throw new Error('Erreur creation album');
        const playlist = await plRes.json();

        for (let i = 0; i < uploadedTracks.length; i++) {
          const tr = uploadedTracks[i];
          const meta = trackMetas[i];
          const trackTitle = meta?.title?.trim() || tr.file?.name?.replace(/\.[^/.]+$/, '') || `Piste ${i + 1}`;
          const perGenre = Array.isArray(meta?.genreOverride) && meta.genreOverride.length ? meta.genreOverride : genres;
          const perExplicit = typeof meta?.isExplicitOverride === 'boolean' ? meta.isExplicitOverride : isExplicit;
          const perLyrics = meta?.lyricsOverride?.trim() || lyrics || '';

          const tRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioUrl: tr.secure_url, audioPublicId: tr.public_id,
              coverUrl: coverResult?.secure_url || null, coverPublicId: coverResult?.public_id || null,
              coverVideoUrl: coverVideoResult?.secure_url || null,
              coverVideoPublicId: coverVideoResult?.public_id || null,
              coverVideoPosterUrl: coverVideoPosterUrl || null,
              trackData: { title: trackTitle, description, lyrics: perLyrics || null, genre: perGenre, isExplicit: perExplicit, isPublic, copyright: { owner: user?.name || '', year: copyrightYear, rights: 'Tous droits reserves' }, album: albumName },
              duration: tr.duration || 0,
              audioBytes: tr.file?.size || 0, coverBytes: coverFile?.size || 0,
              ...extraFields,
            }),
          });
          if (!tRes.ok) throw new Error(`Erreur piste ${i + 1}`);
          const tJson = await tRes.json();
          if (tJson?.trackId) publishedTrackIds.push(String(tJson.trackId));
          await fetch(`/api/playlists/${encodeURIComponent(playlist._id)}/tracks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackId: tJson.trackId }) });
        }
        notify.success('Publie !', `${uploadedTracks.length} piste(s) publiees dans ${albumName}.`);
      }

      if (selectedEventId && publishedTrackIds[0]) {
        const eventResponse = await fetch(`/api/city/events/${encodeURIComponent(selectedEventId)}/participate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: publishedTrackIds[0] }),
        });
        const eventPayload = await eventResponse.json().catch(() => null);
        if (eventResponse.ok) notify.success('Event rejoint', 'Ton son est maintenant inscrit dans l event.');
        else notify.error('Event non rejoint', eventPayload?.error || 'Le son est publie, mais son inscription a l event a echoue.');
      }

        sessionStorage.setItem('fromUpload', 'true');
      router.push('/');
    } catch (err) {
      notify.error('Erreur', err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setIsUploading(false);
      setUploadProgress({ audio: 0, cover: 0 });
    }
  };

  // Cleanup on leave
  useEffect(() => {
    const onUnload = () => {
      if (!tempPublicIds.audio && !tempPublicIds.cover && !tempPublicIds.coverVideo) return;
      const payload = new Blob([JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover, coverVideoPublicId: tempPublicIds.coverVideo })], { type: 'application/json' });
      navigator.sendBeacon?.('/api/upload/cleanup', payload);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [tempPublicIds]);

  const cancelUpload = async () => {
    if (tempPublicIds.audio || tempPublicIds.cover) {
      try { await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover }) }); } catch {}
    }
    setTempPublicIds({});
    router.push('/');
  };

  // Step validation
  const step1Valid = releaseType === 'single' ? !!audioFile : trackMetas.length >= (releaseType === 'ep' ? 2 : 7);
  const step2Valid = !!title.trim() && !!coverFile;

  // ─── Steps label ─────────────────────────────────────
  const STEPS = [
    { k: 1, label: 'Fichiers' },
    { k: 2, label: 'Details' },
    { k: 3, label: 'Publier' },
  ];

  const coverPreviewUrl = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : null, [coverFile]);
  useEffect(() => () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
  }, [coverPreviewUrl]);
  const coverIsVideo = isCoverVideoFile(coverFile);
  const releaseLabel = releaseType === 'single' ? 'Single' : releaseType === 'ep' ? 'EP' : 'Album';
  const selectedTrackCount = releaseType === 'single' ? (audioFile ? 1 : 0) : trackMetas.length;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);
  const uploadLimitLabel = planKey === 'starter' ? '200 MB' : planKey === 'pro' ? '500 MB' : planKey === 'enterprise' ? '1 Go' : '80 MB';
  const scheduledLabel =
    scheduleMode === 'scheduled' && scheduledAt
      ? new Date(scheduledAt).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Immediatement';

  return (
    <SynauraAppShell contentClassName="max-w-[1540px]">
      <SynauraTopBar
        searchLabel="Rechercher avant de publier..."
        secondaryHref="/ai-generator"
        secondaryLabel="Studio"
        primaryHref="/upload"
        primaryLabel="Publier"
      />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <SynauraEventsRail variant="compact" className="mb-4" />

      <section className="mb-4 overflow-hidden rounded-[1.75rem] border border-black/[0.08] bg-[#171313] text-white shadow-[0_28px_80px_rgba(20,15,10,0.22)]">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#171313]">Upload Synaura</span>
              <span className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/62">
                {releaseLabel}
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/62">
                {selectedTrackCount} piste{selectedTrackCount > 1 ? 's' : ''}
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[0.94] tracking-[-0.07em] sm:text-5xl">
              Prepare ta sortie sans te perdre dans les reglages.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/56 sm:text-base">
              Ajoute tes fichiers, verifie les infos, choisis le bon moment et publie proprement sur Synaura.
            </p>
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => router.push('/ai-generator')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]"
              >
                <Wand2 className="h-4 w-4" />
                Ouvrir le Studio
              </button>
              <button
                type="button"
                onClick={() => router.push('/library')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-5 text-sm font-black text-white transition hover:bg-white/[0.14]"
              >
                <Library className="h-4 w-4" />
                Bibliothèque
              </button>
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: 'Importer', value: `${selectedTrackCount || 0} piste(s)`, active: currentStep === 1, done: step1Valid },
              { label: 'Presenter', value: title.trim() || 'Metadata', active: currentStep === 2, done: step2Valid },
              { label: 'Diffuser', value: scheduledLabel, active: currentStep === 3, done: currentStep === 3 },
            ].map((item) => (
              <div
                key={item.label}
                className={[
                  'min-w-0 rounded-[1.15rem] border p-3 transition',
                  item.active ? 'border-white/32 bg-white text-[#171313]' : item.done ? 'border-emerald-200/24 bg-emerald-300/10 text-white' : 'border-white/10 bg-white/[0.06] text-white',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={['text-[10px] font-black uppercase tracking-[0.16em]', item.active ? 'text-black/45' : 'text-white/38'].join(' ')}>{item.label}</p>
                  <span className={['grid h-7 w-7 place-items-center rounded-full', item.active ? 'bg-[#171313] text-white' : item.done ? 'bg-emerald-300/16 text-emerald-100' : 'bg-white/[0.08] text-white/40'].join(' ')}>
                    {item.done ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-black">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)_330px] xl:grid-cols-[270px_minmax(0,1fr)_360px]">
        <aside className="min-w-0 space-y-3">
          <SynauraPanel className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06] text-black/58 transition hover:bg-[#171313] hover:text-white"
                aria-label="Retour a l'accueil"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/38">Publication</p>
                <h1 className="truncate text-xl font-black tracking-[-0.04em] text-[#171313]">Nouvelle sortie</h1>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {STEPS.map((step) => {
                const enabled = step.k === 1 || (step.k === 2 && step1Valid) || (step.k === 3 && step1Valid && step2Valid);
                const active = currentStep === step.k;
                const done = step.k === 1 ? step1Valid : step.k === 2 ? step2Valid : currentStep === 3;

                return (
                  <button
                    key={step.k}
                    type="button"
                    disabled={!enabled}
                    onClick={() => setCurrentStep(step.k)}
                    className={[
                      'flex min-w-0 items-center gap-3 rounded-[1.15rem] px-3 py-3 text-left transition disabled:cursor-not-allowed',
                      active ? 'bg-[#171313] text-white' : done ? 'bg-emerald-500/10 text-[#171313]' : 'bg-black/[0.045] text-black/48',
                    ].join(' ')}
                  >
                    <span className={['grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black', active ? 'bg-white text-[#171313]' : 'bg-white/70 text-[#171313]'].join(' ')}>
                      {done ? <Check className="h-3.5 w-3.5" /> : step.k}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{step.label}</span>
                      <span className={['block truncate text-[11px] font-semibold', active ? 'text-white/54' : 'text-black/38'].join(' ')}>
                        {step.k === 1 ? `${selectedTrackCount || 0} piste(s)` : step.k === 2 ? (title.trim() || 'Titre et cover') : visibility}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.16em] text-black/34">
                <span>Avancee</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.07]">
                <div
                  className="h-full rounded-full bg-[#171313] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </SynauraPanel>

          <SynauraPanel className="p-3 sm:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/38">Contexte</p>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              <div className="rounded-[1rem] bg-black/[0.045] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/34">Format</p>
                <p className="mt-1 text-sm font-black text-[#171313]">{releaseLabel}</p>
              </div>
              <div className="rounded-[1rem] bg-black/[0.045] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/34">Limite</p>
                <p className="mt-1 text-sm font-black text-[#171313]">{uploadLimitLabel}</p>
              </div>
              <div className="rounded-[1rem] bg-black/[0.045] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/34">Sortie</p>
                <p className="mt-1 truncate text-sm font-black text-[#171313]">{scheduledLabel}</p>
              </div>
              <div className="rounded-[1rem] bg-black/[0.045] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/34">Plan</p>
                <p className="mt-1 text-sm font-black capitalize text-[#171313]">{planKey}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/ai-generator')}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-white transition hover:scale-[1.01]"
            >
              <Wand2 className="h-4 w-4" />
              Studio
            </button>
          </SynauraPanel>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[1.5rem] bg-[#171313] text-white shadow-[0_24px_70px_rgba(20,15,10,0.22)] sm:rounded-[2rem]">
          <div className="border-b border-white/[0.08] bg-[#1d1717] px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">Workflow live</p>
                <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-white">
                  {currentStep === 1 ? 'Importer' : currentStep === 2 ? 'Presenter' : 'Diffuser'}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-white/[0.06] p-1">
                {(['single', 'ep', 'album'] as ReleaseType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setReleaseType(type);
                      if (type === 'single') setTrackMetas([]);
                      else setAudioFile(null);
                    }}
                    className={[
                      'h-9 rounded-full px-3 text-xs font-black capitalize transition',
                      releaseType === type ? 'bg-white text-[#171313]' : 'text-white/46 hover:bg-white/[0.07] hover:text-white',
                    ].join(' ')}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {blockedMsg && (
            <div className="mx-3 mt-3 flex flex-col gap-3 rounded-[1.1rem] border border-amber-300/20 bg-amber-300/10 p-3 sm:mx-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold text-amber-100">{blockedMsg}. Passe a un plan superieur.</span>
              <button
                type="button"
                onClick={() => router.push('/subscriptions')}
                className="inline-flex h-9 items-center justify-center rounded-full bg-amber-200 px-3 text-xs font-black text-[#171313]"
              >
                Voir les plans
              </button>
            </div>
          )}

          <div className="p-3 sm:p-5">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="upload-files" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ReleaseTypeSelector
                      value={releaseType}
                      onChange={(value) => {
                        setReleaseType(value);
                        if (value === 'single') setTrackMetas([]);
                        else setAudioFile(null);
                      }}
                    />
                  </div>

                  {releaseType === 'single' && !audioFile ? (
                    <div
                      {...getAudioRP()}
                      className={[
                        'cursor-pointer rounded-[1.25rem] border border-dashed p-6 text-center transition sm:p-10',
                        isAudioDrag ? 'border-[#ff6f61] bg-[#ff6f61]/10' : 'border-white/[0.12] bg-white/[0.035] hover:border-white/24',
                      ].join(' ')}
                    >
                      <input {...getAudioIP()} />
                      <Upload className="mx-auto mb-3 h-10 w-10 text-white/32" />
                      <p className="text-base font-black text-white">Ajoute ton morceau principal</p>
                      <p className="mt-1 text-xs font-semibold text-white/36">MP3, WAV, FLAC - max {uploadLimitLabel}</p>
                    </div>
                  ) : releaseType === 'single' && audioFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/[0.10] bg-white/[0.04] p-3">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#171313] transition hover:scale-[1.03]"
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{audioFile.name}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-white/34">
                            {(audioFile.size / 1024 / 1024).toFixed(1)} MB - {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAudioFile(null);
                            setIsPlaying(false);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-white/42 transition hover:bg-red-500/15 hover:text-red-200"
                          aria-label="Retirer le fichier"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
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
                  ) : (
                    <div className="space-y-3">
                      <div
                        {...getAudioRP()}
                        className={[
                          'cursor-pointer rounded-[1.25rem] border border-dashed p-6 text-center transition',
                          isAudioDrag ? 'border-[#ff6f61] bg-[#ff6f61]/10' : 'border-white/[0.12] bg-white/[0.035] hover:border-white/24',
                        ].join(' ')}
                      >
                        <input {...getAudioIP()} />
                        <Upload className="mx-auto mb-2 h-8 w-8 text-white/32" />
                        <p className="text-sm font-black text-white">Ajouter les pistes</p>
                        <p className="mt-1 text-[11px] font-semibold text-white/34">{releaseType === 'ep' ? '2 a 6 pistes' : '7 a 50 pistes'} - glisse ou clique</p>
                      </div>

                      {trackMetas.length > 0 && (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                            <span className="font-black text-white/46">{trackMetas.length} piste(s)</span>
                            {!trackCountValid && <span className="text-[11px] font-black text-amber-200">{releaseType === 'ep' ? 'EP: 2-6 pistes' : 'Album: 7+ pistes'}</span>}
                          </div>
                          <TrackListEditor tracks={trackMetas} onChange={setTrackMetas} />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="upload-details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                    <div
                      {...getCoverRP()}
                      className={[
                        'aspect-square cursor-pointer overflow-hidden rounded-[1.2rem] border border-dashed transition',
                        isCoverDrag ? 'border-[#ff6f61] bg-[#ff6f61]/10' : coverFile ? 'border-white/[0.10]' : 'border-white/[0.12] bg-white/[0.035] hover:border-white/24',
                      ].join(' ')}
                    >
                      <input {...getCoverIP()} />
                      {coverFile ? (
                        coverIsVideo ? (
                          <video src={coverPreviewUrl!} className="h-full w-full object-cover" muted loop playsInline autoPlay />
                        ) : (
                          <img src={coverPreviewUrl!} alt="" className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="grid h-full place-items-center text-center">
                          <div>
                            <Image className="mx-auto h-7 w-7 text-white/28" />
                            <p className="mt-2 px-3 text-xs font-black text-white/40">Cover image ou video</p>
                            <p className="mt-1 px-3 text-[10px] font-bold text-white/28">Video 7s max</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {coverFile && coverIsVideo ? (
                      <p className="text-[11px] font-bold text-emerald-200/80">
                        Cover video valide ({coverVideoDuration ? `${coverVideoDuration.toFixed(1)}s` : `<= ${MAX_COVER_VIDEO_SECONDS}s`}) - une image poster sera utilisee en fallback.
                      </p>
                    ) : null}

                    <div className="grid min-w-0 gap-3">
                      <label className="grid gap-1.5">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-white/36">{releaseType === 'single' ? 'Titre' : releaseType === 'ep' ? "Nom de l'EP" : "Nom de l'album"}</span>
                        <input
                          type="text"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          className="h-12 rounded-[1rem] border border-white/[0.10] bg-white/[0.05] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/20 focus:border-white/28"
                          placeholder="Titre de ta sortie"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-white/36">Artiste</span>
                        <input
                          type="text"
                          value={user?.name || ''}
                          disabled
                          className="h-12 cursor-not-allowed rounded-[1rem] border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-semibold text-white/34"
                        />
                      </label>
                    </div>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/36">Description</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={3}
                      className="min-h-24 resize-none rounded-[1rem] border border-white/[0.10] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/20 focus:border-white/28"
                      placeholder="Decris ta musique..."
                    />
                  </label>

                  <Section title="Genres" icon={Music} defaultOpen>
                    <GenrePicker selected={genres} onChange={setGenres} max={5} />
                  </Section>
                  <Section title="Mood" icon={Sparkles} defaultOpen={false}>
                    <MoodSelector value={mood} onChange={setMood} />
                  </Section>
                  <Section title="Langue" icon={FileText} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {(['fr', 'en', 'es', 'ar', 'pt', 'de', 'it', 'ja', 'ko', 'instrumental', 'other'] as const).map((key) => {
                        const labels: Record<string, string> = { fr: 'Francais', en: 'Anglais', es: 'Espagnol', ar: 'Arabe', pt: 'Portugais', de: 'Allemand', it: 'Italien', ja: 'Japonais', ko: 'Coreen', instrumental: 'Instrumental', other: 'Autre' };
                        const active = language === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setLanguage(active ? '' : key)}
                            className={['rounded-full px-3 py-2 text-xs font-black transition', active ? 'bg-white text-[#171313]' : 'bg-white/[0.06] text-white/48 hover:bg-white/[0.10]'].join(' ')}
                          >
                            {labels[key]}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                  <Section title="Tags" icon={FileText} defaultOpen={false}>
                    <TagsInput tags={tags} onChange={setTags} max={10} />
                  </Section>
                  {releaseType === 'single' && (
                    <Section title="Paroles" icon={FileText} defaultOpen={false}>
                      <textarea
                        value={lyrics}
                        onChange={(event) => setLyrics(event.target.value)}
                        rows={7}
                        className="w-full resize-none rounded-[1rem] border border-white/[0.10] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/20 focus:border-white/28"
                        placeholder="Ajoute les paroles..."
                      />
                    </Section>
                  )}
                  <Section title="Featuring" icon={Music} defaultOpen={false}>
                    <FeaturingSearch artists={featuring} onChange={setFeaturing} />
                  </Section>
                  <Section title="Credits" icon={FileText} defaultOpen={false}>
                    <CreditsEditor credits={credits} onChange={setCredits} />
                  </Section>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="upload-publish" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([['public', 'Public'], ['unlisted', 'Non liste'], ['private', 'Prive']] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVisibility(key)}
                        className={['h-11 rounded-full text-sm font-black transition', visibility === key ? 'bg-white text-[#171313]' : 'bg-white/[0.06] text-white/46 hover:bg-white/[0.10]'].join(' ')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-[1.1rem] bg-white/[0.04] px-4 py-3 text-sm font-black text-white/68">
                    <input
                      type="checkbox"
                      checked={isExplicit}
                      onChange={(event) => setIsExplicit(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-[#ff6f61] focus:ring-[#ff6f61]/30"
                    />
                    Contenu explicite
                  </label>

                  <Section title="Date de publication" icon={Clock3} defaultOpen>
                    <ScheduleSelector mode={scheduleMode} scheduledAt={scheduledAt} onModeChange={setScheduleMode} onDateChange={setScheduledAt} />
                  </Section>

                  <SynauraEventEntryPanel selectedEventId={selectedEventId} onChange={setSelectedEventId} dark />

                  <label className="grid max-w-xs gap-1.5">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/36">Annee copyright</span>
                    <input
                      type="number"
                      value={copyrightYear}
                      onChange={(event) => setCopyrightYear(parseInt(event.target.value) || new Date().getFullYear())}
                      className="h-11 rounded-[1rem] border border-white/[0.10] bg-white/[0.05] px-4 text-sm font-semibold text-white outline-none focus:border-white/28"
                    />
                  </label>

                  <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.035] p-3">
                    <UploadPreview
                      releaseType={releaseType}
                      title={title}
                      artist={user?.name || ''}
                      description={description}
                      genres={genres}
                      mood={mood}
                      language={language}
                      tags={tags}
                      isPublic={visibility === 'public'}
                      isExplicit={isExplicit}
                      visibility={visibility}
                      coverFile={coverFile}
                      audioFile={audioFile}
                      tracks={trackMetas}
                      featuring={featuring}
                      credits={credits}
                      scheduleMode={scheduleMode}
                      scheduledAt={scheduledAt}
                      duration={duration}
                      copyrightOwner={user?.name || ''}
                      copyrightYear={copyrightYear}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {(uploadProgress.audio > 0 || uploadProgress.cover > 0) && (
            <div className="border-t border-white/[0.08] px-3 py-3 sm:px-5">
              <div className="grid gap-2">
                {uploadProgress.audio > 0 && (
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/36"><span>Audio</span><span>{uploadProgress.audio}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${uploadProgress.audio}%` }} /></div>
                  </div>
                )}
                {uploadProgress.cover > 0 && (
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/36"><span>Pochette</span><span>{uploadProgress.cover}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${uploadProgress.cover}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 z-10 border-t border-white/[0.08] bg-[#171313]/94 px-3 py-3 backdrop-blur-xl sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="h-10 rounded-full bg-white/[0.06] px-4 text-sm font-black text-white/62 transition hover:bg-white/[0.10]">
                    Retour
                  </button>
                )}
                <button type="button" onClick={cancelUpload} className="h-10 rounded-full bg-red-500/10 px-4 text-sm font-black text-red-200 transition hover:bg-red-500/18">
                  Annuler
                </button>
              </div>
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={(currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid) || !canUpload}
                  className="h-11 rounded-full bg-white px-6 text-sm font-black text-[#171313] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isUploading || !canUpload}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#171313] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {isUploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171313]/25 border-t-[#171313]" /> : <Sparkles className="h-4 w-4" />}
                  {isUploading ? 'Upload...' : 'Publier'}
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-3">
          <SynauraPanel className="p-3 sm:p-4">
            <div className="aspect-square overflow-hidden rounded-[1.1rem] bg-[#171313]">
              {coverPreviewUrl ? (
                coverIsVideo ? (
                  <video src={coverPreviewUrl} className="h-full w-full object-cover" muted loop playsInline autoPlay />
                ) : (
                  <img src={coverPreviewUrl} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#171313,#302545_58%,#0f3b42)]">
                  <Music className="h-12 w-12 text-white/20" />
                </div>
              )}
            </div>
            <div className="mt-3 min-w-0">
              <p className="truncate text-xl font-black tracking-[-0.04em] text-[#171313]">{title.trim() || 'Sans titre'}</p>
              <p className="mt-1 truncate text-sm font-semibold text-black/48">{user?.name || 'Artiste'}</p>
              {featuring.length > 0 && <p className="mt-1 truncate text-xs font-semibold text-black/36">feat. {featuring.map((artist) => artist.name).join(', ')}</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[1rem] bg-black/[0.045] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/34">Format</p>
                <p className="mt-1 text-sm font-black text-[#171313]">{releaseLabel}</p>
              </div>
              <div className="rounded-[1rem] bg-black/[0.045] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/34">Pistes</p>
                <p className="mt-1 text-sm font-black text-[#171313]">{selectedTrackCount}</p>
              </div>
            </div>
          </SynauraPanel>

          <SynauraPanel className="p-3 sm:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/38">A verifier</p>
            <div className="mt-3 grid gap-2">
              {[
                { label: 'Audio', done: step1Valid },
                { label: 'Pochette + titre', done: step2Valid },
                { label: 'Publication', done: currentStep === 3 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-[1rem] bg-black/[0.045] px-3 py-2.5">
                  <span className={['grid h-7 w-7 place-items-center rounded-full', item.done ? 'bg-emerald-500/14 text-emerald-700' : 'bg-black/[0.06] text-black/34'].join(' ')}>
                    {item.done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-sm font-black text-[#171313]">{item.label}</span>
                </div>
              ))}
            </div>
          </SynauraPanel>
        </aside>
      </main>
    </SynauraAppShell>
  );

  return (
    <SynauraAppShell contentClassName="max-w-[1500px]">
      <SynauraTopBar />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <div className="space-y-4">
        <SynauraHero
          eyebrow="Publication native"
          title={<>Publier et le studio vivent maintenant dans le meme shell que l'accueil.</>}
          description={
            <>
              Tu peux preparer une sortie, la documenter, la planifier puis la pousser en ligne
              sans revenir a l'ancien Synaura.
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push('/ai-generator')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                <Wand2 className="h-4 w-4" />
                Ouvrir le studio
              </button>
              <button
                type="button"
                onClick={() => router.push('/library')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black/[0.06] px-5 text-sm font-black text-[#171313] transition hover:bg-black/[0.10]"
              >
                <Library className="h-4 w-4" />
                Voir la biblio
              </button>
            </>
          }
          aside={
            <SynauraInkPanel className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/58">
                    <Disc3 className="h-3.5 w-3.5" />
                    {releaseLabel}
                  </div>
                  <div className="mt-3 text-3xl font-black leading-none text-white">{selectedTrackCount}</div>
                  <p className="mt-1 text-xs text-white/44">piste(s) prete(s) pour la mise en ligne</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/58">
                    <Clock3 className="h-3.5 w-3.5" />
                    Diffusion
                  </div>
                  <div className="mt-3 text-sm font-black text-white">{scheduledLabel}</div>
                  <p className="mt-1 text-xs text-white/44">visibilite {visibility === 'public' ? 'publique' : visibility === 'unlisted' ? 'non listee' : 'privee'}</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/58">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Plan
                  </div>
                  <div className="mt-3 text-sm font-black capitalize text-white">{planKey}</div>
                  <p className="mt-1 text-xs text-white/44">limite par fichier: {uploadLimitLabel}</p>
                </div>
              </div>
            </SynauraInkPanel>
          }
        />

        <SynauraInkPanel className="overflow-hidden">
          <div className="overflow-hidden">

          {/* ─── Header ─────────────────────────────────── */}
          <div className="sticky top-0 z-10 bg-[#0a0a14]/95 backdrop-blur-xl border-b border-white/[0.06]">
            <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button type="button" onClick={() => router.push('/')} className="h-10 w-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition grid place-items-center" aria-label="Retour">
                  <ArrowLeft className="h-4 w-4 text-white/50" />
                </button>
                <div className="min-w-0">
                  <div className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Publier</div>
                  <div className="text-[11px] text-white/30">
                    {releaseType === 'single' ? 'Single' : releaseType === 'ep' ? 'EP' : 'Album'}
                    {title && ` — ${title}`}
                  </div>
                </div>
              </div>

              {/* Step indicator */}
              <div className="hidden sm:flex items-center gap-1.5">
                {STEPS.map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    onClick={() => {
                      if (s.k === 1 || (s.k === 2 && step1Valid) || (s.k === 3 && step1Valid && step2Valid)) setCurrentStep(s.k);
                    }}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium transition',
                      currentStep === s.k ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : currentStep > s.k ? 'bg-white/[0.04] text-white/50 border border-white/[0.08]' : 'text-white/20 border border-transparent',
                    ].join(' ')}
                  >
                    {s.k}. {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile step indicator */}
            <div className="sm:hidden px-3 pb-3 flex gap-1.5 overflow-x-auto">
              {STEPS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => {
                    if (s.k === 1 || (s.k === 2 && step1Valid) || (s.k === 3 && step1Valid && step2Valid)) setCurrentStep(s.k);
                  }}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap',
                    currentStep === s.k ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/30 border border-white/[0.06]',
                  ].join(' ')}
                >
                  {s.k}. {s.label}
                </button>
              ))}
              </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-white/[0.04]">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
            </div>
          </div>

          {/* ─── Blocked message ──────────────────────── */}
          {blockedMsg && (
            <div className="mx-3 sm:mx-4 mt-3 rounded-2xl p-3 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-2">
              <span className="text-xs text-amber-300/80">{blockedMsg}. Passe a un plan superieur.</span>
              <button onClick={() => router.push('/subscriptions')} className="h-8 px-3 rounded-full bg-amber-500/15 text-amber-300 font-medium text-xs hover:bg-amber-500/25 transition">Voir les plans</button>
            </div>
          )}

          {/* ─── Content ──────────────────────────────── */}
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">

                {/* ═══════ STEP 1: Fichiers ═══════ */}
            {currentStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4 sm:p-6 space-y-5">

                    {/* Release type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/60">Type de sortie</label>
                      <ReleaseTypeSelector value={releaseType} onChange={(v) => { setReleaseType(v); if (v === 'single') { setTrackMetas([]); } else { setAudioFile(null); } }} />
                    </div>

                    {/* Audio dropzone */}
                    {releaseType === 'single' && !audioFile ? (
                      <div {...getAudioRP()} className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition ${isAudioDrag ? 'border-violet-500/60 bg-violet-500/5' : 'border-white/[0.08] hover:border-white/[0.16]'}`}>
                        <input {...getAudioIP()} />
                        <Upload className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-white/20 mb-3" />
                        <p className="text-base sm:text-lg font-medium text-white/60">Glisse ton fichier audio ici</p>
                        <p className="text-xs text-white/30 mt-1">MP3, WAV, FLAC — Max {planKey === 'starter' ? 200 : planKey === 'pro' ? 500 : planKey === 'enterprise' ? '1 Go' : '80'} MB</p>
                      </div>
                    ) : releaseType === 'single' && audioFile instanceof File ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                          <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition">
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{audioFile?.name}</div>
                            <div className="text-[10px] text-white/30">{((audioFile?.size || 0) / 1024 / 1024).toFixed(1)} MB - {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</div>
                        </div>
                          <button type="button" onClick={() => { setAudioFile(null); setIsPlaying(false); }} className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition text-white/30 hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                        <WaveformDisplay audioFile={audioFile} currentTime={currentTime} duration={duration} onSeek={(t) => { if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } }} />
                  </div>
                    ) : (
                      /* EP / Album mode */
                        <div className="space-y-3">
                        <div {...getAudioRP()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${isAudioDrag ? 'border-violet-500/60 bg-violet-500/5' : 'border-white/[0.08] hover:border-white/[0.16]'}`}>
                          <input {...getAudioIP()} />
                          <Upload className="w-8 h-8 mx-auto text-white/20 mb-2" />
                          <p className="text-sm font-medium text-white/60">Ajouter des pistes</p>
                          <p className="text-[10px] text-white/30 mt-1">
                            {releaseType === 'ep' ? '2 a 6 pistes' : '7 a 50 pistes'} — Glisse ou clique
                          </p>
                </div>

                        {trackMetas.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-white/40">{trackMetas.length} piste(s)</span>
                              {!trackCountValid && (
                                <span className="text-[10px] text-amber-400">
                                  {releaseType === 'ep' ? 'EP : 2-6 pistes requises' : 'Album : 7+ pistes requises'}
                                </span>
                              )}
                                  </div>
                            <TrackListEditor tracks={trackMetas} onChange={setTrackMetas} />
                                      </div>
                        )}
                                    </div>
                    )}
                  </motion.div>
                )}

                {/* ═══════ STEP 2: Details ═══════ */}
                {currentStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4 sm:p-6 space-y-4">

                    {/* Title + Cover */}
                    <div className="flex gap-4">
                      {/* Cover */}
                      <div {...getCoverRP()} className={`w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed flex-shrink-0 cursor-pointer transition overflow-hidden ${isCoverDrag ? 'border-violet-500/60 bg-violet-500/5' : coverFile ? 'border-white/[0.08]' : 'border-white/[0.08] hover:border-white/[0.16]'}`}>
                        <input {...getCoverIP()} />
                        {coverFile ? (
                          <div className="relative w-full h-full group">
                            {coverIsVideo ? (
                              <video src={coverPreviewUrl!} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                            ) : (
                              <img src={coverPreviewUrl!} alt="" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Image className="w-6 h-6 text-white/70" />
                                      </div>
                                    </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                            <Image className="w-6 h-6 text-white/20" />
                            <span className="text-[10px] text-white/30 text-center px-2">Cover image ou video *</span>
                                      </div>
                                    )}
                      </div>

                      {/* Title + Artist */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <label className="text-xs text-white/40 mb-1 block">
                            {releaseType === 'single' ? 'Titre *' : releaseType === 'ep' ? "Nom de l'EP *" : "Nom de l'album *"}
                          </label>
                          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition" placeholder="Titre de ta sortie" />
                                    </div>
                        <div>
                          <label className="text-xs text-white/40 mb-1 block">Artiste</label>
                          <input type="text" value={user?.name || ''} disabled className="w-full h-11 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/30 cursor-not-allowed" />
                                  </div>
                        </div>
                      </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 resize-none" placeholder="Decris ta musique..." />
                              </div>

                    {/* Genres */}
                    <Section title="Genres" icon={Music} defaultOpen={true}>
                      <GenrePicker selected={genres} onChange={setGenres} max={5} />
                    </Section>

                    {/* Mood */}
                    <Section title="Mood / Ambiance" icon={Sparkles} defaultOpen={false}>
                      <MoodSelector value={mood} onChange={setMood} />
                    </Section>

                    {/* Language */}
                    <Section title="Langue" icon={FileText} defaultOpen={false}>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {(['fr', 'en', 'es', 'ar', 'pt', 'de', 'it', 'ja', 'ko', 'instrumental', 'other'] as const).map((k) => {
                          const labels: Record<string, string> = { fr: 'Francais', en: 'Anglais', es: 'Espagnol', ar: 'Arabe', pt: 'Portugais', de: 'Allemand', it: 'Italien', ja: 'Japonais', ko: 'Coreen', instrumental: 'Instrumental', other: 'Autre' };
                          const active = language === k;
                          return (
                            <button key={k} type="button" onClick={() => setLanguage(active ? '' : k)} className={['px-2.5 py-2 rounded-xl text-xs transition', active ? 'bg-violet-500/15 border border-violet-500/40 text-violet-300' : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06]'].join(' ')}>
                              {labels[k]}
                  </button>
                          );
                        })}
                </div>
                    </Section>

                    {/* Tags */}
                    <Section title="Tags" icon={FileText} defaultOpen={false}>
                      <TagsInput tags={tags} onChange={setTags} max={10} />
                    </Section>

                    {/* Lyrics (single only) */}
                    {releaseType === 'single' && (
                      <Section title="Paroles" icon={FileText} defaultOpen={false}>
                        <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 resize-none" placeholder="Ajoute les paroles..." />
                      </Section>
                    )}

                    {/* Featuring */}
                    <Section title="Featuring / Collaborateurs" icon={Music} defaultOpen={false}>
                      <FeaturingSearch artists={featuring} onChange={setFeaturing} />
                    </Section>

                    {/* Credits */}
                    <Section title="Credits" icon={FileText} defaultOpen={false}>
                      <CreditsEditor credits={credits} onChange={setCredits} />
                    </Section>
              </motion.div>
            )}

                {/* ═══════ STEP 3: Publier ═══════ */}
                {currentStep === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4 sm:p-6 space-y-5">

                    {/* Publication options */}
                    <Section title="Publication" icon={Sparkles} defaultOpen={true}>
                      <div className="space-y-4">
                        {/* Visibility */}
                        <div>
                          <label className="text-xs text-white/40 mb-1.5 block">Visibilite</label>
                          <div className="grid grid-cols-3 gap-2">
                            {([['public', 'Public'], ['unlisted', 'Non-liste'], ['private', 'Prive']] as const).map(([k, l]) => (
                              <button key={k} type="button" onClick={() => setVisibility(k)} className={['px-3 py-2 rounded-xl text-xs transition', visibility === k ? 'bg-violet-500/15 border border-violet-500/40 text-violet-300' : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06]'].join(' ')}>{l}</button>
                            ))}
                    </div>
                  </div>

                        {/* Explicit */}
                        <label className="flex items-center gap-3 text-sm text-white/60 cursor-pointer">
                          <input type="checkbox" checked={isExplicit} onChange={(e) => setIsExplicit(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-violet-500 focus:ring-violet-500/30" />
                          Contenu explicite
                        </label>

                        {/* Schedule */}
                        <div>
                          <label className="text-xs text-white/40 mb-1.5 block">Date de publication</label>
                          <ScheduleSelector mode={scheduleMode} scheduledAt={scheduledAt} onModeChange={setScheduleMode} onDateChange={setScheduledAt} />
                  </div>

                        {/* Copyright year */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-white/40">Annee copyright</label>
                          <input type="number" value={copyrightYear} onChange={(e) => setCopyrightYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-24 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none focus:border-violet-500/40" />
                  </div>
                </div>
                    </Section>

                    {/* Preview */}
                    <div>
                      <h3 className="text-sm font-semibold text-white/60 mb-3">Apercu</h3>
                      <UploadPreview
                        releaseType={releaseType}
                        title={title}
                        artist={user?.name || ''}
                        description={description}
                        genres={genres}
                        mood={mood}
                        language={language}
                        tags={tags}
                        isPublic={visibility === 'public'}
                        isExplicit={isExplicit}
                        visibility={visibility}
                        coverFile={coverFile}
                        audioFile={audioFile}
                        tracks={trackMetas}
                        featuring={featuring}
                        credits={credits}
                        scheduleMode={scheduleMode}
                        scheduledAt={scheduledAt}
                        duration={duration}
                        copyrightOwner={user?.name || ''}
                        copyrightYear={copyrightYear}
                      />
                      </div>
                  </motion.div>
                )}

              </AnimatePresence>
                    </div>

            {/* ─── Desktop side preview ──────────────── */}
            <div className="hidden lg:block w-72 xl:w-80 border-l border-white/[0.06] p-4">
              <div className="sticky top-28 space-y-4">
                <div className="text-xs text-white/30 font-medium uppercase tracking-wider">Apercu</div>
                <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
                          {coverFile ? (
                    coverIsVideo ? (
                      <video src={coverPreviewUrl!} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                    ) : (
                      <img src={coverPreviewUrl!} alt="" className="w-full h-full object-cover" />
                    )
                          ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music className="w-12 h-12 text-white/10" /></div>
                          )}
                </div>
                <div>
                  <div className="text-sm font-bold truncate">{title || 'Sans titre'}</div>
                  <div className="text-xs text-white/40">{user?.name || 'Artiste'}</div>
                  {featuring.length > 0 && <div className="text-[10px] text-white/25 mt-0.5">feat. {featuring.map((f) => f.name).join(', ')}</div>}
                          </div>
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {genres.slice(0, 3).map((g) => <span key={g} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40">{g}</span>)}
                    {genres.length > 3 && <span className="text-[10px] text-white/20">+{genres.length - 3}</span>}
                        </div>
                      )}
                {releaseType !== 'single' && trackMetas.length > 0 && (
                  <div className="text-[10px] text-white/30">{trackMetas.length} piste(s) — {Math.floor(trackMetas.reduce((s, t) => s + t.duration, 0) / 60)} min</div>
                          )}
                        </div>
                          </div>
                        </div>

          {/* ─── Upload progress ──────────────────────── */}
            {(uploadProgress.audio > 0 || uploadProgress.cover > 0) && (
            <div className="px-4 py-3 space-y-2 border-t border-white/[0.06]">
                {uploadProgress.audio > 0 && (
                  <div>
                  <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Audio</span><span>{uploadProgress.audio}%</span></div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.audio}%` }} /></div>
                </div>
                )}
                {uploadProgress.cover > 0 && (
                  <div>
                  <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Pochette</span><span>{uploadProgress.cover}%</span></div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.cover}%` }} /></div>
                  </div>
                )}
              </div>
            )}

          {/* ─── Footer nav ───────────────────────────── */}
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-t border-white/[0.06] bg-[#0a0a14]/80 backdrop-blur-xl">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="h-10 px-4 rounded-full bg-white/[0.04] text-white/60 text-sm font-medium hover:bg-white/[0.08] transition">Retour</button>
              )}
              <button type="button" onClick={cancelUpload} className="h-10 px-4 rounded-full bg-red-500/8 text-red-400/80 text-sm font-medium hover:bg-red-500/15 transition">Annuler</button>
            </div>
                
                {currentStep < totalSteps ? (
                  <button 
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                disabled={(currentStep === 1 && !step1Valid) || (currentStep === 2 && !step2Valid) || !canUpload}
                className="h-10 px-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSubmit}
                    disabled={isUploading || !canUpload}
                className="h-10 px-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Upload...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Publier</>
                )}
                  </button>
            )}
        </div>

          </div>
        </SynauraInkPanel>
      </div>
    </SynauraAppShell>
  );
}
