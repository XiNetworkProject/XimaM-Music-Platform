import TrackPlayer from 'react-native-track-player';
import { isCallAudioLocked } from './callAudioLock';

// A queued command, headset Play or error recovery must not steal a call's audio.
export async function playMusicOutsideCall() {
  if (isCallAudioLocked()) return;
  await TrackPlayer.play();
  if (isCallAudioLocked()) await TrackPlayer.pause();
}
