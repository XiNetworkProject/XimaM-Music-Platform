'use client';

import { useState } from 'react';
import { ChevronDown, Folder, Library, RotateCcw, Music2, Plus, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react';
import StudioLyricsEditor from './StudioLyricsEditor';
import StudioTextLibrary from './StudioTextLibrary';
import { CURRENT_SUNO_MODELS, SUNO_GENERATION_LIMITS } from '@/lib/sunoModels';
import type { StudioTool } from '@/lib/studio/tools';
import type { UnifiedStudioProps } from './UnifiedStudio';

const inspirations = [
  ['Après minuit', 'Une balade nocturne, synthés analogiques, basse profonde, voix douce en français, mélancolique et lumineuse.'],
  ['Plein soleil', 'Un morceau afro-pop solaire, guitare organique, rythme dansant et refrain français accrocheur.'],
  ['Sans gravité', 'Une envolée ambient cinématique, textures aériennes, piano délicat et montée progressive, instrumental.'],
] as const;

/** Presentation only: all draft fields, entitlements and paid actions belong to the existing controller. */
export default function StudioComposer({ studio: p, onTool }: { studio: UnifiedStudioProps; onTool: (action: StudioTool) => void }) {
  const form = p.form;
  const simple = form.mode.value === 'simple';
  const audio = form.mode.value === 'remix';
  const [styleLibrary, setStyleLibrary] = useState(false);
  const resetOptions = () => { form.weirdness.set(50); form.styleInfluence.set(50); form.audioWeight.set(50); form.variety?.set(0); form.negativeTags.set(''); form.vocalGender.set(''); form.durationAuto?.set(true); };
  return <>
    <div className="sc-heading"><h1 tabIndex={-1}>Créer</h1><span>Votre prochain morceau.</span></div>
    <div className="sc-mode-row">
      <div className="us-mode" role="group" aria-label="Mode de création">
        <button aria-pressed={simple} onClick={() => form.mode.set('simple')}>Simple</button>
        <button aria-pressed={!simple} onClick={() => form.mode.set('custom')}>Avancé</button>
      </div>
      <label className="us-model"><Sparkles size={14}/><span className="sr-only">Modèle</span>
        <select value={form.model.value} onChange={e => form.model.set(e.target.value)} disabled={p.quotaLoading}>
          {CURRENT_SUNO_MODELS.map(model => <option key={model.id} value={model.id} disabled={!form.allowedModels.includes(model.id)}>{model.label}{!form.allowedModels.includes(model.id) ? ' · Abonnement' : ''}</option>)}
        </select>
      </label>
    </div>
    <div className="sc-source-actions">
      <button aria-pressed={audio} onClick={() => form.mode.set(audio ? 'custom' : 'remix')}><Plus size={16}/>Audio / reprise</button>
      <button onClick={() => onTool('sounds')}><Music2 size={16}/>Boucles & effets</button>
    </div>
    {p.draftRecovery}{p.generationRecovery}{form.sourceCredit}
    {audio && <div className="sc-audio-source">{form.remixSource}</div>}
    <div className="us-form sc-form">
      <div hidden={!simple} className="sc-simple-fields">
        <label className="us-field sc-prompt"><span>Votre idée</span>
          <textarea rows={6} value={form.description.value} onChange={e => form.description.set(e.target.value)} maxLength={SUNO_GENERATION_LIMITS.simplePrompt} placeholder="Décrivez votre chanson : une ambiance, un style, une histoire…"/>
        </label>
        <div className="sc-simple-footer"><button className="us-toggle" role="switch" aria-checked={form.instrumental.value} onClick={() => form.instrumental.set(!form.instrumental.value)}><span className="us-switch"><i/></span>Instrumental</button><span>{form.description.value.length}/{SUNO_GENERATION_LIMITS.simplePrompt}</span></div>
        <div className="sc-inspiration"><span>Un point de départ ?</span><div className="us-inspirations">{inspirations.map(([label, prompt]) => <button key={label} onClick={() => form.description.set(prompt)}><Wand2 size={12}/>{label}</button>)}</div></div>
      </div><div hidden={simple} className="sc-advanced-fields">
        <details className="sc-section" open>
          <summary><ChevronDown size={16}/><span>Paroles</span><small>{form.instrumental.value ? 'Instrumental' : form.lyrics.value ? 'Brouillon' : 'À écrire'}</small></summary>
          <div className="sc-section-body">
            <StudioLyricsEditor studio={p}/>
          </div>
        </details>
        <details className="sc-section" open>
          <summary><ChevronDown size={16}/><span>Styles</span><small>{audio ? 'Pour la reprise' : 'Facultatif'}</small></summary>
          <div className="sc-section-body"><label className="us-field"><span className="sr-only">Direction musicale</span><textarea rows={3} value={form.style.value} onChange={e => form.style.set(e.target.value)} maxLength={SUNO_GENERATION_LIMITS.style} placeholder="Indie pop, basse ronde, voix douce… ou laissez vos paroles inspirer le modèle."/></label>
            <div className="sc-style-actions"><button className="us-text-button" aria-label="Bibliothèque de styles" onClick={() => setStyleLibrary(true)}><Library size={15}/>Vos styles</button><button className="us-text-button" title="Ouvrir l’outil d’enrichissement et consulter sa disponibilité" onClick={() => onTool('style')}><Wand2 size={14}/>Enrichir</button><button className="us-text-button" aria-label="Effacer le style" disabled={!form.style.value} onClick={() => form.style.set('')}><RotateCcw size={14}/></button></div>
          </div>
        </details>
        {audio && form.remixOptions}
        <details className="sc-section">
          <summary><SlidersHorizontal size={16}/><span>Plus d’options</span><ChevronDown size={15}/></summary>
          <div className="sc-section-body sc-options">
            <button className="us-text-button" onClick={resetOptions}><RotateCcw size={13}/>Réinitialiser les options</button>
            {form.variety && <label className="us-field">Variété des versions<select value={form.variety.value} onChange={e => form.variety?.set(Number(e.target.value))}>{['Style exact', 'Équilibrée', 'Élevée', 'Audacieuse', 'Maximale'].map((label, value) => <option key={value} value={value}>{label}</option>)}</select></label>}
            {form.durationAuto && <label className="sc-option-row">Durée<select aria-label="Mode de durée" value={form.durationAuto.value ? 'auto' : 'custom'} onChange={e => form.durationAuto?.set(e.target.value === 'auto')}><option value="auto">Par défaut du modèle</option><option value="custom">Personnalisée</option></select></label>}
            {form.durationAuto?.value ? <p className="sc-help">Aucune durée imposée. L’API annonce actuellement 20 s par défaut ; choisissez une durée pour un morceau plus long.</p> : <label className="us-field">Durée demandée · secondes<input type="number" min={SUNO_GENERATION_LIMITS.minDuration} max={SUNO_GENERATION_LIMITS.maxDuration} value={form.duration.value} onChange={e => form.duration.set(Number(e.target.value))}/></label>}
            {([['Liberté créative', form.weirdness], ['Fidélité au style', form.styleInfluence], ...(audio ? [['Fidélité à l’audio', form.audioWeight] as const] : [])] as const).map(([label, field]) => <label className="us-range" key={label}><span>{label}<output>{field.value}%</output></span><input type="range" min="0" max="100" value={field.value} onChange={e => field.set(Number(e.target.value))}/></label>)}
            {!form.instrumental.value && <label className="us-field">Voix<select value={form.vocalGender.value} onChange={e => form.vocalGender.set(e.target.value)}><option value="">Au choix du modèle</option><option value="f">Féminine</option><option value="m">Masculine</option></select></label>}
            <label className="us-field">À éviter<input maxLength={1000} value={form.negativeTags.value} onChange={e => form.negativeTags.set(e.target.value)} placeholder="Exclure des styles, des instruments…"/></label>
            <p className="sc-help">La variété réinterprète le style entre les versions (0 = style exact). Max Mode et la personnalisation Suno « My Taste » ne sont pas disponibles dans l’API actuelle.</p>
          </div>
        </details>
        <label className="us-field sc-title"><Music2 size={17}/><span className="sr-only">Titre</span><input value={form.title.value} maxLength={SUNO_GENERATION_LIMITS.title} onChange={e => form.title.set(e.target.value)} placeholder={audio ? 'Titre de la reprise' : 'Titre du morceau (facultatif)'}/></label>
      </div>
      {form.tags.length > 0 && <div className="us-tags"><span>{form.tags.join(' · ')}</span><button onClick={form.clearTags} aria-label="Retirer les tags hérités"><X size={14}/></button></div>}
      {form.libraryFolder && <label className="sc-save-folder"><Folder size={15}/><span>Enregistrer dans</span><input aria-label="Dossier de destination" list="studio-destination-folders" maxLength={80} value={form.libraryFolder.value} onChange={e => form.libraryFolder?.set(e.target.value)} placeholder="Sans dossier"/><datalist id="studio-destination-folders">{Array.from(new Set(p.library.songs.map(song => song.folder).filter(Boolean))).map(folder => <option key={folder} value={folder}/>)}</datalist></label>}
    </div>
    {styleLibrary && <StudioTextLibrary studio={p} kind="style" onClose={() => setStyleLibrary(false)} onChoose={form.style.set}/>}
  </>;
}
