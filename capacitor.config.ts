import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ximam.app',
  appName: 'XimaM',
  webDir: 'out',
  server: {
    url: 'https://xima-m-music-platform.vercel.app',
    cleartext: true
  }
};

export default config;
