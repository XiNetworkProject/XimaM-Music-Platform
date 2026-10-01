'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUpRight, ArrowRight, Activity as AudioLines, Award, Check, ChevronRight, Disc3, Headphones, Music2, Pause, Play, Radio, Sparkles, Trophy, Users } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import TrackCover from '@/components/TrackCover';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import type { CityEvent, CityTrack, SynauraCityData } from '@/lib/synauraCity';
import './city-experience.css';

type Chapter = 'events' | 'discover' | 'passport';
type Filter = 'open' | 'all' | 'mine';
type Props = {
  city: SynauraCityData;
  currentId?: string;
  isPlaying: boolean;
  error: string | null;
  busy: boolean;
  onPlay: (track: CityTrack) => void;
  onOpen: (event: CityEvent) => void;
  onParticipate: (event: CityEvent) => void;
  onClaim: (event: CityEvent) => void;
};

export function isCityEventClosed(event: CityEvent) {
  return Boolean(event.isEnded || ['ended', 'resolved', 'archived'].includes(event.status || ''));
}

export function cityEventAction(event: CityEvent): 'claim' | 'participate' | 'open' {
  if (event.claimStatus === 'available') return 'claim';
  if (event.kind === 'battle' || isCityEventClosed(event) || event.activeBoost || event.canParticipate === false || (!event.isLive && !event.canParticipate)) return 'open';
  return 'participate';
}

function eventStatus(event: CityEvent) {
  return isCityEventClosed(event) ? 'Terminé' : event.isLive ? 'En cours' : 'À venir';
}

