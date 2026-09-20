'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Check, ChevronDown, Download, Heart, Library, Loader2, Lock, MoreHorizontal, Music2, Play, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import HandoffReturn from '@/components/navigation/HandoffReturn';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { CURRENT_SUNO_MODELS, SUNO_GENERATION_LIMITS } from '@/lib/sunoModels';
import { ACTION_COSTS } from '@/lib/billing/pricing';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import './unified-studio.css';

type Mode = 'simple' | 'custom' | 'remix';
type Field<T> = { value: T; set: (value: T) => void };
export type StudioSong = { track: GeneratedTrack; liked: boolean; trashed: boolean; published: boolean; folder?: string; model?: string };
export interface UnifiedStudioProps {
  authenticated: boolean;
  quotaLoading: boolean;
  credits: number;
  buyCredits: () => void;
  form: {
    mode: Field<Mode>; description: Field<string>; title: Field<string>; style: Field<string>; lyrics: Field<string>;
    instrumental: Field<boolean>; model: Field<string>; allowedModels: readonly string[];
    duration: Field<number>; weirdness: Field<number>; styleInfluence: Field<number>; audioWeight: Field<number>;
    negativeTags: Field<string>; vocalGender: Field<string>;
    tags: string[]; clearTags: () => void;
    remixSource: ReactNode; remixReady: boolean; remixOptions: ReactNode; sourceCredit: ReactNode;
  };
  generation: { busy: boolean; pending: boolean; progress: number; status: string; error: string | null; cooldown: number; submit: () => Promise<void>; lyricsBusy: boolean; generateLyrics: () => Promise<void> };
  library: { songs: StudioSong[]; loading: boolean; error: string | null; refresh: () => void; fresh: GeneratedTrack[] };
  selected: GeneratedTrack | null;
  select: (track: GeneratedTrack) => void;
  actions: { play: (track: GeneratedTrack) => void; download: (track: GeneratedTrack) => void; share: (track: GeneratedTrack) => void; remix: (track: GeneratedTrack) => void; reuse: (track: GeneratedTrack) => void; copyLyrics: (track: GeneratedTrack) => void; like: (track: GeneratedTrack) => void; trash: (track: GeneratedTrack) => void; folder: (track: GeneratedTrack, folder: string | null) => void; video: (track: GeneratedTrack) => void; videoBusy: boolean; publish: () => Promise<void>; publishBusy: boolean; published: boolean; permissions: ReactNode; timedLyrics: ReactNode };
  modals: ReactNode;
}

const inspirations = [
  ['Après minuit', 'Une balade nocturne, synthés analogiques, basse profonde, voix douce en français, mélancolique et lumineuse.'],
  ['Plein soleil', 'Un morceau afro-pop solaire, guitare organique, rythme dansant et refrain français accrocheur.'],
  ['Sans gravité', 'Une envolée ambient cinématique, textures aériennes, piano délicat et montée progressive, instrumental.'],
] as const;
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
// Kept under a contract test with the existing music-video route; no pricing change.
const MUSIC_VIDEO_CREDIT_COST = 100;

