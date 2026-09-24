'use client';

import { useRef, type ReactNode } from 'react';
import { ArrowLeft, Camera, Check, MapPin, MoreHorizontal, Play, Share2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { toPublicMediaUrl } from '@/lib/mediaUrls';
import './profile-experience.css';

type Props = {
  profile: any;
  own: boolean;
  followers: number;
  plays: number;
  trackCount: number;
  featured?: any;
  primaryActions: ReactNode;
  otherActions: ReactNode;
  socialLinks: ReactNode;
  badges: ReactNode;
  onBack: () => void;
  onShare: () => void;
  onPlay: () => void;
  onImage: (kind: 'avatar' | 'banner', file: File) => void;
};
const number = new Intl.NumberFormat('fr-FR', { notation:'compact', maximumFractionDigits:1 });

export default function ProfileIdentity(p: Props) {
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const living = useLivingMotion();
  const name = p.profile.artistName || p.profile.name || p.profile.username;
  const banner = toPublicMediaUrl(p.profile.banner) || toPublicMediaUrl(p.featured?.cover_url || p.featured?.coverUrl) || '/default-cover.svg';
  return <section className="profile-identity-scene" aria-label={`Profil de ${name}`} data-motion={living.enabled} onPointerMove={event => {
    if (!living.enabled || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pr-pointer-x', `${(event.clientX - bounds.left) / bounds.width * 100}%`);
    event.currentTarget.style.setProperty('--pr-pointer-y', `${(event.clientY - bounds.top) / bounds.height * 100}%`);
  }}>
    <div className="pr-backdrop" aria-hidden="true"><SynauraImage src={banner} alt="" className="pr-landscape" /><div className="pr-shade" /><div className="pr-light" /><i className="pr-orbit" /><i className="pr-orbit pr-orbit-two" /></div>
    <div className="pr-topline"><button onClick={p.onBack} aria-label="Retour" className="pr-icon"><ArrowLeft size={20} /></button><span>{p.own ? 'VOTRE UNIVERS' : 'UN UNIVERS À DÉCOUVRIR'}</span><div>{p.own && <button className="pr-icon" aria-label="Modifier la bannière du profil" onClick={() => bannerInput.current?.click()}><Camera size={18} /></button>}<button className="pr-icon" aria-label="Partager le profil" onClick={p.onShare}><Share2 size={18} /></button></div></div>
    <div className="pr-identity-main">
      <div className="pr-avatar-wrap"><div className="pr-avatar"><Avatar src={p.profile.avatar} name={p.profile.name} username={p.profile.username} size="2xl" className="h-full w-full" /></div>{p.own && <button className="pr-avatar-edit" aria-label="Modifier la photo de profil" onClick={() => avatarInput.current?.click()}><Camera size={16} /></button>}</div>
      <div className="pr-name-group"><div className="pr-eyebrow"><i />{p.profile.isArtist ? 'ARTISTE SYNAURA' : 'MEMBRE SYNAURA'}</div><h1>{name}{p.profile.isVerified && <span className="pr-verified" aria-label="Profil vérifié"><Check size={16} /></span>}</h1><div className="pr-handle"><span>@{p.profile.username}</span>{p.profile.location && <span><MapPin size={12} />{p.profile.location}</span>}</div>{p.profile.bio?.trim() && <p className="pr-bio">{p.profile.bio}</p>}<div className="pr-socials">{p.socialLinks}</div></div>
      <div className="pr-stat-strip"><div><strong>{number.format(p.followers)}</strong><span>abonnés</span></div><div><strong>{number.format(p.plays)}</strong><span>écoutes</span></div><div><strong>{number.format(p.trackCount)}</strong><span>morceaux</span></div></div>
    </div>
    <div className="pr-action-line"><div className="pr-actions">{p.featured && <button className="pr-listen" onClick={p.onPlay}><Play size={18} fill="currentColor" /><span>Écouter</span></button>}{p.primaryActions}<details className="pr-more" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary aria-label="Autres actions du profil"><MoreHorizontal size={21} /></summary><div onClick={event => { if ((event.target as Element).closest('button,a')) { const menu = event.currentTarget.closest('details'); if (menu) menu.open = false; } }}>{p.otherActions}</div></details></div><div className="pr-badges">{p.badges}</div></div>
    {p.own && <><input ref={avatarInput} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) p.onImage('avatar', file); event.target.value = ''; }} /><input ref={bannerInput} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) p.onImage('banner', file); event.target.value = ''; }} /></>}
  </section>;
}
