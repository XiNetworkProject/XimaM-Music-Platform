import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synaura.app',
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
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#1a1a1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
    App: {
      url: 'https://xima-m-music-platform.vercel.app'
    }
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    captureInput: true
  }
};

export default config;
