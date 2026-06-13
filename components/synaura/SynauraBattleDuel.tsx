'use client';

import { motion } from 'framer-motion';
import { Crown, Swords } from 'lucide-react';
import TrackCover from '@/components/TrackCover';
import type { CityEvent, CityTrack } from '@/lib/synauraCity';

function artistName(track: CityTrack) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

export default function SynauraBattleDuel({ event, compact = false }: { event: CityEvent; compact?: boolean }) {
  const tracks = (event.tracks || []).slice(0, 2);
  if (tracks.length < 2) return null;
  const leftTrack = tracks[0];
  const rightTrack = tracks[1];

  return (
    <div className={`relative mx-auto flex w-full items-center justify-center ${compact ? 'max-w-[19rem] py-1' : 'max-w-[42rem] py-4 sm:py-6'}`}>
      <BattleCard track={leftTrack} side="left" event={event} compact={compact} />
      <motion.div
        animate={event.isLive ? { scale: [1, 1.16, 1], rotate: [0, -7, 7, 0] } : { scale: 1 }}
        transition={{ duration: 1.25, repeat: event.isLive ? Infinity : 0, ease: 'easeInOut' }}
        className={`relative z-20 -mx-2 flex shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-[#171313] bg-gradient-to-br from-[#ff6f61] via-[#7c5cff] to-[#00c2cb] font-black leading-none text-white shadow-[0_10px_32px_rgba(124,92,255,.5)] sm:-mx-3 ${compact ? 'h-11 w-11' : 'h-14 w-14 sm:h-16 sm:w-16'}`}
      >
        {event.isEnded ? <Crown className={compact ? 'h-4 w-4' : 'h-5 w-5'} /> : <Swords className={compact ? 'h-4 w-4' : 'h-5 w-5'} />}
        <span className={`${compact ? 'mt-0.5 text-[6px]' : 'mt-1 text-[8px]'} tracking-[0.08em]`}>{event.isEnded ? 'WIN' : 'VS'}</span>
      </motion.div>
      <BattleCard track={rightTrack} side="right" event={event} compact={compact} />
    </div>
  );
}

function BattleCard({ track, side, event, compact }: { track: CityTrack; side: 'left' | 'right'; event: CityEvent; compact: boolean }) {
  const winner = event.winnerTrackId === track._id;
  const left = side === 'left';
  return (
    <motion.div
      animate={event.isLive ? {
        x: left ? [0, 5, 0] : [0, -5, 0],
        rotate: left ? [-3, -1, -3] : [3, 1, 3],
        scale: [1, 1.025, 1],
      } : { rotate: left ? -2 : 2, scale: winner ? 1.04 : 0.98 }}
      transition={{ duration: 2.1, repeat: event.isLive ? Infinity : 0, ease: 'easeInOut' }}
      className={`relative min-w-0 flex-1 overflow-hidden border border-white/15 bg-white/10 shadow-2xl ${
        compact
          ? 'max-w-[7.4rem] rounded-[1rem] p-1.5'
          : 'max-w-[17rem] rounded-[1.45rem] p-2 sm:p-2.5'
      }`}
    >
      <TrackCover
        trackId={track._id}
        src={track.coverUrl}
        title={track.title}
        className={`aspect-square w-full object-cover ${compact ? 'rounded-[0.72rem]' : 'rounded-[1.05rem]'}`}
      />
      <div className={`absolute inset-x-2 bottom-2 rounded-[0.8rem] bg-[#171313]/84 backdrop-blur-md ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
        <p className={`${compact ? 'text-[8px]' : 'text-xs sm:text-sm'} truncate font-black text-white`}>{track.title}</p>
        {!compact ? <p className="mt-0.5 truncate text-[10px] font-bold text-white/52">{artistName(track)}</p> : null}
      </div>
      {winner ? <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#ffd667] text-[#171313] shadow-lg"><Crown className="h-4 w-4" /></span> : null}
    </motion.div>
  );
}
