'use client';
import { useRef } from 'react';
import { ArrowDown, ArrowUpRight, Headphones, Heart, MessageCircle, Pause, Play, Share2 } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import type { LivePilotModel } from '@/components/home/SynauraScroll';
import PilotImage from './PilotImage';

/** Entry and feed read the same active item and use the same existing queue. */
export default function PilotLiveEntry({ model }: { model: LivePilotModel }) {
  const audio = useAudioPlayer();
  const touchY = useRef<number | null>(null);
  const touchAtEnd = useRef(false);
  const lastWheel = useRef(0);
  const endSince = useRef(0);
  const item = model.items[model.activeIndex];
  const track = item && 'track' in item ? item.track : null;
  const current = Boolean(track && audio.audioState.tracks[audio.audioState.currentTrackIndex]?._id === track._id);
  const playing = current && audio.audioState.isPlaying;
  const seen = new Set<string>(track ? [track._id] : []);
  const discoveries = model.items.flatMap(candidate => {
    if (candidate.type !== 'track' || seen.has(candidate.track._id)) return [];
    seen.add(candidate.track._id);
    return [candidate.track];
  }).slice(0, 3);
  const posts = (model.entryPosts || []).slice(0, 2);
  const firstName = model.entryUserName?.trim().split(/\s+/)[0];
  const count = (value: number | string[] | undefined) => (Array.isArray(value) ? value.length : value || 0).toLocaleString('fr-FR');
  const atEnd = (element: HTMLElement) => element.scrollTop + element.clientHeight >= element.scrollHeight - 4;
  const openTrack = () => { if (track) model.navigateFromEntry(`/track/${encodeURIComponent(track._id)}`); };
  const enter = () => model.enterFeed();
  const toggle = () => {
    if (!track) return;
    if (!current) model.playIndex(model.activeIndex);
    else if (playing) audio.pause();
    else void audio.play();
  };
  return <section className="pilot-entry" aria-labelledby="pilot-entry-title" data-pilot-entry-track={track?._id}
    onScroll={event => { if (!atEnd(event.currentTarget)) endSince.current = 0; else if (!endSince.current) endSince.current = Date.now(); }}
    onWheel={event => { const now = Date.now(); const newGesture = now - lastWheel.current > 180; lastWheel.current = now; const element = event.currentTarget; const settled = element.scrollHeight <= element.clientHeight + 4 || (endSince.current > 0 && now - endSince.current > 600); if (settled && newGesture && atEnd(element) && event.deltaY > 24 && !(event.target as Element).closest('button,a,input,select')) enter(); }}
    onTouchStart={event => { touchY.current = event.touches[0]?.clientY ?? null; touchAtEnd.current = atEnd(event.currentTarget); }}
    onTouchEnd={event => { const start = touchY.current; touchY.current = null; if (touchAtEnd.current && start !== null && start - (event.changedTouches[0]?.clientY ?? start) > 55) enter(); }}
    onKeyDown={event => { if (event.target === event.currentTarget && atEnd(event.currentTarget) && (event.key === 'ArrowDown' || event.key === 'PageDown')) { event.preventDefault(); enter(); } }}>
    <div className="pilot-entry-copy"><p className="pilot-kicker">{firstName ? `Bonjour ${firstName} / Votre Live` : 'Live / Votre première rencontre'}</p><h1 id="pilot-entry-title">Laissez le son<br /><em>vous trouver.</em></h1><p className="pilot-entry-intent">Un morceau pour entrer.<br />Des artistes et des histoires à rencontrer.</p><nav className="pilot-entry-shortcuts" aria-label="Explorer et créer">{[{label:'Découvrir',sub:'Sons & artistes',href:'/discover'},{label:'Radar',sub:'Une autre sélection',href:'/radar'},{label:'Studio IA',sub:'Donner forme au son',href:'/ai-generator'},{label:'Événements',sub:'La scène Synaura',href:'/city'}].map(shortcut => <button key={shortcut.href} onClick={() => model.navigateFromEntry(shortcut.href)}><span>{shortcut.label}<small>{shortcut.sub}</small></span><ArrowUpRight size={17}/></button>)}</nav></div>
    <div className="pilot-entry-record">
      {track ? <><div className="pilot-entry-art"><PilotImage src={track.coverUrl || undefined} alt="" /><span aria-hidden="true">{playing ? 'À L’ÉCOUTE / LE VOYAGE CONTINUE' : '01 / LE DÉBUT DU VOYAGE'}</span></div><div className="pilot-entry-track"><div><h2>{track.title}</h2><p>{track.artist.name}</p></div><button onClick={toggle} aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`}>{playing ? <Pause /> : <Play />}</button></div><div className="pilot-entry-stats"><span><Headphones size={14}/>{count(track.plays)} écoutes</span><span>{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2,'0')}</span><span>{track.genre?.slice(0,2).join(' · ')}</span></div><div className="pilot-entry-actions"><button onClick={openTrack} aria-label="Voir les mentions J’aime du morceau"><Heart size={17}/>{count(track.likes)}</button><button onClick={openTrack} aria-label="Voir les commentaires du morceau"><MessageCircle size={17}/>{count(track.comments)}</button><button onClick={openTrack} aria-label="Partager depuis la fiche du morceau"><Share2 size={17}/></button><button onClick={openTrack}>Voir le morceau <ArrowUpRight size={16}/></button></div></> : <p className="pilot-entry-empty">Votre fil est prêt à être exploré.</p>}
      <button className="pilot-entry-enter pilot-entry-direct" onClick={enter}>Continuer dans Live <ArrowDown size={19}/></button>
    </div>
    <div className="pilot-entry-around"><section aria-labelledby="pilot-entry-discover"><div className="pilot-entry-section-title"><h2 id="pilot-entry-discover">À portée d’écoute</h2><span>De vraies découvertes, dans votre fil.</span></div><div className="pilot-entry-discoveries">{discoveries.map(next => <button key={next._id} onClick={() => model.navigateFromEntry(`/track/${encodeURIComponent(next._id)}`)}><PilotImage src={next.coverUrl || undefined} alt="" loading="lazy"/><span><strong>{next.title}</strong><small>{next.artist.name}</small><small>{count(next.plays)} écoutes</small></span><ArrowUpRight size={16}/></button>)}</div>{!discoveries.length && <p className="pilot-entry-note">Les prochaines découvertes apparaîtront ici.</p>}</section><section aria-labelledby="pilot-entry-community"><div className="pilot-entry-section-title"><h2 id="pilot-entry-community">Entre deux morceaux</h2><span>Les voix de la communauté.</span></div><div className="pilot-entry-posts">{posts.map(post => <button key={post.id} onClick={() => model.navigateFromEntry(`/posts/${encodeURIComponent(post.id)}`)}><span className="pilot-entry-post-author"><PilotImage src={post.creator.avatar || '/default-avatar.svg'} alt="" loading="lazy"/><strong>{post.creator.name || post.creator.username}</strong><ArrowUpRight size={16}/></span><span className="pilot-entry-post-excerpt">{post.content || (post.track ? `Partage « ${post.track.title} »` : 'A partagé une image')}</span><small>{count(post.likes_count)} j’aime · {count(post.comments_count)} commentaires</small></button>)}</div>{!posts.length && <p className="pilot-entry-note">Aucune publication disponible pour le moment.</p>}</section></div>
    <footer className="pilot-entry-footer"><span>{playing ? 'La musique continue. Le fil s’ouvre.' : 'À votre rythme. Sans rien interrompre.'}</span><button className="pilot-entry-enter" onClick={enter}>Entrer dans le fil <ArrowDown size={19} /></button><span>Glissez encore pour continuer</span></footer>
  </section>;
}
