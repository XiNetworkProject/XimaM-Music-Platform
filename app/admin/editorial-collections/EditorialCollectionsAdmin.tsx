'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Database, Eye, EyeOff, ImageIcon, Library, Loader2, Music2, Plus, RefreshCw, Save, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

type Collection = {
  id: string;
  playlistId: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  kind: string;
  bannerUrl: string | null;
  coverUrl: string | null;
  themeColors: string[];
  badge: string;
  isFeatured: boolean;
  isPublished: boolean;
  downloadEnabled: boolean;
  commentsEnabled: boolean;
  position?: number;
  trackCount?: number;
  legacy?: boolean;
};

type BatchRow = {
  filename?: string;
  title?: string;
  genre?: string;
  style?: string;
  tags?: string;
};

type AdminTrack = {
  _id: string;
  title: string;
  artist?: { name?: string; username?: string };
  coverUrl?: string | null;
  duration?: number;
  genre?: string[];
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function safeTitleFromFile(file: File) {
  return file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseCsv(text: string): BatchRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const hasHeader = /filename|fichier|title|titre/i.test(lines[0]);
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows.map((line) => {
    const [filename, title, genre, style, tags] = line.split(',').map((cell) => cell?.trim() || '');
    return { filename, title, genre, style, tags };
  });
}

function matchRow(file: File, rows: BatchRow[], index: number) {
  const normalized = file.name.toLowerCase();
  return rows.find((row) => row.filename && normalized.includes(row.filename.toLowerCase())) || rows[index] || null;
}

async function uploadToCloudinary(file: File, resourceType: 'video' | 'image', folder: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${resourceType === 'video' ? 'collection_track' : 'collection_asset'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sigRes = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp, publicId, resourceType, folder }),
  });
  if (!sigRes.ok) throw new Error('Signature Cloudinary impossible');
  const { signature, apiKey, cloudName } = await sigRes.json();

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('resource_type', resourceType);
  form.append('timestamp', String(timestamp));
  form.append('api_key', apiKey);
  form.append('signature', signature);

  const upload = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!upload.ok) throw new Error(`Upload Cloudinary echoue: ${file.name}`);
  return upload.json();
}

async function getAudioDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration || 0);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? Math.round(duration) : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

