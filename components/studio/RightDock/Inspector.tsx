'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Globe2, Heart, Loader2, Lock, Play, RefreshCw, Repeat2, Share2, Wand2 } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store';
import { getSelectedTrack } from '@/lib/studio/selectors';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import ABCompare from './ABCompare';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

function safeFilename(name: string) {
  return (name || 'synaura-track').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
}

export default function Inspector({
  onGenerateVariantFromTrack,
}: {
  onGenerateVariantFromTrack: (trackId: string) => void;
}) {
  const tracks = useStudioStore((s) => s.tracks);
  const selectedTrackId = useStudioStore((s) => s.selectedTrackId);
  const setAB = useStudioStore((s) => s.setAB);
  const loadTrackIntoForm = useStudioStore((s) => s.loadTrackIntoForm);
  const setTracks = useStudioStore((s) => s.setTracks);

  const t = getSelectedTrack(tracks, selectedTrackId);
  const { playTrack } = useAudioPlayer();

  const [tab, setTab] = useState<'details' | 'prompt' | 'lyrics' | 'ab'>('details');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const playerTrack = useMemo(() => {
    if (!t) return null;
    return {
      _id: `ai-${t.id}`,
      title: t.title,
      artist: { _id: 'ai', name: t.artistName, username: t.artistName },
      duration: t.durationSec || 120,
      audioUrl: t.audioUrl || '',
      coverUrl: t.coverUrl || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: [],
      lyrics: (t.lyrics || t.prompt || '').trim(),
    } as any;
  }, [t]);

  const updateLocalTrack = (trackId: string, patch: Record<string, unknown>) => {
    setTracks(tracks.map((track) => (track.id === trackId ? { ...track, ...patch } : track)));
  };

  const toggleFavorite = async () => {
    if (!t) return;
    const nextFavorite = !t.isFavorite;
    updateLocalTrack(t.id, { isFavorite: nextFavorite });
    try {
      setBusyAction('favorite');
      const res = await fetch(`/api/ai/tracks/${encodeURIComponent(t.id)}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: nextFavorite }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Impossible de mettre a jour le favori');
      updateLocalTrack(t.id, { isFavorite: Boolean(json?.is_favorite) });
    } catch (e: any) {
      updateLocalTrack(t.id, { isFavorite: !nextFavorite });
      notify.error('Favori', e?.message || 'Erreur favori');
    } finally {
      setBusyAction(null);
    }
  };

  const downloadTrack = async () => {
    if (!t?.audioUrl) {
      notify.error('Telechargement', 'Aucune URL audio exploitable.');
      return;
    }
    try {
      setBusyAction('download');
      const res = await fetch(t.audioUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename(t.title)}.mp3`;
      a.click();
      window.URL.revokeObjectURL(url);
      notify.success('Telechargement', 'Export audio lance.');
    } catch {
      window.open(t.audioUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setBusyAction(null);
    }
  };

  const shareTrack = async () => {
    if (!t) return;
    const url = `${window.location.origin}/studio?track=${encodeURIComponent(t.id)}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: t.title, text: 'Cree avec Synaura Studio', url });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success('Partage', 'Lien Studio copie.');
      }
    } catch {}
  };

  const toggleVisibility = async () => {
    if (!t) return;
    try {
      setBusyAction('publish');
      const nextPublic = !t.isPublic;
      const res = await fetch(`/api/ai/tracks/${encodeURIComponent(t.id)}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextPublic }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Impossible de changer la visibilite');
      updateLocalTrack(t.id, { isPublic: nextPublic });
      window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
      notify.success('Publication', nextPublic ? 'Piste publique.' : 'Piste repassee en prive.');
    } catch (e: any) {
      notify.error('Publication', e?.message || 'Erreur de publication');
    } finally {
      setBusyAction(null);
    }
  };

  const repairMedia = async () => {
    try {
      setBusyAction('repair');
      const res = await fetch('/api/suno/repair-tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 80 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Reparation impossible');
      window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
      notify.success('Medias', `${json?.updatedTracks || 0} piste(s) reparee(s).`);
    } catch (e: any) {
      notify.error('Medias', e?.message || 'Erreur reparation');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="panel-suno h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border-secondary">
        <div className="text-[11px] text-foreground-tertiary">RIGHT DOCK</div>
        <div className="text-sm font-semibold text-foreground-primary">Inspector</div>
      </div>

      {!t ? (
        <div className="p-4 text-sm text-foreground-tertiary">Sélectionne une track.</div>
      ) : (
        <>
          <div className="p-3 border-b border-border-secondary flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border border-border-secondary bg-white/5 overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.coverUrl || '/synaura_symbol.svg'} alt={t.title} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-foreground-primary truncate">{t.title}</div>
              <div className="text-[11px] text-foreground-tertiary truncate">{t.model}</div>
            </div>
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
              onClick={() => playerTrack && playTrack(playerTrack)}
              title="Play"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
              onClick={toggleFavorite}
              title="Favorite"
            >
              {busyAction === 'favorite' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 ${t.isFavorite ? 'fill-pink-400 text-pink-400' : ''}`} />
              )}
            </button>
          </div>

          <div className="px-3 pt-3 flex items-center gap-2">
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'details' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'prompt' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('prompt')}
            >
              Prompt
            </button>
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'lyrics' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('lyrics')}
            >
              Lyrics
            </button>
            <button
              type="button"
              className={`h-8 px-3 rounded-xl border text-xs transition ${
                tab === 'ab' ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setTab('ab')}
            >
              A/B
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {tab === 'details' ? (
              <div className="grid gap-3 text-sm">
                <div className="rounded-2xl border border-border-secondary bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-foreground-tertiary">Actions rapides</div>
                      <div className="text-sm font-semibold text-foreground-primary">
                        {t.isPublic ? 'Publiee sur Synaura' : 'Privee dans ton Studio'}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      t.isPublic ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-white/45'
                    }`}>
                      {t.isPublic ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {t.isPublic ? 'Public' : 'Prive'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="h-9 rounded-xl border border-border-secondary bg-white/5 px-3 text-xs font-semibold transition hover:bg-white/10 inline-flex items-center justify-center gap-2"
                      onClick={() => onGenerateVariantFromTrack(t.id)}
                    >
                      <Repeat2 className="w-4 h-4" />
                      Remix guide
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'publish'}
                      className="h-9 rounded-xl border border-border-secondary bg-white/5 px-3 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      onClick={toggleVisibility}
                    >
                      {busyAction === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : t.isPublic ? <Lock className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                      {t.isPublic ? 'Retirer' : 'Publier'}
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'download'}
                      className="h-9 rounded-xl border border-border-secondary bg-white/5 px-3 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      onClick={downloadTrack}
                    >
                      {busyAction === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Export
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-xl border border-border-secondary bg-white/5 px-3 text-xs font-semibold transition hover:bg-white/10 inline-flex items-center justify-center gap-2"
                      onClick={shareTrack}
                    >
                      <Share2 className="w-4 h-4" />
                      Partager
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'repair'}
                      className="col-span-2 h-9 rounded-xl border border-amber-200/20 bg-amber-200/[0.08] px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/[0.12] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      onClick={repairMedia}
                    >
                      {busyAction === 'repair' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Reparer les medias Suno
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border-secondary bg-white/5 p-3">
                    <div className="text-[11px] text-foreground-tertiary">Created</div>
                    <div className="text-foreground-secondary">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border border-border-secondary bg-white/5 p-3">
                    <div className="text-[11px] text-foreground-tertiary">Duration</div>
                    <div className="text-foreground-secondary">{t.durationSec ? `${t.durationSec}s` : '—'}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-border-secondary bg-white/5 p-3">
                  <div className="text-[11px] text-foreground-tertiary">Tags</div>
                  <div className="text-foreground-secondary">{(t.tags || []).join(', ') || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm flex items-center gap-2"
                    onClick={() => copyText(t.prompt || '')}
                  >
                    <Copy className="w-4 h-4" />
                    Copy prompt
                  </button>
                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm flex items-center gap-2"
                    onClick={() => {
                      loadTrackIntoForm(t.id);
                    }}
                  >
                    <Wand2 className="w-4 h-4" />
                    Load into form
                  </button>
                </div>
              </div>
            ) : null}

            {tab === 'prompt' ? (
              <div className="rounded-xl border border-border-secondary bg-white/5 p-3 text-sm whitespace-pre-wrap">
                {t.prompt || '—'}
              </div>
            ) : null}

            {tab === 'lyrics' ? (
              <div className="rounded-xl border border-border-secondary bg-white/5 p-3 text-sm whitespace-pre-wrap">
                {t.lyrics || '—'}
              </div>
            ) : null}

            {tab === 'ab' ? (
              <div className="grid gap-3">
                <div className="rounded-xl border border-border-secondary bg-white/5 p-3 text-sm">
                  <div className="text-[11px] text-foreground-tertiary mb-2">Pick A/B</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm"
                      onClick={() => setAB(t.id, null)}
                    >
                      Set as A
                    </button>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm"
                      onClick={() => setAB(null, t.id)}
                    >
                      Set as B
                    </button>
                  </div>
                </div>
                <ABCompare onGenerateVariantFromTrack={onGenerateVariantFromTrack} />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

