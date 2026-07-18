import TrackPlayer, { Event } from 'react-native-track-player';

export async function playbackService() {
  let recoveryInFlight = false;
  let retryTrackId = '';
  let retryCount = 0;

  const resetRecovery = (trackId = '') => {
    retryTrackId = trackId;
    retryCount = 0;
  };

  const recoverPlayback = async () => {
    if (recoveryInFlight) return;
    recoveryInFlight = true;
    try {
      const activeTrack = await TrackPlayer.getActiveTrack().catch(() => undefined);
      const activeId = String(activeTrack?.id || '');
      if (activeId !== retryTrackId) resetRecovery(activeId);
      retryCount += 1;

      if (retryCount <= 5) {
        const delay = [0, 350, 900, 1800, 3600, 6500][retryCount] || 6500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        await TrackPlayer.retry();
        await TrackPlayer.play();
        return;
      }

      const [queue, activeIndex] = await Promise.all([
        TrackPlayer.getQueue().catch(() => []),
        TrackPlayer.getActiveTrackIndex().catch(() => undefined),
      ]);
      if (typeof activeIndex === 'number' && activeIndex >= 0 && activeIndex < queue.length - 1) {
        resetRecovery();
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      }
    } catch {
      // A later native playback-error event can retry again.
    } finally {
      recoveryInFlight = false;
    }
  };

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    resetRecovery();
    void TrackPlayer.skipToNext().then(() => TrackPlayer.play()).catch(() => {});
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    resetRecovery();
    void TrackPlayer.skipToPrevious().then(() => TrackPlayer.play()).catch(() => {});
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    resetRecovery();
    void TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    void TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ track }) => {
    resetRecovery(String(track?.id || ''));
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position }) => {
    if (position >= 3 && retryCount > 0) resetRecovery(retryTrackId);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, () => {
    void recoverPlayback();
  });
}
