/** User-provided message metadata must never choose an arbitrary navigation URL. */
export function sharedMessagePath(type: string, id: string | null | undefined): string | null {
  const routes: Record<string, string> = { track: 'track', clip: 'clips', post: 'posts', playlist: 'playlists' };
  const route = routes[type];
  return route && id?.trim() ? `/${route}/${encodeURIComponent(id.trim())}` : null;
}

/** Restrict audio to a single voice note or recording preview at a time. */
export function pauseOtherVoiceMessages(current: HTMLMediaElement) {
  document.querySelectorAll<HTMLMediaElement>('audio[data-synaura-voice]').forEach(element => {
    if (element !== current && !element.paused) element.pause();
  });
}

export function voiceRecordingExtension(mime: string): 'm4a' | 'ogg' | 'webm' {
  return mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
}
