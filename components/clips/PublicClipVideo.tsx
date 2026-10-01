'use client';

import type { VideoHTMLAttributes } from 'react';

// A poster can keep a video's default 300x150 intrinsic box even after metadata.
// Only size the existing native element; never start or own playback here.
function syncNativeRatio(video: HTMLVideoElement | null) {
  if (!video) return;
  const { videoWidth, videoHeight } = video;
  if (!Number.isFinite(videoWidth) || !Number.isFinite(videoHeight) || videoWidth <= 0 || videoHeight <= 0) return;
  video.style.setProperty('--clip-source-ratio', `${videoWidth} / ${videoHeight}`);
}

export default function PublicClipVideo(props: VideoHTMLAttributes<HTMLVideoElement>) {
  return <video {...props} ref={syncNativeRatio} onLoadedMetadata={event => syncNativeRatio(event.currentTarget)} onResize={event => syncNativeRatio(event.currentTarget)} />;
}
