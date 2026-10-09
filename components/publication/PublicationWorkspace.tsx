'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Disc3, FileAudio, Globe2, ImagePlus, Info, Loader2, LockKeyhole, Music2, Sparkles, Upload, X } from 'lucide-react';
import FennecSprite from '@/components/celestial/FennecSprite';
import GenrePicker from '@/components/upload/GenrePicker';
import MoodSelector from '@/components/upload/MoodSelector';
import TagsInput from '@/components/upload/TagsInput';
import CreditsEditor, { type Credits } from '@/components/upload/CreditsEditor';
import FeaturingSearch, { type FeaturingArtist } from '@/components/upload/FeaturingSearch';
import RemixPermissionsSection from '@/components/upload/RemixPermissionsSection';
import TrackListEditor, { type TrackMeta } from '@/components/upload/TrackListEditor';
import SynauraEventEntryPanel from '@/components/synaura/SynauraEventEntryPanel';
import { MotionControl } from '@/components/ambient/LivingAmbience';
import { DEFAULT_REMIX_PERMISSIONS } from '@/lib/remixPermissions';
import { LANGUAGES, type MoodKey } from '@/lib/genres';
import { getEntitlements } from '@/lib/entitlements';
import { uploadLocalMedia } from '@/lib/clientMediaUpload';
import { coordinateSecondaryAudioElement } from '@/lib/audio/AudioCore';
import { inspectAudioFile, type AudioReport } from '@/lib/publication/audioAnalysis';
import { releaseCountError, type PublicationInput, type PublicationResult, type ReleaseType } from '@/lib/publication/model';
import './publication.css';

