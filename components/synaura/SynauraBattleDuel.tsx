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

  return (
    <div className={`relative grid grid-cols-[1fr_auto_1fr] items-center ${compact ? 'gap-1 py-2' : 'gap-2 py-5 sm:gap-5'}`}>
      {tracks.map((track, index) => {
        const winner = event.winnerTrackId === track._id;
        return (
          <motion.div
            key={track._id}
            animate={event.isLive ? {
              x: index === 0 ? [0, 5, 0] : [0, -5, 0],
              rotate: index === 0 ? [-4, -1, -4] : [4, 1, 4],
              scale: [1, 1.025, 1],
            } : { rotate: index === 0 ? -3 : 3, scale: winner ? 1.04 : 0.97 }}
            transition={{ duration: 2.1, repeat: event.isLive ? Infinity : 0, ease: 'easeInOut' }}
            className={`relative min-w-0 overflow-hidden border border-white/12 bg-white/8 p-2 shadow-2xl ${compact ? 'rounded-[1rem]' : 'rounded-[1.5rem]'}`}
          >
            <TrackCover
              trackId={track._id}
              src={track.coverUrl}
              title={track.title}
              className={`w-full object-cover ${compact ? 'aspect-square rounded-[0.75rem]' : 'aspect-square rounded-[1.1rem]'}`}
            />
            <div className="absolute inset-x-2 bottom-2 rounded-[0.85rem] bg-[#171313]/82 px-2 py-2 backdrop-blur-md">
              <p className={`${compact ? 'text-[9px]' : 'text-xs'} truncate font-black text-white`}>{track.title}</p>
              {!compact ? <p className="mt-0.5 truncate text-[10px] font-bold text-white/48">{artistName(track)}</p> : null}
            </div>
            {winner ? <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#ffd667] text-[#171313] shadow-lg"><Crown className="h-4 w-4" /></span> : null}
          </motion.div>
        );
      })}

      <motion.div
        animate={event.isLive ? { scale: [1, 1.16, 1], rotate: [0, -7, 7, 0] } : { scale: 1 }}
        transition={{ duration: 1.25, repeat: event.isLive ? Infinity : 0, ease: 'easeInOut' }}
        className={`relative z-10 grid shrink-0 place-items-center rounded-full border-4 border-[#171313] bg-gradient-to-br from-[#ff6f61] via-[#7c5cff] to-[#00c2cb] font-black text-white shadow-[0_12px_40px_rgba(124,92,255,.48)] ${compact ? 'h-10 w-10 text-[9px]' : 'h-16 w-16 text-xs'}`}
      >
        {event.isEnded ? <Crown className={compact ? 'h-4 w-4' : 'h-6 w-6'} /> : <><Swords className={compact ? 'h-4 w-4' : 'h-6 w-6'} /><span className="sr-only">VS</span></>}
      </motion.div>
    </div>
  );
}
