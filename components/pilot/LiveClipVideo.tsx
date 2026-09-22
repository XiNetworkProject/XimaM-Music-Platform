'use client';

import { useEffect, useRef, useState } from 'react';

/** Silent picture, one musical owner: the existing AudioCore source track.
 * The existing independent policy excludes this silent follower from secondary
 * audio leases: otherwise video.play() pauses its own musical source in a loop.
 * No independent autoplay, loop or second audible player. */
export default function LiveClipVideo({ src, poster, active, playing, offset, getAudioElement, onEnd }: {
  src: string; poster?: string | null; active: boolean; playing: boolean; offset: number;
  getAudioElement: () => HTMLAudioElement | null; onEnd: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const end = useRef(onEnd); end.current = onEnd;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const audio = getAudioElement();
    let completed = false;
    const sync = () => {
      if (!active || !playing || !audio || audio.paused || audio.ended || audio.readyState < 3) { video.pause(); return; }
      const position = Math.max(0, audio.currentTime - offset);
      if (Number.isFinite(video.duration) && position >= video.duration) {
        video.pause(); if (!completed) { completed = true; end.current(); } return;
      }
      if (video.readyState >= 1 && Math.abs(video.currentTime - position) > .35) video.currentTime = position;
      video.playbackRate = audio.playbackRate;
      if (video.paused && !completed) void video.play().then(() => setFailed(false)).catch(error => {
        if (error?.name !== 'AbortError' && error?.name !== 'NotAllowedError' && active) setFailed(true);
      });
    };
    const finish = () => { if (active && playing && !completed) { completed = true; end.current(); } };
    const events = ['timeupdate', 'play', 'pause', 'seeking', 'seeked', 'ratechange', 'waiting', 'playing'] as const;
    events.forEach(event => audio?.addEventListener(event, sync));
    video.addEventListener('loadedmetadata', sync);
    video.addEventListener('ended', finish);
    sync();
    return () => { video.pause(); events.forEach(event => audio?.removeEventListener(event, sync)); video.removeEventListener('loadedmetadata', sync); video.removeEventListener('ended', finish); };
  }, [active, playing, offset, src, getAudioElement]);
  return <><video ref={ref} src={src} poster={poster || undefined} muted playsInline data-synaura-audio-policy="independent" preload={active ? 'auto' : 'none'} onError={() => setFailed(true)} onLoadedData={() => setFailed(false)} onLoadedMetadata={event => {
    const video = event.currentTarget;
    video.closest('[data-live-artwork]')?.setAttribute('data-video-format', video.videoWidth > video.videoHeight ? 'landscape' : video.videoWidth === video.videoHeight ? 'square' : 'portrait');
  }} />{failed && <span className="live-clip-error" role="status">Vidéo indisponible. Le son reste accessible.</span>}</>;
}
