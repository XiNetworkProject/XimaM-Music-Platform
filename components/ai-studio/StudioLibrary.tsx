'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Folder, Heart, History, LayoutGrid, List, Loader2, MoreHorizontal, Music2, Pencil, Play, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import { activeStudioJob, selectWorkspaceSongs, versionFamilies, type SongFilter } from '@/lib/studio/workspace';
import { STUDIO_TOOLS, type StudioTool } from '@/lib/studio/tools';
import type { UnifiedStudioProps } from './UnifiedStudio';
import StudioSongMenu from './StudioSongMenu';
import type { StudioTasks } from './useStudioTasks';
import StudioTrackEditor from './StudioTrackEditor';
import { sameStudioTrack, uniqueStudioTracks } from '@/lib/studio/trackIdentity';

type Props = { studio: UnifiedStudioProps; tasks: StudioTasks; onTool: (action: StudioTool, source: GeneratedTrack) => void; onCompose: (action: 'reuse' | 'remix', source: GeneratedTrack) => void; onInspect: (source: GeneratedTrack) => void; onActivity: () => void };
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const filters: [SongFilter, string][] = [['all', 'Tous les morceaux'], ['liked', 'Favoris'], ['public', 'Publiés'], ['private', 'Privés'], ['instrumental', 'Instrumentaux'], ['vocals', 'Avec voix'], ['trash', 'Corbeille']];
function dateLabel(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date non renseignée'; }

export default function StudioLibrary({ studio: p, tasks, onTool, onCompose, onInspect, onActivity }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SongFilter>('all');
  const [folder, setFolder] = useState('*');
  const [sort, setSort] = useState('newest');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [family, setFamily] = useState<string>();
  const [menu, setMenu] = useState<string>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [dropFolder, setDropFolder] = useState<string>();
  const allSongs = useMemo(() => uniqueStudioTracks([...p.library.songs, ...p.library.fresh.map(track => ({ track, liked: false, trashed: false, published: false }))]), [p.library.songs, p.library.fresh]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const folderOptions = useMemo(() => Array.from(new Set(p.library.songs.map(song => song.folder).filter((value): value is string => !!value))).sort((a, b) => a.localeCompare(b)), [p.library.songs]);
  const families = useMemo(() => versionFamilies(p.library.songs), [p.library.songs]);
  const songs = useMemo(() => selectWorkspaceSongs(allSongs, { query, filter, folder, sort, family }), [allSongs, query, filter, folder, sort, family]);
  const pending = p.generation.pending || p.generation.busy;
  const received = p.generation.taskId ? allSongs.filter(song => song.track.generationTaskId === p.generation.taskId).length : p.library.fresh.length;
  const placeholders = pending ? Math.max(0, 2 - received) : 0;
  const active = tasks.jobs.filter(activeStudioJob);
  useEffect(() => { setMenuOpen(false); }, [folder, query, filter, layout, family]);
  // If a moved folder becomes empty, keep the selection reachable, not silently reset it.
  const displayedFolders = folder && folder !== '*' && !folderOptions.includes(folder) ? [...folderOptions, folder] : folderOptions;
  return <section className="us-collection" aria-label="Mes morceaux">
    <div className="sw-collection-top"><header className="sw-collection-header"><div><span className="us-eyebrow">ESPACE DE TRAVAIL</span><label className="sw-folder"><Folder size={18}/><span className="sr-only">Dossier affiché</span><select value={folder} onChange={event => { setFolder(event.target.value); setFamily(undefined); }}><option value="*">Tous mes morceaux</option><option value="">Sans dossier</option>{displayedFolders.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div><div className="sw-header-buttons"><button className="us-secondary" aria-label="Outils et exports du studio" onClick={onActivity}><History size={16}/><span>Exports</span>{active.length > 0 && <b>{active.length}</b>}</button><button className="us-icon" onClick={() => { p.library.refresh(); void tasks.refresh(); }} disabled={p.library.loading} aria-label="Actualiser les morceaux"><RefreshCw size={17} className={p.library.loading ? 'us-spin' : ''}/></button></div></header>
    <div className="sw-toolbar" data-filters-open={filtersOpen}><button className="us-icon sw-mobile-filters" aria-label="Filtres et tri" aria-expanded={filtersOpen} data-active={filter !== 'all' || sort !== 'newest' || undefined} onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal size={17}/></button><label className="us-search"><Search size={16}/><span className="sr-only">Rechercher mes morceaux</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…"/></label><label className="sw-select"><SlidersHorizontal size={15}/><span className="sr-only">Filtrer les morceaux</span><select value={filter} onChange={e => setFilter(e.target.value as SongFilter)}>{filters.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="sw-select"><span className="sr-only">Trier les morceaux</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Plus récents</option><option value="oldest">Plus anciens</option><option value="title">A–Z</option><option value="liked">Favoris d’abord</option></select></label><button className="us-icon" aria-label={layout === 'list' ? 'Afficher en grille' : 'Afficher en liste'} onClick={() => setLayout(layout === 'list' ? 'grid' : 'list')}>{layout === 'list' ? <LayoutGrid size={18}/> : <List size={18}/>}</button></div>
    <div className="sw-filter-chips" data-filters-open={filtersOpen} aria-label="Filtres rapides">{([['all', 'Tout'], ['liked', 'Favoris'], ['public', 'Publiés'], ['private', 'Privés']] as const).map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}<span>{songs.length} morceau{songs.length > 1 ? 'x' : ''}</span></div>
    {dragging && <div className="sw-folder-targets" aria-label="Déplacer vers un dossier">{['', ...displayedFolders].map(name => <button key={name} data-drop-active={dropFolder === name || undefined} onDragOver={event => { if (event.dataTransfer.types.includes('application/x-synaura-track')) { event.preventDefault(); setDropFolder(name); } }} onDrop={event => { event.preventDefault(); const source = p.library.songs.find(song => song.track.id === event.dataTransfer.getData('application/x-synaura-track')); if (source) p.actions.folder(source.track, name || null); setDragging(false); setDropFolder(undefined); }}><Folder size={14}/>{name || 'Sans dossier'}</button>)}</div>}
    </div><div className="sw-results" tabIndex={0} aria-label="Liste des créations">
    {pending && <p className="sw-generation-status" role="status">{p.generation.status || 'Préparation de vos versions…'} <small>{received ? `${received} version${received > 1 ? 's' : ''} reçue${received > 1 ? 's' : ''}` : 'Vos morceaux apparaîtront ici'}</small></p>}
    {Array.from({ length: placeholders }, (_, index) => <article key={`pending-${index}`} className="sw-song sw-pending-song" aria-label={`Version ${index + 1} en création`}><div className="sw-skeleton-cover" aria-hidden="true"><Music2 size={24}/></div><div className="sw-skeleton-lines"><strong>{p.form.title.value || 'Nouvelle création'} · {index + 1}</strong><i/><i/><small>Création en cours</small></div></article>)}
    {(active.length > 0 || tasks.error) && <div className="sw-activity-strip" role="status">{active.map(job => <button key={job.id} onClick={onActivity}><span className="us-dot"/><span>{job.title} · {STUDIO_TOOLS.find(tool => tool.id === job.action)?.label}</span><small>{job.status === 'uncertain' ? 'À vérifier' : 'En cours'}</small></button>)}{tasks.error && <button onClick={onActivity}>{tasks.error}</button>}</div>}
    {family && <div className="sw-family-banner"><button className="us-text-button" onClick={() => setFamily(undefined)}><ArrowLeft size={15}/>Tous les morceaux</button><span>Versions liées · {songs.length}</span></div>}
    {p.library.error ? <div className="us-empty" role="alert"><p>{p.library.error}</p><button className="us-secondary" onClick={p.library.refresh}>Réessayer</button></div> : p.library.loading && !songs.length ? <div className="us-empty" role="status"><Loader2 className="us-spin"/><p>Chargement des morceaux…</p></div> : !songs.length ? <div className="us-empty"><Music2 size={32}/><h3>{query || filter !== 'all' || folder !== '*' ? 'Aucun morceau dans cette sélection.' : 'Votre première création, ici.'}</h3><p>{query || filter !== 'all' || folder !== '*' ? 'Changez de dossier ou retirez un filtre.' : 'Décrivez votre idée, puis écoutez les versions sans quitter le studio.'}</p>{(query || filter !== 'all' || folder !== '*') && <button className="us-secondary" onClick={() => { setQuery(''); setFilter('all'); setFolder('*'); setFamily(undefined); }}>Réinitialiser les filtres</button>}</div> : <div className="sw-songs" data-layout={layout}>{songs.map((song, index) => {
      const { track, liked, published, trashed, model } = song;
      const versions = (families.get(track.id) || []).filter(item => !item.trashed).length;
      const day = dateLabel(track.createdAt);
      const saved = p.library.songs.some(item => sameStudioTrack(item.track, track));
      return <div key={track.sunoAudioId || track.id} className="sw-song-entry">{layout === 'list' && sort !== 'title' && sort !== 'liked' && (!index || dateLabel(songs[index - 1].track.createdAt) !== day) && <h3 className="sw-date">{day}</h3>}{editing === track.id && p.editTrack ? <StudioTrackEditor track={track} save={p.editTrack} close={() => setEditing(undefined)}/> : <article className="sw-song" draggable={saved && !trashed} onDragStart={event => { if ((event.target as HTMLElement).closest('input,textarea')) { event.preventDefault(); return; } event.dataTransfer.setData('application/x-synaura-track', track.id); event.dataTransfer.effectAllowed = 'copyMove'; setDragging(true); }} onDragEnd={() => { setDragging(false); setDropFolder(undefined); }} data-selected={p.selected?.id === track.id || undefined}>
        <button className="us-cover" onClick={() => { p.select(track); p.actions.play(track); }} aria-label={`Écouter ${track.title}`} disabled={trashed}>{track.imageUrl ? <img src={track.imageUrl} alt="" loading="lazy"/> : <Music2/>}<span><Play size={18} fill="currentColor"/></span><small>{duration(track.duration)}</small></button>
        <div className="sw-song-main"><button className="us-song-info" onClick={() => onInspect(track)} aria-label={`Détails de ${track.title}`}><strong>{track.title || 'Sans titre'}</strong><span>{track.style || 'Création originale'}</span></button><div className="sw-song-meta"><span>{published ? 'Publié' : 'Privé'}</span>{model && <span>{model}</span>}{song.operation && <span>{STUDIO_TOOLS.find(tool => tool.id === song.operation)?.label || 'Version'}</span>}{song.folder && <span><Folder size={11}/>{song.folder}</span>}</div><div className="sw-quick-actions"><button className="us-icon" aria-label={`${liked ? 'Retirer des' : 'Ajouter aux'} favoris : ${track.title}`} aria-pressed={liked} onClick={() => p.actions.like(track)}><Heart size={15} fill={liked ? 'currentColor' : 'none'}/></button><button className="us-text-button" onClick={() => p.actions.share(track)}><ArrowUpRight size={14}/>Partager</button>{versions > 1 && <button className="us-text-button" onClick={() => { setFamily(track.id); setFolder('*'); setQuery(''); setFilter('all'); }}><History size={14}/>{versions} versions</button>}</div></div>
        {!trashed && <button className="us-secondary sw-remix" onClick={() => onCompose('remix', track)}><RefreshCw size={14}/>Remixer</button>}
        {saved && p.editTrack && !trashed && <button className="us-icon sw-edit" onClick={() => setEditing(track.id)} aria-label={`Modifier le titre et la pochette de ${track.title}`}><Pencil size={15}/></button>}
        <button className="us-icon sw-more" aria-label={`Options de ${track.title}`} aria-haspopup="menu" aria-expanded={menuOpen && menu === track.id} onClick={event => { triggerRef.current = event.currentTarget; setMenuOpen(menu !== track.id || !menuOpen); setMenu(track.id); }}><MoreHorizontal size={21}/></button>
      </article>}</div>;
    })}</div>}
    </div>
    {p.selected && <div className="sw-selection"><Music2 size={16}/><span><strong>{p.selected.title}</strong><small>Morceau sélectionné</small></span><button className="us-text-button" onClick={() => onInspect(p.selected!)}>Paroles & détails <ArrowUpRight size={14}/></button></div>}
    {menu && triggerRef.current && p.library.songs.find(song => song.track.id === menu) && <StudioSongMenu key={menu} open={menuOpen} track={p.library.songs.find(song => song.track.id === menu)!.track} trashed={!!p.library.songs.find(song => song.track.id === menu)?.trashed} anchor={triggerRef.current} onClose={() => setMenuOpen(false)} onCompose={onCompose} onTool={onTool} onDownload={p.actions.download} onShare={p.actions.share} onInspect={onInspect}/>}
  </section>;
}
