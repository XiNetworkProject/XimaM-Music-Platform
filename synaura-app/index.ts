import 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import { registerRootComponent } from 'expo';
import App from './src/App';
import { playbackService } from './src/player/playbackService';

TrackPlayer.registerPlaybackService(() => playbackService);
registerRootComponent(App);
