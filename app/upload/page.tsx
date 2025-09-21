"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';

type CloudinaryUpload = { public_id: string; secure_url: string; bytes?: number };

async function signUpload(resourceType: 'video' | 'image') {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${resourceType === 'video' ? 'track' : 'cover'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const r = await fetch('/api/upload/signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp, publicId, resourceType }) });
  if (!r.ok) throw new Error('Signature échouée');
  const j = await r.json();
  return { timestamp, publicId, ...j } as { timestamp: number; publicId: string; signature: string; apiKey: string; cloudName: string };
}

async function uploadToCloudinary(file: File, resourceType: 'video' | 'image'): Promise<CloudinaryUpload> {
  const { timestamp, publicId, signature, apiKey, cloudName } = await signUpload(resourceType);
  const form = new FormData();
  form.append('file', file);
  form.append('folder', resourceType === 'video' ? 'ximam/audio' : 'ximam/images');
  form.append('public_id', publicId);
  form.append('resource_type', resourceType);
  form.append('timestamp', String(timestamp));
  form.append('api_key', apiKey);
  form.append('signature', signature);
  if (resourceType === 'image') { form.append('width', '800'); form.append('height', '800'); form.append('crop', 'fill'); }
  const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: form });
  if (!up.ok) throw new Error('Upload Cloudinary échoué');
  return await up.json();
}

export default function UploadPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tempPublicIds, setTempPublicIds] = useState<{ audio?: string; cover?: string }>({});

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: files => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith('audio/')) { toast.error('Fichier audio requis'); return; }
      setAudioFile(file); setAudioPreview(URL.createObjectURL(file));
    }, accept: { 'audio/*': [] }, maxFiles: 1
  });

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps, isDragActive: isCoverDragActive } = useDropzone({
    onDrop: files => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { toast.error('Image invalide'); return; }
      setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
    }, accept: { 'image/*': [] }, maxFiles: 1
  });

  const resetState = () => {
    setAudioFile(null); setCoverFile(null); setAudioPreview(null); setCoverPreview(null); setTempPublicIds({});
  };

  const submit = async () => {
    if (!audioFile) { toast.error('Sélectionnez un audio'); return; }
    setUploading(true);
    try {
      const audioUp = await uploadToCloudinary(audioFile, 'video');
      setTempPublicIds(p => ({ ...p, audio: audioUp.public_id }));
      let coverUp: CloudinaryUpload | null = null;
      if (coverFile) { coverUp = await uploadToCloudinary(coverFile, 'image'); setTempPublicIds(p => ({ ...p, cover: coverUp!.public_id })); }

      const res = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioUp.secure_url,
          audioPublicId: audioUp.public_id,
          coverUrl: coverUp ? coverUp.secure_url : null,
          coverPublicId: coverUp ? coverUp.public_id : null,
          trackData: { title: 'Sans titre', artist: '', genre: [], tags: [], description: '', lyrics: '', isExplicit: false, isPublic: true, copyright: { owner: '', year: new Date().getFullYear(), rights: 'Tous droits réservés' } },
          duration: 0,
          audioBytes: audioFile.size,
          coverBytes: coverFile?.size || 0
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur sauvegarde');
      toast.success('Upload réussi');
      resetState();
      router.push('/');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur upload');
    } finally { setUploading(false); }
  };

  useEffect(() => {
    const cleanup = async () => {
      if (!tempPublicIds.audio && !tempPublicIds.cover) return;
      try { await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover }) }); } catch {}
    };
    const onBeforeUnload = () => {
      if (!tempPublicIds.audio && !tempPublicIds.cover) return;
      const payload = new Blob([JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover })], { type: 'application/json' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/upload/cleanup', payload);
    };
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { window.removeEventListener('pagehide', cleanup); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [tempPublicIds]);

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
      <div className="max-w-[1060px] mx-auto">
        <div className="rounded-2xl p-4 sm:p-6 backdrop-blur-lg border border-[var(--border)] bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-4">Uploader une piste</h1>
          <p className="text-white/60 mb-6">Style Suno: simple, net, verrerie légère.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className={`rounded-xl border border-white/10 p-6 bg-white/5 ${isAudioDragActive ? 'ring-1 ring-purple-400/40' : ''}`} {...getAudioRootProps()}>
                <input {...getAudioInputProps()} />
                <div className="flex items-center gap-3">
                  <Upload className="text-purple-300" />
                  <div>
                    <div className="text-white/90 font-medium">Fichier audio</div>
                    <div className="text-white/50 text-sm">Glissez-déposez ou cliquez pour choisir</div>
                  </div>
                </div>
                {audioFile && (
                  <div className="mt-3 text-sm text-white/80">{audioFile.name} · {(audioFile.size/1024/1024).toFixed(2)} MB</div>
                )}
              </div>

              <div className={`rounded-xl border border-white/10 p-6 bg-white/5 ${isCoverDragActive ? 'ring-1 ring-cyan-400/40' : ''}`} {...getCoverRootProps()}>
                <input {...getCoverInputProps()} />
                <div className="flex items-center gap-3">
                  <Image className="text-cyan-300" />
                  <div>
                    <div className="text-white/90 font-medium">Couverture (optionnel)</div>
                    <div className="text-white/50 text-sm">PNG/JPG/WebP · 800x800</div>
                  </div>
                </div>
                {coverFile && (
                  <div className="mt-3 text-sm text-white/80">{coverFile.name} · {(coverFile.size/1024/1024).toFixed(2)} MB</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                <div className="text-white/70 text-sm mb-2">Aperçu</div>
                <div className="aspect-video w-full rounded-lg bg-black/30 border border-white/10 flex items-center justify-center text-white/40">
                  {audioPreview ? 'Audio chargé' : 'Aucun fichier'}
                </div>
                <div className="mt-2 aspect-square w-40 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center text-white/40">
                  {coverPreview ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover rounded-lg" /> : 'Aucune image'}
                </div>
              </div>

              <div className="flex gap-2">
                <button disabled={uploading || !audioFile} onClick={submit} className="flex-1 rounded-xl px-4 py-3 text-white bg-gradient-to-r from-purple-500 to-cyan-400 disabled:opacity-50">Publier</button>
                <button disabled={uploading && !tempPublicIds.audio && !tempPublicIds.cover} onClick={async () => {
                  try { await fetch('/api/upload/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioPublicId: tempPublicIds.audio, coverPublicId: tempPublicIds.cover }) }); } catch {}
                  resetState();
                }} className="rounded-xl px-4 py-3 text-white bg-white/10 ring-1 ring-white/15">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
