'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Music, Image, X, Play, Pause,
  ArrowLeft, Check, FileText, ChevronDown, ChevronRight, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { notify } from '@/components/NotificationCenter';
import BottomNav from '@/components/BottomNav';
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

// ─── Compression image ────────────────────────────────────
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
const uploadToCloudinary = async (file: File, resourceType: 'video' | 'image' = 'video') => {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${resourceType === 'video' ? 'track' : 'cover'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sigRes = await fetch('/api/upload/signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp, publicId, resourceType }) });
  if (!sigRes.ok) throw new Error('Erreur signature');
  const { signature, apiKey, cloudName } = await sigRes.json();
  let fileToUpload = file;
  if (resourceType === 'image' && file.size > 10 * 1024 * 1024) { try { fileToUpload = await compressImageIfNeeded(file); } catch {} }
  const fd = new FormData();
  fd.append('file', fileToUpload);
  fd.append('folder', resourceType === 'video' ? 'ximam/audio' : 'ximam/images');
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.02] transition">
        <Icon className="w-4 h-4 text-violet-400/70" />
        <span className="text-sm font-semibold text-white/80 flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
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
  const [tempPublicIds, setTempPublicIds] = useState<{ audio?: string; cover?: string }>({});

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
  const onCoverDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f && (f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|avif)$/i.test(f.name))) setCoverFile(f);
    else notify.error('Image invalide', 'Format non supporte');
  }, []);

  const { getRootProps: getAudioRP, getInputProps: getAudioIP, isDragActive: isAudioDrag } = useDropzone({
    onDrop: onAudioDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.aiff', '.opus'] },
    maxFiles: releaseType === 'single' ? 1 : 50,
  });

  const { getRootProps: getCoverRP, getInputProps: getCoverIP, isDragActive: isCoverDrag } = useDropzone({
    onDrop: onCoverDrop,
    accept: { 'image/*': [] },
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
    if (!coverFile) { notify.error('Pochette requise', 'Ajoute une image de couverture'); return; }

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
      if (coverFile) {
        notify.info('Upload image', 'Upload pochette...', 0);
        setUploadProgress((p) => ({ ...p, cover: 25 }));
        coverResult = await uploadToCloudinary(coverFile, 'image');
        setTempPublicIds((p) => ({ ...p, cover: coverResult?.public_id }));
        setUploadProgress((p) => ({ ...p, cover: 75 }));
      }
      setUploadProgress({ audio: 100, cover: 100 });

      notify.info('Sauvegarde', 'Enregistrement...', 0);

      const isPublic = visibility === 'public';
      const featuringData = featuring.map((f) => ({ id: f.id, name: f.name, isExternal: f.isExternal || false }));
      const extraFields = { mood, language, tags, featuring: featuringData, credits, release_type: releaseType, visibility, scheduled_at: scheduleMode === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null };

      if (releaseType === 'single') {
        const tr = uploadedTracks[0]!;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: tr.secure_url, audioPublicId: tr.public_id,
            coverUrl: coverResult?.secure_url || null, coverPublicId: coverResult?.public_id || null,
            trackData: { title, description, lyrics, genre: genres, isExplicit, isPublic, copyright: { owner: user?.name || '', year: copyrightYear, rights: 'Tous droits reserves' }, album: null },
            duration: tr.duration || 0,
            audioBytes: tr.file?.size || 0, coverBytes: coverFile?.size || 0,
            ...extraFields,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erreur sauvegarde'); }
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
              trackData: { title: trackTitle, description, lyrics: perLyrics || null, genre: perGenre, isExplicit: perExplicit, isPublic, copyright: { owner: user?.name || '', year: copyrightYear, rights: 'Tous droits reserves' }, album: albumName },
              duration: tr.duration || 0,
              audioBytes: tr.file?.size || 0, coverBytes: coverFile?.size || 0,
              ...extraFields,
            }),
          });
          if (!tRes.ok) throw new Error(`Erreur piste ${i + 1}`);
          const tJson = await tRes.json();
          await fetch(`/api/playlists/${encodeURIComponent(playlist._id)}/tracks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackId: tJson.trackId }) });
        }
        notify.success('Publie !', `${uploadedTracks.length} piste(s) publiees dans ${albumName}.`);
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
      if (!tempPublicIds.audio && !tempPublicIds.cover) return;
      const payload = new Blob([JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover })], { type: 'application/json' });
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

  const coverPreviewUrl = coverFile ? URL.createObjectURL(coverFile) : null;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pb-20">
      <div className="mx-auto max-w-5xl px-3 md:px-6 py-4">
        <div className="rounded-3xl border border-white/[0.06] bg-[#0f0f1e]/80 backdrop-blur-xl overflow-hidden">

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
                    ) : releaseType === 'single' && audioFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                          <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition">
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{audioFile.name}</div>
                            <div className="text-[10px] text-white/30">{(audioFile.size / 1024 / 1024).toFixed(1)} MB — {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</div>
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
                            <img src={coverPreviewUrl!} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Image className="w-6 h-6 text-white/70" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                            <Image className="w-6 h-6 text-white/20" />
                            <span className="text-[10px] text-white/30 text-center px-2">Pochette *</span>
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
                    <img src={coverPreviewUrl!} alt="" className="w-full h-full object-cover" />
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
      </div>
      <BottomNav />
    </div>
  );
}
