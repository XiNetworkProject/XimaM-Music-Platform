import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** Explicit functional changes requested after the presentation-only gates.
 * Restore only these exact reviewed slots for historical comparisons; live-media-
 * continuity and audio-core tests execute their new behavior. No baseline changes. */
export function projectLiveMedia(file, raw) {
  let text = raw.replaceAll('\r\n','\n');
  const replace = (from,to='') => { assert.equal(text.split(from).length,2,`${file}: reviewed Live media slot`);text=text.replace(from,to); };
  if(file==='components/home/SynauraScroll.tsx') {
    replace("import { resolveLiveAutomaticAdvance } from '@/lib/livePlaybackContinuity';", "import ClipUploadIndicator from '@/components/clips/ClipUploadIndicator';");
    replace('  const endedLiveItem = useRef<{ itemId: string; trackId: string; queueIndex: number } | null>(null);\n');
    replace('    endedLiveItem.current = null;\n    suppressRestoredAutoplayRef.current = false;', '    suppressRestoredAutoplayRef.current = false;');
    const start=text.indexOf('  useEffect(() => {\n    const element = getAudioElement();');
    const end=text.indexOf('  useEffect(() => {\n    lastAutoplayRequestRef.current = null;',start);
    assert.ok(start>0 && end>start);
    assert.equal(createHash('sha256').update(text.slice(start,end)).digest('hex'),'a55b4fb1054ac91dd6937995f1456d07eb094b500e7a24fbd550146ec6ca263b');
    text=text.slice(0,start)+text.slice(end);
    replace(' || homePreludeOpen || endedLiveItem.current) return;', ' || homePreludeOpen) return;');
    replace("      const ownsQueue = audioState.tracks.length === playableQueue.length && playableQueue.every((entry, i) => entry._id === audioState.tracks[i]?._id);\n      if (currentId === track._id && (!ownsQueue || audioState.currentTrackIndex === feedIndexToQueueIndex.get(activeIndex))) return;", '      if (currentId === track._id) return;');
    replace('[activeIndex, audioState.currentTrackIndex, audioState.tracks, continuitySettled, currentId, feedIndexToQueueIndex, homePreludeOpen, playableQueue, playIndex, queueByPosition]', '[activeIndex, continuitySettled, currentId, homePreludeOpen, playIndex, queueByPosition]');
    replace("    if (!item || item.type !== 'clip') { clipOffsetSeekedRef.current = null; return; }", "    if (!item || item.type !== 'clip') return;");
    replace('    const offset = item.clip.sourceTrackOffsetSeconds || 0;\n', '    const offset = item.clip.sourceTrackOffsetSeconds || 0;\n    if (offset <= 0) return;\n');
    replace('    if (audioState.currentTrackIndex !== feedIndexToQueueIndex.get(activeIndex)) return;\n');
    replace('[activeIndex, continuitySettled, feedItems, currentId, audioState.currentTrackIndex, audioState.duration, feedIndexToQueueIndex, seek]', '[activeIndex, continuitySettled, feedItems, currentId, audioState.duration, seek]');
    // The badge moved to the persistent root, including the new renderer.
    replace('      <SynauraMobileDock appearance="immersive" showDesktop />\n', '      <SynauraMobileDock appearance="immersive" showDesktop />\n      <ClipUploadIndicator />\n');
  }
  if(file==='lib/audio/AudioCore.ts') {
    replace(`    // The same song can occur as a track and as several clips in a Live queue.
    // Preserve the selected occurrence instead of jumping to the first matching ID.
    const referenceIndex = this.snapshot.queue.indexOf(track);
    const selectedIndex = this.snapshot.currentIndex;
    const queueIndex = referenceIndex >= 0 ? referenceIndex
      : this.snapshot.queue[selectedIndex]?._id === track._id ? selectedIndex
      : this.snapshot.queue.findIndex((item) => item._id === track._id);`, '    const queueIndex = this.snapshot.queue.findIndex((item) => item._id === track._id);');
    replace(`    const index = !this.snapshot.shuffle && effective[this.snapshot.currentIndex]?._id === currentId
      ? this.snapshot.currentIndex : currentId ? effective.findIndex((track) => track._id === currentId) : -1;`, '    const index = currentId ? effective.findIndex((track) => track._id === currentId) : -1;');
  }
  if(file==='app/api/media/upload/route.ts') {
    replace("message.includes('trop volumineux') ? 413 : message.includes('4 minutes') ? 422 :", "message.includes('trop volumineux') ? 413 :");
  }
  if(file==='app/api/music-clips/[id]/route.ts') {
    replace('deleteLocalMedia, inspectOwnedClipVideo, isLocalMediaOwnedBy', 'deleteLocalMedia, isLocalMediaOwnedBy');
    replace("import { MUSIC_CLIP_DURATION_MESSAGE, isClipDurationValid } from '@/lib/clipLimits';\n");
    replace("        return NextResponse.json({ error: 'La video doit provenir du stockage Synaura' }, { status: 422 });", "        if (body.videoPublicId) await deleteLocalMedia(body.videoPublicId).catch(() => false);\n        return NextResponse.json({ error: 'La video doit provenir du stockage Synaura' }, { status: 422 });");
    replace(`    if (body.sourceTrackDurationSeconds !== undefined) {
      if (!isClipDurationValid(body.sourceTrackDurationSeconds)) return NextResponse.json({ error: MUSIC_CLIP_DURATION_MESSAGE }, { status: 422 });
      update.source_track_duration_seconds = clampClipDuration(body.sourceTrackDurationSeconds);
    }
    if (body.videoUrl !== undefined) {
      try {
        const verified = await inspectOwnedClipVideo(body.videoPublicId, userId);
        update.source_track_duration_seconds = Math.round(verified.duration);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Vidéo invalide' }, { status: 422 });
      }
    }`, '    if (body.sourceTrackDurationSeconds !== undefined) update.source_track_duration_seconds = clampClipDuration(body.sourceTrackDurationSeconds);');
    assert.equal(text.split('error: MUSIC_CLIP_DURATION_MESSAGE').length,3);
    text=text.replaceAll('error: MUSIC_CLIP_DURATION_MESSAGE', "error: 'Un clip doit durer entre 15 et 60 secondes'");
    replace('La vidéo dépasse la limite de 250 Mo', 'La video depasse la limite de 95 Mo');
    replace(`        if (permission.source.duration > 0 && (update.source_track_offset_seconds ?? existing.source_track_offset_seconds) + sourceDuration > permission.source.duration + 1) {
          return NextResponse.json({ error: 'Le son choisi est trop court pour cette vidéo. Choisis un morceau plus long ou réduis le début de l’extrait.' }, { status: 422 });
        }
`);
    replace('      // Keep the owned upload for a retry; a failed DB write must not destroy it.', '      if (body.videoPublicId) await deleteLocalMedia(body.videoPublicId).catch(() => false);');
  }
  return text;
}