function eventDate(event: CityEvent) {
  const value = event.isLive || isCityEventClosed(event) ? event.endsAt : event.startsAt;
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${isCityEventClosed(event) ? 'Terminé le' : event.isLive ? 'Jusqu’au' : 'Dès le'} ${date}`;
}

function name(track: CityTrack) { return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura'; }
function count(value: number) { return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }

function Cover({ track, playing = false }: { track: CityTrack; playing?: boolean }) {
  return <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} autoPlayVideo={playing} playOnHover={false} alt="" className="city-cover" />;
}

export default function CityExperience({ city, currentId, isPlaying, error, busy, onPlay, onOpen, onParticipate, onClaim }: Props) {
  const [chapter, setChapter] = useState<Chapter>('events');
  const [filter, setFilter] = useState<Filter>('open');
  const featured = city.currentVoteSession || city.events.find(event => event.isLive && !isCityEventClosed(event)) || city.nextVoteSession || city.events.find(event => !isCityEventClosed(event));
  const featuredTracks = featured?.tracks?.slice(0, 2) || [];
  const open = city.events.filter(event => !isCityEventClosed(event));
  const mine = city.events.filter(event => event.userParticipation || event.selectedTrackId || event.claimStatus === 'available' || event.activeBoost);
  const events = (filter === 'open' ? open : filter === 'mine' ? mine : city.events).filter(event => event.id !== featured?.id || filter === 'mine');
  const playing = (track: CityTrack) => currentId === track._id && isPlaying;
  const act = (event: CityEvent) => {
    const action = cityEventAction(event);
    if (action === 'claim') onClaim(event);
    else if (action === 'participate') onParticipate(event);
    else onOpen(event);
  };

  return <div className="city-experience">
    <header className="city-masthead">
      <div className="city-wordmark"><span className="city-monogram"><AudioLines size={19} /></span> SYNAURA <strong>CITY</strong></div>
      <Link href="/community">La communauté <ArrowUpRight size={15} /></Link>
    </header>

    <ExperienceMotionFrame className="city-stage">
      <div className="city-stage-lights" aria-hidden="true"><i /><i /><i /></div>
      <span className="city-stage-watermark" aria-hidden="true">CITY</span>
      <div className="city-stage-copy">
        <p className="city-eyebrow"><span className="city-signal" /> LE RENDEZ-VOUS DES SONS</p>
        <h1>On écoute.<br />On se rencontre.<br /><em>On fait du bruit.</em></h1>
        <p className="city-stage-intro">Des sons à défendre. Des défis à relever.<br />Et toute une scène à découvrir ensemble.</p>
        <a className="city-primary" href="#city-program">Trouver mon rendez-vous <ArrowDown size={17} /></a>
        <div className="city-stage-footnote"><span>{open.length} événements ouverts</span><span>{count(city.cityMood.reactionsToday)} réactions aujourd’hui</span></div>
      </div>
      <div className="city-marquee">
        <div className="city-marquee-top"><span><Radio size={14} /> À L’AFFICHE</span><span>{featured ? eventStatus(featured) : 'À découvrir'}</span></div>
        {featuredTracks.length ? <div className="city-duel-art">
          {featuredTracks.map((track, index) => <button key={track._id} className={`city-sleeve city-sleeve-${index}`} onClick={() => onPlay(track)} aria-label={`${playing(track) ? 'Mettre en pause' : 'Écouter'} ${track.title}`}>
            <Cover track={track} playing={playing(track)} /><span className="city-sleeve-caption"><small>{name(track)}</small><strong>{track.title}</strong></span>
            <span className="city-round-play">{playing(track) ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}</span>
          </button>)}
          {featuredTracks.length > 1 && <span className="city-versus" aria-hidden="true">×</span>}
        </div> : <div className="city-no-sleeve" aria-hidden="true"><Disc3 /><span>VOTRE PROCHAIN<br />RENDEZ-VOUS</span></div>}
        <div className="city-marquee-bottom">
          <div><p className="city-eyebrow">{featured?.kind === 'battle' ? 'DEUX SONS. VOTRE VOIX.' : 'LA SCÈNE EST OUVERTE'}</p><h2>{featured?.title || 'La suite s’écrit ici.'}</h2><p>{featured ? eventDate(featured) : 'Explorez les artistes et les sons de City.'}</p></div>
          {featured ? <button className="city-arrow-button" onClick={() => onOpen(featured)} aria-label={`Ouvrir ${featured.title}`}><ArrowUpRight size={26} /></button> : <Link className="city-arrow-button" href="/discover" aria-label="Découvrir les sons"><ArrowUpRight size={26} /></Link>}
        </div>
        {featured?.kind === 'battle' && <button className="city-marquee-action" onClick={() => onOpen(featured)}>{featured.selectedTrackId ? <><Check size={16} /> Mon vote est enregistré</> : <>Écouter les titres et voter <ArrowRight size={16} /></>}<span>{count(featured.totalVotes || 0)} votes</span></button>}
      </div>
    </ExperienceMotionFrame>

    <nav id="city-program" className="city-chapters" aria-label="Explorer City">
      {([['events', 'Les rendez-vous', Radio], ['discover', 'Les découvertes', Headphones], ['passport', 'Mon parcours', Award]] as const).map(([key, label, Icon]) => <button key={key} aria-pressed={chapter === key} onClick={() => setChapter(key)}><Icon size={17} /><span>{label}</span>{key === 'passport' && mine.length > 0 && <small>{mine.length}</small>}</button>)}
    </nav>
    {error && <p className="city-error" role="alert">{error}</p>}

    {chapter === 'events' && <section className="city-chapter-content" aria-label="Les rendez-vous">
      <div className="city-section-heading"><div><p className="city-eyebrow">VOTRE PROCHAINE RENCONTRE</p><h2>Entrez dans le jeu.</h2></div><div className="city-filters" aria-label="Filtrer les événements">{([['open', 'À rejoindre'], ['all', 'Tous'], ['mine', 'Les miens']] as const).map(([key, label]) => <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}</button>)}</div></div>
      <div className="city-event-grid">{events.map((event, index) => {
        const action = cityEventAction(event);
        const label = action === 'claim' ? 'Récupérer mon gain' : action === 'participate' ? event.userParticipation ? 'Changer mon son' : 'Proposer mon son' : isCityEventClosed(event) ? 'Voir les résultats' : event.kind === 'battle' ? 'Écouter et voter' : 'Voir le rendez-vous';
        const EventIcon = event.kind === 'battle' ? Headphones : event.kind === 'friday_drop' ? Disc3 : event.kind === 'seasonal' ? Sparkles : AudioLines;
        return <article key={event.id} className="city-event" data-kind={event.kind}>
          <div className="city-event-art" aria-hidden="true"><span className="city-event-number">{String(index + 1).padStart(2, '0')}</span><div className="city-event-orbits"><i /><i /><i /></div><EventIcon size={52} /><span className="city-event-kind">{event.kind === 'battle' ? 'BATTLE' : event.kind === 'friday_drop' ? 'NOUVEAUX SONS' : event.kind === 'seasonal' ? 'ÉDITION SPÉCIALE' : 'DÉFI CRÉATIF'}</span></div>
          <div className="city-event-body"><div className="city-event-meta"><span data-live={event.isLive && !isCityEventClosed(event)}>{eventStatus(event)}</span>{event.userParticipation && <span><Check size={12} /> Inscrit</span>}</div><h3><button onClick={() => onOpen(event)}>{event.title}</button></h3><p className="city-event-description">{event.theme || event.description}</p><div className="city-event-info"><span><Users size={13} /> {count(event.participationCount || 0)} participants</span>{event.reward?.title && <span><Trophy size={13} /> {event.reward.title}</span>}</div><p className="city-event-date">{eventDate(event)}</p><button className="city-event-join" disabled={busy && action !== 'open'} onClick={() => act(event)}>{label}<ArrowUpRight size={18} /></button></div>
        </article>;
      })}</div>
      {!events.length && <div className="city-empty"><Radio size={30} /><h3>{filter === 'mine' ? 'Votre premier rendez-vous vous attend.' : 'Le prochain rendez-vous se prépare.'}</h3><p>{filter === 'mine' ? 'Participez à un défi ou votez dans une battle pour la retrouver ici.' : 'En attendant, découvrez les sons de la communauté.'}</p><button onClick={() => filter === 'mine' ? setFilter('open') : setChapter('discover')}>{filter === 'mine' ? 'Voir les événements' : 'Explorer les sons'} <ArrowRight size={16} /></button></div>}
      <div className="city-invite"><AudioLines size={28} /><div><h3>La prochaine découverte, c’est peut-être vous.</h3><p>Publiez un morceau. Trouvez votre public.</p></div><Link href="/upload">Publier mon son <ArrowUpRight size={18} /></Link></div>
    </section>}

    {chapter === 'discover' && <div className="city-chapter-content">
      <section><div className="city-section-heading"><div><p className="city-eyebrow">LE POULS DE LA COMMUNAUTÉ</p><h2>Ça tourne ici.</h2></div><Link href="/discover">Tout explorer <ArrowUpRight size={17} /></Link></div>
        <div className="city-record-grid">{city.pulse.slice(0, 8).map((track, index) => <button key={track._id} className="city-record" onClick={() => onPlay(track)} aria-label={`${playing(track) ? 'Mettre en pause' : 'Écouter'} ${track.title} — ${name(track)}`}><div className="city-record-art"><Cover track={track} playing={playing(track)} /><span className="city-record-rank">{String(index + 1).padStart(2, '0')}</span><span className="city-round-play">{playing(track) ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}</span></div><strong>{track.title}</strong><span>{name(track)}</span><small><AudioLines size={13} /> Pulse {track.pulse}/100</small></button>)}</div>
        {!city.pulse.length && <p className="city-empty">Les prochains sons apparaîtront ici.</p>}
      </section>
      <section><div className="city-section-heading"><div><p className="city-eyebrow">DERRIÈRE LES SONS</p><h2>Des artistes à rencontrer.</h2></div></div><div className="city-artist-grid">{city.spotlightArtists.map(artist => <Link href={`/profile/${encodeURIComponent(artist.username)}`} key={artist.id} className="city-artist"><div className="city-avatar">{artist.avatar ? <img src={artist.avatar} alt="" loading="lazy" /> : <span>{artist.name.slice(0, 1)}</span>}</div><strong>{artist.name}</strong><span>{artist.trackCount} sons</span><ArrowUpRight size={16} /></Link>)}</div></section>
      <div className="city-discovery-pair"><section className="city-radar"><div className="city-section-heading"><div><p className="city-eyebrow">HORS DES SENTIERS BATTUS</p><h2>Dans le radar.</h2></div><Radio size={26} /></div>{city.radar.slice(0, 5).map(track => <button className="city-track-row" key={track._id} onClick={() => onPlay(track)}><Cover track={track} playing={playing(track)} /><span><strong>{track.title}</strong><small>{name(track)}</small></span>{playing(track) ? <Pause size={18} /> : <Play size={18} />}</button>)}{!city.radar.length && <p className="city-muted">Le radar attend de nouveaux sons.</p>}</section>
      <section className="city-awards"><div className="city-section-heading"><div><p className="city-eyebrow">SOUS LES PROJECTEURS</p><h2>La vitrine.</h2></div><Trophy size={26} /></div>{city.hallOfFame.slice(0, 6).map(award => <div className="city-award" key={award.id}><Award size={19} /><div><strong>{award.title}</strong><span>{award.subtitle}</span></div>{award.track ? <button onClick={() => award.track && onPlay(award.track)} aria-label={`Écouter ${award.track.title}`}>{playing(award.track) ? <Pause size={17} /> : <Play size={17} />}</button> : award.artist?.username ? <Link href={`/profile/${encodeURIComponent(award.artist.username)}`} aria-label={`Voir ${award.artist.name}`}><ArrowUpRight size={17} /></Link> : null}</div>)}</section></div>
    </div>}

    {chapter === 'passport' && <section className="city-chapter-content" aria-label="Mon parcours">
      <div className="city-section-heading"><div><p className="city-eyebrow">VOUS FAITES PARTIE DE LA SCÈNE</p><h2>Chaque soutien compte.</h2></div></div>
      <div className="city-passport-grid"><div className="city-passport"><span className="city-eyebrow">CARTE ARTISTE / SYNAURA CITY</span><Disc3 className="city-passport-disc" size={100} aria-hidden="true" />{city.creatorCard ? <><span className="city-passport-level">{String(city.creatorCard.level).padStart(2, '0')}</span><h3>{city.creatorCard.levelName}</h3><p>{city.creatorCard.xp} XP · {city.creatorCard.trackCount} sons publiés</p><progress value={city.creatorCard.xp} max={Math.max(city.creatorCard.xp, city.creatorCard.nextLevelXp, 1)} aria-label="Progression artiste" /><p>{Math.max(0, city.creatorCard.nextLevelXp - city.creatorCard.xp)} XP avant le prochain niveau</p></> : <><span className="city-passport-level">01</span><h3>Tout commence<br />par un son.</h3><p>Votre carte artiste se construit avec vos publications et vos participations.</p><Link href="/upload">Publier mon premier son <ArrowUpRight size={18} /></Link></>}</div>
      <div className="city-badges">{city.listenerBadges.map(badge => <div key={badge.id} className="city-badge" data-unlocked={badge.unlocked}><span className="city-badge-medal">{badge.unlocked ? <Award size={23} /> : <Headphones size={23} />}</span><div><h3>{badge.title}</h3><p>{badge.description}</p><progress value={Math.min(badge.progress, Math.max(1, badge.target))} max={Math.max(1, badge.target)} aria-label={badge.title} /></div><span className="city-badge-count">{badge.unlocked ? <Check size={17} aria-label="Débloqué" /> : `${badge.progress}/${badge.target}`}</span></div>)}</div></div>
      <div className="city-section-heading"><div><p className="city-eyebrow">À RETROUVER</p><h2>Mes participations.</h2></div></div>
      {mine.length ? <div className="city-participations">{mine.map(event => <div key={event.id}><div><span className="city-eyebrow">{eventStatus(event)}</span><h3>{event.title}</h3><p>{event.activeBoost ? `Boost ×${event.activeBoost.multiplier} actif` : event.claimStatus === 'available' ? 'Une récompense vous attend' : event.selectedTrackId ? 'Votre vote est enregistré' : 'Votre son est inscrit'}</p></div><button className="city-arrow-button" disabled={busy && cityEventAction(event) !== 'open'} aria-label={`${event.claimStatus === 'available' ? 'Récupérer le gain' : 'Ouvrir'} : ${event.title}`} onClick={() => event.claimStatus === 'available' ? onClaim(event) : onOpen(event)}><ChevronRight size={22} /></button></div>)}</div> : <div className="city-empty"><Music2 size={28} /><h3>Aucune participation pour le moment.</h3><button onClick={() => { setChapter('events'); setFilter('open'); }}>Trouver un rendez-vous <ArrowRight size={16} /></button></div>}
    </section>}
    <footer className="city-footer"><span>SYNAURA CITY</span><p>Pas juste écouter. En faire partie.</p><Link href="/community">Rejoindre la conversation <ArrowUpRight size={14} /></Link></footer>
  </div>;
}