export default function EditorialCollectionsAdmin() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [needsMigration, setNeedsMigration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');

  const [title, setTitle] = useState('Synaura Originals');
  const [slug, setSlug] = useState('synaura-originals');
  const [subtitle, setSubtitle] = useState('Une selection officielle de sons originaux');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('Synaura Originals');
  const [kind, setKind] = useState('originals');
  const [colors, setColors] = useState('#8B5CF6,#EC4899,#22D3EE');
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(true);
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [csvText, setCsvText] = useState('filename,title,genre,style,tags\n');
  const [defaultGenre, setDefaultGenre] = useState('Synaura Originals');
  const [existingTrackIds, setExistingTrackIds] = useState('');
  const [edit, setEdit] = useState({
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    badge: '',
    kind: '',
    colors: '',
    position: '0',
  });
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [deletePhysical, setDeletePhysical] = useState(false);

  const selected = useMemo(() => collections.find((collection) => collection.id === selectedId) || null, [collections, selectedId]);

  const loadTracks = useCallback(async (collectionId = selectedId) => {
    if (!collectionId) {
      setTracks([]);
      return;
    }
    setTracksLoading(true);
    try {
      const res = await fetch(`/api/admin/editorial-collections/${collectionId}/tracks`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Chargement des titres impossible');
      setTracks(Array.isArray(json.tracks) ? json.tracks : []);
    } catch (error: any) {
      notify.error('Titres', error.message || 'Erreur');
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }, [selectedId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/editorial-collections', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Chargement impossible');
      setCollections(json.collections || []);
      setNeedsMigration(Boolean(json.needsMigration));
      if (!selectedId && json.collections?.[0]?.id) setSelectedId(json.collections[0].id);
    } catch (error: any) {
      notify.error('Collections', error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setTracks([]);
      return;
    }
    setEdit({
      title: selected.title || '',
      slug: selected.slug || '',
      subtitle: selected.subtitle || '',
      description: selected.description || '',
      badge: selected.badge || '',
      kind: selected.kind || '',
      colors: (selected.themeColors || []).join(','),
      position: String(selected.position || 0),
    });
    setEditBannerFile(null);
    setEditCoverFile(null);
    void loadTracks(selected.id);
  }, [selected?.id, loadTracks]);

  const runMigration = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/editorial-collections/migrate', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Migration impossible');
      notify.success('Migration appliquee');
      await load();
    } catch (error: any) {
      notify.error('Migration', error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const createCollection = async () => {
    setSaving(true);
    try {
      let bannerUrl: string | null = null;
      let coverUrl: string | null = null;
      if (bannerFile) {
        setProgress('Upload de la banniere...');
        const uploaded = await uploadToCloudinary(bannerFile, 'image', 'ximam/editorial-banners');
        bannerUrl = uploaded.secure_url;
      }
      if (coverFile) {
        setProgress('Upload de la cover...');
        const uploaded = await uploadToCloudinary(coverFile, 'image', 'ximam/editorial-covers');
        coverUrl = uploaded.secure_url;
      }

      const res = await fetch('/api/admin/editorial-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          subtitle,
          description,
          kind,
          badge,
          bannerUrl,
          coverUrl,
          themeColors: colors.split(',').map((entry) => entry.trim()).filter(Boolean),
          isPublished,
          isFeatured,
          downloadEnabled,
          commentsEnabled,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Creation impossible');
      notify.success('Collection creee', json.collection?.title);
      setSelectedId(json.collection.id);
      await load();
    } catch (error: any) {
      notify.error('Creation', error.message || 'Erreur');
    } finally {
      setProgress('');
      setSaving(false);
    }
  };

  const updateSelected = async (patch: Partial<Collection>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/editorial-collections/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Mise a jour impossible');
      notify.success('Collection mise a jour');
      await load();
    } catch (error: any) {
      notify.error('Mise a jour', error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const saveSelected = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      let bannerUrl = selected.bannerUrl;
      let coverUrl = selected.coverUrl;
      if (editBannerFile) {
        setProgress('Upload nouvelle banniere...');
        const uploaded = await uploadToCloudinary(editBannerFile, 'image', 'ximam/editorial-banners');
        bannerUrl = uploaded.secure_url;
      }
      if (editCoverFile) {
        setProgress('Upload nouvelle cover...');
        const uploaded = await uploadToCloudinary(editCoverFile, 'image', 'ximam/editorial-covers');
        coverUrl = uploaded.secure_url;
      }

      const res = await fetch(`/api/admin/editorial-collections/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: edit.title,
          slug: edit.slug,
          subtitle: edit.subtitle,
          description: edit.description,
          badge: edit.badge,
          kind: edit.kind,
          bannerUrl,
          coverUrl,
          themeColors: edit.colors.split(',').map((entry) => entry.trim()).filter(Boolean),
          position: Number(edit.position || 0),
          isPublished: selected.isPublished,
          isFeatured: selected.isFeatured,
          downloadEnabled: selected.downloadEnabled,
          commentsEnabled: selected.commentsEnabled,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Sauvegarde impossible');
      notify.success('Collection sauvegardee');
      setEditBannerFile(null);
      setEditCoverFile(null);
      await load();
    } catch (error: any) {
      notify.error('Sauvegarde', error.message || 'Erreur');
    } finally {
      setProgress('');
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    if (!window.confirm(`Supprimer "${selected.title}" et sa playlist ?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/editorial-collections/${selected.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Suppression impossible');
      notify.success('Collection supprimee');
      setSelectedId('');
      setTracks([]);
      await load();
    } catch (error: any) {
      notify.error('Suppression', error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    if (!selected) return;
    if (deletePhysical && !window.confirm('Supprimer aussi le titre de Synaura ?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/editorial-collections/${selected.id}/tracks?trackId=${encodeURIComponent(trackId)}${deletePhysical ? '&deleteTrack=1' : ''}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Retrait impossible');
      notify.success(deletePhysical ? 'Titre supprime' : 'Titre retire');
      await Promise.all([load(), loadTracks(selected.id)]);
    } catch (error: any) {
      notify.error('Titre', error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const copySelectedLink = async () => {
    if (!selected) return;
    const url = `${window.location.origin}/playlists/${selected.slug || selected.playlistId}`;
    await navigator.clipboard.writeText(url);
    notify.success('Lien copie', url);
  };

  const importBatch = async () => {
    if (!selected) {
      notify.error('Import', 'Choisis une collection');
      return;
    }
    const ids = existingTrackIds.split(/[\s,;]+/).map((entry) => entry.trim()).filter(Boolean);
    if (!audioFiles.length && !ids.length) {
      notify.error('Import', 'Ajoute des fichiers audio ou des IDs de tracks');
      return;
    }

    setImporting(true);
    try {
      let sharedCoverUrl = selected.coverUrl || selected.bannerUrl || null;
      let sharedCoverPublicId: string | null = null;
      if (coverFile) {
        setProgress('Upload cover commune...');
        const cover = await uploadToCloudinary(coverFile, 'image', 'ximam/editorial-covers');
        sharedCoverUrl = cover.secure_url;
        sharedCoverPublicId = cover.public_id;
      }

      const rows = parseCsv(csvText);
      const items = [];
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const row = matchRow(file, rows, i);
        setProgress(`Upload ${i + 1}/${audioFiles.length} - ${file.name}`);
        const [audio, duration] = await Promise.all([
          uploadToCloudinary(file, 'video', 'ximam/editorial-audio'),
          getAudioDuration(file),
        ]);
        items.push({
          title: row?.title || safeTitleFromFile(file),
          description: selected.description,
          audioUrl: audio.secure_url,
          audioPublicId: audio.public_id,
          coverUrl: sharedCoverUrl,
          coverPublicId: sharedCoverPublicId,
          duration,
          audioBytes: file.size,
          genre: row?.genre || defaultGenre,
          style: row?.style || row?.genre || defaultGenre,
          tags: row?.tags || defaultGenre,
        });
      }

      setProgress('Sauvegarde dans Synaura...');
      const res = await fetch(`/api/admin/editorial-collections/${selected.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, existingTrackIds: ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Import impossible');
      const errorText = json.errors?.length ? `, ${json.errors.length} erreur(s)` : '';
      notify.success('Import termine', `${json.created || 0} cree(s), ${json.linked || 0} lie(s)${errorText}`);
      setAudioFiles([]);
      setExistingTrackIds('');
      await load();
    } catch (error: any) {
      notify.error('Import', error.message || 'Erreur');
    } finally {
      setProgress('');
      setImporting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-[#F4EFE6] p-4 text-[#171313] md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8B5CF6]">
            Collections editoriales
          </p>
          <h1 className="text-3xl font-black tracking-tight">Synaura Originals et playlists officielles</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-black/55">
            Cree des collections reutilisables, importe des lots de sons, publie une page premium et garde les titres connectes aux likes, commentaires, partage et telechargement.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-black shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {needsMigration ? (
        <div className="mb-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Database className="h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <p className="font-black text-amber-950">Table editorial_collections manquante</p>
              <p className="text-sm font-semibold text-amber-800">Le mode legacy fonctionne quand meme. La migration reste recommandee pour les slugs propres.</p>
            </div>
            <button onClick={runMigration} disabled={saving} className="rounded-full bg-[#171313] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {saving ? 'Migration...' : 'Appliquer'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-[1.7rem] border border-black/[0.08] bg-[#fffaf2]/92 p-4 shadow-[0_18px_60px_rgba(30,25,20,0.10)]">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#8B5CF6]" />
            <h2 className="text-lg font-black">Nouvelle collection</h2>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Titre<input value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Slug<input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Sous-titre<input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Badge<input value={badge} onChange={(e) => setBadge(e.target.value)} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Type<input value={kind} onChange={(e) => setKind(e.target.value)} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
            </div>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Couleurs<input value={colors} onChange={(e) => setColors(e.target.value)} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <FileInput label="Banniere" icon={<ImageIcon className="h-4 w-4" />} file={bannerFile} onFile={setBannerFile} />
              <FileInput label="Cover" icon={<Library className="h-4 w-4" />} file={coverFile} onFile={setCoverFile} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Publiee" checked={isPublished} onChange={setIsPublished} />
              <Toggle label="Mise en avant" checked={isFeatured} onChange={setIsFeatured} />
              <Toggle label="Telechargement" checked={downloadEnabled} onChange={setDownloadEnabled} />
              <Toggle label="Commentaires" checked={commentsEnabled} onChange={setCommentsEnabled} />
            </div>
            <button
              type="button"
              onClick={createCollection}
              disabled={saving}
              className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-[#fffaf2] transition hover:scale-[1.01] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Creer la collection
            </button>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-black/[0.08] bg-[#fffaf2]/92 p-4 shadow-[0_18px_60px_rgba(30,25,20,0.10)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-[#EC4899]" />
              <h2 className="text-lg font-black">Import batch admin</h2>
            </div>
            {selected ? (
              <a href={`/playlists/${selected.slug}`} target="_blank" className="rounded-full bg-black/[0.06] px-3 py-2 text-xs font-black text-black/60" rel="noreferrer">
                Voir la page
              </a>
            ) : null}
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">
              Collection cible
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]">
                <option value="">Choisir...</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.title} ({collection.trackCount || 0})</option>
                ))}
              </select>
            </label>

            {selected ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[1.4rem] border border-black/10 bg-white">
                <div
                  className="relative min-h-[150px] p-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${selected.themeColors?.[0] || '#8B5CF6'}, ${selected.themeColors?.[1] || '#EC4899'}, ${selected.themeColors?.[2] || '#22D3EE'})` }}
                >
                  {selected.bannerUrl ? <img src={selected.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
                  <div className="relative">
                    <p className="mb-2 inline-flex rounded-full bg-white/18 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">{selected.badge}</p>
                    <h3 className="max-w-lg text-3xl font-black">{selected.title}</h3>
                    <p className="mt-1 max-w-xl text-sm font-bold text-white/82">{selected.subtitle || selected.description}</p>
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-white/70">{selected.trackCount || 0} titres · /playlists/{selected.slug}</p>
                  </div>
                </div>
                <div className="grid gap-2 p-3 sm:grid-cols-4">
                  <button onClick={() => updateSelected({ isPublished: !selected.isPublished } as any)} className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-3 py-2 text-xs font-black text-white">
                    {selected.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {selected.isPublished ? 'Depublier' : 'Publier'}
                  </button>
                  <button onClick={() => updateSelected({ isFeatured: !selected.isFeatured } as any)} className="rounded-full bg-black/[0.06] px-3 py-2 text-xs font-black text-black/62">{selected.isFeatured ? 'Retirer feature' : 'Feature'}</button>
                  <button onClick={() => updateSelected({ downloadEnabled: !selected.downloadEnabled } as any)} className="rounded-full bg-black/[0.06] px-3 py-2 text-xs font-black text-black/62">{selected.downloadEnabled ? 'Download ON' : 'Download OFF'}</button>
                  <button onClick={() => updateSelected({ commentsEnabled: !selected.commentsEnabled } as any)} className="rounded-full bg-black/[0.06] px-3 py-2 text-xs font-black text-black/62">{selected.commentsEnabled ? 'Coms ON' : 'Coms OFF'}</button>
                </div>

                <div className="border-t border-black/10 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-black/38">Gestion complete</p>
                      <p className="text-sm font-black text-[#171313]">Modifier, masquer, remplacer les medias, gerer les titres</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={copySelectedLink} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06] text-black/58">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={saveSelected} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white disabled:opacity-50">
                        <Save className="h-4 w-4" />
                        Sauver
                      </button>
                      <button type="button" onClick={deleteSelected} disabled={saving} className="grid h-10 w-10 place-items-center rounded-full bg-red-500/10 text-red-500 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Titre<input value={edit.title} onChange={(e) => setEdit((v) => ({ ...v, title: e.target.value }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Slug<input value={edit.slug} onChange={(e) => setEdit((v) => ({ ...v, slug: slugify(e.target.value) }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Sous-titre<input value={edit.subtitle} onChange={(e) => setEdit((v) => ({ ...v, subtitle: e.target.value }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Badge<input value={edit.badge} onChange={(e) => setEdit((v) => ({ ...v, badge: e.target.value }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Type<input value={edit.kind} onChange={(e) => setEdit((v) => ({ ...v, kind: e.target.value }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Position<input value={edit.position} onChange={(e) => setEdit((v) => ({ ...v, position: e.target.value.replace(/[^0-9-]/g, '') }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="md:col-span-2 grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Couleurs<input value={edit.colors} onChange={(e) => setEdit((v) => ({ ...v, colors: e.target.value }))} className="h-11 rounded-2xl border border-black/10 bg-[#fffaf2] px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <label className="md:col-span-2 grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Description<textarea value={edit.description} onChange={(e) => setEdit((v) => ({ ...v, description: e.target.value }))} rows={3} className="rounded-2xl border border-black/10 bg-[#fffaf2] px-3 py-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
                    <FileInput label="Remplacer banniere" icon={<ImageIcon className="h-4 w-4" />} file={editBannerFile} onFile={setEditBannerFile} />
                    <FileInput label="Remplacer cover" icon={<Library className="h-4 w-4" />} file={editCoverFile} onFile={setEditCoverFile} />
                  </div>

                  <div className="mt-4 rounded-[1.25rem] border border-black/10 bg-[#fffaf2] p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-black/38">Titres</p>
                        <p className="text-sm font-black">{tracks.length} dans la collection</p>
                      </div>
                      <button type="button" onClick={() => setDeletePhysical((v) => !v)} className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-black ${deletePhysical ? 'bg-red-500 text-white' : 'bg-black/[0.06] text-black/58'}`}>
                        {deletePhysical ? <XCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        {deletePhysical ? 'Suppression definitive' : 'Retirer seulement'}
                      </button>
                    </div>
                    <div className="grid max-h-[360px] gap-2 overflow-auto pr-1">
                      {tracksLoading ? <div className="rounded-2xl bg-white p-3 text-sm font-bold text-black/45">Chargement des titres...</div> : null}
                      {!tracksLoading && !tracks.length ? <div className="rounded-2xl bg-white p-3 text-sm font-bold text-black/45">Aucun titre dans cette collection.</div> : null}
                      {tracks.map((track, index) => (
                        <div key={track._id} className="flex items-center gap-3 rounded-2xl bg-white p-2">
                          <span className="w-6 text-right text-xs font-black text-black/28">{index + 1}</span>
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/[0.06]">
                            {track.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black">{track.title}</p>
                            <p className="truncate text-xs font-bold text-black/42">{track.artist?.name || track.artist?.username || 'Synaura'} {track.genre?.[0] ? `- ${track.genre[0]}` : ''}</p>
                          </div>
                          <button type="button" onClick={() => removeTrack(track._id)} disabled={saving} className="grid h-9 w-9 place-items-center rounded-full bg-red-500/10 text-red-500 disabled:opacity-40">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : loading ? (
              <div className="rounded-2xl bg-white p-4 text-sm font-bold text-black/50">Chargement...</div>
            ) : null}

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">
              Fichiers audio
              <input multiple type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" onChange={(e) => setAudioFiles(Array.from(e.target.files || []))} className="rounded-2xl border border-dashed border-black/16 bg-white px-3 py-4 text-sm normal-case tracking-normal text-black/60" />
            </label>
            {audioFiles.length ? <p className="text-xs font-black text-[#8B5CF6]">{audioFiles.length} fichier(s) pret(s) a importer</p> : null}

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">
              Mapping CSV optionnel
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={5} className="rounded-2xl border border-black/10 bg-white px-3 py-3 font-mono text-xs normal-case tracking-normal text-[#171313]" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">Genre par defaut<input value={defaultGenre} onChange={(e) => setDefaultGenre(e.target.value)} className="h-12 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-[#171313]" /></label>
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">IDs tracks existants<textarea value={existingTrackIds} onChange={(e) => setExistingTrackIds(e.target.value)} rows={2} className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs normal-case tracking-normal text-[#171313]" /></label>
            </div>

            {progress ? (
              <div className="flex items-center gap-2 rounded-2xl bg-black/[0.05] px-3 py-2 text-sm font-black text-black/62">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress}
              </div>
            ) : null}

            <button
              type="button"
              onClick={importBatch}
              disabled={importing || !selected}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-[#fffaf2] transition hover:scale-[1.01] disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
              Importer dans la collection
            </button>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {collections.map((collection) => (
          <div key={collection.id} className="flex items-center gap-3 rounded-[1.35rem] border border-black/[0.08] bg-[#fffaf2]/90 p-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-black/[0.06]">
              {collection.coverUrl || collection.bannerUrl ? <img src={collection.coverUrl || collection.bannerUrl || ''} alt="" className="h-full w-full object-cover" /> : <Library className="h-5 w-5 text-black/45" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{collection.title}</p>
              <p className="truncate text-xs font-bold text-black/45">/{collection.slug} · {collection.trackCount || 0} titres</p>
            </div>
            {collection.isPublished ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <span className="rounded-full bg-black/[0.06] px-2 py-1 text-[10px] font-black uppercase text-black/45">draft</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FileInput({ label, icon, file, onFile }: { label: string; icon: ReactNode; file: File | null; onFile: (file: File | null) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">
      {label}
      <span className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 text-sm normal-case tracking-normal text-black/60">
        {icon}
        <span className="truncate">{file?.name || 'Choisir un fichier'}</span>
      </span>
      <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] || null)} className="hidden" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex h-11 items-center justify-between rounded-2xl border border-black/10 bg-white px-3 text-left text-xs font-black text-black/62">
      {label}
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? 'bg-[#8B5CF6]' : 'bg-black/14'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  );
}