const STEPS = [
  { label: 'Ton son', title: 'Tout commence par un son.', subtitle: 'Dépose tes fichiers. On fait les vérifications ensemble.', help: 'Je vérifie si ton navigateur peut lire le fichier, puis les niveaux et les silences quand sa taille le permet. Rien n’est envoyé avant ta confirmation.', details: ['MP3, WAV, FLAC, M4A, AAC, OGG, AIFF ou Opus. Si ton navigateur ne lit pas un format, réexporte-le en MP3 ou WAV.', 'Un avertissement de silence ou de niveau n’est pas forcément une erreur : un morceau calme ou une introduction peuvent être volontaires. Écoute toujours ton export.', 'L’analyse des niveaux est indicative, effectuée après décodage à 44,1 kHz. Ce n’est ni une mesure LUFS, ni une mesure de true peak, ni une certification du mastering.', 'Le serveur vérifiera également la présence d’une piste audio, sa durée et sa taille au moment de publier. Aucun service de reconnaissance musicale n’est utilisé.'] },
  { label: 'Son identité', title: 'Donne-lui un visage.', subtitle: 'Un titre, une pochette, quelques mots. À ton image.', help: 'Le titre est indispensable. La pochette et la description sont facultatives. Pour un EP ou un album, tu peux aussi renommer et réordonner chaque morceau.', details: ['La pochette est commune à tous les morceaux de cette sortie. Image JPG, PNG, WebP, GIF ou AVIF : 25 Mo maximum.', 'Pour une pochette animée, utilise une vidéo de 7 secondes maximum. Une image de remplacement est créée automatiquement pour les surfaces qui ne lisent pas la vidéo.', 'Utilise seulement une pochette que tu as le droit de diffuser. Évite les informations personnelles et vérifie sa lisibilité en petit format.'] },
  { label: 'Son univers', title: 'Aide ton son à trouver ses oreilles.', subtitle: 'Du genre aux sous-genres, décris ce qui le rend unique.', help: 'Tu peux choisir jusqu’à cinq styles, sans obligation. Le premier sera le principal. Les ambiances, la langue et les tags apportent du contexte ; ils ne garantissent pas un nombre d’écoutes.', details: ['Déplie une famille puis explore ses sous-styles, ou recherche directement un nom. Retire un style en cliquant sur sa pastille.', 'Si le morceau mélange des genres, choisis les plus représentatifs. Tu peux aussi ne rien préciser plutôt que choisir un style trompeur.', 'Les paroles sont facultatives. Colle le texte chanté et garde les retours à la ligne. Ce parcours n’invente pas de paroles ni de synchronisation.', 'Pour un EP ou un album, les réglages par morceau dans « Son identité » peuvent remplacer les styles, les paroles et le marquage explicite communs.'] },
  { label: 'La diffusion', title: 'C’est toi qui choisis la suite.', subtitle: 'Visibilité, artistes invités et autorisations de création.', help: 'Public : ta sortie rejoint le catalogue. Privé : elle reste dans ta bibliothèque, hors découverte. Les remixes sont désactivés par défaut, tu gardes le choix.', details: ['Le mode privé masque la sortie du catalogue ; il ne chiffre pas le fichier et ne révoque pas un lien audio déjà partagé.', 'Crédite les artistes invités et les personnes qui ont participé. Un crédit est une attribution, pas une invitation ni un partage automatique des revenus.', 'Activer les droits de création permet les usages indiqués dans les options. Ne l’active que si tu disposes des autorisations correspondantes.', 'Aucune reconnaissance de copyright n’est effectuée. Tu dois avoir les droits sur le son, les paroles, les samples et la pochette.', 'La programmation et les liens non listés ne sont pas disponibles dans ce parcours. Aucun horaire fictif ne sera affiché.'] },
  { label: 'Dernier regard', title: 'Prêt à le laisser voyager ?', subtitle: 'Vérifie une dernière fois. Rien ne part sans ton accord.', help: 'Relis le récapitulatif et écoute ton export. Après confirmation, je suivrai les envois puis l’enregistrement. En cas de coupure, la même tentative peut être reprise sans doublon.', details: ['Les fichiers sont envoyés un par un. L’étape suivante vérifie les médias sur le serveur avant d’enregistrer la sortie entière.', 'Si un morceau d’un album est refusé, aucun morceau de cette tentative n’est publié. Tes fichiers déjà transférés sont conservés dans cet écran pour réessayer.', 'Si tu fermes ou recharges cette page avant la fin, les fichiers locaux devront être sélectionnés à nouveau. Ne ferme pas la page pendant l’enregistrement.', 'Le contrôle technique ne prouve ni la propriété des droits, ni l’originalité de la musique.'] },
];
type Item = TrackMeta & { key: string; report?: AudioReport };
type Stored = Awaited<ReturnType<typeof uploadLocalMedia>>;
const isCoverVideo = (file: File | null) => Boolean(file && (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)));
function useFileUrl(file: File | null) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!file) { setUrl(''); return; } const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value); }, [file]);
  return url;
}
function AudioPreview({ file }: { file: File }) {
  const url = useFileUrl(file), ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (!ref.current) return; return coordinateSecondaryAudioElement(ref.current, 'preview'); }, [url]);
  return <audio ref={ref} src={url || undefined} controls preload="metadata" aria-label={`Écouter ${file.name}`} className="pub-audio"/>;
}
function AudioCheck({ item }: { item: Item }) {
  const r = item.report;
  return <div className="pub-analysis" data-state={r?.state || 'pending'}>
    <div className="pub-analysis-heading">{!r ? <Loader2 size={14} className="pub-spin"/> : r.state === 'checked' ? <CheckCircle2 size={14}/> : <Info size={14}/>}<strong>{!r ? 'Analyse locale…' : r.state === 'checked' ? 'Contrôle technique effectué' : r.state === 'error' ? 'Fichier à remplacer' : 'À vérifier à l’écoute'}</strong>{r?.duration ? <span>{Math.floor(r.duration / 60)}:{String(Math.round(r.duration % 60)).padStart(2, '0')}</span> : null}</div>
    {r?.waveform && <div className="pub-waveform" aria-hidden>{r.waveform.map((v, i) => <i key={i} style={{ height: `${Math.max(2, v * 100)}%` }}/>)}</div>}
    {r?.messages.map(m => <p key={m}>{m}</p>)}
    {r?.detailed && <small>Crête échantillon : {r.peakDb?.toFixed(1)} dBFS · Niveau RMS : {r.rmsDb?.toFixed(1)} dBFS · Mesures indicatives</small>}
  </div>;
}

