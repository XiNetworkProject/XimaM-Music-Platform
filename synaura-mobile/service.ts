import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

  TrackPlayer.addEventListener(Event.RemotePlayId, async (e) => {
    const queue = await TrackPlayer.getQueue();
    const idx = queue.findIndex((t) => t.id === e.id);
    if (idx >= 0) {
      await TrackPlayer.skip(idx);
      await TrackPlayer.play();
    }
  });

  TrackPlayer.addEventListener(Event.RemotePlaySearch, async () => {
    const queue = await TrackPlayer.getQueue();
    if (queue.length > 0) {
      await TrackPlayer.skip(0);
      await TrackPlayer.play();
    }
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (e) => {
    if (e.paused) {
      await TrackPlayer.pause();
    } else if (e.permanent) {
      await TrackPlayer.stop();
    } else {
      await TrackPlayer.play();
    }
  });
};
