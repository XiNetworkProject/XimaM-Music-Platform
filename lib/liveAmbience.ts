import type { ScrollFeedItem } from './scrollFeed';

export const LIVE_AMBIENCE_KEY = 'synaura.live-ambience.v2';
export const DEFAULT_LIVE_AMBIENCE = { halo:65, blur:60, darkness:58, pulse:70, sensitivity:60, transition:420, particles:12, musicParticles:7, particleSpeed:45, particleSize:45, particleLight:65, parallax:true };
export type LiveAmbience = typeof DEFAULT_LIVE_AMBIENCE;
const clamp = (value:number, min:number, max:number) => Math.max(min,Math.min(max,value));
export function normalizeLiveAmbience(raw: unknown): LiveAmbience {
  const value = raw && typeof raw === 'object' ? raw as Record<string,unknown> : {};
  const number = (key:keyof LiveAmbience,min:number,max:number) => typeof value[key] === 'number' && Number.isFinite(value[key]) ? clamp(value[key] as number,min,max) : DEFAULT_LIVE_AMBIENCE[key] as number;
  return { halo:number('halo',0,100),blur:number('blur',24,100),darkness:number('darkness',35,85),pulse:number('pulse',0,100),sensitivity:number('sensitivity',0,100),transition:number('transition',0,650),particles:Math.round(number('particles',0,16)),musicParticles:Math.round(number('musicParticles',0,16)),particleSpeed:number('particleSpeed',0,100),particleSize:number('particleSize',0,100),particleLight:number('particleLight',0,100),parallax:typeof value.parallax==='boolean'?value.parallax:true };
}
export function liveItemCover(item?:ScrollFeedItem):string|null {
  if (!item) return null;
  if (item.type==='post') return item.post.image_url || item.post.track?.cover_url || item.post.track?.cover_video_poster_url || null;
  if (item.type==='clip') return item.clip.posterUrl || item.track.coverUrl || null;
  if (item.type==='artist_spotlight') return item.artist.avatar || item.track?.coverUrl || null;
  if (item.type==='collection') return item.collection.coverUrl || item.collection.bannerUrl || null;
  return 'track' in item ? item.track.coverUrl || null : null;
}
/** Stable on render; a different entity gets a different bounded particle path. */
export function liveParticlePaths(seed:string,count:number) {
  let state=2166136261;
  for(const char of seed) state=Math.imul(state^char.charCodeAt(0),16777619)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  return Array.from({length:clamp(Math.floor(count)||0,0,16)},()=>({x:20+random()*60,y:18+random()*64,dx:(random()-.5)*180,dy:(random()-.5)*170,size:3+random()*6,delay:random()*35,crop:random()*100}));
}