export default function PublicationWorkspace({ preview = false }: { preview?: boolean }) {
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0), [furthest, setFurthest] = useState(0);
  const [releaseType, setReleaseType] = useState<ReleaseType>('single');
  const [tracks, setTracks] = useState<Item[]>([]);
  const [title, setTitle] = useState(''), [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null), [coverError, setCoverError] = useState('');
  const coverUrl = useFileUrl(coverFile);
  const [genres, setGenres] = useState<string[]>([]), [mood, setMood] = useState<MoodKey | null>(null);
  const [language, setLanguage] = useState(''), [lyrics, setLyrics] = useState(''), [tags, setTags] = useState<string[]>([]);
  const [isExplicit, setExplicit] = useState(false), [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [credits, setCredits] = useState<Credits>({}), [featuring, setFeaturing] = useState<FeaturingArtist[]>([]);
  const [permissions, setPermissions] = useState(DEFAULT_REMIX_PERMISSIONS), [rights, setRights] = useState(false);
  const [help, setHelp] = useState(false), [error, setError] = useState(''), [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState({ label: '', percent: 0 });
  const [result, setResult] = useState<PublicationResult | null>(null), [notice, setNotice] = useState('');
  const [plan, setPlan] = useState('free'), [used, setUsed] = useState<number | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null), scroll = useRef<HTMLDivElement>(null), files = useRef<HTMLInputElement>(null);
  const uploads = useRef(new Map<File, Stored>()), submitting = useRef(false), submission = useRef<PublicationInput | null>(null);
  const [locked, setLocked] = useState(false);
  const ent = getEntitlements(plan as any).uploads;
  const maxFileMb = Math.min(500, ent.maxFileMb);
  const storageKey = session?.user?.id ? `synaura:publication:pending:${session.user.id}` : '';
  const fileKey = tracks.map(t => t.key).join('|');
  const coverVideo = isCoverVideo(coverFile);
  const reportErrors = tracks.some(t => t.report?.state === 'error');
  const analyzing = tracks.some(t => !t.report);
  useEffect(() => {
    if (preview || !session?.user?.id) return;
    const controller = new AbortController();
    fetch('/api/subscriptions/usage', { signal: controller.signal, cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error(); const json = await r.json(); setPlan(json.plan || 'free'); setUsed(json.tracks?.used ?? null); }).catch(() => {});
    try { setPendingReceipt(localStorage.getItem(storageKey)); } catch {}
    return () => controller.abort();
  }, [session?.user?.id, preview, storageKey]);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      for (const item of tracks) {
        if (item.report || controller.signal.aborted) continue;
        try {
          const report = await inspectAudioFile(item.file, controller.signal);
          if (!controller.signal.aborted) setTracks(current => current.map(t => t.key === item.key ? { ...t, report, duration: report.duration || 0 } : t));
        } catch { if (!controller.signal.aborted) setTracks(current => current.map(t => t.key === item.key ? { ...t, report: { state: 'error', detailed: false, messages: ['Analyse interrompue. Retire puis ajoute à nouveau ce fichier.'] } } : t)); }
      }
    })();
    return () => controller.abort();
    // Metadata edits must not restart an expensive decode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);
  useEffect(() => {
    if (!tracks.length || result) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [tracks.length, result]);
  useEffect(() => { setHelp(false); scroll.current?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }); }, [step]);

  function addFiles(incoming: FileList | File[]) {
    if (busy || locked) return;
    const next = [...tracks]; let warning = '';
    for (const file of Array.from(incoming)) {
      if (!/\.(mp3|wav|m4a|aac|ogg|flac|aiff?|opus)$/i.test(file.name)) { warning = `${file.name} : format audio non pris en charge.`; continue; }
      if (file.size > maxFileMb * 1024 ** 2) { warning = `${file.name} dépasse la limite de ${maxFileMb} Mo.`; continue; }
      if (next.some(t => t.file.name === file.name && t.file.size === file.size && t.file.lastModified === file.lastModified)) { warning = 'Un fichier déjà sélectionné a été ignoré.'; continue; }
      if (next.length >= 50) { warning = '50 morceaux maximum par sortie.'; break; }
      next.push({ file, key: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), duration: 0, genreOverride: null, isExplicitOverride: null, lyricsOverride: null });
    }
    setTracks(next); setError(warning);
    if (!title && next[0]) setTitle(next[0].title);
  }
  function validate(index: number) {
    if (index === 0) return releaseCountError(releaseType, tracks.length) || (analyzing ? 'Laisse l’analyse des fichiers se terminer.' : reportErrors ? 'Remplace les fichiers illisibles avant de continuer.' : '');
    if (index === 1) return !title.trim() ? 'Donne un titre à ta sortie.' : tracks.some(t => !t.title.trim()) ? 'Chaque morceau doit avoir un titre.' : coverError;
    if (index === 3 && !rights) return 'Confirme les droits sur ta sortie pour continuer.';
    return '';
  }
  function go(next: number) {
    if (busy || locked) return;
    if (next > step) { for (let i = 0; i <= step; i++) { const message = validate(i); if (message) { setError(message); setStep(i); return; } } }
    setError(''); setStep(next); setFurthest(Math.max(furthest, next));
  }
  async function recoverReceipt() {
    if (!pendingReceipt) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/publications?key=${encodeURIComponent(pendingReceipt)}`, { cache: 'no-store' });
      const json = await response.json();
      if (response.ok && json.result) { setResult(json.result); localStorage.removeItem(storageKey); setPendingReceipt(null); }
      else if (response.status === 404) { setNotice('Aucune publication confirmée pour cette tentative. Sélectionne à nouveau tes fichiers pour reprendre.'); localStorage.removeItem(storageKey); setPendingReceipt(null); }
      else throw new Error(json.error || 'Impossible de vérifier la tentative.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Vérification indisponible.'); } finally { setBusy(false); }
  }
  async function submit() {
    if (submitting.current || preview) return;
    if (!submission.current) for (let i = 0; i < 4; i++) { const message = validate(i); if (message) { setError(message); setStep(i); return; } }
    submitting.current = true; setBusy(true); setError('');
    try {
      if (!submission.current) {
        const allFiles = [...tracks.map(t => t.file), ...(coverFile ? [coverFile] : [])];
        const total = allFiles.reduce((n, f) => n + f.size, 0); let sent = 0;
        for (const [index, file] of Array.from(allFiles.entries())) {
          if (!uploads.current.has(file)) {
            const label = file === coverFile ? 'Envoi de la pochette' : `Envoi du morceau ${index + 1}/${tracks.length}`;
            const media = await uploadLocalMedia(file, file === coverFile ? coverVideo ? 'cover-video' : 'cover' : 'audio', { onProgress: fraction => setProgress({ label, percent: Math.round((sent + file.size * fraction) / Math.max(1, total) * 100) }) });
            uploads.current.set(file, media);
          }
          sent += file.size;
        }
        const reference = (f: File) => { const media = uploads.current.get(f)!; return { publicId: media.public_id, url: media.secure_url }; };
        submission.current = { requestKey: crypto.randomUUID(), title, description, releaseType, visibility, genres, mood: mood || '', language, tags, lyrics, isExplicit, credits, featuring: featuring.map(f => ({ id: f.id, name: f.name, isExternal: Boolean(f.isExternal) })), rightsConfirmed: rights, remixPermissions: permissions,
          cover: coverFile ? { ...reference(coverFile), kind: coverVideo ? 'cover-video' : 'cover' } : null,
          tracks: tracks.map(t => ({ ...reference(t.file), title: t.title, genres: t.genreOverride, isExplicit: t.isExplicitOverride, lyrics: t.lyricsOverride })) };
        try { localStorage.setItem(storageKey, submission.current.requestKey); } catch {}
      }
      setLocked(true); setProgress({ label: 'Vérification serveur et enregistrement de la sortie…', percent: 100 });
      const response = await fetch('/api/publications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission.current) });
      const json = await response.json();
      if (!response.ok) {
        // Definitive validation failures permit editing. Unknown outcomes reuse the immutable receipt.
        if (response.status >= 400 && response.status < 500) { submission.current = null; setLocked(false); try { localStorage.removeItem(storageKey); } catch {} }
        throw new Error(json.error || 'Publication non confirmée. Réessaie la même tentative.');
      }
      setResult(json.result); setLocked(false); try { localStorage.removeItem(storageKey); } catch {}
      if (json.notificationWarning) setNotice('Ta sortie est enregistrée. Certaines notifications aux abonnés n’ont pas pu être envoyées.');
      if (eventId && visibility === 'public') {
        try { const entry = await fetch(`/api/city/events/${encodeURIComponent(eventId)}/participate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackId: json.result.trackIds[0], trackType: 'track' }) }); if (!entry.ok) throw new Error(); }
        catch { setNotice('Ta sortie est enregistrée, mais son inscription à l’événement a échoué. Réessaie depuis la City.'); }
      }
      const challengeId = new URLSearchParams(window.location.search).get('challengeId');
      if (challengeId && visibility === 'public') {
        try { const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}/participate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: json.result.trackIds[0], contentType: 'track' }) }); if (!response.ok) throw new Error(); }
        catch { setNotice('Ta sortie est enregistrée, mais son inscription au défi a échoué. Réessaie depuis la page du défi.'); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Un envoi a échoué. Tes fichiers restent sélectionnés.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  function selectCover(file: File | undefined) {
    if (!file) return;
    if (!/\.(jpe?g|png|webp|gif|avif|mp4|webm|mov)$/i.test(file.name)) { setError('Choisis une image JPG, PNG, WebP, GIF, AVIF ou une vidéo MP4, WebM, MOV.'); return; }
    if (file.size > (isCoverVideo(file) ? 250 : 25) * 1024 ** 2) { setError('Cette pochette dépasse la taille autorisée.'); return; }
    setCoverError(isCoverVideo(file) ? 'La vérification de la pochette animée est en cours.' : ''); setCoverFile(file); setError('');
  }
  const cover = coverUrl ? coverVideo ? <video src={coverUrl} muted controls playsInline preload="metadata" onLoadedMetadata={e => setCoverError(Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0 && e.currentTarget.duration <= 7.1 ? '' : 'La pochette animée doit durer au maximum 7 secondes.')} onError={() => setCoverError('Cette vidéo ne peut pas être lue. Essaie un MP4 ou une image.')} /> : <img src={coverUrl} alt="Pochette de ta sortie" onError={() => setCoverError('Cette image est illisible. Choisis une autre pochette.')} /> : <div className="pub-cover-empty"><Disc3 size={36}/><span>Ta prochaine sortie</span></div>;
  if (!preview && status !== 'authenticated') return <main className="publication-workspace pub-gate"><FennecSprite/><h1>{status === 'loading' ? 'Un instant…' : 'Ton son mérite sa place ici.'}</h1><p>{status === 'loading' ? 'Connexion à ton espace de publication.' : 'Connecte-toi pour préparer une sortie, guidé à chaque étape.'}</p>{status !== 'loading' && <Link className="pub-primary" href="/auth/signin?callbackUrl=%2Fupload">Me connecter <ArrowRight size={16}/></Link>}</main>;
  if (result) return <main className="publication-workspace pub-gate" data-fennec-host="publication"><FennecSprite pose="happy"/><span className="pub-eyebrow">SORTIE ENREGISTRÉE</span><h1>{result.visibility === 'public' ? 'Ton son a trouvé sa place.' : 'Bien au chaud dans ta bibliothèque.'}</h1><p>{result.trackIds.length} morceau{result.trackIds.length > 1 ? 'x' : ''} {result.visibility === 'public' ? 'disponible' : 'enregistré'}{result.trackIds.length > 1 ? 's' : ''}. {notice}</p><div className="pub-success-links"><Link className="pub-primary" href={result.albumId ? `/album/${result.albumId}` : `/track/${result.trackIds[0]}`}>Voir ma sortie <ArrowRight size={16}/></Link><Link href="/library">Ma bibliothèque</Link>{result.visibility === 'public' && <Link href="/posts?compose=true">En parler dans un post</Link>}</div></main>;
  return <main className="publication-workspace" data-fennec-host="publication">
    <header className="pub-top"><div><span className="pub-eyebrow"><Sparkles size={12}/> UNE NOUVELLE SORTIE</span><h1>De ton espace aux autres.</h1></div><div className="pub-top-tools"><MotionControl/><Link href="/library" onClick={e => { if (busy || locked || (tracks.length > 0 && !window.confirm('Quitter cette préparation ? Les fichiers devront être sélectionnés à nouveau.'))) e.preventDefault(); }}>Ma bibliothèque <ArrowRight size={14}/></Link></div></header>
    <div className="pub-layout">
      <nav className="pub-steps" aria-label="Étapes de publication">{STEPS.map((s, i) => <button key={s.label} type="button" disabled={busy || locked || i > furthest} aria-current={step === i ? 'step' : undefined} onClick={() => go(i)}><span>{i < step ? <Check size={15}/> : `0${i + 1}`}</span><div><strong>{s.label}</strong><small>{i === step ? 'On en est ici' : i < step ? 'Tu peux y revenir' : 'À suivre'}</small></div></button>)}<div className="pub-step-note"><LockKeyhole size={15}/><p>Tu gardes la main.<br/>Rien n’est publié avant ta confirmation.</p></div></nav>
      <section className="pub-center">
        <div className="pub-scroll" ref={scroll}>
          {preview && <p className="pub-notice">Aperçu local — aucun envoi ni aucune publication.</p>}
          {pendingReceipt && <div className="pub-notice">Une tentative précédente doit être vérifiée. <button type="button" disabled={busy} onClick={recoverReceipt}>Vérifier son résultat</button></div>}
          {notice && <p className="pub-notice">{notice}</p>}
          <div className="pub-step-heading"><span className="pub-eyebrow">ÉTAPE {step + 1} / 5</span><h2 ref={heading} tabIndex={-1}>{STEPS[step].title}</h2><p>{STEPS[step].subtitle}</p></div>
          <div className="pub-mobile-help"><FennecSprite/><p>{STEPS[step].help}</p><button type="button" aria-expanded={help} onClick={() => setHelp(!help)} aria-label="Afficher les explications du fennec"><Info size={18}/></button></div>
          {help && <div className="pub-mobile-details">{STEPS[step].details.map(d => <p key={d}>{d}</p>)}</div>}
          <fieldset disabled={busy || locked} className="pub-form" key={step}>
            {step === 0 && <>
              <div className="pub-formats" role="group" aria-label="Format de la sortie">{(['single', 'ep', 'album'] as const).map((format, i) => <button type="button" key={format} aria-pressed={releaseType === format} onClick={() => setReleaseType(format)}><Disc3 size={19}/><strong>{['Single', 'EP', 'Album'][i]}</strong><small>{['1 morceau', '2 à 6 morceaux', '7 à 50 morceaux'][i]}</small>{releaseType === format && <Check size={13}/>}</button>)}</div>
              <div className="pub-drop" data-dragging={dragging} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
                <div className="pub-drop-icon"><Upload size={23}/></div><h3>{tracks.length ? 'Ajouter un autre morceau' : 'Fais entrer ta musique.'}</h3><p>Glisse tes fichiers ici, ou sélectionne-les sur ton appareil.</p><button type="button" className="pub-primary" onClick={() => files.current?.click()}>Choisir mes fichiers <ArrowRight size={14}/></button><small>MP3, WAV, FLAC, M4A… · {maxFileMb} Mo / fichier{used !== null && ent.maxTracks >= 0 ? ` · ${Math.max(0, ent.maxTracks - used)} place(s) disponible(s)` : ''}</small>
                <input hidden ref={files} type="file" accept=".mp3,.wav,.flac,.m4a,.aac,.ogg,.aif,.aiff,.opus" multiple onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}/>
              </div>
              {tracks.map((t, i) => <article className="pub-file" key={t.key}><div className="pub-file-heading"><span className="pub-file-icon"><FileAudio size={20}/></span><div><strong>{t.file.name}</strong><small>{(t.file.size / 1024 ** 2).toFixed(1)} Mo · Morceau {i + 1}</small></div><button type="button" className="pub-icon-button" aria-label={`Retirer ${t.file.name}`} onClick={() => setTracks(current => current.filter(x => x.key !== t.key))}><X size={16}/></button></div><AudioCheck item={t}/><AudioPreview file={t.file}/></article>)}
              <p className="pub-footnote"><LockKeyhole size={12}/> Analyse gratuite sur cet appareil. Pas de reconnaissance musicale.</p>
            </>}
            {step === 1 && <>
              <div className="pub-identity"><div className="pub-cover-editor"><div className="pub-cover">{cover}</div><label className="pub-secondary"><ImagePlus size={14}/>{coverFile ? 'Changer la pochette' : 'Ajouter une pochette'}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={e => { selectCover(e.target.files?.[0]); e.target.value = ''; }}/></label>{coverFile && <button type="button" onClick={() => { setCoverFile(null); setCoverError(''); }}>Retirer</button>}<small>Image ou vidéo de 7 s max.</small></div><div className="pub-fields"><label>Titre de {releaseType === 'single' ? 'ton morceau' : 'ta sortie'} <span>Requis</span><input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="Comment s’appelle cette histoire ?"/></label><label>Description <span>Facultatif</span><textarea value={description} maxLength={5000} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Une inspiration, un souvenir, quelques mots pour les auditeurs…"/></label></div></div>
              {coverError && <p role="alert" className="pub-error">{coverError}</p>}
              {releaseType !== 'single' && <section className="pub-panel"><h3>L’ordre de ton histoire</h3><p>Renomme, réorganise et ajuste les informations de chaque morceau.</p><TrackListEditor tracks={tracks} onChange={next => setTracks(next.map(t => ({ ...tracks.find(x => x.file === t.file)!, ...t })))}/></section>}
            </>}
            {step === 2 && <>
              <section className="pub-panel"><h3>Styles & sous-styles</h3><GenrePicker selected={genres} onChange={setGenres}/></section>
              <details className="pub-details"><summary>Quelle ambiance ? <span>Facultatif</span><ChevronDown size={14}/></summary><MoodSelector value={mood} onChange={setMood}/></details>
              <label>Langue du morceau<select value={language} onChange={e => setLanguage(e.target.value)}><option value="">Non précisée</option>{LANGUAGES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}</select></label>
              <details className="pub-details"><summary>Paroles & tags <span>Facultatif</span><ChevronDown size={14}/></summary><label>Paroles<textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={7} maxLength={20000} placeholder="Le texte chanté, sans synchronisation automatique."/></label><TagsInput tags={tags} onChange={setTags}/></details>
            </>}
            {step === 3 && <>
              <div className="pub-visibility" role="group" aria-label="Visibilité">{(['public', 'private'] as const).map(v => <button type="button" key={v} aria-pressed={visibility === v} onClick={() => setVisibility(v)}>{v === 'public' ? <Globe2 size={22}/> : <LockKeyhole size={22}/>}<strong>{v === 'public' ? 'Faire découvrir' : 'Garder pour moi'}</strong><p>{v === 'public' ? 'Disponible dans le catalogue Synaura.' : 'Dans ma bibliothèque, hors découverte.'}</p>{visibility === v && <Check size={14}/>}</button>)}</div>
              {visibility === 'private' && <p className="pub-footnote">Privé dans le catalogue, pas chiffré : ne partage pas l’adresse directe du fichier.</p>}
              <label className="pub-check"><input type="checkbox" checked={isExplicit} onChange={e => setExplicit(e.target.checked)}/><span>Ce morceau contient des paroles explicites<small>Indique les contenus adultes ou le langage grossier.</small></span></label>
              <details className="pub-details"><summary>Artistes invités & crédits <ChevronDown size={14}/></summary><FeaturingSearch artists={featuring} onChange={setFeaturing}/><CreditsEditor credits={credits} onChange={setCredits}/></details>
              {!preview && visibility === 'public' && <details className="pub-details"><summary>Participer à un événement <span>Facultatif</span><ChevronDown size={14}/></summary><SynauraEventEntryPanel selectedEventId={eventId} onChange={setEventId} dark/></details>}
              <details className="pub-details"><summary>Usages de ma musique <span>{permissions.remixVisibility === 'disabled' ? 'Remix désactivé' : 'Autorisations personnalisées'}</span><ChevronDown size={14}/></summary><RemixPermissionsSection value={permissions} onChange={setPermissions}/></details>
              <label className="pub-check pub-rights"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)}/><span>Je confirme disposer des droits nécessaires<small>Sur l’audio, les paroles, les samples et la pochette, ainsi que pour les usages que j’autorise. Le contrôle technique ne vérifie pas ces droits.</small></span></label>
            </>}
            {step === 4 && <>
              <div className="pub-review"><div className="pub-cover">{cover}</div><div><span className="pub-eyebrow">{releaseType.toUpperCase()} · {tracks.length} MORCEAU{tracks.length > 1 ? 'X' : ''}</span><h3>{title}</h3><p>{session?.user?.name || 'Ton nom d’artiste'}</p><span className="pub-badge">{visibility === 'public' ? <Globe2 size={12}/> : <LockKeyhole size={12}/>} {visibility === 'public' ? 'Sortie publique' : 'Sortie privée'}</span></div></div>
              <div className="pub-summary">{[['Fichiers', `${tracks.length} morceau(x) · ${tracks.filter(t => t.report?.state === 'warning').length} avertissement(s)`, 0], ['Présentation', coverFile ? 'Pochette ajoutée' : 'Sans pochette personnalisée', 1], ['Univers musical', genres.join(' · ') || 'Styles non précisés', 2], ['Diffusion & droits', `${visibility === 'public' ? 'Public' : 'Privé'} · ${isExplicit ? 'Explicite' : 'Non explicite'} · droits confirmés`, 3]].map(([label, value, target]) => <button type="button" key={String(label)} onClick={() => go(Number(target))}><span><strong>{label}</strong><small>{value}</small></span><span>Modifier <ArrowRight size={12}/></span></button>)}</div>
              {tracks.map(t => <div className="pub-review-track" key={t.key}><strong>{releaseType === 'single' ? title : t.title}</strong><AudioPreview file={t.file}/>{t.report?.state === 'warning' && <AudioCheck item={t}/>}</div>)}
              <p className="pub-footnote">En confirmant, tu {visibility === 'public' ? 'rends cette sortie publique sur Synaura' : 'enregistres cette sortie dans ta bibliothèque privée'}. Aucun crédit IA n’est débité pour cet envoi.</p>
            </>}
          </fieldset>
        </div>
        <footer className="pub-bottom">
          {error && <div className="pub-error" role="alert"><Info size={15}/><span>{error}</span></div>}
          {busy && <div className="pub-progress" role="status"><span><Loader2 size={14} className="pub-spin"/>{progress.label || 'Vérification…'}</span><progress value={progress.percent} max={100}/></div>}
          <div className="pub-bottom-actions"><button type="button" className="pub-secondary" onClick={() => go(step - 1)} disabled={step === 0 || busy || locked}><ArrowLeft size={14}/>Retour</button><span>{step === 4 ? 'Tu as le dernier mot.' : 'À ton rythme.'}</span>{step < 4 ? <button type="button" className="pub-primary" onClick={() => go(step + 1)} disabled={busy || locked}>Continuer <ArrowRight size={15}/></button> : <button type="button" className="pub-primary" onClick={submit} disabled={busy || preview || Boolean(pendingReceipt)}>{busy ? 'En cours…' : locked ? 'Reprendre la tentative' : visibility === 'public' ? 'Confirmer et publier' : 'Enregistrer en privé'}{!busy && <Check size={15}/>}</button>}</div>
        </footer>
      </section>
      <aside className="pub-guide"><div className="pub-guide-pet"><span aria-hidden>✦</span><FennecSprite pose={step === 4 ? 'happy' : 'tail'}/><span aria-hidden>✧</span></div><div className="pub-guide-copy"><span className="pub-eyebrow">UN PETIT COUP DE PATTE</span><h3>Je suis là,<br/><em>on fait ça ensemble.</em></h3><p>{STEPS[step].help}</p><button type="button" className="pub-guide-toggle" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? 'Moins de détails' : 'Explique-moi en détail'}<ChevronDown size={14}/></button>{help && <div className="pub-guide-details">{STEPS[step].details.map(d => <p key={d}>{d}</p>)}</div>}</div><div className="pub-guide-note"><Music2 size={14}/><p>Une sortie, cinq petits pas.<br/>Et ta musique qui prend sa place.</p></div></aside>
    </div>
  </main>;
}
