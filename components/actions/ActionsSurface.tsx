'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Check, ListMusic, Play, Trash2 } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';
import { useContextSurfaceController, type ContextSurfaceRendererProps } from '@/components/context-surfaces/ContextSurfaceController';
import { SynauraOverlayDescription, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import { useActionTrack, useActionDownloadPermission, useOrganizationViewer, useOwnedPlaylists, organizationRequest, playlistKey, notifyOrganizationChange } from '@/lib/organizationClient';
import { normalizeActionTrack, canPlaylistTrack, trackHref, trackShareUrl, trackHandoffHref, copyTrackLink, remainingQueueStart, type ActionTrack, type TrackSurface } from '@/lib/trackActions';
import { canUseSoundClientSide } from '@/lib/clipPermissions';
import { downloadAudioFile, generateFilename } from '@/hooks/useDownloadPermission';
import { useTrackActions } from './useTrackActions';
import FavoriteAction from './FavoriteAction';

const button = 'syn-interactive min-h-11 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--syn-soft)] disabled:opacity-45';
const primary = `${button} bg-[var(--syn-accent)] text-white`;
const time = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const titles: Record<string, string> = { 'track-options': 'Options du morceau', 'playlist-picker': 'Ajouter à une playlist', queue: 'File d’attente', lyrics: 'Paroles', 'track-details': 'À propos du morceau', 'track-share': 'Partager', 'track-remix': 'Créer une variation', 'track-clip': 'Créer un clip' };

export default function ActionsSurface(props: ContextSurfaceRendererProps) {
  return <ActionContent key={`${props.entry.surface}:${props.entry.entityId || ''}`} {...props} />;
}
function ActionContent({ entry, closeSurface }: ContextSurfaceRendererProps) {
  const viewer = useOrganizationViewer();
  const client = useQueryClient();
  const trackState = useActionTrack(entry.entityId || '', entry.surface !== 'queue');
  const summary = client.getQueryData<ActionTrack>(['organization-summary', viewer, entry.entityId || '']);
  const track = trackState.data || summary || normalizeActionTrack({ id: entry.entityId });
  const router = useRouter();
  const controller = useContextSurfaceController();
  const actions = useTrackActions(entry.origin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const root = useRef<HTMLElement>(null);
  const focus = useRef<HTMLElement>(null);
  const navigating = useRef(false);
  const { data: canDownload } = useActionDownloadPermission(entry.surface === 'track-options');
  const { addToUpNext } = useAudioPlayer();
  useEffect(() => { focus.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => root.current?.style.setProperty('--organization-keyboard', `${Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))}px`);
    update(); viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); };
  }, []);
  const run = async (work: () => Promise<unknown>) => { if (busy) return; setBusy(true); setError(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); } finally { setBusy(false); } };
  const open = (surface: TrackSurface) => actions.open(track, surface);
  const navigate = (href: string) => {
    if (navigating.current) return; navigating.current = true;
    let done = false;
    const finish = () => { if (done) return; done = true; window.removeEventListener('popstate', finish); router.push(href, { scroll: false }); };
    // Close the transient stack first; native Back then returns to the Live anchor,
    // not to a stale option/confirmation entry. 4B.1 saved it on route intent.
    window.addEventListener('popstate', finish, { once: true });
    if (controller.depth) window.history.go(-controller.depth); else finish();
    window.setTimeout(finish, 500);
  };
  const owner = viewer !== 'public' && viewer === track.artist._id;
  const clipAllowed = Boolean(trackState.data && viewer !== 'public' && canUseSoundClientSide({ isOwner: owner, allowClips: Boolean(track.allowClips), remixVisibility: track.remixVisibility || 'disabled' }));
  const remixAllowed = Boolean(trackState.data && viewer !== 'public' && track.canRemixAiVariation && track.allowAiVariation && track.remixVisibility !== 'disabled');
  const downloadAllowed = Boolean(trackState.data && canDownload && track.audioUrl && (track.isPublic === true || owner));
  const ready = entry.surface === 'queue' || Boolean(trackState.data);
  const menuRows = [
    ...(canPlaylistTrack(track._id) ? [{ id: 'playlist-picker', label: 'Ajouter à une playlist', action: () => open('playlist-picker') }] : []),
    { id: 'queue-next', label: 'Lire ensuite', action: () => void run(async () => { addToUpNext(track as any, 'next'); setFeedback('Ce morceau sera lu ensuite.'); }) },
    { id: 'queue-end', label: 'Ajouter à la file', action: () => void run(async () => { addToUpNext(track as any, 'end'); setFeedback('Ajouté en fin de file.'); }) },
    { id: 'queue', label: 'Voir la file', action: () => open('queue') },
    { id: 'lyrics', label: 'Paroles', action: () => open('lyrics') },
    { id: 'share', label: 'Partager', action: () => void actions.share(track) },
    { id: 'track-details', label: 'Informations du morceau', action: () => open('track-details') },
    ...(remixAllowed ? [{ id: 'track-remix', label: 'Remixer / créer une variation', action: () => open('track-remix') }] : []),
    ...(clipAllowed ? [{ id: 'track-clip', label: 'Créer un clip', action: () => open('track-clip') }] : []),
    ...(downloadAllowed ? [{ id: 'download', label: 'Télécharger', action: () => void run(async () => { await downloadAudioFile(track.audioUrl, generateFilename(track.title, track.artist.name)); setFeedback('Téléchargement terminé.'); }) }] : []),
  ];
  return <section ref={root} data-organization-surface={entry.surface} data-organization-track={entry.entityId || ''} data-organization-state={ready ? 'loaded' : trackState.isError ? 'error' : 'loading'} className={`organization-surface flex flex-col ${entry.surface === 'track-options' || entry.surface === 'track-share' ? 'organization-compact' : ''}`}>
    <header ref={focus} tabIndex={-1} data-context-surface-initial-focus className="shrink-0 px-5 pb-4 pt-14 outline-none">
      <SynauraOverlayTitle>{titles[entry.surface]}</SynauraOverlayTitle>
      <SynauraOverlayDescription className="mt-2 break-words text-sm">{entry.surface === 'queue' ? 'La file du lecteur, sans interrompre le morceau.' : `${track.title} · ${track.artist.name}`}</SynauraOverlayDescription>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
      {!ready && !trackState.isError && <p role="status" className="py-5">Chargement…</p>}
      {trackState.isError && entry.surface !== 'queue' && <div role="alert"><p>{trackState.error.message}</p><button className={button} onClick={() => void trackState.refetch()}>Réessayer</button></div>}
      {ready && entry.surface === 'track-options' && <>
        <FavoriteAction track={track} label className="mb-3 w-full border border-[var(--syn-border)]" />
        <div role="menu" aria-label="Actions du morceau" onKeyDown={e => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
          const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
          items.forEach((item, i) => { item.tabIndex = i === next ? 0 : -1; }); items[next]?.focus();
        }}>{menuRows.map((row, i) => <button key={row.id} role="menuitem" tabIndex={i ? -1 : 0} type="button" data-track-action={row.id} className={`${button} block w-full text-left`} disabled={busy || ((row.id === 'queue-next' || row.id === 'queue-end') && (!track.audioUrl || getBrowserAudioCore()?.getSnapshot().currentTrack?._id === track._id))} onClick={row.action}>{row.label}</button>)}</div>
      </>}
      {ready && entry.surface === 'playlist-picker' && <PlaylistPicker track={track} />}
      {entry.surface === 'queue' && <QueueContent />}
      {ready && entry.surface === 'lyrics' && <div data-track-lyrics className="whitespace-pre-wrap break-words text-base leading-8">{track.lyrics?.trim() || 'Aucune parole disponible pour ce morceau.'}</div>}
      {ready && entry.surface === 'track-details' && <dl className="space-y-4 break-words text-sm">
        {[['Artiste', track.artist.name], ['Durée', track.duration > 0 ? time(track.duration) : null], ['Date', track.createdAt && Number.isFinite(Date.parse(track.createdAt)) ? new Date(track.createdAt).toLocaleDateString('fr-FR') : null], ['Genre', track.genre.join(', ')], ['Album', track.album], ['Variations publiées', track.variationsCount ? String(track.variationsCount) : null], ['Inspiré de', track.remixAttribution?.title ? `${track.remixAttribution.title}${track.remixAttribution.artist ? ' · ' + track.remixAttribution.artist : ''}` : null]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--syn-text-secondary)]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
      </dl>}
      {ready && entry.surface === 'track-share' && <div className="space-y-4"><label className="block text-xs">Lien du morceau<input readOnly aria-label="Lien partageable du morceau" value={trackShareUrl(track._id)} onFocus={e => e.target.select()} className="syn-interactive mt-2 min-h-11 w-full rounded-xl border border-[var(--syn-border)] bg-[var(--syn-soft)] p-3 text-sm" /></label><button className={`${primary} w-full`} disabled={busy} onClick={() => void run(async () => { await copyTrackLink(track._id, navigator.clipboard); setFeedback('Lien copié.'); })}>Copier le lien</button><p className="text-xs text-[var(--syn-text-secondary)]">Le lien ouvre le morceau complet, sans URL média brute.</p></div>}
      {ready && (entry.surface === 'track-remix' || entry.surface === 'track-clip') && <div className="space-y-5 text-sm leading-6"><p>{entry.surface === 'track-remix' ? 'Le workspace de création s’ouvrira avec ce morceau comme source. Rien ne sera généré avant ton action dans le Studio.' : 'La création du clip se poursuit dans son espace dédié avec ce morceau comme source.'}</p><p>Ton contexte Live reste disponible au retour.</p><button data-live-route-intent type="button" className={`${primary} w-full`} disabled={entry.surface === 'track-remix' ? !remixAllowed : !clipAllowed} onClick={() => navigate(trackHandoffHref(track, entry.surface === 'track-remix' ? 'remix' : 'clip', entry.returnSnapshotId))}>{entry.surface === 'track-remix' ? 'Ouvrir le Studio' : 'Ouvrir la création de clip'}</button><button className={`${button} w-full`} onClick={closeSurface}>Annuler</button></div>}
      {feedback && <p role="status" className="mt-4 text-sm text-[var(--syn-accent)]">{feedback}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
    {entry.surface === 'track-details' && <footer className="shrink-0 border-t border-[var(--syn-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button data-live-route-intent className={`${button} w-full`} onClick={() => navigate(trackHref(track._id))}>Ouvrir le morceau</button></footer>}
  </section>;
}

function PlaylistPicker({ track }: { track: ActionTrack }) {
  const viewer = useOrganizationViewer(); const client = useQueryClient(); const playlists = useOwnedPlaylists();
  const [search, setSearch] = useState(''); const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const refresh = () => { void client.invalidateQueries({ queryKey: playlistKey(viewer) }); notifyOrganizationChange('playlists'); };
  const change = async (playlist: any) => {
    if (busy) return; setBusy(true); setError('');
    const exists = playlist.tracks.some((t: any) => t._id === track._id);
    try {
      await organizationRequest(`/api/playlists/${encodeURIComponent(playlist._id)}/tracks${exists ? '?trackId=' + encodeURIComponent(track._id) : ''}`, { method: exists ? 'DELETE' : 'POST', ...(!exists ? { body: JSON.stringify({ trackId: track._id }) } : {}) });
      client.setQueryData<any[]>(playlistKey(viewer), old => old?.map(p => p._id === playlist._id ? { ...p, tracks: exists ? p.tracks.filter((t: any) => t._id !== track._id) : [...p.tracks, track], trackCount: Math.max(0, p.trackCount + (exists ? -1 : 1)) } : p));
      setMessage(exists ? `Retiré de « ${playlist.name} ».` : `Ajouté à « ${playlist.name} ».`); refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); refresh(); } finally { setBusy(false); }
  };
  const create = async () => {
    if (busy || !name.trim()) return; setBusy(true); setError('');
    try { const created = await organizationRequest('/api/playlists', { method: 'POST', body: JSON.stringify({ name: name.trim(), isPublic: false }) });
      client.setQueryData<any[]>(playlistKey(viewer), old => [created, ...(old || [])]); setName('');
      setMessage(`Playlist privée « ${created.name} » créée. Sélectionne-la pour ajouter ce morceau.`); refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Création impossible'); } finally { setBusy(false); }
  };
  if (viewer === 'public') return <p>Connecte-toi pour gérer tes playlists.</p>;
  return <div className="space-y-4"><p className="text-xs text-[var(--syn-text-secondary)]">Tes playlists organisent plusieurs morceaux. Les favoris restent indépendants.</p>
    <label className="block text-xs">Rechercher une playlist<input value={search} onChange={e => setSearch(e.target.value)} type="search" className="syn-interactive mt-2 min-h-11 w-full rounded-xl border border-[var(--syn-border)] bg-[var(--syn-soft)] p-3 text-base" /></label>
    {playlists.isPending && <p role="status">Chargement des playlists…</p>}
    {playlists.isError && <p role="alert">{playlists.error.message}<button className={button} onClick={() => void playlists.refetch()}>Réessayer</button></p>}
    <div className="space-y-2">{(playlists.data || []).filter(p => String(p.name).toLocaleLowerCase('fr-FR').includes(search.toLocaleLowerCase('fr-FR'))).map(p => {
      const exists = p.tracks.some((t: any) => t._id === track._id);
      return <button type="button" key={p._id} data-playlist-id={p._id} aria-pressed={exists} disabled={busy} onClick={() => void change(p)} className={`${button} flex w-full items-center gap-3 border border-[var(--syn-border)] text-left`}><ListMusic className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><span className="block break-words">{p.name}</span><span className="block text-xs text-[var(--syn-text-secondary)]">{exists ? 'Déjà présent · retirer' : 'Ajouter le morceau'}</span></span>{exists && <Check className="h-5 w-5 shrink-0 text-[var(--syn-accent)]" />}</button>;
    })}</div>
    {!playlists.isPending && !playlists.isError && !playlists.data?.length && <p className="text-sm">Aucune playlist pour le moment.</p>}
    <form className="space-y-2 border-t border-[var(--syn-border)] pt-4" onSubmit={e => { e.preventDefault(); void create(); }}><label className="block text-xs">Nouvelle playlist privée<input value={name} maxLength={100} onChange={e => setName(e.target.value)} className="syn-interactive mt-2 min-h-11 w-full rounded-xl border border-[var(--syn-border)] bg-[var(--syn-soft)] p-3 text-base" /></label><button type="submit" disabled={busy || !name.trim()} className={`${primary} w-full`}>{busy ? 'En cours…' : 'Créer la playlist'}</button></form>
    {message && <p role="status" className="text-sm text-[var(--syn-accent)]">{message}</p>}{error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
}

function QueueContent() {
  const { audioState, playTrack, removeFromUpNext, clearUpNext } = useAudioPlayer();
  const current = getBrowserAudioCore()?.getSnapshot().currentTrack;
  const remaining = audioState.tracks.slice(remainingQueueStart(audioState.tracks, current?._id || null));
  return <div data-organization-queue className="space-y-4">
    {current ? <div className="rounded-xl bg-[var(--syn-soft)] p-4"><p className="text-xs text-[var(--syn-accent)]">Morceau courant</p><p className="mt-1 break-words font-bold">{current.title}</p><p className="text-xs">{current.artist.name}</p></div> : <p>Aucun morceau courant.</p>}
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">À suivre · {remaining.length}</h3><button type="button" disabled={!remaining.length} className={button} onClick={clearUpNext}>Vider la suite</button></div>
    {remaining.map((track, index) => <div data-queue-track={track._id} key={track._id} className="flex items-center gap-2 border-b border-[var(--syn-border)] py-2"><div className="min-w-0 flex-1"><p className="text-[10px] text-[var(--syn-accent)]">{index === 0 ? 'Suivant' : index + 1}</p><p className="break-words text-sm font-semibold">{track.title}</p><p className="truncate text-xs text-[var(--syn-text-secondary)]">{track.artist.name}</p></div><button className={button} aria-label={`Lire ${track.title}`} onClick={() => void playTrack(track)}><Play className="h-4 w-4" /></button><button className={button} aria-label={`Retirer ${track.title} de la file`} onClick={() => removeFromUpNext(track._id)}><Trash2 className="h-4 w-4" /></button></div>)}
    {!remaining.length && <p className="py-4 text-sm text-[var(--syn-text-secondary)]">Aucun morceau à suivre. Ajoute un titre depuis ses options.</p>}
  </div>;
}