export default function UnifiedStudio(p: UnifiedStudioProps) {
  const search = useSearchParams();
  const [view, setView] = useState<'create' | 'library'>(search?.get('view') === 'library' ? 'library' : 'create');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'trash' | 'video' | null>(null);
  const [folder, setFolder] = useState('');
  const submitLock = useRef(false);
  const deepLink = useRef('');
  const form = p.form;
  const selectedSong = p.library.songs.find(song => song.track.id === p.selected?.id);

  useEffect(() => { if (p.generation.error) setView('create'); }, [p.generation.error]);
  useEffect(() => { if (p.generation.pending) setView('library'); }, [p.generation.pending]);

  useEffect(() => {
    if (search?.get('view') === 'library') setView('library');
    const id = search?.get('track');
    if (!id || deepLink.current === id) return;
    const song = p.library.songs.find(item => item.track.id === id.replace(/^ai-/, ''));
    if (song) { deepLink.current = id; p.select(song.track); setDetails(true); setView('library'); }
  }, [search, p.library.songs, p.select]);

  const songs = p.library.songs.filter(song => {
    if (filter === 'trash' ? !song.trashed : song.trashed) return false;
    if (filter === 'liked' && !song.liked) return false;
    if (filter === 'public' && !song.published) return false;
    return `${song.track.title} ${song.track.style} ${song.folder || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  }).sort((a, b) => sort === 'title' ? a.track.title.localeCompare(b.track.title) : (sort === 'oldest' ? 1 : -1) * (Date.parse(a.track.createdAt) - Date.parse(b.track.createdAt)));
  const lacksCredits = p.credits < ACTION_COSTS.generation.credits;
  const empty = form.mode.value === 'simple' ? !form.description.value.trim() : !form.style.value.trim() || (form.mode.value === 'custom' && (!form.title.value.trim() || (!form.instrumental.value && !form.lyrics.value.trim())));
  const disabled = p.quotaLoading || p.generation.busy || p.generation.cooldown > 0 || empty || lacksCredits || (form.mode.value === 'remix' && !form.remixReady);
  const openDetails = (track: GeneratedTrack) => { p.select(track); setDetails(true); setConfirm(null); setFolder(p.library.songs.find(song => song.track.id === track.id)?.folder || ''); };
  const create = async () => {
    if (submitLock.current || disabled) return;
    submitLock.current = true;
    try { await p.generation.submit(); } finally { submitLock.current = false; }
  };

  return <div className="unified-studio" data-studio-view={view}>
    <header className="us-header">
      <Link href="/live" className="us-brand" aria-label="Synaura, Live"><img src="/brand/v2/reference-symbol.svg" alt="" /><span>Synaura<span className="us-brand-divider">/</span><strong>Studio</strong></span></Link>
      <div className="us-header-actions"><HandoffReturn fallbackHref="/live" fallbackLabel="Retour Live" className="us-return" />{p.authenticated && <button className="us-credit" aria-label={`${p.credits} crédits, ajouter des crédits`} onClick={p.buyCredits}><span>{p.quotaLoading ? '…' : p.credits} <small>crédits</small></span><Plus size={15} aria-hidden="true" /></button>}</div>
    </header>
    {!p.authenticated ? <main className="us-signin"><div className="us-sculpture" aria-hidden="true"><i /><i /><i /></div><span className="us-eyebrow">SYNAURA STUDIO</span><h1>Le prochain son.<br /><em>Le vôtre.</em></h1><p>Une idée, des paroles ou un extrait. À vous de jouer.</p><Link className="us-generate" href={`/auth/signin?callbackUrl=${encodeURIComponent(`/studio${search?.toString() ? `?${search.toString()}` : ''}`)}`}>Ouvrir mon studio <ArrowUpRight size={18} /></Link></main> : <>
      <nav className="us-mobile-nav" aria-label="Espace du studio"><button aria-pressed={view === 'create'} onClick={() => setView('create')}><Sparkles size={16} />Créer</button><button aria-pressed={view === 'library'} onClick={() => setView('library')}><Library size={16} />Mes morceaux{p.generation.pending && <span className="us-dot" />}</button></nav>
      <main className="us-workspace">
        <section className="us-composer" aria-label="Créer un morceau">
          <div className="us-composer-heading"><span className="us-eyebrow"><span className="us-dot" /> VOTRE ESPACE DE CRÉATION</span><h1>Faites du <em>bruit.</em></h1></div>
          <div className="us-mode" role="group" aria-label="Mode de création">{([['simple', 'Une idée'], ['custom', 'Mes paroles'], ['remix', 'Un audio']] as const).map(([id, label]) => <button key={id} aria-pressed={form.mode.value === id} onClick={() => form.mode.set(id)}>{label}</button>)}</div>
          {form.sourceCredit}
          {form.mode.value === 'remix' && form.remixSource}
          <div className="us-form">
            {form.mode.value !== 'simple' && <label className="us-field">Titre<input value={form.title.value} maxLength={SUNO_GENERATION_LIMITS.title} onChange={e => form.title.set(e.target.value)} placeholder={form.mode.value === 'remix' ? 'Mon remix' : 'Donnez-lui un nom'} /></label>}
            <label className="us-field us-prompt"><span>{form.mode.value === 'simple' ? 'Quelle musique imaginez-vous ?' : 'Direction musicale'}</span><textarea rows={form.mode.value === 'simple' ? 5 : 3} value={form.mode.value === 'simple' ? form.description.value : form.style.value} onChange={e => (form.mode.value === 'simple' ? form.description : form.style).set(e.target.value)} maxLength={form.mode.value === 'simple' ? SUNO_GENERATION_LIMITS.simplePrompt : SUNO_GENERATION_LIMITS.style} placeholder={form.mode.value === 'simple' ? 'Un genre, une ambiance, une histoire…' : 'Afro-pop, guitares chaudes, voix douce…'} /></label>
            {form.mode.value === 'simple' && <div className="us-inspirations" aria-label="Idées de départ">{inspirations.map(([label, prompt]) => <button key={label} onClick={() => form.description.set(prompt)}><Wand2 size={12} />{label}</button>)}</div>}
            {form.tags.length > 0 && <div className="us-tags"><span>{form.tags.join(' · ')}</span><button onClick={form.clearTags} aria-label="Retirer les tags hérités"><X size={14} /></button></div>}
            <div className="us-controls"><label className="us-model"><Sparkles size={15} /><span className="sr-only">Modèle</span><select value={form.model.value} onChange={e => form.model.set(e.target.value)} disabled={p.quotaLoading}>{CURRENT_SUNO_MODELS.map(model => <option key={model.id} value={model.id} disabled={!form.allowedModels.includes(model.id)}>{model.label}{!form.allowedModels.includes(model.id) ? ' · Abonnement' : ''}</option>)}</select></label><button className="us-toggle" role="switch" aria-checked={form.instrumental.value} onClick={() => form.instrumental.set(!form.instrumental.value)}><span className="us-switch"><i /></span>Instrumental</button></div>
            {form.mode.value !== 'simple' && !form.instrumental.value && <div className="us-field"><span className="us-field-heading"><label htmlFor="us-lyrics-input">Paroles</label><button aria-label="Écrire les paroles avec l’IA" type="button" className="us-text-button" disabled={p.generation.lyricsBusy || p.generation.busy} onClick={p.generation.generateLyrics}>{p.generation.lyricsBusy ? <Loader2 size={14} className="us-spin" /> : <Wand2 size={14} />}Écrire avec l’IA</button></span><textarea id="us-lyrics-input" value={form.lyrics.value} rows={7} maxLength={SUNO_GENERATION_LIMITS.prompt} onChange={e => form.lyrics.set(e.target.value)} placeholder={"[Couplet]\nVos paroles…\n\n[Refrain]"} /></div>}
            {form.mode.value === 'remix' && form.remixOptions}
            {form.mode.value !== 'simple' && <details className="us-advanced"><summary><SlidersHorizontal size={15} />Réglages<ChevronDown size={14} /></summary><div className="us-advanced-fields"><label className="us-field">Durée demandée · secondes<input type="number" min={SUNO_GENERATION_LIMITS.minDuration} max={SUNO_GENERATION_LIMITS.maxDuration} value={form.duration.value} onChange={e => form.duration.set(Number(e.target.value))} /></label>{([['Liberté créative', form.weirdness], ['Fidélité au style', form.styleInfluence], ...(form.mode.value === 'remix' ? [['Fidélité à l’audio', form.audioWeight] as const] : [])] as const).map(([label, field]) => <label className="us-range" key={label}><span>{label}<output>{field.value}%</output></span><input type="range" min="0" max="100" value={field.value} onChange={e => field.set(Number(e.target.value))} /></label>)}{!form.instrumental.value && <label className="us-field">Voix<select value={form.vocalGender.value} onChange={e => form.vocalGender.set(e.target.value)}><option value="">Au choix du modèle</option><option value="f">Féminine</option><option value="m">Masculine</option></select></label>}<label className="us-field">À éviter<input value={form.negativeTags.value} onChange={e => form.negativeTags.set(e.target.value)} placeholder="Ex. distorsion, batterie…" /></label></div></details>}
          </div>
          <div className="us-commit">{p.generation.error && <p role="alert" className="us-error">{p.generation.error}</p>}{lacksCredits && !p.quotaLoading ? <button className="us-generate" onClick={p.buyCredits}>Ajouter des crédits <Plus size={18} /></button> : <button className="us-generate" onClick={create} disabled={disabled}>{p.generation.busy ? <Loader2 size={18} className="us-spin" /> : <Sparkles size={18} />}<span>{p.generation.busy ? 'Création en cours…' : p.generation.cooldown ? `Réessayer dans ${p.generation.cooldown}s` : 'Créer mon morceau'}</span><span className="us-cost">{ACTION_COSTS.generation.credits} cr.</span></button>}<span className="us-private"><Lock size={11} />Privé jusqu’à votre publication</span></div>
        </section>
        <section className="us-collection" aria-label="Mes morceaux">
          <header className="us-collection-heading"><div><span className="us-eyebrow">VOTRE COLLECTION</span><h2>À vous de jouer<span>.</span></h2></div><button className="us-icon" onClick={p.library.refresh} disabled={p.library.loading} aria-label="Actualiser les morceaux"><RefreshCw size={17} className={p.library.loading ? 'us-spin' : ''} /></button></header>
          {(p.generation.pending || p.library.fresh.length > 0) && <div className="us-progress" role="status"><div><span className="us-dot" /><strong>{p.generation.status}</strong>{p.generation.pending && <span>{p.generation.progress}%</span>}</div>{p.generation.pending && <progress max="100" value={p.generation.progress} aria-label="Génération en cours" />}{p.library.fresh.map(track => <button key={track.id} className="us-fresh" onClick={() => { p.select(track); p.actions.play(track); }} disabled={!track.audioUrl}><Play size={15} />{track.title || 'Nouvelle version'}</button>)}</div>}
          <div className="us-library-tools"><label className="us-search"><Search size={17} /><span className="sr-only">Rechercher mes morceaux</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un morceau…" /></label><label className="us-sort"><span className="sr-only">Trier les morceaux</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Plus récents</option><option value="oldest">Plus anciens</option><option value="title">A–Z</option></select></label></div>
          <div className="us-filters" role="group" aria-label="Filtrer les morceaux">{[['all', 'Tous'], ['liked', 'Favoris'], ['public', 'Publiés'], ['trash', 'Corbeille']].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}{id === 'all' && <span>{p.library.songs.filter(song => !song.trashed).length}</span>}</button>)}</div>
          {p.library.error ? <div className="us-empty" role="alert"><p>{p.library.error}</p><button className="us-secondary" onClick={p.library.refresh}>Réessayer</button></div> : p.library.loading && !songs.length ? <div className="us-empty" role="status"><Loader2 className="us-spin" /><p>Vos morceaux arrivent…</p></div> : !songs.length ? <div className="us-empty"><div className="us-sculpture" aria-hidden="true"><i /><i /><i /></div><h3>{query || filter !== 'all' ? 'Rien ici pour le moment.' : 'Tout commence par une idée.'}</h3><p>{query ? 'Essayez un autre titre ou style.' : filter !== 'all' ? 'Vos morceaux apparaîtront ici.' : 'Créez votre premier morceau. Écoutez ce qui arrive.'}</p><button className="us-secondary us-mobile-only" onClick={() => setView('create')}>Créer un morceau <ArrowUpRight size={16} /></button></div> : <div className="us-song-list">{songs.map(({ track, liked, published, trashed, folder: songFolder, model }, index) => <article key={track.id} className="us-song" data-selected={p.selected?.id === track.id || undefined}>
            <span className="us-song-number">{String(index + 1).padStart(2, '0')}</span><button className="us-cover" onClick={() => { p.select(track); p.actions.play(track); }} aria-label={`Écouter ${track.title}`} disabled={trashed}>{track.imageUrl ? <img src={track.imageUrl} alt="" loading="lazy" /> : <Music2 />}<span><Play size={18} fill="currentColor" /></span></button><button className="us-song-info" onClick={() => openDetails(track)}><strong>{track.title || 'Sans titre'}</strong><span>{track.style || 'Création originale'}{songFolder && ` · ${songFolder}`}</span><small>{published ? 'Publié' : 'Privé'}{model && ` · ${model}`}</small></button><span className="us-song-time">{time(track.duration)}</span><button className="us-icon us-like" aria-label={`${liked ? 'Retirer des' : 'Ajouter aux'} favoris : ${track.title}`} aria-pressed={liked} onClick={() => p.actions.like(track)}><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button><button className="us-icon" onClick={() => openDetails(track)} aria-label={`Options de ${track.title}`}><MoreHorizontal size={21} /></button>
          </article>)}</div>}
        </section>
      </main>
    </>}
    <SynauraOverlay open={details && !!p.selected} onClose={() => { setDetails(false); setConfirm(null); }} ariaLabel={p.selected?.title || 'Détails du morceau'} presentation="responsive" size="lg" className="us-detail-overlay">
      {p.selected && <div className="unified-studio us-detail"><div className="us-detail-hero">{p.selected.imageUrl && <img src={p.selected.imageUrl} alt="" />}<div><span className="us-eyebrow">{p.actions.published ? 'PUBLIÉ' : 'PRIVÉ'}</span><h2>{p.selected.title}</h2><p>{p.selected.style}</p><button className="us-secondary" onClick={() => p.actions.play(p.selected!)} disabled={selectedSong?.trashed}><Play size={16} />Écouter · {time(p.selected.duration)}</button></div></div>
        <div className="us-detail-actions"><button onClick={() => { p.actions.reuse(p.selected!); setDetails(false); setView('create'); }}><Wand2 />Réutiliser</button><button onClick={() => { p.actions.remix(p.selected!); setDetails(false); setView('create'); }}><RefreshCw />Remixer</button><button onClick={() => p.actions.download(p.selected!)}><Download />Télécharger</button><button onClick={() => p.actions.share(p.selected!)}><ArrowUpRight />Partager</button></div>
        <details className="us-advanced"><summary>Paroles & détails<ChevronDown size={14} /></summary><div className="us-advanced-fields"><p className="us-lyrics">{p.selected.lyrics || p.selected.prompt || 'Instrumental'}</p>{p.selected.lyrics && <button className="us-text-button" onClick={() => p.actions.copyLyrics(p.selected!)}>Copier les paroles</button>}{p.actions.timedLyrics}</div></details>
        <details className="us-advanced"><summary>Organisation & outils<ChevronDown size={14} /></summary><div className="us-advanced-fields"><label className="us-field">Dossier<input value={folder} onChange={e => setFolder(e.target.value)} placeholder="Nom du dossier" /></label><button className="us-secondary" onClick={() => p.actions.folder(p.selected!, folder.trim() || null)}><Check size={14} />Enregistrer le dossier</button><button className="us-secondary" disabled={p.actions.videoBusy || p.credits < MUSIC_VIDEO_CREDIT_COST} onClick={() => setConfirm('video')}>Vidéo de couverture · {MUSIC_VIDEO_CREDIT_COST} crédits</button><button className="us-secondary" onClick={() => setConfirm('trash')}>{selectedSong?.trashed ? 'Restaurer' : 'Mettre à la corbeille'}</button></div></details>
        <details className="us-advanced"><summary>Droits de remix<ChevronDown size={14} /></summary><div className="us-advanced-fields">{p.actions.permissions}</div></details>
        <button className="us-generate us-publish" disabled={p.actions.publishBusy || !selectedSong || selectedSong.trashed} onClick={() => setConfirm('publish')}>{p.actions.publishBusy ? 'Mise à jour…' : p.actions.published ? 'Rendre privé' : 'Publier sur Synaura'}<ArrowUpRight size={17} /></button>
        {confirm && <div className="us-confirm" role="group" aria-label="Confirmer l’action"><p>{confirm === 'publish' ? p.actions.published ? 'Retirer ce morceau du public ?' : 'Rendre ce morceau public, selon les droits de sa source ?' : confirm === 'trash' ? selectedSong?.trashed ? 'Restaurer cette génération et ses versions ?' : 'Mettre cette génération et ses versions à la corbeille ?' : `Créer une vidéo de couverture pour ${MUSIC_VIDEO_CREDIT_COST} crédits ?`}</p><div><button className="us-secondary" onClick={() => setConfirm(null)}>Annuler</button><button className="us-secondary" disabled={p.actions.publishBusy || p.actions.videoBusy} onClick={async () => { if (confirm === 'publish') await p.actions.publish(); else if (confirm === 'trash') { p.actions.trash(p.selected!); setDetails(false); } else p.actions.video(p.selected!); setConfirm(null); }}>Confirmer</button></div></div>}
      </div>}
    </SynauraOverlay>
    {p.modals}
  </div>;
}
