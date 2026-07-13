import 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import { Text, TextInput } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './src/App';
import { playbackService } from './src/player/playbackService';

// Conserve l'accessibilite du texte sans laisser un reglage constructeur tres
// eleve casser les boutons et les barres de navigation sur les petits ecrans.
for (const component of [Text, TextInput]) {
  const nativeComponent = component as any;
  nativeComponent.defaultProps = {
    ...(nativeComponent.defaultProps || {}),
    maxFontSizeMultiplier: 1.35,
  };
}

TrackPlayer.registerPlaybackService(() => playbackService);
registerRootComponent(App);
