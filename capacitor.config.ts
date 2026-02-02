import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synaura.music',
  appName: 'Synaura',
  webDir: 'out',
  server: {
    url: 'https://xima-m-music-platform.vercel.app',
    cleartext: false,
    allowNavigation: [
      'https://accounts.google.com/*',
      'https://xima-m-music-platform.vercel.app/*',
      'https://*.googleusercontent.com/*',
      'https://*.google.com/*',
      'https://oauth2.googleapis.com/*',
      'https://www.googleapis.com/*',
      'https://*.googleapis.com/*',
      'https://accounts.google.com/oauth/*',
      'https://accounts.google.com/signin/*',
      'https://accounts.google.com/ServiceLogin*'
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#050214',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7C3AED',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
    captureInput: true,
    backgroundColor: '#050214'
  }
};

export default config;
